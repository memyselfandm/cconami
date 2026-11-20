import { atom, read, update } from 'claude-code'
import type { EngineInterface, PluginOptions, Register } from 'claude-code'

import type { Check, Head, OpenedPr, Summary, View } from '../types'
import {
  ciText,
  fromRest,
  fromRollup,
  isPrCreate,
  isPush,
  json,
  parseRemote,
  prNumber,
  prUrls,
  shortText,
  summarize,
  upstreamRemote,
} from './logic'

// Defaults for the userConfig fields in plugin.json, used when a value is
// missing or not a usable number.
const DEFAULT_POLL_SECONDS = 30
const DEFAULT_IDLE_POLL_MINUTES = 0
const DEFAULT_MAX_FAILING_NAMES = 3
// After a push or a new PR, GitHub takes a moment to register the checks, so
// the mod polls at the pending rate for this long even when it sees none.
const GRACE_MS = 120_000
// How long one `git` or `gh` call may run before it counts as a failure.
const PROCESS_TIMEOUT_MS = 15_000
// Keeps `gh` from prompting or printing an update notice into what it parses.
const GH_ENV = { GH_PROMPT_DISABLED: '1', GH_NO_UPDATE_NOTIFIER: '1', NO_COLOR: '1' }

const EMPTY: View = { head: null, opened: [] }
const view = atom({ plugin: 'ci-status', key: 'view' } as const, EMPTY, {
  shape: 'view-1',
})

type Settings = { pollMs: number; idleMs: number; maxNames: number }

function settings(options: PluginOptions): Settings {
  const number = (value: unknown, fallback: number, min: number): number => {
    const parsed = Number(value)
    return Number.isFinite(parsed) && parsed >= min ? parsed : fallback
  }

  return {
    pollMs: number(options.pollSeconds, DEFAULT_POLL_SECONDS, 5) * 1000,
    idleMs: number(options.idlePollMinutes, DEFAULT_IDLE_POLL_MINUTES, 0) * 60_000,
    maxNames: Math.floor(number(options.maxFailingNames, DEFAULT_MAX_FAILING_NAMES, 0)),
  }
}

/** Every failure goes to the debug log alone: the mod never speaks in the chat. */
function debug($: EngineInterface, text: string): void {
  $.ui.log(`ci-status: ${text}`, { to: 'debug' })
}

/** Runs a command; null when it cannot start, times out or exits non-zero. */
async function run(
  $: EngineInterface,
  cwd: string,
  argv: readonly string[],
): Promise<string | null> {
  try {
    const done = await $.process.run(argv, {
      cwd,
      timeoutMs: PROCESS_TIMEOUT_MS,
      env: argv[0] === 'gh' ? GH_ENV : {},
    })
    if (done.exitCode !== 0) {
      debug($, `${argv.slice(0, 3).join(' ')} exited ${done.exitCode}: ${done.stderr.trim().slice(0, 200)}`)
      return null
    }
    return done.stdout
  } catch (error) {
    debug($, `${argv.slice(0, 3).join(' ')} failed: ${error instanceof Error ? error.message : String(error)}`)
    return null
  }
}

/** The CI state of HEAD in `cwd`, or null whenever it cannot be shown. */
async function readHead(
  $: EngineInterface,
  cwd: string,
  sha: string,
): Promise<Head | null> {
  const branch = (await run($, cwd, ['git', 'rev-parse', '--abbrev-ref', 'HEAD']))?.trim() ?? 'HEAD'
  const upstream = await run($, cwd, [
    'git',
    'rev-parse',
    '--abbrev-ref',
    '--symbolic-full-name',
    '@{upstream}',
  ])
  const remote = upstreamRemote(upstream ?? '') ?? 'origin'
  const url =
    (await run($, cwd, ['git', 'remote', 'get-url', remote])) ??
    (remote === 'origin' ? null : await run($, cwd, ['git', 'remote', 'get-url', 'origin']))
  const repo = url === null ? null : parseRemote(url)
  if (repo === null) {
    debug($, `no GitHub remote in ${cwd}`)
    return null
  }
  const slug = `${repo.owner}/${repo.name}`

  let pr: number | null = null
  let prUrl: string | null = null
  let checks: Check[] | null = null
  if (branch !== 'HEAD') {
    const viewed = json(
      (await run($, cwd, [
        'gh',
        'pr',
        'view',
        branch,
        '-R',
        slug,
        '--json',
        'number,state,url,headRefOid,statusCheckRollup',
      ])) ?? '',
    ) as Record<string, unknown> | null
    if (viewed !== null && viewed.state === 'OPEN') {
      pr = typeof viewed.number === 'number' ? viewed.number : null
      prUrl = typeof viewed.url === 'string' ? viewed.url : null
      // The PR's rollup is for its head; use it only when that is HEAD.
      if (viewed.headRefOid === sha) {
        checks = fromRollup(viewed.statusCheckRollup)
      }
    }
  }
  if (checks === null) {
    const runs = await run($, cwd, [
      'gh',
      'api',
      `repos/${slug}/commits/${sha}/check-runs?per_page=100`,
    ])
    if (runs === null) {
      // Also what GitHub answers for a commit it does not have.
      return null
    }
    const status = await run($, cwd, ['gh', 'api', `repos/${slug}/commits/${sha}/status`])
    checks = fromRest(json(runs), json(status ?? ''))
  }

  const summary = summarize(checks)
  if (summary === null) {
    debug($, `no checks on ${slug}@${sha.slice(0, 7)}`)
    return null
  }

  return { cwd, sha, summary, pr, prUrl }
}

/** The state of a PR the session opened; unchanged when `gh` cannot say. */
async function readOpened(
  $: EngineInterface,
  cwd: string,
  pr: OpenedPr,
): Promise<OpenedPr> {
  const viewed = json(
    (await run($, cwd, ['gh', 'pr', 'view', pr.url, '--json', 'number,state,statusCheckRollup'])) ??
      '',
  ) as Record<string, unknown> | null
  if (viewed === null) {
    return pr
  }

  return {
    ...pr,
    state: typeof viewed.state === 'string' ? viewed.state : pr.state,
    summary: summarize(fromRollup(viewed.statusCheckRollup)),
  }
}

function isPending(summary: Summary | null | undefined): boolean {
  return summary?.state === 'pending'
}

// The module's own variables start over on a reload, which also runs
// session.start again; the view itself is in $.state and stays.
let config: Settings = settings({})
let isBusy = false
let isAgain = false
let lastRefresh = 0
let graceUntil = 0
// Where the last refresh looked, so a turn that moves HEAD triggers one.
let lastCwd = ''
let lastSha = ''

async function refresh($: EngineInterface): Promise<void> {
  if (isBusy) {
    isAgain = true
    return
  }
  isBusy = true
  try {
    do {
      isAgain = false
      lastRefresh = await $.clock.now()
      const cwd = await $.session.cwd()
      const sha = (await run($, cwd, ['git', 'rev-parse', 'HEAD']))?.trim() ?? ''
      lastCwd = cwd
      lastSha = sha
      const head = sha === '' ? null : await readHead($, cwd, sha)
      const prior = await read($, view)
      const opened: OpenedPr[] = []
      for (const pr of prior.opened) {
        opened.push(
          pr.state === 'MERGED' || pr.state === 'CLOSED' ? pr : await readOpened($, cwd, pr),
        )
      }
      // PRs added while this refresh ran are kept.
      await update($, view, current => ({
        head,
        opened: current.opened.map(pr => opened.find(fresh => fresh.url === pr.url) ?? pr),
      }))
    } while (isAgain)
  } catch (error) {
    debug($, `refresh failed: ${error instanceof Error ? error.message : String(error)}`)
  } finally {
    isBusy = false
  }
}

/** One poll period: reads GitHub only while something is worth reading. */
async function tick($: EngineInterface): Promise<void> {
  const now = await $.clock.now()
  const { head, opened } = await read($, view)
  const isRunning =
    isPending(head?.summary) ||
    opened.some(pr => pr.state === '' || (pr.state === 'OPEN' && isPending(pr.summary)))
  const isIdleDue = config.idleMs > 0 && now - lastRefresh >= config.idleMs
  if (isRunning || now < graceUntil || isIdleDue) {
    await refresh($)
  }
}

/** Records the PRs a `gh pr create` printed, and starts the grace period. */
async function afterPush($: EngineInterface, output: string): Promise<void> {
  const urls = prUrls(output)
  if (urls.length > 0) {
    await update($, view, current => ({
      ...current,
      opened: [
        ...current.opened,
        ...urls
          .filter(url => !current.opened.some(pr => pr.url === url))
          .map(url => ({ url, number: prNumber(url) ?? 0, state: '', summary: null })),
      ],
    }))
  }
  graceUntil = (await $.clock.now()) + GRACE_MS
  await refresh($)
}

/** Refreshes when the working directory or HEAD moved since the last read. */
async function ifMoved($: EngineInterface): Promise<void> {
  const cwd = await $.session.cwd()
  const sha = (await run($, cwd, ['git', 'rev-parse', 'HEAD']))?.trim() ?? ''
  if (cwd !== lastCwd || sha !== lastSha) {
    await refresh($)
  }
}

export const register: Register = (on, options) => {
  config = settings(options)

  on('session.start', async ($, e, next) => {
    void refresh($)
    $.clock.every(config.pollMs, () => {
      void tick($)
    })

    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    const ran = await next(e)
    if (e.tool !== 'Bash' || ran.deny !== undefined) {
      return ran
    }
    const command = String(e.command ?? '')
    const created = isPrCreate(command)
    if (!isPush(command) && !created) {
      return ran
    }
    void afterPush($, created && ran.isError !== true ? (ran.text ?? '') : '')

    return ran
  }).catch(($, e, next) => next(e))

  // A turn that commits, checks out or switches directory moves HEAD; the band
  // would otherwise go on showing the old commit's checks.
  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    void ifMoved($)

    return result
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const { head, opened } = await read($, view)
    const others = opened.filter(pr => pr.url !== head?.prUrl)
    if (e.props.hasSurvey || (head === null && others.length === 0)) {
      return next(e)
    }
    const { Box, Text } = $.ui.resolve(e)
    const color =
      head?.summary.state === 'pass'
        ? 'success'
        : head?.summary.state === 'fail'
          ? 'error'
          : 'warning'

    return (
      <Box gap={1}>
        {head !== null && (
          <Text bold color={color} wrap="truncate-end">
            {ciText(head.summary, config.maxNames)}
          </Text>
        )}
        {head !== null && head.pr !== null && <Text dimColor>PR #{head.pr}</Text>}
        {others.length > 0 && (
          <Text dimColor wrap="truncate-end">
            {head === null ? '' : '· '}opened{' '}
            {others.map(pr => `#${pr.number} ${shortText(pr.summary, pr.state)}`).join(', ')}
          </Text>
        )}
      </Box>
    )
  })
}

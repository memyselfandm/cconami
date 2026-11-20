import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Check, Head, OpenedPr, View } from '../types'
import {
  addOpened,
  ciText,
  fromRest,
  isNotFound,
  isOpenedPending,
  MAX_OPENED_FAILURES,
  isPrCreate,
  isPush,
  json,
  jsonLines,
  parseHead,
  parsePrUrl,
  parseRemote,
  parseUpstream,
  ownPr,
  prUrls,
  settings,
  shortText,
  summarize,
} from './logic'
import type { Settings } from './logic'

// Every read runs from the session's own timer, which ticks this often; the
// hooks on tool calls and turns only mark a read as due.
const TICK_MS = 5_000
// After a push or a new PR, GitHub takes a moment to register the checks, so
// the mod polls at the pending rate for this long even when it sees none.
const GRACE_MS = 120_000
// After any change of state, a late check or a re-run started on GitHub can
// still come: read every SETTLE_EVERY_MS for SETTLE_FOR_MS after the change.
// The same slow read goes on, with no end, while GitHub does not have HEAD's
// commit yet, so a push made outside the session shows up.
const SETTLE_EVERY_MS = 180_000
const SETTLE_FOR_MS = 900_000
// While `gh` fails (offline, logged out), read only this often.
const OFFLINE_EVERY_MS = 600_000
// How long one `git` or `gh` call may run before it counts as a failure.
const PROCESS_TIMEOUT_MS = 15_000
// Keeps `gh` from prompting or printing an update notice into what it parses.
const GH_ENV = { GH_PROMPT_DISABLED: '1', GH_NO_UPDATE_NOTIFIER: '1', NO_COLOR: '1' }

const EMPTY: View = { head: null, opened: [], isOffline: false }
const view = atom({ plugin: 'ci-status', key: 'view' } as const, EMPTY, {
  shape: 'view-2',
})

/** Every failure goes to the debug log alone: the mod never speaks in the chat. */
function debug($: EngineInterface, text: string): void {
  $.ui.log(`ci-status: ${text}`, { to: 'debug' })
}

function reason(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

type Ran = { ok: true; stdout: string } | { ok: false; stderr: string }

/** Runs a command; `ok: false` when it cannot start, times out or exits non-zero. */
async function run($: EngineInterface, cwd: string, argv: readonly string[]): Promise<Ran> {
  const what = argv.slice(0, 3).join(' ')
  try {
    const done = await $.process.run(argv, {
      cwd,
      timeoutMs: PROCESS_TIMEOUT_MS,
      env: argv[0] === 'gh' ? GH_ENV : {},
    })
    if (done.exitCode !== 0) {
      debug($, `${what} exited ${done.exitCode}: ${done.stderr.trim().slice(0, 200)}`)
      return { ok: false, stderr: done.stderr }
    }
    return { ok: true, stdout: done.stdout }
  } catch (error) {
    debug($, `${what} failed: ${reason(error)}`)
    return { ok: false, stderr: reason(error) }
  }
}

/**
 * Why a read failed: `isMissing` when GitHub said it has no such commit (not
 * pushed yet), `isOffline` when `gh` itself failed; neither for an odd answer.
 */
type Failed = { ok: false; isOffline: boolean; isMissing: boolean }

function failure(stderr: string): Failed {
  const isMissing = isNotFound(stderr)

  return { ok: false, isOffline: !isMissing, isMissing }
}

/** Rows of a `gh api` list, or why not. */
type Rows = { ok: true; rows: unknown[] } | Failed

/**
 * The `key` rows of a REST answer that carries `total_count`, every page of
 * them: a second call with `--paginate` when the first page is short.
 */
async function apiRows($: EngineInterface, cwd: string, path: string, key: string): Promise<Rows> {
  const first = await run($, cwd, ['gh', 'api', path])
  if (!first.ok) {
    return failure(first.stderr)
  }
  const body = json(first.stdout) as Record<string, unknown> | null
  const rows = body?.[key]
  if (!Array.isArray(rows)) {
    debug($, `gh api ${path} answered without ${key}`)
    return { ok: false, isOffline: false, isMissing: false }
  }
  const total = Number(body?.total_count ?? rows.length)
  if (!(total > rows.length)) {
    return { ok: true, rows }
  }
  const all = await run($, cwd, ['gh', 'api', '--paginate', '--jq', `.${key}[]`, path])
  if (!all.ok) {
    return failure(all.stderr)
  }

  return { ok: true, rows: jsonLines(all.stdout) }
}

type Read<T> = { ok: true; value: T } | Failed

/** The checks on one commit; a failed call is never read as "no checks". */
async function readCommit(
  $: EngineInterface,
  cwd: string,
  slug: string,
  sha: string,
): Promise<Read<Check[]>> {
  const runs = await apiRows(
    $,
    cwd,
    `repos/${slug}/commits/${sha}/check-runs?per_page=100&filter=latest`,
    'check_runs',
  )
  if (!runs.ok) {
    return runs
  }
  const statuses = await apiRows($, cwd, `repos/${slug}/commits/${sha}/status?per_page=100`, 'statuses')
  if (!statuses.ok) {
    return statuses
  }

  return { ok: true, value: fromRest(runs.rows, statuses.rows) }
}

/**
 * HEAD's state, or why it is hidden: `isOffline` when `gh` failed, `isMissing`
 * when GitHub does not have the commit yet.
 */
type HeadRead = { head: Head | null; isOffline: boolean; isMissing: boolean }

const HIDDEN: HeadRead = { head: null, isOffline: false, isMissing: false }

/** The CI state of HEAD in `cwd`, or null whenever it cannot be shown. */
async function readHead(
  $: EngineInterface,
  cwd: string,
  at: { sha: string; branch: string },
): Promise<HeadRead> {
  const tracked = await run($, cwd, [
    'git',
    'rev-parse',
    '--abbrev-ref',
    '--symbolic-full-name',
    '@{upstream}',
  ])
  const upstream = tracked.ok ? parseUpstream(tracked.stdout) : null
  const remote = upstream?.remote ?? 'origin'
  let url = await run($, cwd, ['git', 'remote', 'get-url', remote])
  if (!url.ok && remote !== 'origin') {
    url = await run($, cwd, ['git', 'remote', 'get-url', 'origin'])
  }
  const repo = url.ok ? parseRemote(url.stdout) : null
  if (repo === null) {
    debug($, `no GitHub remote in ${cwd}`)
    return HIDDEN
  }
  const slug = `${repo.owner}/${repo.name}`

  // The PR is found by the upstream branch's name, never `gh pr view <branch>`,
  // which reads a branch named `123` as PR #123. `--head` ignores the owner,
  // so forks' PRs from a branch of the same name (say `main`) are listed too;
  // ownPr skips them.
  let pr: number | null = null
  let prUrl: string | null = null
  if (upstream !== null) {
    const listed = await run($, cwd, [
      'gh',
      'pr',
      'list',
      '-R',
      slug,
      '--head',
      upstream.branch,
      '--state',
      'open',
      '--json',
      'number,url,isCrossRepository',
      '--limit',
      '30',
    ])
    if (!listed.ok) {
      return { ...HIDDEN, isOffline: true }
    }
    const own = ownPr(json(listed.stdout))
    pr = own?.number ?? null
    prUrl = own?.url ?? null
  }

  const checks = await readCommit($, cwd, slug, at.sha)
  if (!checks.ok) {
    return { head: null, isOffline: checks.isOffline, isMissing: checks.isMissing }
  }
  const summary = summarize(checks.value)
  if (summary === null) {
    debug($, `no checks on ${slug}@${at.sha.slice(0, 7)}`)
    return HIDDEN
  }

  return {
    head: { cwd, branch: at.branch, sha: at.sha, summary, pr, prUrl },
    isOffline: false,
    isMissing: false,
  }
}

/** A PR the session opened, read again; a failed read counts in `failures`. */
async function readOpened($: EngineInterface, cwd: string, pr: OpenedPr): Promise<OpenedPr> {
  const failed = { ...pr, failures: pr.failures + 1 }
  const where = parsePrUrl(pr.url)
  if (where === null) {
    return failed
  }
  const viewed = await run($, cwd, ['gh', 'pr', 'view', pr.url, '--json', 'state,headRefOid'])
  const fields = viewed.ok ? (json(viewed.stdout) as Record<string, unknown> | null) : null
  if (fields === null || typeof fields.state !== 'string') {
    return failed
  }
  if (fields.state !== 'OPEN' || typeof fields.headRefOid !== 'string') {
    return { ...pr, state: fields.state, summary: null, failures: 0 }
  }
  const checks = await readCommit($, cwd, where.slug, fields.headRefOid)
  if (!checks.ok) {
    return failed
  }

  return { ...pr, state: 'OPEN', summary: summarize(checks.value), failures: 0 }
}

// The module's own variables start over on a reload, which also runs
// session.start again; the view itself is in $.state and stays.
let config: Settings = settings({})
let isTicking = false
let isDue = false
let isTurnEnded = false
let lastRefresh = 0
// The last read that was not a fast poll: the slow reads are timed from it,
// so pending polls do not keep putting them off.
let lastFullRefresh = 0
let lastChange = 0
let lastSignature = ''
let graceUntil = 0
let isMissing = false
// Where the last refresh looked, so a turn that moves HEAD triggers one.
let lastCwd = ''
let lastHeadKey = ''

/** What the band would draw, to tell when the state changed. */
function signature(next: View): string {
  return JSON.stringify([
    next.isOffline,
    next.head && [next.head.sha, next.head.pr, next.head.summary],
    next.opened.map(pr => [pr.url, pr.state, pr.failures === 0, pr.summary]),
  ])
}

async function headAt($: EngineInterface, cwd: string) {
  const got = await run($, cwd, ['git', 'rev-parse', 'HEAD', '--abbrev-ref', 'HEAD'])
  return got.ok ? parseHead(got.stdout) : null
}

/**
 * How much a read covers. `pending`, the fast poll, reads HEAD and only the
 * opened PRs still pending. `slow` also reads the finished open ones. `due`, a
 * read asked for by a push, a new PR, a moved HEAD or the session's start,
 * also tries again the PRs that failed MAX_OPENED_FAILURES times.
 */
type Reach = 'pending' | 'slow' | 'due'

function isOpenedRead(pr: OpenedPr, reach: Reach): boolean {
  if ((pr.state === 'MERGED' || pr.state === 'CLOSED') && pr.failures === 0) {
    return false
  }
  if (pr.failures >= MAX_OPENED_FAILURES) {
    return reach === 'due'
  }

  return reach !== 'pending' || isOpenedPending(pr)
}

async function refresh($: EngineInterface, reach: Reach): Promise<void> {
  const now = await $.clock.now()
  lastRefresh = now
  if (reach !== 'pending') {
    lastFullRefresh = now
  }
  const cwd = await $.session.cwd()
  const at = await headAt($, cwd)
  lastCwd = cwd
  lastHeadKey = at === null ? '' : `${at.branch} ${at.sha}`
  const found = at === null ? HIDDEN : await readHead($, cwd, at)
  isMissing = found.isMissing

  const prior = await read($, view)
  const opened: OpenedPr[] = []
  for (const pr of prior.opened) {
    opened.push(isOpenedRead(pr, reach) ? await readOpened($, cwd, pr) : pr)
  }
  const next = await update($, view, current => ({
    head: found.head,
    isOffline: found.isOffline,
    // PRs added while this refresh ran are kept.
    opened: current.opened.map(pr => opened.find(fresh => fresh.url === pr.url) ?? pr),
  }))
  const drawn = signature(next)
  if (drawn !== lastSignature) {
    lastSignature = drawn
    lastChange = now
  }
}

/** One period of the session's timer: reads GitHub only when a read is due. */
async function tick($: EngineInterface): Promise<void> {
  if (isTicking) {
    return
  }
  isTicking = true
  try {
    const now = await $.clock.now()
    if (isTurnEnded && !isDue) {
      isTurnEnded = false
      const cwd = await $.session.cwd()
      const at = await headAt($, cwd)
      if (cwd !== lastCwd || (at === null ? '' : `${at.branch} ${at.sha}`) !== lastHeadKey) {
        isDue = true
      }
    }
    const { head, opened, isOffline } = await read($, view)
    const since = now - lastRefresh
    const sinceFull = now - lastFullRefresh
    const isRunning = head?.summary.state === 'pending' || opened.some(isOpenedPending)
    const isFast = (isRunning || now < graceUntil) && since >= config.pollMs
    const isSlow =
      ((now - lastChange < SETTLE_FOR_MS || (head === null && isMissing)) &&
        sinceFull >= SETTLE_EVERY_MS) ||
      (config.idleMs > 0 && sinceFull >= config.idleMs)
    // While `gh` fails, every timed read waits for the offline period.
    const reach: Reach | null = isDue
      ? 'due'
      : isOffline
        ? since >= OFFLINE_EVERY_MS
          ? 'slow'
          : null
        : isSlow
          ? 'slow'
          : isFast
            ? 'pending'
            : null
    if (reach !== null) {
      isDue = false
      isTurnEnded = false
      await refresh($, reach)
    }
  } finally {
    isTicking = false
  }
}

export const register: Register = (on, options) => {
  config = settings(options)

  on('session.start', async ($, e, next) => {
    isDue = true
    $.clock.every(TICK_MS, () => {
      void tick($).catch(error => {
        // The read that threw is asked for again at the next tick.
        isDue = true
        debug($, `refresh failed: ${reason(error)}`)
      })
    })

    return next(e)
  })

  // A push or a new PR marks a read as due; the session's timer makes it.
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
    const urls = created && ran.isError !== true ? prUrls(ran.text ?? '') : []
    if (urls.length > 0) {
      await update($, view, current => ({ ...current, opened: addOpened(current.opened, urls) }))
    }
    graceUntil = (await $.clock.now()) + GRACE_MS
    isDue = true

    return ran
  }).catch(($, e, next) => next(e))

  // A turn that commits, checks out or switches directory may move HEAD; the
  // next tick checks, so the band does not go on showing the old commit.
  on('turn.complete', (_$, e, next) => {
    isTurnEnded = true

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const { head, opened, isOffline } = await read($, view)
    // A PR is drawn only from a read that worked, and none while `gh` fails.
    const others = isOffline
      ? []
      : opened.filter(pr => pr.url !== head?.prUrl && pr.state !== '' && pr.failures === 0)
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

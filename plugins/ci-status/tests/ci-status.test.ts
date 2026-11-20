import { describe, expect, mock, test } from 'claude-code/testing'
import type { Engine, MockClock } from 'claude-code/testing'
import type { On, ProcessRunResult } from 'claude-code'

import type { OpenedPr } from '../types'
import {
  addOpened,
  ciText,
  fromRest,
  isOpenedPending,
  ownPr,
  isPrCreate,
  isPush,
  jsonLines,
  parseHead,
  parsePrUrl,
  parseRemote,
  parseUpstream,
  prUrls,
  settings,
  shortText,
  summarize,
} from '../hooks/logic'
import {
  CCONAMI_MAIN_CHECK_RUNS,
  CCONAMI_MAIN_STATUS,
  CCONAMI_PR_11_VIEW,
  CCONAMI_PR_LIST,
  K8S_CHECK_RUNS,
  K8S_STATUS,
  NEXT_RERUN_CHECK_RUNS,
  VSCODE_CHECK_RUNS,
  VSCODE_PR_LIST_MAIN,
} from './fixtures'

const rest = (runs: { check_runs: readonly unknown[] }, status: { statuses: readonly unknown[] }) =>
  summarize(fromRest(runs.check_runs, status.statuses))

describe('parsing gh output', () => {
  test('a passing commit', () => {
    const summary = rest(CCONAMI_MAIN_CHECK_RUNS, CCONAMI_MAIN_STATUS)
    expect(summary).toEqual({ state: 'pass', total: 1, passed: 1, done: 1, failing: [] })
    expect(ciText(summary!, 3)).toBe('CI ✓ 1/1')
  })

  test('failures, skips and a running check: fails, naming the failures', () => {
    const summary = rest(VSCODE_CHECK_RUNS, CCONAMI_MAIN_STATUS)!
    expect(summary.total).toBe(38)
    expect(summary.done).toBe(37)
    expect(ciText(summary, 3)).toBe(
      'CI ✗ 3 failing · PR Gate, Linux / Browser-Unit, Linux / Electron-Unit (electron)',
    )
    expect(ciText(summary, 1)).toBe('CI ✗ 3 failing · PR Gate +2')
    expect(ciText(summary, 0)).toBe('CI ✗ 3 failing')
  })

  test('commit statuses with one pending are running', () => {
    expect(ciText(rest(K8S_CHECK_RUNS, K8S_STATUS)!, 3)).toBe('CI ● running 12/13')
  })

  test('a failed attempt followed by a passing re-run counts once, as passed', () => {
    const summary = rest(NEXT_RERUN_CHECK_RUNS, CCONAMI_MAIN_STATUS)!
    expect(ciText(summary, 3)).toBe('CI ✓ 2/2')
    // By time, not by the order GitHub happened to list them in.
    const reversed = { check_runs: [...NEXT_RERUN_CHECK_RUNS.check_runs].reverse() }
    expect(ciText(rest(reversed, CCONAMI_MAIN_STATUS)!, 3)).toBe('CI ✓ 2/2')
  })

  test('no checks and no statuses is no summary: the band hides', () => {
    expect(rest(K8S_CHECK_RUNS, CCONAMI_MAIN_STATUS)).toBeNull()
    expect(summarize(fromRest(null, null))).toBeNull()
  })

  test('the short mark for an opened PR', () => {
    expect(shortText(rest(K8S_CHECK_RUNS, K8S_STATUS), 'OPEN')).toBe('● 12/13')
    expect(shortText(rest(VSCODE_CHECK_RUNS, CCONAMI_MAIN_STATUS), 'OPEN')).toBe('✗ 3 failing')
    expect(shortText(null, CCONAMI_PR_11_VIEW.state)).toBe('merged')
    expect(shortText(null, 'OPEN')).toBe('no checks')
  })

  test("the branch's own PR, never a fork's PR from a branch of the same name", () => {
    expect(ownPr(VSCODE_PR_LIST_MAIN)).toBeNull()
    expect(ownPr(CCONAMI_PR_LIST)).toEqual({
      number: 13,
      url: 'https://github.com/memyselfandm/cconami/pull/13',
    })
    expect(ownPr([...VSCODE_PR_LIST_MAIN, ...CCONAMI_PR_LIST])?.number).toBe(13)
    expect(ownPr([])).toBeNull()
    expect(ownPr(null)).toBeNull()
  })

  test('one JSON value per line, as gh api --paginate --jq prints', () => {
    expect(jsonLines('{"a":1}\n\n{"a":2}\nnot json\n')).toEqual([{ a: 1 }, { a: 2 }])
  })
})

describe('reading git, commands and settings', () => {
  test('GitHub remotes in each form, and others refused', () => {
    const repo = { owner: 'acme', name: 'widgets' }
    expect(parseRemote('git@github.com:acme/widgets.git')).toEqual(repo)
    expect(parseRemote('https://github.com/acme/widgets.git\n')).toEqual(repo)
    expect(parseRemote('https://github.com/acme/widgets')).toEqual(repo)
    expect(parseRemote('ssh://git@github.com/acme/widgets.git')).toEqual(repo)
    expect(parseRemote('https://user@github.com/acme/widgets/')).toEqual(repo)
    expect(parseRemote('git@github.com:acme/my.repo_v-2.git')).toEqual({
      owner: 'acme',
      name: 'my.repo_v-2',
    })
    expect(parseRemote('git@gitlab.com:acme/widgets.git')).toBeNull()
    expect(parseRemote('https://github.com.evil.example/acme/widgets')).toBeNull()
    expect(parseRemote('')).toBeNull()
  })

  test('owner and repository names outside [A-Za-z0-9._-], and . or .., are refused', () => {
    expect(parseRemote('https://github.com/../widgets')).toBeNull()
    expect(parseRemote('https://github.com/acme/..')).toBeNull()
    expect(parseRemote('https://github.com/./widgets')).toBeNull()
    expect(parseRemote('https://github.com/ac%2Fme/widgets')).toBeNull()
    expect(parseRemote('git@github.com:acme/wid?gets')).toBeNull()
    expect(parsePrUrl('https://github.com/../x/pull/3')).toBeNull()
    expect(parsePrUrl('https://github.com/acme/widgets/pull/42')).toEqual({
      slug: 'acme/widgets',
      number: 42,
    })
  })

  test('the upstream and HEAD', () => {
    expect(parseUpstream('origin/main\n')).toEqual({ remote: 'origin', branch: 'main' })
    expect(parseUpstream('fork/feature/x')).toEqual({ remote: 'fork', branch: 'feature/x' })
    expect(parseUpstream('')).toBeNull()
    const sha = 'e9a762342e36d12d728a8d25f2b8c4ffcdd10a80'
    expect(parseHead(`${sha}\nfeature\n`)).toEqual({ sha, branch: 'feature' })
    expect(parseHead('fatal: not a git repository')).toBeNull()
  })

  test('commands that push or open a PR', () => {
    expect(isPush('git push origin HEAD:refs/heads/x')).toBe(true)
    expect(isPush('git -C /tmp/repo push origin HEAD')).toBe(true)
    expect(isPush('cd repo && git push')).toBe(true)
    expect(isPush('git status')).toBe(false)
    expect(isPush('echo pushing')).toBe(false)
    expect(isPrCreate('gh pr create -R a/b --base main --head x')).toBe(true)
    expect(isPrCreate('gh pr view 3')).toBe(false)
  })

  test('PR URLs in gh pr create output', () => {
    const out = 'Creating pull request for x into main\n\nhttps://github.com/acme/widgets/pull/42\n'
    expect(prUrls(out)).toEqual(['https://github.com/acme/widgets/pull/42'])
    expect(prUrls('nothing here')).toEqual([])
  })

  test('settings are clamped: poll at least 5 s, idle poll 0 or at least 1 min', () => {
    expect(settings({})).toEqual({ pollMs: 30_000, idleMs: 0, maxNames: 3 })
    expect(settings({ pollSeconds: 1 }).pollMs).toBe(5_000)
    expect(settings({ pollSeconds: 'often' }).pollMs).toBe(30_000)
    expect(settings({ idlePollMinutes: 0.2 }).idleMs).toBe(60_000)
    expect(settings({ idlePollMinutes: -3 }).idleMs).toBe(0)
    expect(settings({ idlePollMinutes: 10 }).idleMs).toBe(600_000)
    expect(settings({ maxFailingNames: -1 }).maxNames).toBe(0)
    expect(settings({ maxFailingNames: 2.7 }).maxNames).toBe(2)
  })

  test('the opened list keeps 10, dropping the oldest finished PR first', () => {
    const pr = (n: number, state: string): OpenedPr => ({
      url: `https://github.com/acme/widgets/pull/${n}`,
      number: n,
      state,
      summary: null,
      failures: 0,
    })
    const list = [pr(1, 'OPEN'), pr(2, 'MERGED'), ...[3, 4, 5, 6, 7, 8, 9, 10].map(n => pr(n, 'OPEN'))]
    const next = addOpened(list, ['https://github.com/acme/widgets/pull/11'])
    expect(next.map(item => item.number)).toEqual([1, 3, 4, 5, 6, 7, 8, 9, 10, 11])
    const again = addOpened(next, ['https://github.com/acme/widgets/pull/12'])
    expect(again.map(item => item.number)).toEqual([3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
    expect(addOpened(again, ['https://github.com/acme/widgets/pull/12'])).toEqual(again)
  })

  test('an opened PR that cannot be read stops counting as pending after 3 tries', () => {
    const unread: OpenedPr = { url: 'u', number: 1, state: '', summary: null, failures: 0 }
    expect(isOpenedPending(unread)).toBe(true)
    expect(isOpenedPending({ ...unread, failures: 2 })).toBe(true)
    expect(isOpenedPending({ ...unread, failures: 3 })).toBe(false)
  })
})

const SHA = 'e9a762342e36d12d728a8d25f2b8c4ffcdd10a80'
const PR_SHA = '1e17e99a47de05caaaba442405c97e59e0085a1c'
const OPENED_URL = 'https://github.com/acme/widgets/pull/42'
const TICK = 5_000
const BAND = {
  plugin: 'ci-status',
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isCollapsed: false,
    isWorking: false,
    maxRows: 10,
    bodyColumns: 120,
    scroll: { offset: 0, bodyRows: 10 },
    view: {},
  },
} as const

function done(stdout: string, exitCode = 0, stderr = ''): ProcessRunResult {
  return { exitCode, stdout, stderr, isStdoutTruncated: false, isStderrTruncated: false }
}
const ok = (value: unknown) => done(JSON.stringify(value))
const OFFLINE = done('', 1, 'error connecting to api.github.com')
const NOT_FOUND = done('', 1, 'gh: No commit found for SHA: x (HTTP 422)')

/** The repository the tests stand in: what each `git` and `gh` call answers. */
type Repo = {
  sha: string
  branch: string
  upstream: string
  remoteUrl: string
  prList: unknown
  runs: Record<string, unknown>
  statuses: Record<string, unknown>
  prView: unknown
  /** Answers a line before the rest, or undefined to let them answer. */
  first: (line: string) => ProcessRunResult | undefined
}

function answer(repo: Repo, line: string): ProcessRunResult {
  const early = repo.first(line)
  if (early !== undefined) return early
  if (line === 'git rev-parse HEAD --abbrev-ref HEAD') return done(`${repo.sha}\n${repo.branch}\n`)
  if (line.startsWith('git rev-parse --abbrev-ref --symbolic-full-name')) {
    return repo.upstream === '' ? done('', 128) : done(`${repo.upstream}\n`)
  }
  if (line === 'git remote get-url origin') return done(`${repo.remoteUrl}\n`)
  if (line.startsWith('gh pr list -R acme/widgets --head ')) return ok(repo.prList)
  if (line.startsWith(`gh pr view ${OPENED_URL} `)) return ok(repo.prView)
  const commit = line.match(/^gh api repos\/acme\/widgets\/commits\/([0-9a-f]+)\/(check-runs|status)\?/)
  if (commit !== null) {
    const table = commit[2] === 'check-runs' ? repo.runs : repo.statuses
    const value = table[commit[1] ?? '']
    return value === undefined ? NOT_FOUND : ok(value)
  }

  return done('', 1, `unexpected: ${line}`)
}

/**
 * Stands in for the engine: a mocked clock, the session's directory, and
 * every `git` and `gh` call answered from `repo`. A test registers every hook
 * before its first call on `$`.
 */
function setUp(on: On) {
  const repo: Repo = {
    sha: SHA,
    branch: 'feature',
    upstream: 'origin/feature',
    remoteUrl: 'git@github.com:acme/widgets.git',
    prList: [{ number: 7, url: 'https://github.com/acme/widgets/pull/7', isCrossRepository: false }],
    runs: { [SHA]: VSCODE_CHECK_RUNS, [PR_SHA]: K8S_CHECK_RUNS },
    statuses: { [SHA]: CCONAMI_MAIN_STATUS, [PR_SHA]: K8S_STATUS },
    prView: { state: 'OPEN', headRefOid: PR_SHA },
    first: () => undefined,
  }
  const world = { repo, calls: [] as string[], logs: [] as string[], toolText: '' }
  const clock = mock.clock(on, { now: 1_000_000 })
  on('session.cwd', () => ({ value: '/repo' }))
  on('ui.log', (_, e) => {
    world.logs.push(e.to ?? 'transcript')
    return { value: undefined }
  })
  on('process.run', (_, e) => {
    const line = e.argv.join(' ')
    world.calls.push(line)
    return { value: answer(repo, line) }
  })
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('tool.call', () => ({ result: {}, text: world.toolText }))
  on('turn.complete', () => ({ text: '' }))

  return { world, repo, clock }
}

async function start($: Engine, clock: MockClock) {
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
  await clock.advance(TICK)
}

async function band($: Engine, surface: 'terminal' | 'desktop' = 'terminal') {
  const ui = await $.ui.mount({ ...BAND, surface })
  const ci = (await ui.find({ type: 'Text', text: /^CI / }))?.text
  const pr = (await ui.find({ type: 'Text', text: /^PR / }))?.text
  const opened = (await ui.find({ type: 'Text', text: /opened/ }))?.text
  await ui.unmount()

  return { ci, pr, opened }
}

const NOTHING = { ci: undefined, pr: undefined, opened: undefined }

describe('the band', () => {
  test('shows the failing checks and the PR number, on each surface', async ($, on) => {
    const { world, clock } = setUp(on)
    await start($, clock)

    for (const surface of ['terminal', 'desktop'] as const) {
      expect(await band($, surface)).toEqual({
        ci: 'CI ✗ 3 failing · PR Gate, Linux / Browser-Unit, Linux / Electron-Unit (electron)',
        pr: 'PR #7',
        opened: undefined,
      })
    }
    expect(world.logs.every(to => to === 'debug')).toBe(true)
  })

  test('finds the PR by the upstream branch name, so branch 123 is not PR #123', async ($, on) => {
    const { world, repo, clock } = setUp(on)
    repo.branch = '123'
    repo.upstream = 'origin/123'
    repo.prList = []
    await start($, clock)

    expect((await band($)).pr).toBeUndefined()
    expect(world.calls).toContain(
      'gh pr list -R acme/widgets --head 123 --state open --json number,url,isCrossRepository --limit 30',
    )
    expect(world.calls.some(line => line.startsWith('gh pr view'))).toBe(false)
  })

  test("on main, forks' PRs from their own main are not this branch's PR", async ($, on) => {
    const { repo, clock } = setUp(on)
    repo.branch = 'main'
    repo.upstream = 'origin/main'
    repo.prList = VSCODE_PR_LIST_MAIN
    await start($, clock)

    expect((await band($)).pr).toBeUndefined()
    expect((await band($)).ci).toBeDefined()
  })

  test('follows pending, then passing, then failing, through the clock alone', async ($, on) => {
    const { repo, clock } = setUp(on)
    const lint = (status: string, conclusion: string | null) => ({
      total_count: 1,
      check_runs: [{ name: 'lint', status, conclusion }],
    })
    repo.runs[SHA] = lint('in_progress', null)
    await start($, clock)
    expect((await band($)).ci).toBe('CI ● running 0/1')

    repo.runs[SHA] = lint('completed', 'success')
    await clock.advance(30_000)
    expect((await band($)).ci).toBe('CI ✓ 1/1')

    // A re-run started on GitHub after it passed: the settle poll sees it.
    repo.runs[SHA] = lint('completed', 'failure')
    await clock.advance(180_000)
    expect((await band($)).ci).toBe('CI ✗ 1 failing · lint')
  })

  test('the settle poll ends 15 minutes after the last change', async ($, on) => {
    const { world, repo, clock } = setUp(on)
    repo.runs[SHA] = CCONAMI_MAIN_CHECK_RUNS
    await start($, clock)
    expect((await band($)).ci).toBe('CI ✓ 1/1')

    await clock.advance(16 * 60_000)
    const settled = world.calls.length
    await clock.advance(60 * 60_000)
    expect(world.calls.length).toBe(settled)
  })

  test('while the commit is not on GitHub yet, a slow poll goes on', async ($, on) => {
    const { world, repo, clock } = setUp(on)
    delete repo.runs[SHA]
    delete repo.statuses[SHA]
    await start($, clock)
    expect(await band($)).toEqual(NOTHING)

    await clock.advance(30 * 60_000)
    const before = world.calls.length
    // A push from another terminal: the checks appear without any hook firing.
    repo.runs[SHA] = CCONAMI_MAIN_CHECK_RUNS
    repo.statuses[SHA] = CCONAMI_MAIN_STATUS
    await clock.advance(180_000)
    expect(world.calls.length).toBeGreaterThan(before)
    expect((await band($)).ci).toBe('CI ✓ 1/1')
  })

  test('a repository with no CI stops polling once the settle window ends', async ($, on) => {
    const { world, repo, clock } = setUp(on)
    repo.runs[SHA] = K8S_CHECK_RUNS
    await start($, clock)
    expect(await band($)).toEqual(NOTHING)

    await clock.advance(16 * 60_000)
    const settled = world.calls.length
    await clock.advance(60 * 60_000)
    expect(world.calls.length).toBe(settled)
  })

  test('while gh fails, it reads only every 10 minutes', async ($, on) => {
    const { world, repo, clock } = setUp(on)
    repo.first = line => (line.startsWith('gh ') ? OFFLINE : undefined)
    await start($, clock)
    const after = world.calls.length

    await clock.advance(9 * 60_000)
    expect(world.calls.length).toBe(after)
    await clock.advance(60_000)
    expect(world.calls.length).toBeGreaterThan(after)
  })

  test('the fast poll skips opened PRs that are not pending', async ($, on) => {
    const { world, repo, clock } = setUp(on)
    world.toolText = `${OPENED_URL}\n`
    repo.runs[PR_SHA] = CCONAMI_MAIN_CHECK_RUNS
    repo.statuses[PR_SHA] = CCONAMI_MAIN_STATUS
    repo.runs[SHA] = { total_count: 1, check_runs: [{ name: 'lint', status: 'queued', conclusion: null }] }
    await start($, clock)
    await $.tool.call({ tool: 'Bash', command: 'gh pr create' })
    await clock.advance(TICK)
    expect((await band($)).opened).toBe('· opened #42 ✓ 1/1')

    const views = () => world.calls.filter(line => line.startsWith(`gh pr view ${OPENED_URL}`)).length
    const before = views()
    const headReads = world.calls.length
    // Past the push's grace period, HEAD is still pending: 30 s polls run.
    await clock.advance(150_000)
    expect(world.calls.length).toBeGreaterThan(headReads)
    expect(views()).toBe(before)
    // The settle read, 3 minutes after the last, reads it again.
    await clock.advance(60_000)
    expect(views()).toBeGreaterThan(before)
  })

  test('an opened PR that failed 3 reads is no longer read on a timer', async ($, on) => {
    const { world, repo, clock } = setUp(on)
    world.toolText = `${OPENED_URL}\n`
    repo.first = line => (line.startsWith(`gh pr view ${OPENED_URL}`) ? done('', 1, 'HTTP 502') : undefined)
    repo.runs[SHA] = { total_count: 1, check_runs: [{ name: 'lint', status: 'queued', conclusion: null }] }
    await start($, clock)
    await $.tool.call({ tool: 'Bash', command: 'gh pr create' })
    await clock.advance(10 * 60_000)

    const views = () => world.calls.filter(line => line.startsWith(`gh pr view ${OPENED_URL}`)).length
    expect(views()).toBe(3)
    await clock.advance(30 * 60_000)
    expect(views()).toBe(3)
  })

  test(
    'a slow idle poll reads while nothing is pending, when configured',
    { options: { idlePollMinutes: 30 } },
    async ($, on) => {
      const { world, repo, clock } = setUp(on)
      repo.runs[SHA] = CCONAMI_MAIN_CHECK_RUNS
      await start($, clock)
      await clock.advance(16 * 60_000)
      const before = world.calls.length
      await clock.advance(30 * 60_000)
      expect(world.calls.length).toBeGreaterThan(before)
    },
  )

  test('a merged PR clears on the settle poll', async ($, on) => {
    const { repo, clock } = setUp(on)
    await start($, clock)
    expect((await band($)).pr).toBe('PR #7')

    repo.prList = []
    await clock.advance(180_000)
    expect((await band($)).pr).toBeUndefined()
  })

  test('a branch switch to the same commit reads again when the turn ends', async ($, on) => {
    const { repo, clock } = setUp(on)
    repo.runs[SHA] = CCONAMI_MAIN_CHECK_RUNS
    await start($, clock)
    await clock.advance(16 * 60_000)
    expect((await band($)).pr).toBe('PR #7')

    repo.branch = 'other'
    repo.upstream = 'origin/other'
    repo.prList = []
    await $.turn.complete({ answer: '', durationMs: 1, isAborted: false, turnId: 't', reason: 'answer' })
    await clock.advance(TICK)
    expect(await band($)).toEqual({ ci: 'CI ✓ 1/1', pr: undefined, opened: undefined })
  })

  test('reads every page of statuses when there are more than 100', async ($, on) => {
    const { world, repo, clock } = setUp(on)
    repo.runs[SHA] = K8S_CHECK_RUNS
    repo.statuses[SHA] = { ...K8S_STATUS, total_count: 101, statuses: K8S_STATUS.statuses.slice(0, 1) }
    const rows = [...K8S_STATUS.statuses, { context: 'late', state: 'failure' }]
    repo.first = line =>
      line.startsWith('gh api --paginate --jq .statuses[] ')
        ? done(rows.map(row => JSON.stringify(row)).join('\n'))
        : undefined
    await start($, clock)

    expect(world.calls).toContain(
      `gh api --paginate --jq .statuses[] repos/acme/widgets/commits/${SHA}/status?per_page=100`,
    )
    expect((await band($)).ci).toBe('CI ✗ 1 failing · late')
  })

  test('lists a PR the session opened, with its checks', async ($, on) => {
    const { world, clock } = setUp(on)
    world.toolText = `Creating pull request\n\n${OPENED_URL}\n`
    await start($, clock)
    await $.tool.call({ tool: 'Bash', command: 'gh pr create --base main --head feature' })
    await clock.advance(TICK)

    expect((await band($)).opened).toBe('· opened #42 ● 12/13')
  })

  test('offline: the opened PRs hide with the head, never left stale', async ($, on) => {
    const { world, repo, clock } = setUp(on)
    world.toolText = `${OPENED_URL}\n`
    await start($, clock)
    await $.tool.call({ tool: 'Bash', command: 'gh pr create' })
    await clock.advance(TICK)
    expect((await band($)).opened).toBe('· opened #42 ● 12/13')

    repo.first = line => (line.startsWith('gh ') ? OFFLINE : undefined)
    await clock.advance(30_000)
    expect(await band($)).toEqual(NOTHING)
  })

  test('an opened PR whose read fails is hidden', async ($, on) => {
    const { world, repo, clock } = setUp(on)
    world.toolText = `${OPENED_URL}\n`
    repo.first = line => (line.startsWith(`gh pr view ${OPENED_URL}`) ? OFFLINE : undefined)
    await start($, clock)
    await $.tool.call({ tool: 'Bash', command: 'gh pr create' })
    await clock.advance(TICK)

    const shown = await band($)
    expect(shown.opened).toBeUndefined()
    expect(shown.ci).toBeDefined()
  })

  // Each case the ticket lists as "hidden, never an error", and a status call
  // that fails, which must not read as "no statuses".
  const HIDDEN: Record<string, (repo: Repo) => void> = {
    'outside a git repository': repo => {
      repo.first = line => (line.startsWith('git ') ? done('', 128) : undefined)
    },
    'no GitHub remote': repo => {
      repo.remoteUrl = 'git@gitlab.com:acme/widgets.git'
    },
    'gh not authenticated, or offline': repo => {
      repo.first = line => (line.startsWith('gh ') ? done('', 4, 'gh auth login') : undefined)
    },
    'no checks': repo => {
      repo.runs[SHA] = K8S_CHECK_RUNS
    },
    'the commit is not on GitHub': repo => {
      repo.upstream = ''
      delete repo.runs[SHA]
    },
    'the status call fails': repo => {
      repo.runs[SHA] = CCONAMI_MAIN_CHECK_RUNS
      repo.first = line => (line.includes('/status?') ? OFFLINE : undefined)
    },
    'gh missing, so the command cannot start': repo => {
      repo.first = line => {
        if (line.startsWith('gh ')) throw new Error('gh: not found')
        return undefined
      }
    },
  }
  for (const [name, arrange] of Object.entries(HIDDEN)) {
    test(`hidden: ${name}`, async ($, on) => {
      const { world, repo, clock } = setUp(on)
      arrange(repo)
      await start($, clock)

      expect(await band($)).toEqual(NOTHING)
      // It did look, and said so only in the debug log.
      expect(world.calls.length).toBeGreaterThan(0)
      expect(world.logs.length).toBeGreaterThan(0)
      expect(world.logs.every(to => to === 'debug')).toBe(true)
    })
  }
})

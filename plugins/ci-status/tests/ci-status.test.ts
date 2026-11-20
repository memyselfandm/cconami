import { describe, expect, mock, test } from 'claude-code/testing'
import type { Engine, MockClock } from 'claude-code/testing'
import type { On, ProcessRunResult } from 'claude-code'

import {
  ciText,
  fromRest,
  fromRollup,
  isPrCreate,
  isPush,
  parseRemote,
  prUrls,
  shortText,
  summarize,
  upstreamRemote,
} from '../hooks/logic'
import {
  CCONAMI_MAIN_CHECK_RUNS,
  CCONAMI_MAIN_STATUS,
  CCONAMI_PR_11,
  K8S_CHECK_RUNS,
  K8S_PR,
  K8S_STATUS,
  VSCODE_PR,
} from './fixtures'

describe('parsing gh output', () => {
  test('a passing PR rollup', () => {
    const summary = summarize(fromRollup(CCONAMI_PR_11.statusCheckRollup))
    expect(summary).toEqual({ state: 'pass', total: 1, passed: 1, done: 1, failing: [] })
    expect(ciText(summary!, 3)).toBe('CI ✓ 1/1')
  })

  test('a rollup with failures, skips and a running check fails and names the failures', () => {
    const summary = summarize(fromRollup(VSCODE_PR.statusCheckRollup))!
    expect(summary.state).toBe('fail')
    expect(summary.total).toBe(38)
    expect(summary.done).toBe(37)
    expect(ciText(summary, 3)).toBe(
      'CI ✗ 3 failing · Linux / Electron-Unit (electron), Linux / Browser-Unit, PR Gate',
    )
    expect(ciText(summary, 1)).toBe('CI ✗ 3 failing · Linux / Electron-Unit (electron) +2')
    expect(ciText(summary, 0)).toBe('CI ✗ 3 failing')
  })

  test('a rollup of commit statuses with one pending is running', () => {
    const summary = summarize(fromRollup(K8S_PR.statusCheckRollup))!
    expect(ciText(summary, 3)).toBe('CI ● running 12/13')
  })

  test('the REST check runs and statuses give the same answers', () => {
    const passing = summarize(fromRest(CCONAMI_MAIN_CHECK_RUNS, CCONAMI_MAIN_STATUS))!
    expect(ciText(passing, 3)).toBe('CI ✓ 1/1')
    const running = summarize(fromRest(K8S_CHECK_RUNS, K8S_STATUS))!
    expect(ciText(running, 3)).toBe('CI ● running 12/13')
  })

  test('no checks and no statuses is no summary: the band hides', () => {
    expect(summarize(fromRest(K8S_CHECK_RUNS, CCONAMI_MAIN_STATUS))).toBeNull()
    expect(summarize(fromRollup([]))).toBeNull()
    expect(summarize(fromRest(null, null))).toBeNull()
  })

  test('the short mark for an opened PR', () => {
    expect(shortText(summarize(fromRollup(K8S_PR.statusCheckRollup)), 'OPEN')).toBe('● 12/13')
    expect(shortText(summarize(fromRollup(VSCODE_PR.statusCheckRollup)), 'OPEN')).toBe(
      '✗ 3 failing',
    )
    expect(shortText(null, 'MERGED')).toBe('merged')
    expect(shortText(null, 'OPEN')).toBe('no checks')
  })
})

describe('reading git and commands', () => {
  test('GitHub remotes in each form, and others refused', () => {
    const repo = { owner: 'acme', name: 'widgets' }
    expect(parseRemote('git@github.com:acme/widgets.git')).toEqual(repo)
    expect(parseRemote('https://github.com/acme/widgets.git\n')).toEqual(repo)
    expect(parseRemote('https://github.com/acme/widgets')).toEqual(repo)
    expect(parseRemote('ssh://git@github.com/acme/widgets.git')).toEqual(repo)
    expect(parseRemote('https://user@github.com/acme/widgets/')).toEqual(repo)
    expect(parseRemote('git@gitlab.com:acme/widgets.git')).toBeNull()
    expect(parseRemote('https://github.com.evil.example/acme/widgets')).toBeNull()
    expect(parseRemote('')).toBeNull()
  })

  test('the upstream remote', () => {
    expect(upstreamRemote('origin/main\n')).toBe('origin')
    expect(upstreamRemote('fork/feature/x')).toBe('fork')
    expect(upstreamRemote('')).toBeNull()
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
})

const SHA = 'e9a762342e36d12d728a8d25f2b8c4ffcdd10a80'
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

function done(stdout: string, exitCode = 0): ProcessRunResult {
  return { exitCode, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false }
}

/** A repository on `feature`, pushed to acme/widgets, with VSCODE_PR open at HEAD. */
function repo(line: string, overrides: Record<string, ProcessRunResult> = {}): ProcessRunResult {
  const found = Object.entries(overrides).find(([prefix]) => line.startsWith(prefix))
  if (found !== undefined) {
    return found[1]
  }
  if (line === 'git rev-parse HEAD') return done(`${SHA}\n`)
  if (line === 'git rev-parse --abbrev-ref HEAD') return done('feature\n')
  if (line.startsWith('git rev-parse --abbrev-ref --symbolic-full-name')) return done('origin/feature\n')
  if (line === 'git remote get-url origin') return done('git@github.com:acme/widgets.git\n')
  if (line.startsWith('gh pr view feature -R acme/widgets')) return done(JSON.stringify(VSCODE_PR))
  if (line.startsWith('gh pr view https://github.com/acme/widgets/pull/42')) {
    return done(JSON.stringify(K8S_PR))
  }

  return done('', 1)
}

type World = {
  /** Run once per `$.process.run`, its argv joined by spaces. */
  answer: (line: string) => ProcessRunResult
  calls: string[]
  /** The `to` of each `$.ui.log` line: the mod must only ever write `debug`. */
  logs: string[]
  /** What a Bash call's result reads as. */
  toolText: string
}

/**
 * Stands in for the engine: a mocked clock, the session's directory, and
 * every `git` and `gh` call answered by `world.answer`.
 */
function setUp(on: On, overrides: Record<string, ProcessRunResult> = {}) {
  // A test registers every hook before its first call on `$`.
  const world: World = {
    answer: line => repo(line, overrides),
    calls: [],
    logs: [],
    toolText: '',
  }
  const clock = mock.clock(on, { now: 1_000_000 })
  on('session.cwd', () => ({ value: '/repo' }))
  on('ui.log', (_, e) => {
    world.logs.push(e.to ?? 'transcript')
    return { value: undefined }
  })
  on('process.run', (_, e) => {
    const line = e.argv.join(' ')
    world.calls.push(line)
    return { value: world.answer(line) }
  })
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('tool.call', () => ({ result: {}, text: world.toolText }))
  on('turn.complete', () => ({ text: '' }))

  return { world, clock }
}

async function start($: Engine, clock: MockClock) {
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
  await clock.settle()
}

async function band($: Engine) {
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  const ci = (await ui.find({ type: 'Text', text: /^CI / }))?.text
  const pr = (await ui.find({ type: 'Text', text: /^PR / }))?.text
  const opened = (await ui.find({ type: 'Text', text: /opened/ }))?.text
  await ui.unmount()

  return { ci, pr, opened }
}

describe('the band', () => {
  test('shows the failing checks and the PR number, on each surface', async ($, on) => {
    const { world, clock } = setUp(on)
    await start($, clock)

    for (const surface of ['terminal', 'desktop'] as const) {
      const ui = await $.ui.mount({ ...BAND, surface })
      expect((await ui.find({ type: 'Text', text: /^CI / }))?.text).toBe(
        'CI ✗ 3 failing · Linux / Electron-Unit (electron), Linux / Browser-Unit, PR Gate',
      )
      expect((await ui.find({ type: 'Text', text: /^PR / }))?.text).toBe('PR #349369')
      await ui.unmount()
    }
    expect(world.logs.every(to => to === 'debug')).toBe(true)
  })

  test('falls back to the commit API when the branch has no PR', async ($, on) => {
    const { clock } = setUp(on, {
      'gh pr view': done('', 1),
      [`gh api repos/acme/widgets/commits/${SHA}/check-runs`]: done(JSON.stringify(K8S_CHECK_RUNS)),
      [`gh api repos/acme/widgets/commits/${SHA}/status`]: done(JSON.stringify(K8S_STATUS)),
    })
    await start($, clock)

    expect(await band($)).toEqual({ ci: 'CI ● running 12/13', pr: undefined, opened: undefined })
  })

  test('follows pending, then passing, then failing, within one poll each', async ($, on) => {
    const { world, clock } = setUp(on)
    const rollup = (checks: unknown[]) =>
      done(JSON.stringify({ ...VSCODE_PR, headRefOid: SHA, statusCheckRollup: checks }))
    const run = (status: string, conclusion: string) => ({
      __typename: 'CheckRun',
      name: 'lint',
      status,
      conclusion,
    })
    let next = rollup([run('IN_PROGRESS', '')])
    world.answer = line => (line.startsWith('gh pr view') ? next : repo(line))

    await start($, clock)
    expect((await band($)).ci).toBe('CI ● running 0/1')

    next = rollup([run('COMPLETED', 'SUCCESS')])
    await clock.advance(30_000)
    expect((await band($)).ci).toBe('CI ✓ 1/1')

    // Nothing is pending now, so the default reads nothing more on a timer.
    next = rollup([run('COMPLETED', 'FAILURE')])
    const before = world.calls.length
    await clock.advance(10 * 60_000)
    expect(world.calls.length).toBe(before)
    expect((await band($)).ci).toBe('CI ✓ 1/1')

    // A push reads again, and so does every poll in the grace period after it.
    await $.tool.call({ tool: 'Bash', command: 'git push origin HEAD:refs/heads/feature' })
    await clock.settle()
    expect((await band($)).ci).toBe('CI ✗ 1 failing · lint')
  })

  test(
    'a slow poll reads while nothing is pending, when configured',
    { options: { idlePollMinutes: 5 } },
    async ($, on) => {
      const { world, clock } = setUp(on, {
        'gh pr view': done(JSON.stringify({ ...CCONAMI_PR_11, state: 'OPEN', headRefOid: SHA })),
      })
      await start($, clock)
      expect((await band($)).ci).toBe('CI ✓ 1/1')
      const before = world.calls.length
      await clock.advance(5 * 60_000)
      expect(world.calls.length).toBeGreaterThan(before)
    },
  )

  test('a moved HEAD reads again when the turn ends', async ($, on) => {
    const { world, clock } = setUp(on, {
      'gh pr view': done('', 1),
      [`gh api repos/acme/widgets/commits/${SHA}/check-runs`]: done(JSON.stringify(K8S_CHECK_RUNS)),
      [`gh api repos/acme/widgets/commits/${SHA}/status`]: done(JSON.stringify(K8S_STATUS)),
    })
    await start($, clock)
    expect((await band($)).ci).toBe('CI ● running 12/13')

    world.answer = line =>
      line === 'git rev-parse HEAD' ? done('0000000000000000000000000000000000000000\n') : done('', 1)
    await $.turn.complete({
      answer: '',
      durationMs: 1,
      isAborted: false,
      turnId: 't1',
      reason: 'answer',
    })
    await clock.settle()
    expect((await band($)).ci).toBeUndefined()
  })

  // Each case the ticket lists as "hidden, never an error".
  const HIDDEN: Record<string, Record<string, ProcessRunResult>> = {
    'outside a git repository': { 'git ': done('', 128) },
    'no GitHub remote': { 'git remote get-url': done('git@gitlab.com:acme/widgets.git\n') },
    'gh not authenticated, or offline': { gh: done('', 4) },
    'no checks': {
      'gh pr view': done('', 1),
      [`gh api repos/acme/widgets/commits/${SHA}/check-runs`]: done(JSON.stringify(K8S_CHECK_RUNS)),
      [`gh api repos/acme/widgets/commits/${SHA}/status`]: done(JSON.stringify(CCONAMI_MAIN_STATUS)),
    },
    'the commit is not on GitHub': { 'gh pr view': done('', 1), 'gh api': done('', 1) },
  }
  for (const [name, overrides] of Object.entries(HIDDEN)) {
    test(`hidden: ${name}`, async ($, on) => {
      const { world, clock } = setUp(on, overrides)
      await start($, clock)

      expect(await band($)).toEqual({ ci: undefined, pr: undefined, opened: undefined })
      // It did look, and said so only in the debug log.
      expect(world.calls.length).toBeGreaterThan(0)
      expect(world.logs.length).toBeGreaterThan(0)
      expect(world.logs.every(to => to === 'debug')).toBe(true)
    })
  }

  test('hidden: gh missing, so the command cannot start', async ($, on) => {
    const { world, clock } = setUp(on)
    world.answer = line => {
      if (line.startsWith('gh ')) {
        throw new Error('gh: not found')
      }
      return repo(line)
    }
    await start($, clock)

    expect(await band($)).toEqual({ ci: undefined, pr: undefined, opened: undefined })
    expect(world.logs.every(to => to === 'debug')).toBe(true)
  })

  test('lists a PR the session opened, with its checks', async ($, on) => {
    const { world, clock } = setUp(on)
    world.toolText = 'Creating pull request\n\nhttps://github.com/acme/widgets/pull/42\n'
    await start($, clock)
    await $.tool.call({ tool: 'Bash', command: 'gh pr create --base main --head feature' })
    await clock.settle()

    expect((await band($)).opened).toBe('· opened #42 ● 12/13')
  })
})

import type { On } from 'claude-code'
import { describe, expect, mock, test } from 'claude-code/testing'
import type { Engine, MockClock } from 'claude-code/testing'

import {
  age,
  bandText,
  belongsTo,
  DEFAULT_REINFORCEMENT_LIMIT,
  DEFAULT_STALE_HOURS,
  isSafeSessionId,
  judge,
  markerCandidates,
  markerId,
  numberOf,
  omcRoot,
  parseState,
  projectIdentifier,
  sha16,
  statePaths,
  thresholds,
  touchesOmcState,
} from '../hooks/logic'
import type { ModeState } from '../hooks/logic'
import { REFRESH_MS } from '../hooks/register'
import { autopilot, autopilotDone, OTHER_SID, ralph, SID, team } from './fixtures'

const HOUR = 60 * 60 * 1000
const NOW = Date.parse('2026-11-20T12:00:00.000Z')
const LIMITS = thresholds({})

function state(text: string): ModeState {
  const parsed = parseState(text)
  if (parsed === null) {
    throw new Error('fixture did not parse')
  }

  return parsed
}

// The pure logic.

describe('settings', () => {
  test('defaults are OMC’s two hours and five reinforcements', () => {
    expect(DEFAULT_STALE_HOURS).toBe(2)
    expect(DEFAULT_REINFORCEMENT_LIMIT).toBe(5)
    expect(thresholds({})).toEqual({ staleMs: 2 * HOUR, reinforcementLimit: 5 })
  })

  test('a set value is used; zero, negative or unreadable takes the default', () => {
    expect(thresholds({ staleHours: 6, reinforcementLimit: 9 })).toEqual({ staleMs: 6 * HOUR, reinforcementLimit: 9 })
    expect(thresholds({ staleHours: 0.5 })).toEqual({ staleMs: HOUR / 2, reinforcementLimit: 5 })
    for (const bad of [0, -1, 'lots', null, NaN, Infinity, {}]) {
      expect(thresholds({ staleHours: bad, reinforcementLimit: bad })).toEqual(LIMITS)
    }
  })

  test('numbers may be stored as strings', () => {
    expect(numberOf(3)).toBe(3)
    expect(numberOf('3')).toBe(3)
    expect(numberOf(' 7 ')).toBe(7)
    for (const bad of ['', '  ', 'three', null, undefined, true, NaN, {}]) {
      expect(numberOf(bad)).toBeNull()
    }
  })

  test('a session id is used in a path only when OMC would accept it', () => {
    expect(isSafeSessionId(SID)).toBe(true)
    for (const bad of ['', '../x', 'a/b', 'a\\b', 'a b', 'x'.repeat(257)]) {
      expect(isSafeSessionId(bad)).toBe(false)
    }
  })
})

describe('the state root', () => {
  test('marker candidates run from the start upwards and stop before home', () => {
    expect(markerCandidates('/home/me/work/repo/sub', '/home/me')).toEqual([
      '/home/me/work/repo/sub',
      '/home/me/work/repo',
      '/home/me/work',
    ])
    expect(markerCandidates('/srv/a/', '/home/me')).toEqual(['/srv/a', '/srv', '/'])
    expect(markerCandidates('/home/me', '/home/me')).toEqual([])
    expect(markerCandidates('/x', null)).toEqual(['/x', '/'])
  })

  test('a marker names an id only when it holds a non-empty string id', () => {
    expect(markerId('{ "id": " my-org " }')).toBe('my-org')
    for (const none of ['', '{}', '{"id": ""}', '{"id": 3}', '[1]', 'not json', 'null']) {
      expect(markerId(none)).toBeNull()
    }
  })

  test('sha16 is the first 16 hex digits of SHA-256 (checked against shasum)', async () => {
    expect(await sha16('git@github.com:acme/widgets.git')).toBe('44d052bc011d3b94')
    expect(await sha16('/repo/main')).toBe('14171f47651e1020')
  })

  test('project identifiers follow getProjectIdentifier', async () => {
    const base = { root: '/repo/main', workspace: null, workspaceId: null, remoteUrl: '', commonDir: '' }
    // The remote URL is hashed; the name is the primary checkout's.
    expect(
      await projectIdentifier({ ...base, remoteUrl: 'git@github.com:acme/widgets.git', commonDir: '/repo/main/.git' }),
    ).toBe('main-44d052bc011d3b94')
    // A linked worktree resolves to its primary checkout, so it shares the id.
    expect(await projectIdentifier({ ...base, root: '/repo/wt', commonDir: '/repo/main/.git' })).toBe(
      'main-14171f47651e1020',
    )
    // No remote and no common dir: the root itself.
    expect(await projectIdentifier(base)).toBe('main-14171f47651e1020')
    // A submodule's common dir is not used.
    expect(await projectIdentifier({ ...base, commonDir: '/super/.git/modules/main' })).toBe('main-14171f47651e1020')
    // A workspace marker wins, by its id or else by its path.
    expect(await projectIdentifier({ ...base, workspace: '/work/space', workspaceId: 'my-org' })).toBe(
      'my-org-c6f029eb68756a03',
    )
    expect(await projectIdentifier({ ...base, workspace: '/work/space', remoteUrl: 'x' })).toBe(
      'space-670ff979f4d8c331',
    )
  })

  test('the root follows getOmcRoot’s order', () => {
    const facts = { stateDir: null, cwd: '/repo/main/sub', home: '/home/me', gitTop: '/repo/main', workspace: null, projectId: null }
    expect(omcRoot(facts)).toBe('/repo/main/.omc')
    expect(omcRoot({ ...facts, workspace: '/repo' })).toBe('/repo/.omc')
    expect(omcRoot({ ...facts, gitTop: null })).toBe('/home/me/.omc')
    expect(omcRoot({ ...facts, gitTop: null, home: null })).toBeNull()
    expect(omcRoot({ ...facts, stateDir: '/state', projectId: 'main-abc' })).toBe('/state/main-abc')
    expect(omcRoot({ ...facts, stateDir: '/state', workspace: '/repo', projectId: 'ws-1' })).toBe('/state/ws-1')
    expect(omcRoot({ ...facts, stateDir: '/state', gitTop: null })).toBe('/state/non-git')
    expect(omcRoot({ ...facts, stateDir: '/state' })).toBeNull()
  })

  test('the session file comes first, the legacy flat file second', () => {
    expect(statePaths('/repo/.omc', SID, 'ralph')).toEqual({
      session: `/repo/.omc/state/sessions/${SID}/ralph-state.json`,
      legacy: '/repo/.omc/state/ralph-state.json',
    })
  })
})

describe('reading a state file', () => {
  test('the real autopilot shape: phase, counters and the latest activity time', () => {
    const s = state(autopilot(NOW - HOUR))
    expect(s).toEqual({
      isActive: true,
      sessionId: SID,
      phase: 'execution',
      iteration: null,
      maxIterations: null,
      reinforcement: 4,
      activityMs: NOW - HOUR,
    })
  })

  test('the real team shape: string counts and only _meta.updatedAt', () => {
    const s = state(team(NOW - 3 * HOUR))
    expect(s.phase).toBe('team-exec')
    expect(s.activityMs).toBe(NOW - 3 * HOUR)
    expect(s.sessionId).toBeNull()
  })

  test('the phase is current_phase, else phase, else stage', () => {
    expect(state('{"current_phase":"a","phase":"b","stage":"c"}').phase).toBe('a')
    expect(state('{"phase":"b","stage":"c"}').phase).toBe('b')
    expect(state('{"stage":"c"}').phase).toBe('c')
    expect(state('{"current_phase":"  "}').phase).toBeNull()
    expect(state('{}').phase).toBeNull()
  })

  test('the activity time is the latest of the timestamps; none is null', () => {
    const at = (ms: number) => JSON.stringify(new Date(ms).toISOString())
    expect(state(`{"started_at":${at(NOW - 5 * HOUR)},"updated_at":${at(NOW - HOUR)},"last_checked_at":${at(NOW - 3 * HOUR)}}`).activityMs).toBe(
      NOW - HOUR,
    )
    expect(state('{"last_checked_at":"garbage"}').activityMs).toBeNull()
    expect(state('{}').activityMs).toBeNull()
  })

  test('only active: true is active', () => {
    expect(state('{"active":true}').isActive).toBe(true)
    for (const v of ['"true"', '1', 'false', 'null']) {
      expect(state(`{"active":${v}}`).isActive).toBe(false)
    }
  })

  test('anything but a JSON object is not a state', () => {
    for (const bad of ['', 'nope', '[]', 'null', '3', '"x"']) {
      expect(parseState(bad)).toBeNull()
    }
  })

  test('a session file is ours unless it names another session; a legacy file only when it names ours', () => {
    const mine = state(ralph(NOW))
    const theirs = state(ralph(NOW, { session_id: OTHER_SID }))
    const unnamed = state(team(NOW))
    expect(belongsTo(mine, SID, false)).toBe(true)
    expect(belongsTo(unnamed, SID, false)).toBe(true)
    expect(belongsTo(theirs, SID, false)).toBe(false)
    expect(belongsTo(mine, SID, true)).toBe(true)
    expect(belongsTo(unnamed, SID, true)).toBe(false)
    expect(belongsTo(theirs, SID, true)).toBe(false)
  })
})

describe('judging', () => {
  test('an active autopilot untouched for 3h is stale, with its phase', () => {
    const finding = judge('autopilot', state(autopilot(NOW - 3 * HOUR)), NOW, LIMITS)
    expect(finding).toEqual({ mode: 'autopilot', phase: 'execution', kind: 'stale', ageMs: 3 * HOUR })
    expect(finding && bandText(finding)).toBe('autopilot active but stale for 3h; cancel or resume (phase: execution)')
  })

  test('a ralph reinforced 7 times at iteration 9 of 10 is looping', () => {
    const finding = judge('ralph', state(ralph(NOW, { iteration: 9, max_iterations: 10, reinforcement_count: 7 })), NOW, LIMITS)
    expect(finding && bandText(finding)).toBe('ralph looping: reinforcement 7, iteration 9/10')
  })

  test('reaching the iteration cap alone is looping', () => {
    const finding = judge('ralph', state(ralph(NOW, { iteration: 100 })), NOW, LIMITS)
    expect(finding && bandText(finding)).toBe('ralph looping: iteration 100/100')
  })

  test('the reinforcement limit alone is looping, and the phase is named', () => {
    const finding = judge('autopilot', state(autopilot(NOW, { reinforcement_count: 5 })), NOW, LIMITS)
    expect(finding && bandText(finding)).toBe('autopilot looping: reinforcement 5 (phase: execution)')
  })

  test('a healthy run, an inactive run, and the boundaries produce nothing', () => {
    expect(judge('autopilot', state(autopilot(NOW - HOUR)), NOW, LIMITS)).toBeNull()
    expect(judge('ralph', state(ralph(NOW)), NOW, LIMITS)).toBeNull()
    expect(judge('team', state(team(NOW - HOUR)), NOW, LIMITS)).toBeNull()
    expect(judge('autopilot', state(autopilotDone(NOW - 30 * HOUR)), NOW, LIMITS)).toBeNull()
    // Exactly the threshold is not yet stale (OMC: age > threshold).
    expect(judge('autopilot', state(autopilot(NOW - 2 * HOUR)), NOW, LIMITS)).toBeNull()
    expect(judge('autopilot', state(autopilot(NOW, { reinforcement_count: 4 })), NOW, LIMITS)).toBeNull()
    expect(judge('ralph', state(ralph(NOW, { iteration: 99 })), NOW, LIMITS)).toBeNull()
    expect(judge('ralph', state(ralph(NOW, { max_iterations: 0, iteration: 3 })), NOW, LIMITS)).toBeNull()
  })

  test('a dead run is reported as stale even when its counters are high', () => {
    const finding = judge('ralph', state(ralph(NOW - 4 * HOUR, { reinforcement_count: 9, iteration: 100 })), NOW, LIMITS)
    expect(finding?.kind).toBe('stale')
  })

  test('an active state with no activity time is stale', () => {
    const finding = judge('team', state('{"active":true,"stage":"exec"}'), NOW, LIMITS)
    expect(finding && bandText(finding)).toBe(
      'team active with no activity time recorded; cancel or resume (phase: exec)',
    )
  })

  test('the thresholds come from the settings', () => {
    const limits = thresholds({ staleHours: 5, reinforcementLimit: 10 })
    expect(judge('autopilot', state(autopilot(NOW - 3 * HOUR)), NOW, limits)).toBeNull()
    expect(judge('autopilot', state(autopilot(NOW, { reinforcement_count: 9 })), NOW, limits)).toBeNull()
    expect(judge('autopilot', state(autopilot(NOW - 6 * HOUR)), NOW, limits)?.kind).toBe('stale')
  })

  test('ages are rounded down to minutes, hours or days', () => {
    expect(age(0)).toBe('0m')
    expect(age(59 * 60_000 + 59_999)).toBe('59m')
    expect(age(HOUR)).toBe('1h')
    expect(age(3 * HOUR + 59 * 60_000)).toBe('3h')
    expect(age(47 * HOUR)).toBe('47h')
    expect(age(48 * HOUR)).toBe('2d')
    expect(age(-5)).toBe('0m')
  })
})

describe('which tool calls start a read', () => {
  test('OMC’s state and cancel tools, OMC mode skills, and anything naming .omc/state', () => {
    expect(touchesOmcState('mcp__plugin_oh-my-claudecode_t__state_write', { mode: 'ralph' })).toBe(true)
    expect(touchesOmcState('mcp__plugin_oh-my-claudecode_t__state_clear', {})).toBe(true)
    expect(touchesOmcState('Skill', { skill: 'oh-my-claudecode:cancel' })).toBe(true)
    expect(touchesOmcState('Skill', { skill: 'oh-my-claudecode:autopilot' })).toBe(true)
    expect(touchesOmcState('Bash', { command: 'cat .omc/state/sessions/x/ralph-state.json' })).toBe(true)
  })

  test('other calls do not, including OMC tools that do not touch state', () => {
    expect(touchesOmcState('Bash', { command: 'git status' })).toBe(false)
    expect(touchesOmcState('mcp__plugin_oh-my-claudecode_t__lsp_diagnostics', { file: 'a.ts' })).toBe(false)
    expect(touchesOmcState('Skill', { skill: 'oh-my-claudecode:wiki' })).toBe(false)
    // The envelope's own keys are not the input.
    expect(touchesOmcState('Read', { tool: 'Read', tool_use_id: '.omc/state', file_path: 'a.ts' })).toBe(false)
  })
})

// The mod in a session. The test's hooks stand for the engine: the session's
// id and directory, the environment, the files on disk and `git`.

const BAND = {
  plugin: 'omc-watchdog',
  surface: 'terminal',
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isCollapsed: false,
    isWorking: false,
    maxRows: 8,
    bodyColumns: 100,
    scroll: { offset: 0, bodyRows: 8 },
    view: {},
  },
} as const

const REPO = '/home/me/repo'
const ROOT = `${REPO}/.omc`
const sessionFile = (root: string, mode: string) => `${root}/state/sessions/${SID}/${mode}-state.json`

type World = {
  files: Map<string, string>
  env: Record<string, string>
  cwd: string
  git: Map<string, string>
  ran: string[][]
  writes: string[]
  clock: MockClock
}

function session(on: On, setup: Partial<Pick<World, 'env' | 'cwd'>> = {}): World {
  const world: World = {
    files: new Map(),
    env: { HOME: '/home/me', ...setup.env },
    cwd: setup.cwd ?? REPO,
    git: new Map([[`${REPO} rev-parse --show-toplevel`, REPO]]),
    ran: [],
    writes: [],
    clock: mock.clock(on, { now: NOW }),
  }
  mock.env(on, world.env)
  on('session.id', () => ({ value: SID }))
  on('session.cwd', () => ({ value: world.cwd }))
  on('fs.read', (_, e) => {
    const text = world.files.get(e.path)
    if (text === undefined) {
      return { deny: `ENOENT: ${e.path}` }
    }

    return { value: text }
  })
  on('fs.exists', (_, e) => ({ value: world.files.has(e.path) }))
  on('fs.write', (_, e) => {
    world.writes.push(e.path)

    return { value: undefined }
  })
  on('process.run', (_, e) => {
    world.ran.push([...e.argv])
    const out = world.git.get(`${e.init?.cwd ?? ''} ${e.argv.slice(1).join(' ')}`)

    return {
      value: {
        exitCode: out === undefined ? 128 : 0,
        stdout: out === undefined ? '' : `${out}\n`,
        stderr: out === undefined ? 'fatal: not a git repository' : '',
        isStdoutTruncated: false,
        isStderrTruncated: false,
      },
    }
  })
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('tool.call', () => ({ result: {}, text: 'ok' }))

  return world
}

async function start($: Engine, world: World): Promise<void> {
  await $.session.start({ cwd: world.cwd, surface: 'terminal', isInteractive: true })
  await world.clock.settle()
}

async function lines($: Engine, surface: 'terminal' | 'desktop' = 'terminal', hasSurvey = false): Promise<string[]> {
  const band = await $.ui.mount({ ...BAND, surface, props: { ...BAND.props, hasSurvey } })
  const found = (await band.findAll({ type: 'Text' })).map(t => t.text ?? '')
  await band.unmount()

  return found
}

/** Only read-only git commands ran, and nothing was written. */
function expectReadOnly(world: World): void {
  expect(world.writes).toEqual([])
  for (const argv of world.ran) {
    expect(argv[0]).toBe('git')
    expect(['rev-parse', 'remote']).toContain(argv[1])
  }
}

describe('the band', () => {
  test('a stale active autopilot shows, with mode and phase, on each surface', async ($, on) => {
    const world = session(on)
    world.files.set(sessionFile(ROOT, 'autopilot'), autopilot(NOW - 3 * HOUR))
    await start($, world)
    for (const surface of ['terminal', 'desktop'] as const) {
      expect(await lines($, surface)).toEqual(['autopilot active but stale for 3h; cancel or resume (phase: execution)'])
    }
    expectReadOnly(world)
  })

  test('a looping ralph shows', async ($, on) => {
    const world = session(on)
    world.files.set(sessionFile(ROOT, 'ralph'), ralph(NOW, { iteration: 9, max_iterations: 10, reinforcement_count: 7 }))
    await start($, world)
    expect(await lines($)).toEqual(['ralph looping: reinforcement 7, iteration 9/10'])
  })

  test('a healthy run, an ended run, or no OMC state shows nothing', async ($, on) => {
    const world = session(on)
    await start($, world)
    expect(await lines($)).toEqual([])
    world.files.set(sessionFile(ROOT, 'autopilot'), autopilot(NOW - HOUR))
    world.files.set(sessionFile(ROOT, 'team'), team(NOW - HOUR))
    world.files.set(sessionFile(ROOT, 'ultragoal'), autopilotDone(NOW - 30 * HOUR))
    await world.clock.advance(REFRESH_MS)
    expect(await lines($)).toEqual([])
    expectReadOnly(world)
  })

  test('two modes in trouble show a line each', async ($, on) => {
    const world = session(on)
    world.files.set(sessionFile(ROOT, 'ralph'), ralph(NOW, { reinforcement_count: 6 }))
    world.files.set(sessionFile(ROOT, 'team'), team(NOW - 5 * HOUR))
    await start($, world)
    expect(await lines($)).toEqual([
      'ralph looping: reinforcement 6, iteration 12/100',
      'team active but stale for 5h; cancel or resume (phase: team-exec)',
    ])
  })

  test('another session’s state is not shown; a legacy file naming this session is', async ($, on) => {
    const world = session(on)
    world.files.set(sessionFile(ROOT, 'autopilot'), autopilot(NOW - 3 * HOUR, { session_id: OTHER_SID }))
    world.files.set(`${ROOT}/state/sessions/${OTHER_SID}/ralph-state.json`, ralph(NOW - 9 * HOUR, { session_id: OTHER_SID }))
    world.files.set(`${ROOT}/state/team-state.json`, team(NOW - 9 * HOUR))
    await start($, world)
    expect(await lines($)).toEqual([])
    world.files.set(`${ROOT}/state/ralph-state.json`, ralph(NOW - 9 * HOUR))
    await world.clock.advance(REFRESH_MS)
    expect(await lines($)).toEqual(['ralph active but stale for 9h; cancel or resume'])
  })

  test('the band stays out of the way of a survey', async ($, on) => {
    const world = session(on)
    world.files.set(sessionFile(ROOT, 'autopilot'), autopilot(NOW - 3 * HOUR))
    await start($, world)
    expect(await lines($, 'terminal', true)).toEqual([])
  })

  test('a run that goes quiet turns stale at the next timed read', async ($, on) => {
    const world = session(on)
    world.files.set(sessionFile(ROOT, 'autopilot'), autopilot(NOW))
    await start($, world)
    expect(await lines($)).toEqual([])
    await world.clock.advance(2 * HOUR)
    expect(await lines($)).toEqual([])
    await world.clock.advance(REFRESH_MS)
    expect(await lines($)).toEqual(['autopilot active but stale for 2h; cancel or resume (phase: execution)'])
  })

  test('an OMC state tool call reads again at once, and its result passes through unchanged', async ($, on) => {
    const world = session(on)
    world.files.set(sessionFile(ROOT, 'ralph'), ralph(NOW))
    await start($, world)
    expect(await lines($)).toEqual([])
    world.files.set(sessionFile(ROOT, 'ralph'), ralph(NOW, { reinforcement_count: 8 }))
    // An unrelated call does not read.
    await $.tool.call({ tool: 'Bash', command: 'git status', tool_use_id: 't1' })
    await world.clock.settle()
    expect(await lines($)).toEqual([])
    const result = await $.tool.call({ tool: 'mcp__plugin_oh-my-claudecode_t__state_write', mode: 'ralph', tool_use_id: 't2' })
    expect(result.text).toBe('ok')
    await world.clock.settle()
    expect(await lines($)).toEqual(['ralph looping: reinforcement 8, iteration 12/100'])
    expectReadOnly(world)
  })

  test('the settings move the thresholds', { options: { staleHours: 4, reinforcementLimit: 3 } }, async ($, on) => {
    const world = session(on)
    world.files.set(sessionFile(ROOT, 'autopilot'), autopilot(NOW - 3 * HOUR, { reinforcement_count: 0 }))
    world.files.set(sessionFile(ROOT, 'ralph'), ralph(NOW, { reinforcement_count: 3 }))
    await start($, world)
    expect(await lines($)).toEqual(['ralph looping: reinforcement 3, iteration 12/100'])
  })
})

describe('where the state is read from', () => {
  test('from a subdirectory, the git top level’s .omc', async ($, on) => {
    const world = session(on, { cwd: `${REPO}/src/deep` })
    world.git.set(`${REPO}/src/deep rev-parse --show-toplevel`, REPO)
    world.files.set(sessionFile(ROOT, 'autopilot'), autopilot(NOW - 3 * HOUR))
    world.files.set(sessionFile(`${REPO}/src/deep/.omc`, 'ralph'), ralph(NOW - 3 * HOUR))
    await start($, world)
    expect(await lines($)).toEqual(['autopilot active but stale for 3h; cancel or resume (phase: execution)'])
  })

  test('inside a submodule, the outermost superproject’s .omc', async ($, on) => {
    const sub = `${REPO}/vendor/lib`
    const world = session(on, { cwd: sub })
    world.git.set(`${sub} rev-parse --show-toplevel`, sub)
    world.git.set(`${sub} rev-parse --show-superproject-working-tree`, REPO)
    world.files.set(sessionFile(ROOT, 'ralph'), ralph(NOW, { reinforcement_count: 5 }))
    world.files.set(sessionFile(`${sub}/.omc`, 'autopilot'), autopilot(NOW - 3 * HOUR))
    await start($, world)
    expect(await lines($)).toEqual(['ralph looping: reinforcement 5, iteration 12/100'])
  })

  test('a .omc-workspace marker above the repository anchors the state there', async ($, on) => {
    const world = session(on)
    world.files.set('/home/me/.omc-workspace', '{}')
    world.files.set(`${REPO}/../.omc-workspace`, '{}')
    world.files.set('/home/.omc-workspace', '{}')
    await start($, world)
    // A marker at home or above is never used: still the repository's .omc.
    world.files.set(sessionFile(ROOT, 'ralph'), ralph(NOW, { reinforcement_count: 5 }))
    await world.clock.advance(REFRESH_MS)
    expect(await lines($)).toEqual(['ralph looping: reinforcement 5, iteration 12/100'])
  })

  test('a workspace marker between home and the repository wins', async ($, on) => {
    const world = session(on, { cwd: '/home/me/ws/repo' })
    world.git.set('/home/me/ws/repo rev-parse --show-toplevel', '/home/me/ws/repo')
    world.files.set('/home/me/ws/.omc-workspace', '{}')
    world.files.set(sessionFile('/home/me/ws/.omc', 'team'), team(NOW - 3 * HOUR))
    world.files.set(sessionFile('/home/me/ws/repo/.omc', 'ralph'), ralph(NOW - 3 * HOUR))
    await start($, world)
    expect(await lines($)).toEqual(['team active but stale for 3h; cancel or resume (phase: team-exec)'])
  })

  test('OMC_DISABLE_MULTIREPO=1 ignores the marker', async ($, on) => {
    const world = session(on, { cwd: '/home/me/ws/repo', env: { OMC_DISABLE_MULTIREPO: '1' } })
    world.git.set('/home/me/ws/repo rev-parse --show-toplevel', '/home/me/ws/repo')
    world.files.set('/home/me/ws/.omc-workspace', '{}')
    world.files.set(sessionFile('/home/me/ws/.omc', 'team'), team(NOW - 3 * HOUR))
    world.files.set(sessionFile('/home/me/ws/repo/.omc', 'ralph'), ralph(NOW - 3 * HOUR))
    await start($, world)
    expect(await lines($)).toEqual(['ralph active but stale for 3h; cancel or resume'])
  })

  test('outside a repository, $HOME/.omc', async ($, on) => {
    const world = session(on, { cwd: '/tmp/scratch' })
    world.files.set(sessionFile('/home/me/.omc', 'autopilot'), autopilot(NOW - 3 * HOUR))
    world.files.set(sessionFile('/tmp/scratch/.omc', 'ralph'), ralph(NOW - 3 * HOUR))
    await start($, world)
    expect(await lines($)).toEqual(['autopilot active but stale for 3h; cancel or resume (phase: execution)'])
  })

  test('outside a repository with no home directory, nothing is read', async ($, on) => {
    const world = session(on, { cwd: '/tmp/scratch', env: { HOME: '' } })
    world.files.set(sessionFile('/tmp/scratch/.omc', 'ralph'), ralph(NOW - 3 * HOUR))
    await start($, world)
    expect(await lines($)).toEqual([])
  })

  test('OMC_STATE_DIR: $OMC_STATE_DIR/<project id>, the id from the origin remote', async ($, on) => {
    const world = session(on, { env: { OMC_STATE_DIR: '/state' } })
    world.git.set(`${REPO} remote get-url origin`, 'git@github.com:acme/widgets.git')
    world.git.set(`${REPO} rev-parse --path-format=absolute --git-common-dir`, `${REPO}/.git`)
    world.files.set(sessionFile('/state/repo-44d052bc011d3b94', 'autopilot'), autopilot(NOW - 3 * HOUR))
    world.files.set(sessionFile(ROOT, 'ralph'), ralph(NOW - 3 * HOUR))
    await start($, world)
    expect(await lines($)).toEqual(['autopilot active but stale for 3h; cancel or resume (phase: execution)'])
    expectReadOnly(world)
  })

  test('OMC_STATE_DIR outside a repository: $OMC_STATE_DIR/non-git', async ($, on) => {
    const world = session(on, { cwd: '/tmp/scratch', env: { OMC_STATE_DIR: '/state' } })
    world.files.set(sessionFile('/state/non-git', 'ralph'), ralph(NOW, { reinforcement_count: 5 }))
    await start($, world)
    expect(await lines($)).toEqual(['ralph looping: reinforcement 5, iteration 12/100'])
  })

  test('OMC_STATE_DIR with a workspace marker id', async ($, on) => {
    const world = session(on, { cwd: '/home/me/ws/repo', env: { OMC_STATE_DIR: '/state' } })
    world.git.set('/home/me/ws/repo rev-parse --show-toplevel', '/home/me/ws/repo')
    world.files.set('/home/me/ws/.omc-workspace', '{"id":"my-org"}')
    world.files.set(sessionFile('/state/my-org-c6f029eb68756a03', 'team'), team(NOW - 3 * HOUR))
    await start($, world)
    expect(await lines($)).toEqual(['team active but stale for 3h; cancel or resume (phase: team-exec)'])
  })
})

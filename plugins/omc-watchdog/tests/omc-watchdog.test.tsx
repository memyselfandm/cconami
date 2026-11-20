import type { On } from 'claude-code'
import { describe, expect, mock, test } from 'claude-code/testing'
import type { Engine, MockClock } from 'claude-code/testing'

import {
  age,
  AUTOPILOT_CEILING,
  bandText,
  belongsTo,
  AWAITING_CONFIRMATION_TTL_MS,
  DEFAULT_STALE_HOURS,
  isAwaitingConfirmation,
  isSafeSessionId,
  isSensitiveLocation,
  iterationCap,
  judge,
  markerCandidates,
  markerId,
  MAX_SESSION_SCAN,
  numberOf,
  omcRoot,
  parseState,
  projectIdentifier,
  RALPH_HARD_LIMIT,
  RALPH_HARD_LIMIT_STRICT,
  ralphHardLimit,
  reinforcementCeiling,
  sessionsToScan,
  sha16,
  statePaths,
  TEAM_CEILING,
  thresholds,
  touchesOmcState,
  ULTRAGOAL_CEILING,
} from '../hooks/logic'
import type { ModeState } from '../hooks/logic'
import { REFRESH_MS, RESOLVE_EVERY } from '../hooks/register'
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

function textOf(mode: string, text: string, limits = LIMITS): string | null {
  const finding = judge(mode, state(text), NOW, limits)

  return finding === null ? null : bandText(finding)
}

// The pure logic.

describe('settings', () => {
  test('defaults: OMC’s two hours, and OMC’s own reinforcement ceilings', () => {
    expect(DEFAULT_STALE_HOURS).toBe(2)
    expect(thresholds({})).toEqual({ staleMs: 2 * HOUR, reinforcementLimit: null, ralphHardLimit: 500 })
  })

  test('a set value is used; zero, negative or unreadable takes the default', () => {
    expect(thresholds({ staleHours: 6, reinforcementLimit: 9 })).toEqual({ staleMs: 6 * HOUR, reinforcementLimit: 9, ralphHardLimit: 500 })
    expect(thresholds({ staleHours: 0.5 })).toEqual({ staleMs: HOUR / 2, reinforcementLimit: null, ralphHardLimit: 500 })
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

  test('a session id is used in a path only when OMC’s stop hook would accept it', () => {
    expect(isSafeSessionId(SID)).toBe(true)
    for (const bad of ['', '../x', 'a/b', 'a\\b', 'a b', '_x', '-x', 'x'.repeat(257)]) {
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

  test('sensitive locations follow isSensitiveStateLocation, lexically', () => {
    const home = '/home/me'
    const tmp = '/var/folders/xy/T'
    for (const ok of ['/home/me/ws', '/home/me/code/.omc', '/srv/projects', '/home/me/work/repo']) {
      expect(isSensitiveLocation(ok, home, tmp)).toBe(false)
    }
    for (const bad of [
      '/home/me',
      '/home/me/',
      '/home/me/.config/ws',
      '/home/me/.hidden',
      '/home/me/Documents/ws',
      '/home/me/Desktop',
      '/Users/me/Library/x',
      '/home/me/downloads/a',
      '/',
      '/tmp',
      '/private/tmp',
      '/var/lib/x',
      '/opt/ws',
      '/private/var/ws',
      '/usr/local/ws',
      '/etc/ws',
      '/var/folders/xy/T/ws',
    ]) {
      expect(isSensitiveLocation(bad, home, tmp)).toBe(true)
    }
    // A directory merely named like a root is not under it.
    expect(isSensitiveLocation('/optional/ws', home, null)).toBe(false)
    // A temporary directory elsewhere is covered once named.
    expect(isSensitiveLocation('/scratch/t/ws', home, '/scratch/t')).toBe(true)
    expect(isSensitiveLocation('/scratch/t/ws', home, null)).toBe(false)
  })

  test('sha16 is the first 16 hex digits of SHA-256 (checked against shasum)', async () => {
    expect(await sha16('git@github.com:acme/widgets.git')).toBe('44d052bc011d3b94')
    expect(await sha16('/repo/main')).toBe('14171f47651e1020')
  })

  test('project identifiers follow getProjectIdentifier', async () => {
    const base = { root: '/repo/main', workspace: null, workspaceId: null, remoteUrl: '', commonDir: '' }
    expect(
      await projectIdentifier({ ...base, remoteUrl: 'git@github.com:acme/widgets.git', commonDir: '/repo/main/.git' }),
    ).toBe('main-44d052bc011d3b94')
    expect(await projectIdentifier({ ...base, root: '/repo/wt', commonDir: '/repo/main/.git' })).toBe(
      'main-14171f47651e1020',
    )
    expect(await projectIdentifier(base)).toBe('main-14171f47651e1020')
    expect(await projectIdentifier({ ...base, commonDir: '/super/.git/modules/main' })).toBe('main-14171f47651e1020')
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

  test('where a mode’s state can be, in readStateFileWithSession’s order', () => {
    expect(statePaths('/repo/.omc', SID, 'ralph', '/home/me')).toEqual({
      session: `/repo/.omc/state/sessions/${SID}/ralph-state.json`,
      sessionsDir: '/repo/.omc/state/sessions',
      legacy: '/repo/.omc/state/ralph-state.json',
      global: '/home/me/.omc/state/ralph-state.json',
    })
    expect(statePaths('/repo/.omc', SID, 'ralph', null).global).toBeNull()
  })

  test('the session scan takes valid directories other than this one, at most 50', () => {
    const dir = (name: string) => ({ name, kind: 'dir' })
    expect(sessionsToScan([dir(SID), dir(OTHER_SID), { name: 'x', kind: 'file' }, dir('.hidden'), dir('_bad')], SID)).toEqual([
      OTHER_SID,
    ])
    const many = Array.from({ length: 80 }, (_, i) => dir(`s${i}`))
    expect(MAX_SESSION_SCAN).toBe(50)
    expect(sessionsToScan(many, SID)).toHaveLength(50)
  })
})

describe('reading a state file', () => {
  test('the real autopilot shape: phase, counters and the latest activity time', () => {
    expect(state(autopilot(NOW - HOUR))).toEqual({
      isActive: true,
      sessionId: SID,
      phase: 'execution',
      iteration: null,
      reinforcement: 4,
      maxReinforcements: null,
      awaitingSinceMs: null,
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

  test('numeric timestamps are ignored, as OMC’s isStaleState ignores them', () => {
    expect(state(`{"active":true,"last_checked_at":${NOW},"updated_at":${NOW}}`).activityMs).toBeNull()
    expect(state(`{"last_checked_at":${NOW},"started_at":"${new Date(NOW - HOUR).toISOString()}"}`).activityMs).toBe(NOW - HOUR)
  })

  test('active is true or "true"; anything else is not', () => {
    expect(state('{"active":true}').isActive).toBe(true)
    expect(state('{"active":"true"}').isActive).toBe(true)
    for (const v of ['"false"', '"yes"', '1', 'false', 'null']) {
      expect(state(`{"active":${v}}`).isActive).toBe(false)
    }
  })

  test('awaiting confirmation only when it is true, since awaiting_confirmation_set_at, else started_at', () => {
    const set = new Date(NOW - 60_000).toISOString()
    const started = new Date(NOW - HOUR).toISOString()
    expect(state(`{"awaiting_confirmation":true,"awaiting_confirmation_set_at":"${set}","started_at":"${started}"}`).awaitingSinceMs).toBe(NOW - 60_000)
    expect(state(`{"awaiting_confirmation":true,"awaiting_confirmation_set_at":" ","started_at":"${started}"}`).awaitingSinceMs).toBe(NOW - HOUR)
    expect(state('{"awaiting_confirmation":true}').awaitingSinceMs).toBeNull()
    expect(state(`{"awaiting_confirmation":"true","awaiting_confirmation_set_at":"${set}"}`).awaitingSinceMs).toBeNull()
  })

  test('awaiting confirmation lasts OMC’s two minutes, from the time it began', () => {
    expect(AWAITING_CONFIRMATION_TTL_MS).toBe(2 * 60_000)
    const since = (ms: number | null) => ({ ...state('{}'), awaitingSinceMs: ms })
    expect(isAwaitingConfirmation(since(NOW), NOW)).toBe(true)
    expect(isAwaitingConfirmation(since(NOW - 119_999), NOW)).toBe(true)
    expect(isAwaitingConfirmation(since(NOW - 120_000), NOW)).toBe(false)
    expect(isAwaitingConfirmation(since(NOW + 1), NOW)).toBe(false)
    expect(isAwaitingConfirmation(since(null), NOW)).toBe(false)
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
  test('OMC’s ceilings: autopilot and team 20, ultragoal max_reinforcements or 50, ralph none', () => {
    expect([AUTOPILOT_CEILING, TEAM_CEILING, ULTRAGOAL_CEILING]).toEqual([20, 20, 50])
    expect(reinforcementCeiling('autopilot', state('{}'), null)).toBe(20)
    expect(reinforcementCeiling('team', state('{}'), null)).toBe(20)
    expect(reinforcementCeiling('ultragoal', state('{}'), null)).toBe(50)
    expect(reinforcementCeiling('ultragoal', state('{"max_reinforcements":0}'), null)).toBe(50)
    expect(reinforcementCeiling('ultragoal', state('{"max_reinforcements":"12"}'), null)).toBe(12)
    expect(reinforcementCeiling('ralph', state('{}'), null)).toBeNull()
    expect(reinforcementCeiling('ralph', state('{}'), 5)).toBe(5)
    expect(reinforcementCeiling('team', state('{}'), 5)).toBe(5)
  })

  test('ralph’s hard limit is OMC’s: 500, or 200 with OMC_SECURITY=strict; flagged at 90% of it', () => {
    expect([RALPH_HARD_LIMIT, RALPH_HARD_LIMIT_STRICT]).toEqual([500, 200])
    expect(ralphHardLimit(null)).toBe(500)
    expect(ralphHardLimit('')).toBe(500)
    expect(ralphHardLimit('relaxed')).toBe(500)
    expect(ralphHardLimit('strict')).toBe(200)
    expect(iterationCap('ralph', 500)).toBe(450)
    expect(iterationCap('ralph', 200)).toBe(180)
    expect(iterationCap('team', 500)).toBeNull()
  })

  test('an active autopilot untouched for 3h is stale, with its phase', () => {
    expect(judge('autopilot', state(autopilot(NOW - 3 * HOUR)), NOW, LIMITS)).toEqual({
      mode: 'autopilot',
      phase: 'execution',
      kind: 'stale',
      ageMs: 3 * HOUR,
    })
    expect(textOf('autopilot', autopilot(NOW - 3 * HOUR))).toBe(
      'autopilot active but stale for 3h; cancel or resume (phase: execution)',
    )
  })

  test('a fresh team run at count 6 is healthy: OMC keeps reinforcing up to 20', () => {
    expect(textOf('team', team(NOW, { reinforcement_count: 6 }))).toBeNull()
    expect(textOf('team', team(NOW, { reinforcement_count: '19' }))).toBeNull()
    expect(textOf('team', team(NOW, { reinforcement_count: 20 }))).toBe('team looping: reinforcement 20/20 (phase: team-exec)')
    expect(textOf('team', team(NOW, { reinforcement_count: 23 }))).toBe('team looping: reinforcement 23/20 (phase: team-exec)')
  })

  test('autopilot at its ceiling of 20 is looping; below it is not', () => {
    expect(textOf('autopilot', autopilot(NOW, { reinforcement_count: 19 }))).toBeNull()
    expect(textOf('autopilot', autopilot(NOW, { reinforcement_count: 20 }))).toBe(
      'autopilot looping: reinforcement 20/20 (phase: execution)',
    )
  })

  test('ultragoal uses max_reinforcements, else 50', () => {
    expect(textOf('ultragoal', team(NOW, { reinforcement_count: 49, current_phase: undefined }))).toBeNull()
    expect(textOf('ultragoal', team(NOW, { reinforcement_count: 50, current_phase: undefined }))).toBe(
      'ultragoal looping: reinforcement 50/50',
    )
    expect(textOf('ultragoal', team(NOW, { reinforcement_count: 10, max_reinforcements: 10, current_phase: undefined }))).toBe(
      'ultragoal looping: reinforcement 10/10',
    )
  })

  test('ralph at max_iterations is not looping: OMC extends it by 10 and goes on', () => {
    // OMC's walk: at 100/100 it writes max_iterations 110; the run reaches 110/110; and so on.
    for (const [iteration, max] of [[100, 100], [100, 110], [110, 110], [120, 120], [10, 10]]) {
      expect(textOf('ralph', ralph(NOW, { iteration, max_iterations: max }))).toBeNull()
    }
    expect(textOf('ralph', ralph(NOW, { iteration: 100, max_iterations: undefined }))).toBeNull()
    expect(textOf('ralph', ralph(NOW, { reinforcement_count: 40 }))).toBeNull()
  })

  test('ralph is looping near OMC’s hard limit, whatever max_iterations says', () => {
    expect(textOf('ralph', ralph(NOW, { iteration: 449, max_iterations: 450 }))).toBeNull()
    expect(textOf('ralph', ralph(NOW, { iteration: 450, max_iterations: 450 }))).toBe('ralph looping: iteration 450, hard limit 500')
    expect(textOf('ralph', ralph(NOW, { iteration: 499, max_iterations: 9999 }))).toBe('ralph looping: iteration 499, hard limit 500')
    const strict = { ...LIMITS, ralphHardLimit: 200 }
    expect(textOf('ralph', ralph(NOW, { iteration: 179 }), strict)).toBeNull()
    expect(textOf('ralph', ralph(NOW, { iteration: 180 }), strict)).toBe('ralph looping: iteration 180, hard limit 200')
  })

  test('the setting overrides every ceiling', () => {
    const limits = thresholds({ reinforcementLimit: 5 })
    expect(textOf('team', team(NOW, { reinforcement_count: 5 }), limits)).toBe('team looping: reinforcement 5/5 (phase: team-exec)')
    expect(textOf('ralph', ralph(NOW, { reinforcement_count: 5 }), limits)).toBe('ralph looping: reinforcement 5/5')
    expect(textOf('autopilot', autopilot(NOW, { reinforcement_count: 4 }), limits)).toBeNull()
  })

  test('a confirmation 9 minutes old has lapsed: OMC reinforces again, so count 20 is looping', () => {
    // The fixture's awaiting_confirmation_set_at is 9 minutes before last_checked_at.
    expect(textOf('autopilot', autopilot(NOW, { reinforcement_count: 20, awaiting_confirmation: true }))).toBe(
      'autopilot looping: reinforcement 20/20 (phase: execution)',
    )
  })

  test('a fresh confirmation holds the run: count 20 is not looping, but it can still be stale', () => {
    const fresh = new Date(NOW - 30_000).toISOString()
    expect(
      textOf('autopilot', autopilot(NOW, { reinforcement_count: 20, awaiting_confirmation: true, awaiting_confirmation_set_at: fresh })),
    ).toBeNull()
    expect(textOf('autopilot', autopilot(NOW - 3 * HOUR, { awaiting_confirmation: true, awaiting_confirmation_set_at: fresh }))).toBe(
      'autopilot active but stale for 3h; cancel or resume (phase: execution)',
    )
  })

  test('a healthy run, an inactive run, and the boundaries produce nothing', () => {
    expect(textOf('autopilot', autopilot(NOW - HOUR))).toBeNull()
    expect(textOf('ralph', ralph(NOW))).toBeNull()
    expect(textOf('team', team(NOW - HOUR))).toBeNull()
    expect(textOf('autopilot', autopilotDone(NOW - 30 * HOUR))).toBeNull()
    // Exactly the threshold is not yet stale (OMC: age > threshold).
    expect(textOf('autopilot', autopilot(NOW - 2 * HOUR))).toBeNull()
  })

  test('a dead run is reported as stale even when its counters are high', () => {
    expect(judge('ralph', state(ralph(NOW - 4 * HOUR, { iteration: 100 })), NOW, LIMITS)?.kind).toBe('stale')
  })

  test('an active state with no activity time is stale', () => {
    expect(textOf('team', '{"active":true,"stage":"exec"}')).toBe(
      'team active with no activity time recorded; cancel or resume (phase: exec)',
    )
  })

  test('the stale threshold comes from the settings', () => {
    const limits = thresholds({ staleHours: 5 })
    expect(textOf('autopilot', autopilot(NOW - 3 * HOUR), limits)).toBeNull()
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
const sessionFile = (root: string, mode: string, sid = SID) => `${root}/state/sessions/${sid}/${mode}-state.json`
/** A ralph run near OMC's hard limit, and the line it draws. */
const LOOPING = () => ralph(NOW, { iteration: 480, max_iterations: 480 })
const LOOPING_LINE = 'ralph looping: iteration 480, hard limit 500'

type World = {
  files: Map<string, string>
  env: Record<string, string>
  cwd: string
  git: Map<string, string>
  /** While set, every git command fails as a timeout would: not "not a repository". */
  isGitBroken: boolean
  /** git commands (`<cwd> <args>`) that fail as a timeout would. */
  timeouts: Set<string>
  /** git commands that exit 2 with this message, as git does for a missing remote. */
  failures: Map<string, string>
  ran: string[][]
  /** The environment each git command ran with. */
  envs: (Record<string, string> | undefined)[]
  /** How many times each path was read. */
  reads: Map<string, number>
  writes: string[]
  clock: MockClock
}

function session(on: On, setup: Partial<Pick<World, 'env' | 'cwd'>> = {}): World {
  const world: World = {
    files: new Map(),
    env: { HOME: '/home/me', ...setup.env },
    cwd: setup.cwd ?? REPO,
    git: new Map([[`${REPO} rev-parse --show-toplevel`, REPO]]),
    isGitBroken: false,
    timeouts: new Set(),
    failures: new Map(),
    ran: [],
    envs: [],
    reads: new Map(),
    writes: [],
    clock: mock.clock(on, { now: NOW }),
  }
  mock.env(on, world.env)
  on('session.id', () => ({ value: SID }))
  on('session.cwd', () => ({ value: world.cwd }))
  on('fs.read', (_, e) => {
    world.reads.set(e.path, (world.reads.get(e.path) ?? 0) + 1)
    const text = world.files.get(e.path)

    return text === undefined ? { deny: `ENOENT: ${e.path}` } : { value: text }
  })
  on('fs.exists', (_, e) => ({ value: world.files.has(e.path) }))
  on('fs.list', (_, e) => {
    const prefix = `${e.path}/`
    const names = new Map<string, 'file' | 'dir'>()
    for (const path of world.files.keys()) {
      if (path.startsWith(prefix)) {
        const rest = path.slice(prefix.length)
        const name = rest.split('/')[0] ?? ''
        names.set(name, rest.includes('/') ? 'dir' : 'file')
      }
    }
    if (names.size === 0) {
      return { deny: `ENOENT: ${e.path}` }
    }

    return { value: [...names].map(([name, kind]) => ({ name, kind, size: 0, mtimeMs: 0, isLink: false })) }
  })
  on('fs.write', (_, e) => {
    world.writes.push(e.path)

    return { value: undefined }
  })
  on('process.run', (_, e) => {
    world.ran.push([...e.argv])
    world.envs.push(e.init?.env)
    const key = `${e.init?.cwd ?? ''} ${e.argv.slice(1).join(' ')}`
    const isBroken = world.isGitBroken || world.timeouts.has(key)
    const failure = world.failures.get(key)
    if (!isBroken && failure !== undefined) {
      return { value: { exitCode: 2, stdout: '', stderr: failure, isStdoutTruncated: false, isStderrTruncated: false } }
    }
    const out = isBroken ? undefined : world.git.get(key)

    return {
      value: {
        exitCode: out === undefined ? 128 : 0,
        stdout: out === undefined ? '' : `${out}\n`,
        stderr: out !== undefined ? '' : isBroken ? 'error: timed out' : 'fatal: not a git repository',
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

/** Only read-only git commands ran, under LC_ALL=C, and nothing was written. */
function expectReadOnly(world: World): void {
  expect(world.writes).toEqual([])
  for (const argv of world.ran) {
    expect(argv[0]).toBe('git')
    expect(['rev-parse', 'remote']).toContain(argv[1])
  }
  for (const env of world.envs) {
    expect(env?.LC_ALL).toBe('C')
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

  test('a looping team shows', async ($, on) => {
    const world = session(on)
    world.files.set(sessionFile(ROOT, 'team'), team(NOW, { reinforcement_count: '20' }))
    await start($, world)
    expect(await lines($)).toEqual(['team looping: reinforcement 20/20 (phase: team-exec)'])
  })

  test('a fresh team run at count 6 shows no band', async ($, on) => {
    const world = session(on)
    world.files.set(sessionFile(ROOT, 'team'), team(NOW, { reinforcement_count: '6' }))
    await start($, world)
    expect(await lines($)).toEqual([])
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
    world.files.set(sessionFile(ROOT, 'ralph'), LOOPING())
    world.files.set(sessionFile(ROOT, 'team'), team(NOW - 5 * HOUR))
    await start($, world)
    expect(await lines($)).toEqual([LOOPING_LINE, 'team active but stale for 5h; cancel or resume (phase: team-exec)'])
  })

  test('another session’s state is not shown; a legacy file naming this session is', async ($, on) => {
    const world = session(on)
    world.files.set(sessionFile(ROOT, 'autopilot'), autopilot(NOW - 3 * HOUR, { session_id: OTHER_SID }))
    world.files.set(sessionFile(ROOT, 'ralph', OTHER_SID), ralph(NOW - 9 * HOUR, { session_id: OTHER_SID }))
    world.files.set(`${ROOT}/state/team-state.json`, team(NOW - 9 * HOUR))
    await start($, world)
    expect(await lines($)).toEqual([])
    world.files.set(`${ROOT}/state/ralph-state.json`, ralph(NOW - 9 * HOUR))
    await world.clock.advance(REFRESH_MS)
    expect(await lines($)).toEqual(['ralph active but stale for 9h; cancel or resume'])
  })

  test('a file in another session directory that names this session is read', async ($, on) => {
    const world = session(on)
    world.files.set(sessionFile(ROOT, 'autopilot', OTHER_SID), autopilot(NOW - 3 * HOUR))
    await start($, world)
    expect(await lines($)).toEqual(['autopilot active but stale for 3h; cancel or resume (phase: execution)'])
  })

  test('the global $HOME/.omc/state file counts when it names this session and the root has none', async ($, on) => {
    const world = session(on)
    world.files.set('/home/me/.omc/state/ralph-state.json', LOOPING())
    world.files.set('/home/me/.omc/state/team-state.json', team(NOW - 9 * HOUR))
    await start($, world)
    expect(await lines($)).toEqual([LOOPING_LINE])
    // The root's own legacy file, even another session's, hides the global one.
    world.files.set(`${ROOT}/state/ralph-state.json`, ralph(NOW, { session_id: OTHER_SID, iteration: 480 }))
    await world.clock.advance(REFRESH_MS)
    expect(await lines($)).toEqual([])
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
    world.files.set(sessionFile(ROOT, 'ralph'), LOOPING())
    await $.tool.call({ tool: 'Bash', command: 'git status', tool_use_id: 't1' })
    await world.clock.settle()
    expect(await lines($)).toEqual([])
    const result = await $.tool.call({ tool: 'mcp__plugin_oh-my-claudecode_t__state_write', mode: 'ralph', tool_use_id: 't2' })
    expect(result.text).toBe('ok')
    await world.clock.settle()
    expect(await lines($)).toEqual([LOOPING_LINE])
    expectReadOnly(world)
  })

  test('OMC_SECURITY=strict lowers ralph’s hard limit to 200', async ($, on) => {
    const world = session(on, { env: { OMC_SECURITY: 'strict' } })
    world.files.set(sessionFile(ROOT, 'ralph'), ralph(NOW, { iteration: 190, max_iterations: 190 }))
    await start($, world)
    expect(await lines($)).toEqual(['ralph looping: iteration 190, hard limit 200'])
  })

  test('a second session.start does not add a second timed read', async ($, on) => {
    const world = session(on)
    const path = sessionFile(ROOT, 'ralph')
    world.files.set(path, ralph(NOW))
    await start($, world)
    await start($, world)
    const before = world.reads.get(path) ?? 0
    await world.clock.advance(REFRESH_MS)
    expect((world.reads.get(path) ?? 0) - before).toBe(1)
  })

  test('the settings move the thresholds', { options: { staleHours: 4, reinforcementLimit: 3 } }, async ($, on) => {
    const world = session(on)
    world.files.set(sessionFile(ROOT, 'autopilot'), autopilot(NOW - 3 * HOUR, { reinforcement_count: 0 }))
    world.files.set(sessionFile(ROOT, 'team'), team(NOW, { reinforcement_count: 3 }))
    await start($, world)
    expect(await lines($)).toEqual(['team looping: reinforcement 3/3 (phase: team-exec)'])
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
    world.files.set(sessionFile(ROOT, 'ralph'), LOOPING())
    world.files.set(sessionFile(`${sub}/.omc`, 'autopilot'), autopilot(NOW - 3 * HOUR))
    await start($, world)
    expect(await lines($)).toEqual([LOOPING_LINE])
  })

  test('a marker at home or above is never used', async ($, on) => {
    const world = session(on)
    world.files.set('/home/me/.omc-workspace', '{}')
    world.files.set('/home/.omc-workspace', '{}')
    world.files.set(sessionFile(ROOT, 'ralph'), LOOPING())
    await start($, world)
    expect(await lines($)).toEqual([LOOPING_LINE])
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

  test('a workspace marker in a sensitive location is skipped, in a repository', async ($, on) => {
    const world = session(on, { cwd: '/home/me/Documents/ws/repo' })
    world.git.set('/home/me/Documents/ws/repo rev-parse --show-toplevel', '/home/me/Documents/ws/repo')
    world.files.set('/home/me/Documents/ws/.omc-workspace', '{}')
    world.files.set(sessionFile('/home/me/Documents/ws/.omc', 'team'), team(NOW - 3 * HOUR))
    world.files.set(sessionFile('/home/me/Documents/ws/repo/.omc', 'ralph'), ralph(NOW - 3 * HOUR))
    await start($, world)
    expect(await lines($)).toEqual(['ralph active but stale for 3h; cancel or resume'])
  })

  test('a workspace marker in a sensitive location is skipped outside a repository: $HOME/.omc', async ($, on) => {
    const world = session(on, { cwd: '/home/me/.config/ws/sub' })
    world.files.set('/home/me/.config/ws/.omc-workspace', '{}')
    world.files.set(sessionFile('/home/me/.config/ws/.omc', 'team'), team(NOW - 3 * HOUR))
    world.files.set(sessionFile('/home/me/.omc', 'ralph'), ralph(NOW - 3 * HOUR))
    await start($, world)
    expect(await lines($)).toEqual(['ralph active but stale for 3h; cancel or resume'])
  })

  test('outside a repository, a safe workspace marker anchors the state', async ($, on) => {
    const world = session(on, { cwd: '/srv/ws/sub' })
    world.files.set('/srv/ws/.omc-workspace', '{}')
    world.files.set(sessionFile('/srv/ws/.omc', 'team'), team(NOW - 3 * HOUR))
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
    const world = session(on, { cwd: '/srv/scratch' })
    world.files.set(sessionFile('/home/me/.omc', 'autopilot'), autopilot(NOW - 3 * HOUR))
    world.files.set(sessionFile('/srv/scratch/.omc', 'ralph'), ralph(NOW - 3 * HOUR))
    await start($, world)
    expect(await lines($)).toEqual(['autopilot active but stale for 3h; cancel or resume (phase: execution)'])
  })

  test('outside a repository with no home directory, nothing is read', async ($, on) => {
    const world = session(on, { cwd: '/srv/scratch', env: { HOME: '' } })
    world.files.set(sessionFile('/srv/scratch/.omc', 'ralph'), ralph(NOW - 3 * HOUR))
    await start($, world)
    expect(await lines($)).toEqual([])
  })

  test('a root found while git failed is not kept: the next read asks git again', async ($, on) => {
    const world = session(on)
    world.isGitBroken = true
    world.files.set(sessionFile(ROOT, 'ralph'), LOOPING())
    await start($, world)
    expect(await lines($)).toEqual([])
    world.isGitBroken = false
    await world.clock.advance(REFRESH_MS)
    expect(await lines($)).toEqual([LOOPING_LINE])
  })

  test('a sure root is kept, and worked out again every RESOLVE_EVERY reads, not one more', async ($, on) => {
    expect(RESOLVE_EVERY).toBe(10)
    const world = session(on, { cwd: '/srv/proj' })
    world.files.set(sessionFile('/srv/proj/.omc', 'ralph'), LOOPING())
    // Read 1 works out the root.
    await start($, world)
    expect(await lines($)).toEqual([])
    // The directory becomes a repository; the kept root still says $HOME/.omc.
    world.git.set('/srv/proj rev-parse --show-toplevel', '/srv/proj')
    // Reads 2 to 10 use the kept root.
    await world.clock.advance((RESOLVE_EVERY - 1) * REFRESH_MS)
    expect(await lines($)).toEqual([])
    // Read 11 works it out again.
    await world.clock.advance(REFRESH_MS)
    expect(await lines($)).toEqual([LOOPING_LINE])
  })

  test('a timed-out superproject probe is not kept', async ($, on) => {
    const sub = `${REPO}/vendor/lib`
    const world = session(on, { cwd: sub })
    world.git.set(`${sub} rev-parse --show-toplevel`, sub)
    world.git.set(`${sub} rev-parse --show-superproject-working-tree`, REPO)
    world.timeouts.add(`${sub} rev-parse --show-superproject-working-tree`)
    world.files.set(sessionFile(ROOT, 'ralph'), LOOPING())
    await start($, world)
    expect(await lines($)).toEqual([])
    world.timeouts.clear()
    await world.clock.advance(REFRESH_MS)
    expect(await lines($)).toEqual([LOOPING_LINE])
  })

  test('OMC_STATE_DIR: a timed-out remote probe is not kept', async ($, on) => {
    const world = session(on, { env: { OMC_STATE_DIR: '/state' } })
    world.git.set(`${REPO} remote get-url origin`, 'git@github.com:acme/widgets.git')
    world.git.set(`${REPO} rev-parse --path-format=absolute --git-common-dir`, `${REPO}/.git`)
    world.timeouts.add(`${REPO} remote get-url origin`)
    world.files.set(sessionFile('/state/repo-44d052bc011d3b94', 'ralph'), LOOPING())
    await start($, world)
    expect(await lines($)).toEqual([])
    world.timeouts.clear()
    await world.clock.advance(REFRESH_MS)
    expect(await lines($)).toEqual([LOOPING_LINE])
  })

  test('OMC_STATE_DIR: a repository with no origin remote is a sure answer, and kept', async ($, on) => {
    const world = session(on, { env: { OMC_STATE_DIR: '/state' } })
    world.failures.set(`${REPO} remote get-url origin`, "error: No such remote 'origin'")
    world.git.set(`${REPO} rev-parse --path-format=absolute --git-common-dir`, `${REPO}/.git`)
    world.files.set(sessionFile(`/state/repo-${await sha16(REPO)}`, 'ralph'), LOOPING())
    await start($, world)
    expect(await lines($)).toEqual([LOOPING_LINE])
    // A remote added now is not seen until the root is worked out again.
    world.failures.clear()
    world.git.set(`${REPO} remote get-url origin`, 'git@github.com:acme/widgets.git')
    await world.clock.advance(REFRESH_MS)
    expect(await lines($)).toEqual([LOOPING_LINE])
  })

  test('OMC_STATE_DIR: a timed-out common-dir probe is not kept', async ($, on) => {
    const world = session(on, { cwd: '/srv/wt', env: { OMC_STATE_DIR: '/state' } })
    world.git.set('/srv/wt rev-parse --show-toplevel', '/srv/wt')
    world.git.set('/srv/wt rev-parse --path-format=absolute --git-common-dir', `${REPO}/.git`)
    world.timeouts.add('/srv/wt rev-parse --path-format=absolute --git-common-dir')
    // The primary checkout's id: basename "repo", hashed path /home/me/repo.
    world.files.set(sessionFile(`/state/repo-${await sha16(REPO)}`, 'ralph'), LOOPING())
    await start($, world)
    expect(await lines($)).toEqual([])
    world.timeouts.clear()
    await world.clock.advance(REFRESH_MS)
    expect(await lines($)).toEqual([LOOPING_LINE])
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
    const world = session(on, { cwd: '/srv/scratch', env: { OMC_STATE_DIR: '/state' } })
    world.files.set(sessionFile('/state/non-git', 'ralph'), LOOPING())
    await start($, world)
    expect(await lines($)).toEqual([LOOPING_LINE])
  })

  test('OMC_STATE_DIR with a workspace marker id, found from the working directory', async ($, on) => {
    const world = session(on, { cwd: '/home/me/ws/repo/sub', env: { OMC_STATE_DIR: '/state' } })
    world.git.set('/home/me/ws/repo/sub rev-parse --show-toplevel', '/home/me/ws/repo')
    world.files.set('/home/me/ws/repo/sub/.omc-workspace', '{"id":"my-org"}')
    world.files.set(sessionFile('/state/my-org-c6f029eb68756a03', 'team'), team(NOW - 3 * HOUR))
    await start($, world)
    expect(await lines($)).toEqual(['team active but stale for 3h; cancel or resume (phase: team-exec)'])
  })
})

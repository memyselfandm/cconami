// The state-finding and judging logic omc-runs took over from omc-watchdog:
// these are omc-watchdog's tests of it, with the warning in the row's shorter
// form (the row already names the mode and phase).

import { describe, expect, test } from 'claude-code/testing'

import {
  age,
  AUTOPILOT_CEILING,
  AWAITING_CONFIRMATION_TTL_MS,
  belongsTo,
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
  warningText,
} from '../hooks/watch'
import type { ModeState } from '../hooks/watch'
import { autopilot, OTHER_SID, ralph, SID, team } from './fixtures'

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

  return finding === null ? null : warningText(finding)
}

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
    expect(markerCandidates('/home/me/work/repo/sub', '/home/me')).toEqual(['/home/me/work/repo/sub', '/home/me/work/repo', '/home/me/work'])
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
    expect(isSensitiveLocation('/optional/ws', home, null)).toBe(false)
    expect(isSensitiveLocation('/scratch/t/ws', home, '/scratch/t')).toBe(true)
    expect(isSensitiveLocation('/scratch/t/ws', home, null)).toBe(false)
  })

  test('sha16 is the first 16 hex digits of SHA-256 (checked against shasum)', async () => {
    expect(await sha16('git@github.com:acme/widgets.git')).toBe('44d052bc011d3b94')
    expect(await sha16('/repo/main')).toBe('14171f47651e1020')
  })

  test('project identifiers follow getProjectIdentifier', async () => {
    const base = { root: '/repo/main', workspace: null, workspaceId: null, remoteUrl: '', commonDir: '' }
    expect(await projectIdentifier({ ...base, remoteUrl: 'git@github.com:acme/widgets.git', commonDir: '/repo/main/.git' })).toBe(
      'main-44d052bc011d3b94',
    )
    expect(await projectIdentifier({ ...base, root: '/repo/wt', commonDir: '/repo/main/.git' })).toBe('main-14171f47651e1020')
    expect(await projectIdentifier(base)).toBe('main-14171f47651e1020')
    expect(await projectIdentifier({ ...base, commonDir: '/super/.git/modules/main' })).toBe('main-14171f47651e1020')
    expect(await projectIdentifier({ ...base, workspace: '/work/space', workspaceId: 'my-org' })).toBe('my-org-c6f029eb68756a03')
    expect(await projectIdentifier({ ...base, workspace: '/work/space', remoteUrl: 'x' })).toBe('space-670ff979f4d8c331')
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
    expect(sessionsToScan([dir(SID), dir(OTHER_SID), { name: 'x', kind: 'file' }, dir('.hidden'), dir('_bad')], SID)).toEqual([OTHER_SID])
    const many = Array.from({ length: 80 }, (_, i) => dir(`s${i}`))
    expect(MAX_SESSION_SCAN).toBe(50)
    expect(sessionsToScan(many, SID)).toHaveLength(50)
  })
})

describe('reading a state file', () => {
  test('the hook-written autopilot shape: phase, counters and the latest activity time', () => {
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

  test('the state_write team shape: string counts and only _meta.updatedAt', () => {
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
    expect(state(`{"started_at":${at(NOW - 5 * HOUR)},"updated_at":${at(NOW - HOUR)},"last_checked_at":${at(NOW - 3 * HOUR)}}`).activityMs).toBe(NOW - HOUR)
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
    expect(judge('autopilot', state(autopilot(NOW - 3 * HOUR)), NOW, LIMITS)).toEqual({ mode: 'autopilot', phase: 'execution', kind: 'stale', ageMs: 3 * HOUR })
    expect(textOf('autopilot', autopilot(NOW - 3 * HOUR))).toBe('stale for 3h; cancel or resume')
  })

  test('a fresh team run at count 6 is healthy: OMC keeps reinforcing up to 20', () => {
    expect(textOf('team', team(NOW, { reinforcement_count: 6 }))).toBeNull()
    expect(textOf('team', team(NOW, { reinforcement_count: '19' }))).toBeNull()
    expect(textOf('team', team(NOW, { reinforcement_count: 20 }))).toBe('looping: reinforcement 20/20')
    expect(textOf('team', team(NOW, { reinforcement_count: 23 }))).toBe('looping: reinforcement 23/20')
  })

  test('autopilot at its ceiling of 20 is looping; below it is not', () => {
    expect(textOf('autopilot', autopilot(NOW, { reinforcement_count: 19 }))).toBeNull()
    expect(textOf('autopilot', autopilot(NOW, { reinforcement_count: 20 }))).toBe('looping: reinforcement 20/20')
  })

  test('ultragoal uses max_reinforcements, else 50', () => {
    expect(textOf('ultragoal', team(NOW, { reinforcement_count: 49, current_phase: undefined }))).toBeNull()
    expect(textOf('ultragoal', team(NOW, { reinforcement_count: 50, current_phase: undefined }))).toBe('looping: reinforcement 50/50')
    expect(textOf('ultragoal', team(NOW, { reinforcement_count: 10, max_reinforcements: 10, current_phase: undefined }))).toBe(
      'looping: reinforcement 10/10',
    )
  })

  test('ralph at max_iterations is not looping: OMC extends it by 10 and goes on', () => {
    for (const [iteration, max] of [[100, 100], [100, 110], [110, 110], [120, 120], [10, 10]]) {
      expect(textOf('ralph', ralph(NOW, { iteration, max_iterations: max }))).toBeNull()
    }
    expect(textOf('ralph', ralph(NOW, { iteration: 100, max_iterations: undefined }))).toBeNull()
    expect(textOf('ralph', ralph(NOW, { reinforcement_count: 40 }))).toBeNull()
  })

  test('ralph is looping near OMC’s hard limit, whatever max_iterations says', () => {
    expect(textOf('ralph', ralph(NOW, { iteration: 449, max_iterations: 450 }))).toBeNull()
    expect(textOf('ralph', ralph(NOW, { iteration: 450, max_iterations: 450 }))).toBe('looping: iteration 450, hard limit 500')
    expect(textOf('ralph', ralph(NOW, { iteration: 499, max_iterations: 9999 }))).toBe('looping: iteration 499, hard limit 500')
    const strict = { ...LIMITS, ralphHardLimit: 200 }
    expect(textOf('ralph', ralph(NOW, { iteration: 179 }), strict)).toBeNull()
    expect(textOf('ralph', ralph(NOW, { iteration: 180 }), strict)).toBe('looping: iteration 180, hard limit 200')
  })

  test('the setting overrides every ceiling', () => {
    const limits = thresholds({ reinforcementLimit: 5 })
    expect(textOf('team', team(NOW, { reinforcement_count: 5 }), limits)).toBe('looping: reinforcement 5/5')
    expect(textOf('ralph', ralph(NOW, { reinforcement_count: 5 }), limits)).toBe('looping: reinforcement 5/5')
    expect(textOf('autopilot', autopilot(NOW, { reinforcement_count: 4 }), limits)).toBeNull()
  })

  test('a confirmation 13 minutes old has lapsed: OMC reinforces again, so count 20 is looping', () => {
    // The fixture's awaiting_confirmation_set_at is 13 minutes before last_checked_at.
    expect(textOf('autopilot', autopilot(NOW, { reinforcement_count: 20, awaiting_confirmation: true }))).toBe('looping: reinforcement 20/20')
  })

  test('a fresh confirmation holds the run: count 20 is not looping, but it can still be stale', () => {
    const fresh = new Date(NOW - 30_000).toISOString()
    expect(textOf('autopilot', autopilot(NOW, { reinforcement_count: 20, awaiting_confirmation: true, awaiting_confirmation_set_at: fresh }))).toBeNull()
    expect(textOf('autopilot', autopilot(NOW - 3 * HOUR, { awaiting_confirmation: true, awaiting_confirmation_set_at: fresh }))).toBe(
      'stale for 3h; cancel or resume',
    )
  })

  test('a healthy run, an inactive run, and the boundaries produce nothing', () => {
    expect(textOf('autopilot', autopilot(NOW - HOUR))).toBeNull()
    expect(textOf('ralph', ralph(NOW))).toBeNull()
    expect(textOf('team', team(NOW - HOUR))).toBeNull()
    expect(textOf('autopilot', autopilot(NOW - 30 * HOUR, { active: false }))).toBeNull()
    // Exactly the threshold is not yet stale (OMC: age > threshold).
    expect(textOf('autopilot', autopilot(NOW - 2 * HOUR))).toBeNull()
  })

  test('a dead run is reported as stale even when its counters are high', () => {
    expect(judge('ralph', state(ralph(NOW - 4 * HOUR, { iteration: 480 })), NOW, LIMITS)?.kind).toBe('stale')
  })

  test('an active state with no activity time is stale', () => {
    expect(textOf('team', '{"active":true,"stage":"exec"}')).toBe('stale: no activity time recorded; cancel or resume')
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

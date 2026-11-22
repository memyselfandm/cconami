// The mod in a session. The test's hooks stand for the engine: the session's
// id and directory, the environment, the files on disk, `git`, the agents the
// engine lists, and the bottom of each event the mod observes.

import type { On } from 'claude-code'
import { describe, expect, mock, test } from 'claude-code/testing'
import type { Engine, MockClock } from 'claude-code/testing'

import { COMMAND, REFRESH_MS, RESOLVE_EVERY } from '../hooks/register'
import { sha16 } from '../hooks/watch'
import {
  autopilot,
  autopilotPipeline,
  autopilotTyped,
  goals,
  OTHER_SID,
  ralph,
  ralphTyped,
  SID,
  team,
  teamTyped,
  ultragoal,
} from './fixtures'

const MIN = 60 * 1000
const HOUR = 60 * MIN
const NOW = Date.parse('2026-11-20T12:00:00.000Z')

const BAND = {
  plugin: 'omc-runs',
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
/** A ralph run near OMC's hard limit, and the row it draws. */
const LOOPING = () => ralph(NOW, { iteration: 480, max_iterations: 480 })
const LOOPING_ROW = 'ralph · iteration 480 · 22m · looping: iteration 480, hard limit 500'
const STALE_RALPH = (hours: number) => ralph(NOW - hours * HOUR)
/** ralph's fixture started 22 minutes before its last check. */
const staleRalphRow = (hours: number) => `ralph · iteration 12 · ${hours}h · stale for ${hours}h; cancel or resume`

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
  /** The agent ids `$.agent.list()` answers; null makes it fail. */
  listed: string[] | null
  clock: MockClock
}

type Setup = Partial<Pick<World, 'env' | 'cwd'>> & {
  /** The session id `$.session.id()` answers; SID when left out. */
  sid?: string
  /** Agent descriptions whose spawn the engine refuses. */
  refused?: string[]
}

function session(on: On, setup: Setup = {}): World {
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
    listed: null,
    clock: mock.clock(on, { now: NOW }),
  }
  mock.env(on, world.env)
  on('session.id', () => ({ value: setup.sid ?? SID }))
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
  on('agent.list', () => {
    if (world.listed === null) {
      return { deny: 'agent list unavailable' }
    }

    return {
      value: world.listed.map(id => ({
        id,
        description: id,
        type: 'general-purpose',
        status: 'running' as const,
        kind: 'local_agent' as const,
        taskStatus: 'running' as const,
        label: id,
        startTime: NOW,
        cwd: world.cwd,
        tokenCount: 0,
        tokenSamples: [],
        hasRow: true,
        concurrent: 1,
        depth: 1,
      })),
    }
  })
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.end', (_, e) => ({ sessionId: e.sessionId }))
  on('prompt.submit', (_, e) => ({ text: e.text }))
  on('tool.call', () => ({ result: {}, text: 'ok' }))
  // The engine's answer: the spawned agent's id is the call's description.
  on('agent.spawn', (_, e) =>
    setup.refused?.includes(e.description) === true ? { deny: 'refused' } : { model: 'model-x', agentId: e.description },
  )
  on('agent.report', (_, e) => ({ text: e.text }))
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', (_, e) => ({ text: e.answer }))

  return world
}

async function start($: Engine, world: World): Promise<void> {
  await $.session.start({ cwd: world.cwd, surface: 'terminal', isInteractive: true })
  await world.clock.settle()
}

type Drawn = { text: string; color: unknown; bold: unknown; dim: unknown }

async function drawn($: Engine, surface: 'terminal' | 'desktop' = 'terminal', hasSurvey = false): Promise<Drawn[]> {
  const band = await $.ui.mount({ ...BAND, surface, props: { ...BAND.props, hasSurvey } })
  const found = (await band.findAll({ type: 'Text' })).map(t => ({
    text: t.text,
    color: t.props.color,
    bold: t.props.bold,
    dim: t.props.dimColor,
  }))
  await band.unmount()

  return found
}

/** Each row's whole text: the main text, and its warning when it has one. */
async function lines($: Engine, surface: 'terminal' | 'desktop' = 'terminal', hasSurvey = false): Promise<string[]> {
  const out: string[] = []
  for (const t of await drawn($, surface, hasSurvey)) {
    if (t.color === 'warning' && t.text.startsWith(' · ') && out.length > 0) {
      out[out.length - 1] += t.text
    } else {
      out.push(t.text)
    }
  }

  return out
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

const PROVIDER = { plugin: 'engine', tier: 'core' } as const

function spawnInput(id: string, extra: { isTeammate?: true; workflow?: { runId: string; agentIndex: number } } = {}) {
  return {
    tool_use_id: `tu-${id}`,
    prompt: 'do the thing',
    description: id,
    subagentType: extra.isTeammate === true ? 'teammate' : 'executor',
    provider: PROVIDER,
    parentModel: 'model-x',
    background: false,
    fork: false,
    ...extra,
  }
}

async function spawn($: Engine, id: string, extra: Parameters<typeof spawnInput>[1] = {}) {
  return $.agent.spawn(spawnInput(id, extra) as Parameters<Engine['agent']['spawn']>[0])
}

async function report($: Engine, id: string) {
  return $.agent.report({ agentId: id, subagentType: 'executor', provider: PROVIDER, status: 'completed', text: `done ${id}` })
}

async function turnStart($: Engine, agentId?: string) {
  return $.turn.start({ text: '', turnId: `turn-${agentId ?? 'main'}`, ...(agentId === undefined ? {} : { agentId }) })
}

async function turnComplete($: Engine, agentId?: string) {
  return $.turn.complete({
    answer: 'ok',
    durationMs: 1,
    isAborted: false,
    turnId: `turn-${agentId ?? 'main'}`,
    reason: 'answer',
    ...(agentId === undefined ? {} : { agentId }),
  })
}

const ORIGIN = { kind: 'composer' } as const

async function command($: Engine): Promise<string | undefined> {
  const ran = await $.command.run({
    command: COMMAND,
    args: '',
    origin: ORIGIN as Parameters<Engine['command']['run']>[0]['origin'],
    presentation: { isFullscreen: false, columns: 100 },
  })

  return ran.text
}

describe('a row per active mode', () => {
  test('autopilot as the hooks write it: phase 3/5 execution, elapsed, on each surface', async ($, on) => {
    const world = session(on)
    world.files.set(sessionFile(ROOT, 'autopilot'), autopilot(NOW))
    await start($, world)
    for (const surface of ['terminal', 'desktop'] as const) {
      expect(await lines($, surface)).toEqual(['autopilot · phase 3/5 execution · 14m'])
    }
    expectReadOnly(world)
  })

  test('autopilot as initAutopilot() writes it: phase 2/5 planning', async ($, on) => {
    const world = session(on)
    world.files.set(sessionFile(ROOT, 'autopilot'), autopilotTyped(NOW))
    await start($, world)
    expect(await lines($)).toEqual(['autopilot · phase 2/5 planning · 20m'])
  })

  test('autopilot in each legacy phase, and one outside the list', async ($, on) => {
    const world = session(on)
    const expected: [string, string][] = [
      ['expansion', 'phase 1/5 expansion'],
      ['qa', 'phase 4/5 qa'],
      ['validation', 'phase 5/5 validation'],
      ['ralplan', 'phase ralplan'],
    ]
    await start($, world)
    for (const [phase, text] of expected) {
      world.files.set(sessionFile(ROOT, 'autopilot'), autopilot(NOW, { current_phase: phase }))
      await $.prompt.submit({ text: 'go', wait: false, origin: ORIGIN as Parameters<Engine['prompt']['submit']>[0]['origin'] })
      await world.clock.settle()
      expect(await lines($)).toEqual([`autopilot · ${text} · 14m`])
    }
  })

  test('autopilot running a named workflow: the pipeline stage, 2/4', async ($, on) => {
    const world = session(on)
    world.files.set(sessionFile(ROOT, 'autopilot'), autopilotPipeline(NOW))
    await start($, world)
    expect(await lines($)).toEqual(['autopilot · stage 2/4 execution · 20m'])
  })

  test('ralph: the iteration, the reviewer when recorded, and elapsed', async ($, on) => {
    const world = session(on)
    world.files.set(sessionFile(ROOT, 'ralph'), ralphTyped(NOW))
    await start($, world)
    expect(await lines($)).toEqual(['ralph · iteration 7 · reviewer: critic · 22m'])
    world.files.set(sessionFile(ROOT, 'ralph'), ralph(NOW))
    await world.clock.advance(REFRESH_MS)
    expect(await lines($)).toEqual(['ralph · iteration 12 · 23m'])
  })

  test('team as initTeamPipelineState() writes it: 4 workers, 3 busy', async ($, on) => {
    const world = session(on)
    world.files.set(sessionFile(ROOT, 'team'), teamTyped(NOW))
    await start($, world)
    expect(await lines($)).toEqual(['team · team-exec · 4 workers (3 busy) · 9m'])
  })

  test('team as the team skill writes it: its agent count, no busy count, no start time', async ($, on) => {
    const world = session(on)
    world.files.set(sessionFile(ROOT, 'team'), team(NOW))
    await start($, world)
    expect(await lines($)).toEqual(['team · team-exec · 3 workers'])
  })

  test('ultragoal: the active goal of its plan, else its phase', async ($, on) => {
    const world = session(on)
    world.files.set(sessionFile(ROOT, 'ultragoal'), ultragoal(NOW))
    world.files.set(`${ROOT}/ultragoal/goals.json`, goals())
    await start($, world)
    expect(await lines($)).toEqual(['ultragoal · goal 2/5 · 31m'])
    world.files.delete(`${ROOT}/ultragoal/goals.json`)
    await world.clock.advance(REFRESH_MS)
    expect(await lines($)).toEqual(['ultragoal · executing · 32m'])
  })

  test('two active modes draw a row each, in OMC’s mode order', async ($, on) => {
    const world = session(on)
    world.files.set(sessionFile(ROOT, 'team'), teamTyped(NOW))
    world.files.set(sessionFile(ROOT, 'ralph'), ralphTyped(NOW))
    await start($, world)
    expect(await lines($)).toEqual(['ralph · iteration 7 · reviewer: critic · 22m', 'team · team-exec · 4 workers (3 busy) · 9m'])
  })

  test('the elapsed time moves with the timed read', async ($, on) => {
    const world = session(on)
    world.files.set(sessionFile(ROOT, 'ralph'), ralphTyped(NOW))
    await start($, world)
    await world.clock.advance(10 * REFRESH_MS)
    // Still fresh: last_checked_at is ten minutes old.
    expect(await lines($)).toEqual(['ralph · iteration 7 · reviewer: critic · 32m'])
  })
})

describe('nothing drawn', () => {
  test('with no OMC state', async ($, on) => {
    const world = session(on)
    await start($, world)
    expect(await lines($)).toEqual([])
    expectReadOnly(world)
  })

  test('when every mode has ended', async ($, on) => {
    const world = session(on)
    world.files.set(sessionFile(ROOT, 'autopilot'), autopilot(NOW, { active: false }))
    world.files.set(sessionFile(ROOT, 'ralph'), ralph(NOW, { active: 'false' }))
    world.files.set(sessionFile(ROOT, 'team'), teamTyped(NOW, { active: false, phase: 'complete' }))
    await start($, world)
    expect(await lines($)).toEqual([])
  })

  test('when a run ends, its row goes at the next read', async ($, on) => {
    const world = session(on)
    world.files.set(sessionFile(ROOT, 'ralph'), ralphTyped(NOW))
    await start($, world)
    expect(await lines($)).toHaveLength(1)
    world.files.set(sessionFile(ROOT, 'ralph'), ralphTyped(NOW, { active: false }))
    await world.clock.advance(REFRESH_MS)
    expect(await lines($)).toEqual([])
  })

  test('for another session’s state; a legacy file naming this session is drawn', async ($, on) => {
    const world = session(on)
    world.files.set(sessionFile(ROOT, 'autopilot'), autopilot(NOW, { session_id: OTHER_SID }))
    world.files.set(sessionFile(ROOT, 'ralph', OTHER_SID), ralph(NOW, { session_id: OTHER_SID }))
    world.files.set(`${ROOT}/state/team-state.json`, team(NOW))
    await start($, world)
    expect(await lines($)).toEqual([])
    world.files.set(`${ROOT}/state/ralph-state.json`, ralph(NOW))
    await world.clock.advance(REFRESH_MS)
    expect(await lines($)).toEqual(['ralph · iteration 12 · 23m'])
  })

  test('while a survey is showing', async ($, on) => {
    const world = session(on)
    world.files.set(sessionFile(ROOT, 'autopilot'), autopilot(NOW))
    await start($, world)
    expect(await lines($, 'terminal', true)).toEqual([])
  })

  test('with an unsafe session id', async ($, on) => {
    // OMC's stop hook refuses an id that does not start with a letter or digit.
    const world = session(on, { sid: '_unsafe' })
    // A file at the path the id spells, naming that id: still not read.
    world.files.set(sessionFile(ROOT, 'ralph', '_unsafe'), ralph(NOW, { session_id: '_unsafe' }))
    await start($, world)
    expect(await lines($)).toEqual([])
  })
})

describe('the warning in the row', () => {
  test('stale: drawn after the row, bold in the warning colour; a healthy row is dim', async ($, on) => {
    const world = session(on)
    world.files.set(sessionFile(ROOT, 'autopilot'), autopilot(NOW - 3 * HOUR))
    world.files.set(sessionFile(ROOT, 'ralph'), ralphTyped(NOW))
    await start($, world)
    for (const surface of ['terminal', 'desktop'] as const) {
      expect(await drawn($, surface)).toEqual([
        { text: 'ralph · iteration 7 · reviewer: critic · 22m', color: undefined, bold: undefined, dim: true },
        { text: 'autopilot · phase 3/5 execution · 3h', color: undefined, bold: undefined, dim: false },
        { text: ' · stale for 3h; cancel or resume', color: 'warning', bold: true, dim: undefined },
      ])
    }
  })

  test('looping at OMC’s ceiling', async ($, on) => {
    const world = session(on)
    world.files.set(sessionFile(ROOT, 'team'), teamTyped(NOW, { reinforcement_count: 20 }))
    world.files.set(sessionFile(ROOT, 'ralph'), LOOPING())
    await start($, world)
    expect(await lines($)).toEqual([LOOPING_ROW, 'team · team-exec · 4 workers (3 busy) · 9m · looping: reinforcement 20/20'])
  })

  test('awaiting confirmation, for OMC’s two minutes only', async ($, on) => {
    const world = session(on)
    const set = new Date(NOW - 30_000).toISOString()
    world.files.set(sessionFile(ROOT, 'ultragoal'), ultragoal(NOW, { awaiting_confirmation: true, awaiting_confirmation_set_at: set }))
    await start($, world)
    expect(await lines($)).toEqual(['ultragoal · executing · 31m · awaiting confirmation'])
    await world.clock.advance(2 * MIN)
    expect(await lines($)).toEqual(['ultragoal · executing · 33m'])
  })

  test('a stale run awaiting confirmation shows stale', async ($, on) => {
    const world = session(on)
    const set = new Date(NOW - 30_000).toISOString()
    world.files.set(sessionFile(ROOT, 'autopilot'), autopilot(NOW - 3 * HOUR, { awaiting_confirmation: true, awaiting_confirmation_set_at: set }))
    await start($, world)
    expect(await lines($)).toEqual(['autopilot · phase 3/5 execution · 3h · stale for 3h; cancel or resume'])
  })

  test('an active state with no activity time', async ($, on) => {
    const world = session(on)
    world.files.set(sessionFile(ROOT, 'team'), '{"active":true,"stage":"exec"}')
    await start($, world)
    expect(await lines($)).toEqual(['team · exec · stale: no activity time recorded; cancel or resume'])
  })

  test('a run that goes quiet turns stale at the next timed read', async ($, on) => {
    const world = session(on)
    world.files.set(sessionFile(ROOT, 'ralph'), ralph(NOW))
    await start($, world)
    await world.clock.advance(2 * HOUR)
    expect(await lines($)).toEqual(['ralph · iteration 12 · 2h'])
    await world.clock.advance(REFRESH_MS)
    expect(await lines($)).toEqual(['ralph · iteration 12 · 2h · stale for 2h; cancel or resume'])
  })

  test('OMC_SECURITY=strict lowers ralph’s hard limit to 200', async ($, on) => {
    const world = session(on, { env: { OMC_SECURITY: 'strict' } })
    world.files.set(sessionFile(ROOT, 'ralph'), ralph(NOW, { iteration: 190, max_iterations: 190 }))
    await start($, world)
    expect(await lines($)).toEqual(['ralph · iteration 190 · 22m · looping: iteration 190, hard limit 200'])
  })

  test('the settings move the thresholds', { options: { staleHours: 4, reinforcementLimit: 3 } }, async ($, on) => {
    const world = session(on)
    world.files.set(sessionFile(ROOT, 'autopilot'), autopilot(NOW - 3 * HOUR, { reinforcement_count: 0 }))
    world.files.set(sessionFile(ROOT, 'team'), team(NOW, { reinforcement_count: 3 }))
    await start($, world)
    expect(await lines($)).toEqual(['autopilot · phase 3/5 execution · 3h', 'team · team-exec · 3 workers · looping: reinforcement 3/3'])
  })
})

describe('agents, counted from this session’s events', () => {
  test('subagents started minus reported, on the row', async ($, on) => {
    const world = session(on)
    world.files.set(sessionFile(ROOT, 'autopilot'), autopilot(NOW))
    await start($, world)
    await spawn($, 'a1')
    await spawn($, 'a2')
    await spawn($, 'a3')
    expect(await lines($)).toEqual(['autopilot · phase 3/5 execution · 14m · 3 agents running'])
    await report($, 'a2')
    expect(await lines($)).toEqual(['autopilot · phase 3/5 execution · 14m · 2 agents running'])
    await report($, 'a1')
    expect(await lines($)).toEqual(['autopilot · phase 3/5 execution · 14m · 1 agent running'])
    await report($, 'a3')
    expect(await lines($)).toEqual(['autopilot · phase 3/5 execution · 14m'])
  })

  test('the hooks pass the engine’s answers through unchanged', async ($, on) => {
    const world = session(on)
    await start($, world)
    expect(await spawn($, 'a1')).toEqual({ model: 'model-x', agentId: 'a1' })
    expect(await report($, 'a1')).toEqual({ text: 'done a1' })
    expect(await $.tool.call({ tool: 'Bash', command: 'ls', tool_use_id: 't1' })).toMatchObject({ text: 'ok' })
  })

  test('a report for an agent never started, a second report, or a resumed spawn change nothing', async ($, on) => {
    const world = session(on)
    world.files.set(sessionFile(ROOT, 'ralph'), ralphTyped(NOW))
    await start($, world)
    await spawn($, 'a1')
    await spawn($, 'a1')
    await report($, 'zz')
    expect(await lines($)).toEqual(['ralph · iteration 7 · reviewer: critic · 22m · 1 agent running'])
    await report($, 'a1')
    await report($, 'a1')
    expect(await lines($)).toEqual(['ralph · iteration 7 · reviewer: critic · 22m'])
  })

  test('a refused spawn, a workflow agent and a teammate are not running subagents', async ($, on) => {
    const world = session(on, { refused: ['refused'] })
    world.files.set(sessionFile(ROOT, 'ralph'), ralphTyped(NOW))
    await start($, world)
    await spawn($, 'refused')
    await spawn($, 'w1', { workflow: { runId: 'r1', agentIndex: 0 } })
    await spawn($, 'tm1', { isTeammate: true })
    expect(await lines($)).toEqual(['ralph · iteration 7 · reviewer: critic · 22m'])
  })

  test('a team row counts this session’s teammates, busy while in a turn', async ($, on) => {
    const world = session(on)
    world.files.set(sessionFile(ROOT, 'team'), teamTyped(NOW))
    await start($, world)
    for (const id of ['w1', 'w2', 'w3', 'w4']) {
      await spawn($, id, { isTeammate: true })
    }
    expect(await lines($)).toEqual(['team · team-exec · 4 workers (0 busy) · 9m'])
    await turnStart($, 'w1')
    await turnStart($, 'w2')
    await turnStart($, 'w3')
    expect(await lines($)).toEqual(['team · team-exec · 4 workers (3 busy) · 9m'])
    await turnComplete($, 'w2')
    expect(await lines($)).toEqual(['team · team-exec · 4 workers (2 busy) · 9m'])
    // A turn in a loop that is not a teammate's marks nothing.
    await turnStart($, 'stranger')
    expect(await lines($)).toEqual(['team · team-exec · 4 workers (2 busy) · 9m'])
  })

  test('agents the engine no longer lists are dropped at the next read', async ($, on) => {
    const world = session(on)
    world.files.set(sessionFile(ROOT, 'team'), team(NOW))
    await start($, world)
    await spawn($, 'a1')
    await spawn($, 'a2')
    await spawn($, 'w1', { isTeammate: true })
    await spawn($, 'w2', { isTeammate: true })
    expect(await lines($)).toEqual(['team · team-exec · 2 workers (0 busy) · 2 agents running'])
    world.listed = ['a2', 'w2']
    await world.clock.advance(REFRESH_MS)
    expect(await lines($)).toEqual(['team · team-exec · 1 worker (0 busy) · 1 agent running'])
  })

  test('when the engine cannot list agents, nothing is dropped', async ($, on) => {
    const world = session(on)
    world.files.set(sessionFile(ROOT, 'ralph'), ralphTyped(NOW))
    await start($, world)
    await spawn($, 'a1')
    await world.clock.advance(REFRESH_MS)
    expect(await lines($)).toEqual(['ralph · iteration 7 · reviewer: critic · 23m · 1 agent running'])
  })

  test('a /clear or /resume starts the tally over', async ($, on) => {
    const world = session(on)
    world.files.set(sessionFile(ROOT, 'ralph'), ralphTyped(NOW))
    await start($, world)
    await spawn($, 'a1')
    await $.session.end({ reason: 'clear', sessionId: SID } as Parameters<Engine['session']['end']>[0])
    await world.clock.settle()
    expect(await lines($)).toEqual(['ralph · iteration 7 · reviewer: critic · 22m'])
  })
})

describe('when it reads', () => {
  test('a submitted prompt reads again: OMC writes a mode’s state as the prompt is submitted', async ($, on) => {
    const world = session(on)
    await start($, world)
    world.files.set(sessionFile(ROOT, 'ralph'), ralph(NOW))
    await $.prompt.submit({ text: '/oh-my-claudecode:ralph go', wait: false, origin: ORIGIN as Parameters<Engine['prompt']['submit']>[0]['origin'] })
    await world.clock.settle()
    expect(await lines($)).toEqual(['ralph · iteration 12 · 22m'])
  })

  test('the main loop’s turn ending reads again; a subagent’s does not', async ($, on) => {
    const world = session(on)
    world.files.set(sessionFile(ROOT, 'ralph'), ralph(NOW))
    await start($, world)
    world.files.set(sessionFile(ROOT, 'ralph'), ralph(NOW, { iteration: 13 }))
    await turnComplete($, 'sub1')
    await world.clock.settle()
    expect(await lines($)).toEqual(['ralph · iteration 12 · 22m'])
    await turnComplete($)
    await world.clock.settle()
    expect(await lines($)).toEqual(['ralph · iteration 13 · 22m'])
  })

  test('an OMC state tool call reads again at once; another call does not', async ($, on) => {
    const world = session(on)
    world.files.set(sessionFile(ROOT, 'ralph'), ralph(NOW))
    await start($, world)
    world.files.set(sessionFile(ROOT, 'ralph'), LOOPING())
    await $.tool.call({ tool: 'Bash', command: 'git status', tool_use_id: 't1' })
    await world.clock.settle()
    expect(await lines($)).toEqual(['ralph · iteration 12 · 22m'])
    const result = await $.tool.call({ tool: 'mcp__plugin_oh-my-claudecode_t__state_write', mode: 'ralph', tool_use_id: 't2' })
    expect(result.text).toBe('ok')
    await world.clock.settle()
    expect(await lines($)).toEqual([LOOPING_ROW])
    expectReadOnly(world)
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

  test('ultragoal’s plan is read only while ultragoal is active', async ($, on) => {
    const world = session(on)
    const plan = `${ROOT}/ultragoal/goals.json`
    world.files.set(plan, goals())
    world.files.set(sessionFile(ROOT, 'ralph'), ralph(NOW))
    world.files.set(sessionFile(ROOT, 'ultragoal'), ultragoal(NOW, { active: false }))
    await start($, world)
    expect(world.reads.get(plan) ?? 0).toBe(0)
    expect(await lines($)).toEqual(['ralph · iteration 12 · 22m'])
  })
})

describe('the detail command', () => {
  test(`/${COMMAND} prints the plan file, the last phase change and the cancel command`, async ($, on) => {
    const world = session(on)
    world.files.set(sessionFile(ROOT, 'autopilot'), autopilotTyped(NOW))
    world.files.set(sessionFile(ROOT, 'team'), teamTyped(NOW))
    await start($, world)
    await spawn($, 'a1')
    expect(await command($)).toBe(
      [
        'autopilot · phase 2/5 planning · 20m · 1 agent running',
        '  plan: .omc/plans/autopilot-impl.md',
        `  last phase change: planning at ${new Date(NOW - 5 * MIN).toISOString()}`,
        '  cancel: /oh-my-claudecode:cancel',
        '',
        'team · team-exec · 4 workers (3 busy) · 9m · 1 agent running',
        '  plan: .omc/plans/team-plan.md',
        `  last phase change: team-exec at ${new Date(NOW - 4 * MIN).toISOString()}`,
        '  cancel: /oh-my-claudecode:cancel',
      ].join('\n'),
    )
  })

  test('it carries the warning, and says when nothing is recorded', async ($, on) => {
    const world = session(on)
    world.files.set(sessionFile(ROOT, 'ralph'), STALE_RALPH(3))
    await start($, world)
    expect(await command($)).toBe(
      [
        'ralph · iteration 12 · 3h',
        '  warning: stale for 3h; cancel or resume',
        '  plan: none recorded',
        '  last phase change: none recorded',
        '  cancel: /oh-my-claudecode:cancel',
      ].join('\n'),
    )
  })

  test('with no active mode it says so', async ($, on) => {
    const world = session(on)
    await start($, world)
    expect(await command($)).toBe('No oh-my-claudecode mode is active in this session.')
  })
})

describe('where the state is read from', () => {
  test('from a subdirectory, the git top level’s .omc', async ($, on) => {
    const world = session(on, { cwd: `${REPO}/src/deep` })
    world.git.set(`${REPO}/src/deep rev-parse --show-toplevel`, REPO)
    world.files.set(sessionFile(ROOT, 'ralph'), STALE_RALPH(3))
    world.files.set(sessionFile(`${REPO}/src/deep/.omc`, 'team'), team(NOW))
    await start($, world)
    expect(await lines($)).toEqual([staleRalphRow(3)])
  })

  test('inside a submodule, the outermost superproject’s .omc', async ($, on) => {
    const sub = `${REPO}/vendor/lib`
    const world = session(on, { cwd: sub })
    world.git.set(`${sub} rev-parse --show-toplevel`, sub)
    world.git.set(`${sub} rev-parse --show-superproject-working-tree`, REPO)
    world.files.set(sessionFile(ROOT, 'ralph'), LOOPING())
    world.files.set(sessionFile(`${sub}/.omc`, 'team'), team(NOW))
    await start($, world)
    expect(await lines($)).toEqual([LOOPING_ROW])
  })

  test('a file in another session directory that names this session is read', async ($, on) => {
    const world = session(on)
    world.files.set(sessionFile(ROOT, 'ralph', OTHER_SID), STALE_RALPH(3))
    await start($, world)
    expect(await lines($)).toEqual([staleRalphRow(3)])
  })

  test('the global $HOME/.omc/state file counts when it names this session and the root has none', async ($, on) => {
    const world = session(on)
    world.files.set('/home/me/.omc/state/ralph-state.json', LOOPING())
    world.files.set('/home/me/.omc/state/team-state.json', team(NOW))
    await start($, world)
    expect(await lines($)).toEqual([LOOPING_ROW])
    // The root's own legacy file, even another session's, hides the global one.
    world.files.set(`${ROOT}/state/ralph-state.json`, ralph(NOW, { session_id: OTHER_SID }))
    await world.clock.advance(REFRESH_MS)
    expect(await lines($)).toEqual([])
  })

  test('a marker at home or above is never used', async ($, on) => {
    const world = session(on)
    world.files.set('/home/me/.omc-workspace', '{}')
    world.files.set('/home/.omc-workspace', '{}')
    world.files.set(sessionFile(ROOT, 'ralph'), LOOPING())
    await start($, world)
    expect(await lines($)).toEqual([LOOPING_ROW])
  })

  test('a workspace marker between home and the repository wins', async ($, on) => {
    const world = session(on, { cwd: '/home/me/ws/repo' })
    world.git.set('/home/me/ws/repo rev-parse --show-toplevel', '/home/me/ws/repo')
    world.files.set('/home/me/ws/.omc-workspace', '{}')
    world.files.set(sessionFile('/home/me/ws/.omc', 'team'), team(NOW))
    world.files.set(sessionFile('/home/me/ws/repo/.omc', 'ralph'), ralph(NOW))
    await start($, world)
    expect(await lines($)).toEqual(['team · team-exec · 3 workers'])
  })

  test('a workspace marker in a sensitive location is skipped, in a repository', async ($, on) => {
    const world = session(on, { cwd: '/home/me/Documents/ws/repo' })
    world.git.set('/home/me/Documents/ws/repo rev-parse --show-toplevel', '/home/me/Documents/ws/repo')
    world.files.set('/home/me/Documents/ws/.omc-workspace', '{}')
    world.files.set(sessionFile('/home/me/Documents/ws/.omc', 'team'), team(NOW))
    world.files.set(sessionFile('/home/me/Documents/ws/repo/.omc', 'ralph'), STALE_RALPH(3))
    await start($, world)
    expect(await lines($)).toEqual([staleRalphRow(3)])
  })

  test('a workspace marker in a sensitive location is skipped outside a repository: $HOME/.omc', async ($, on) => {
    const world = session(on, { cwd: '/home/me/.config/ws/sub' })
    world.files.set('/home/me/.config/ws/.omc-workspace', '{}')
    world.files.set(sessionFile('/home/me/.config/ws/.omc', 'team'), team(NOW))
    world.files.set(sessionFile('/home/me/.omc', 'ralph'), STALE_RALPH(3))
    await start($, world)
    expect(await lines($)).toEqual([staleRalphRow(3)])
  })

  test('outside a repository, a safe workspace marker anchors the state', async ($, on) => {
    const world = session(on, { cwd: '/srv/ws/sub' })
    world.files.set('/srv/ws/.omc-workspace', '{}')
    world.files.set(sessionFile('/srv/ws/.omc', 'team'), team(NOW))
    await start($, world)
    expect(await lines($)).toEqual(['team · team-exec · 3 workers'])
  })

  test('OMC_DISABLE_MULTIREPO=1 ignores the marker', async ($, on) => {
    const world = session(on, { cwd: '/home/me/ws/repo', env: { OMC_DISABLE_MULTIREPO: '1' } })
    world.git.set('/home/me/ws/repo rev-parse --show-toplevel', '/home/me/ws/repo')
    world.files.set('/home/me/ws/.omc-workspace', '{}')
    world.files.set(sessionFile('/home/me/ws/.omc', 'team'), team(NOW))
    world.files.set(sessionFile('/home/me/ws/repo/.omc', 'ralph'), STALE_RALPH(3))
    await start($, world)
    expect(await lines($)).toEqual([staleRalphRow(3)])
  })

  test('outside a repository, $HOME/.omc', async ($, on) => {
    const world = session(on, { cwd: '/srv/scratch' })
    world.files.set(sessionFile('/home/me/.omc', 'ralph'), STALE_RALPH(3))
    world.files.set(sessionFile('/srv/scratch/.omc', 'team'), team(NOW))
    await start($, world)
    expect(await lines($)).toEqual([staleRalphRow(3)])
  })

  test('outside a repository with no home directory, nothing is read', async ($, on) => {
    const world = session(on, { cwd: '/srv/scratch', env: { HOME: '' } })
    world.files.set(sessionFile('/srv/scratch/.omc', 'ralph'), ralph(NOW))
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
    expect(await lines($)).toEqual(['ralph · iteration 480 · 23m · looping: iteration 480, hard limit 500'])
  })

  test('a sure root is kept, and worked out again every RESOLVE_EVERY reads, not one more', async ($, on) => {
    expect(RESOLVE_EVERY).toBe(10)
    const world = session(on, { cwd: '/srv/proj' })
    world.files.set(sessionFile('/srv/proj/.omc', 'ralph'), LOOPING())
    await start($, world)
    expect(await lines($)).toEqual([])
    world.git.set('/srv/proj rev-parse --show-toplevel', '/srv/proj')
    await world.clock.advance((RESOLVE_EVERY - 1) * REFRESH_MS)
    expect(await lines($)).toEqual([])
    // Read 11 works it out again; ten minutes on, the run is still fresh.
    await world.clock.advance(REFRESH_MS)
    expect(await lines($)).toEqual(['ralph · iteration 480 · 32m · looping: iteration 480, hard limit 500'])
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
    expect(await lines($)).toEqual(['ralph · iteration 480 · 23m · looping: iteration 480, hard limit 500'])
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
    expect(await lines($)).toEqual(['ralph · iteration 480 · 23m · looping: iteration 480, hard limit 500'])
  })

  test('OMC_STATE_DIR: a repository with no origin remote is a sure answer, and kept', async ($, on) => {
    const world = session(on, { env: { OMC_STATE_DIR: '/state' } })
    world.failures.set(`${REPO} remote get-url origin`, "error: No such remote 'origin'")
    world.git.set(`${REPO} rev-parse --path-format=absolute --git-common-dir`, `${REPO}/.git`)
    world.files.set(sessionFile(`/state/repo-${await sha16(REPO)}`, 'ralph'), LOOPING())
    await start($, world)
    expect(await lines($)).toEqual([LOOPING_ROW])
    world.failures.clear()
    world.git.set(`${REPO} remote get-url origin`, 'git@github.com:acme/widgets.git')
    await world.clock.advance(REFRESH_MS)
    expect(await lines($)).toEqual(['ralph · iteration 480 · 23m · looping: iteration 480, hard limit 500'])
  })

  test('OMC_STATE_DIR: a timed-out common-dir probe is not kept', async ($, on) => {
    const world = session(on, { cwd: '/srv/wt', env: { OMC_STATE_DIR: '/state' } })
    world.git.set('/srv/wt rev-parse --show-toplevel', '/srv/wt')
    world.git.set('/srv/wt rev-parse --path-format=absolute --git-common-dir', `${REPO}/.git`)
    world.timeouts.add('/srv/wt rev-parse --path-format=absolute --git-common-dir')
    world.files.set(sessionFile(`/state/repo-${await sha16(REPO)}`, 'ralph'), LOOPING())
    await start($, world)
    expect(await lines($)).toEqual([])
    world.timeouts.clear()
    await world.clock.advance(REFRESH_MS)
    expect(await lines($)).toEqual(['ralph · iteration 480 · 23m · looping: iteration 480, hard limit 500'])
  })

  test('OMC_STATE_DIR: $OMC_STATE_DIR/<project id>, the id from the origin remote', async ($, on) => {
    const world = session(on, { env: { OMC_STATE_DIR: '/state' } })
    world.git.set(`${REPO} remote get-url origin`, 'git@github.com:acme/widgets.git')
    world.git.set(`${REPO} rev-parse --path-format=absolute --git-common-dir`, `${REPO}/.git`)
    world.files.set(sessionFile('/state/repo-44d052bc011d3b94', 'ralph'), STALE_RALPH(3))
    world.files.set(sessionFile(ROOT, 'team'), team(NOW))
    await start($, world)
    expect(await lines($)).toEqual([staleRalphRow(3)])
    expectReadOnly(world)
  })

  test('OMC_STATE_DIR outside a repository: $OMC_STATE_DIR/non-git', async ($, on) => {
    const world = session(on, { cwd: '/srv/scratch', env: { OMC_STATE_DIR: '/state' } })
    world.files.set(sessionFile('/state/non-git', 'ralph'), LOOPING())
    await start($, world)
    expect(await lines($)).toEqual([LOOPING_ROW])
  })

  test('OMC_STATE_DIR with a workspace marker id, found from the working directory', async ($, on) => {
    const world = session(on, { cwd: '/home/me/ws/repo/sub', env: { OMC_STATE_DIR: '/state' } })
    world.git.set('/home/me/ws/repo/sub rev-parse --show-toplevel', '/home/me/ws/repo')
    world.files.set('/home/me/ws/repo/sub/.omc-workspace', '{"id":"my-org"}')
    world.files.set(sessionFile('/state/my-org-c6f029eb68756a03', 'team'), team(NOW))
    await start($, world)
    expect(await lines($)).toEqual(['team · team-exec · 3 workers'])
  })
})

import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, Timer } from 'claude-code'

import type { AgentTally, Run } from '../types'
import { EMPTY_TALLY, reconcile, reported, spawned, tallyIds, turned } from './agents'
import { readGoals, readMode, resolveRoot } from './locate'
import { buildRun, detailText, labelRuns, rowText } from './progress'
import { GUARDED_MODES, isSafeSessionId, ralphHardLimit, thresholds, touchesOmcState } from './watch'
import type { Thresholds } from './watch'

const runs = atom({ plugin: 'omc-runs', key: 'runs' } as const, [] as Run[])
const agents = atom({ plugin: 'omc-runs', key: 'agents' } as const, EMPTY_TALLY)

/** How often the state files are read again; elapsed times are in minutes. */
export const REFRESH_MS = 60_000
/** The state root is worked out again after this many reads, whatever happened. */
export const RESOLVE_EVERY = 10
/** The slash command that prints each run's detail. */
export const COMMAND = 'omc-runs'

// Module state; a reload starts it over, and session.start reads again.
let limits: Thresholds = thresholds({})
let cached: { cwd: string; root: string | null; reads: number } | null = null
let isReading = false
let isAgain = false
let ticker: Timer | null = null

async function readAll($: EngineInterface): Promise<void> {
  const sessionId = await $.session.id()
  const cwd = await $.session.cwd()
  let root: string | null
  if (cached === null || cached.cwd !== cwd || cached.reads >= RESOLVE_EVERY) {
    const resolved = await resolveRoot($, cwd)
    // A root found while git could not be asked is used once, not kept. This
    // read is the first of RESOLVE_EVERY.
    cached = resolved.isSure ? { cwd, root: resolved.root, reads: 1 } : null
    root = resolved.root
  } else {
    cached.reads += 1
    root = cached.root
  }
  await readRuns($, root, sessionId)
  await reconcileAgents($)
}

async function readRuns($: EngineInterface, root: string | null, sessionId: string): Promise<void> {
  let found: Run[] = []
  if (root !== null && isSafeSessionId(sessionId)) {
    const home = (await $.env.get('HOME')) || null
    const now = await $.clock.now()
    const current = { ...limits, ralphHardLimit: ralphHardLimit((await $.env.get('OMC_SECURITY')) || null) }
    for (const mode of GUARDED_MODES) {
      const got = await readMode($, root, sessionId, mode, home)
      if (got === null) {
        continue
      }
      // ultragoal's plan is read only while ultragoal is active.
      const goals = mode === 'ultragoal' && got.state.isActive ? await readGoals($, root) : null
      const run = buildRun(mode, got.state, got.raw, goals, now, current)
      if (run !== null) {
        found.push(run)
      }
    }
    found = labelRuns(found)
  }
  // Redraw only when what the rows hold changes.
  if (JSON.stringify(await read($, runs)) !== JSON.stringify(found)) {
    await update($, runs, () => found)
  }
}

async function reconcileAgents($: EngineInterface): Promise<void> {
  // The ids tallied before the list is asked for: an agent tallied while it is
  // awaited is not judged by a list that may predate it.
  const snapshot = tallyIds(await read($, agents))
  if (snapshot.size === 0) {
    return
  }
  const listed = await $.agent.list().catch(() => null)
  if (listed !== null) {
    const statuses = new Map(listed.map(agent => [agent.id, String(agent.status)] as const))
    await tallied($, t => reconcile(t, snapshot, statuses))
  }
}

/** Reads now, or once more after the read under way, never two at a time. */
async function refresh($: EngineInterface): Promise<void> {
  if (isReading) {
    isAgain = true

    return
  }
  isReading = true
  try {
    do {
      isAgain = false
      await readAll($)
    } while (isAgain)
  } finally {
    isReading = false
  }
}

function log($: EngineInterface, error: unknown): void {
  try {
    $.ui.log(`omc-runs: could not read OMC state: ${String(error)}`, { to: 'debug' })
  } catch {
    // Nothing more can be reported.
  }
}

function later($: EngineInterface): void {
  $.clock.after(0, () => {
    refresh($).catch(error => log($, error))
  })
}

async function tallied($: EngineInterface, change: (tally: AgentTally) => AgentTally): Promise<void> {
  const before = await read($, agents)
  const after = change(before)
  if (after !== before) {
    await update($, agents, () => after)
  }
}

// READ ONLY: the mod reads OMC's state files and runs `git` to find them. It
// never writes or deletes OMC state and never calls OMC's tools. Its hooks on
// tool calls, agents and turns only observe: each returns next(e)'s result
// unchanged.
export const register: Register = (on, options) => {
  limits = thresholds(options)
  cached = null

  on('session.start', async ($, e, next) => {
    cached = null
    await $.command.register({
      name: COMMAND,
      description: 'Show each active oh-my-claudecode run: plan file, last phase change, and how to cancel',
    })
    later($)
    // One timed read per mod, however many times the session starts.
    ticker?.cancel()
    ticker = $.clock.every(REFRESH_MS, () => {
      refresh($).catch(error => log($, error))
    })

    return next(e)
  })

  // A /clear or a /resume goes on under another session id, with no
  // session.start: start the tally over and read again for the new one. The
  // read waits on a zero-delay timer, by when $.session.id() is the new id.
  on('session.end', async ($, e, next) => {
    const result = await next(e)
    await update($, agents, () => EMPTY_TALLY)
    later($)

    return result
  })

  // OMC's keyword detector writes a mode's state from its UserPromptSubmit
  // hook, which runs inside next(e); its stop hook updates state as a turn ends.
  on('prompt.submit', async ($, e, next) => {
    const result = await next(e)
    later($)

    return result
  })

  on('tool.call', async ($, e, next) => {
    const result = await next(e)
    if (touchesOmcState(e.tool, e)) {
      later($)
    }

    return result
  }).catch(($, e, next) => next(e))

  on('agent.spawn', async ($, e, next) => {
    const result = await next(e)
    if (result.deny === undefined && result.agentId !== undefined) {
      const id = result.agentId
      const kind = e.workflow !== undefined ? 'workflow' : e.isTeammate === true ? 'teammate' : 'subagent'
      await tallied($, t => spawned(t, id, kind))
    }

    return result
  }).catch(($, e, next) => next(e))

  on('agent.report', async ($, e, next) => {
    const result = await next(e)
    await tallied($, t => reported(t, e.agentId))

    return result
  })

  on('turn.start', async ($, e, next) => {
    const result = await next(e)
    const id = e.agentId
    if (id !== undefined) {
      await tallied($, t => turned(t, id, true))
    }

    return result
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    const id = e.agentId
    if (id !== undefined) {
      await tallied($, t => turned(t, id, false))
    } else {
      later($)
    }

    return result
  })

  on('command.run', { command: COMMAND }, async $ => {
    const list = await read($, runs)
    const tally = await read($, agents)
    if (list.length === 0) {
      return { text: 'No oh-my-claudecode mode is active in this session.' }
    }

    return { text: list.map((run, i) => detailText(run, tally, i === 0)).join('\n\n') }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const list = await read($, runs)
    if (e.props.hasSurvey || list.length === 0) {
      return next(e)
    }
    const tally = await read($, agents)
    const { Box, Text } = $.ui.resolve(e)

    // One Text per row, the warning nested inside it, so a narrow terminal
    // wraps the row as one line rather than as two columns.
    return (
      <Box flexDirection="column">
        {list.map((run, i) => (
          <Box key={`omc-${run.mode}`}>
            <Text dimColor={run.warning === null}>
              {rowText(run, tally, i === 0)}
              {run.warning === null ? null : (
                <Text bold color="warning">
                  {` · ${run.warning}`}
                </Text>
              )}
            </Text>
          </Box>
        ))}
      </Box>
    )
  })
}

// Pure logic for counting this session's agents from its own events, not from
// OMC's state files: a subagent is running from the `agent.spawn` that started
// it until its `agent.report`; a teammate is busy from a `turn.start` in its
// loop until that turn's `turn.complete`. No engine calls here.

import type { AgentTally } from '../types'

export const EMPTY_TALLY: AgentTally = { running: [], teammates: [] }

/**
 * After an `agent.spawn` that started an agent (`agentId` set). A teammate is
 * tallied as a worker, idle until its first turn starts. A workflow script's
 * agent is not tallied: `agent.report` is not raised for it, so it would
 * never be counted as finished. A resumed run spawns again under its own id
 * and is counted once.
 */
export function spawned(tally: AgentTally, id: string, kind: 'subagent' | 'teammate' | 'workflow'): AgentTally {
  if (kind === 'workflow') {
    return tally
  }
  if (kind === 'teammate') {
    return tally.teammates.some(t => t.id === id)
      ? tally
      : { ...tally, teammates: [...tally.teammates, { id, isBusy: false }] }
  }

  return tally.running.includes(id) ? tally : { ...tally, running: [...tally.running, id] }
}

/** After an `agent.report`: the run ended or was stopped. An id never tallied changes nothing. */
export function reported(tally: AgentTally, id: string): AgentTally {
  return tally.running.includes(id) ? { ...tally, running: tally.running.filter(r => r !== id) } : tally
}

/** After a `turn.start` (busy) or `turn.complete` (idle) in a loop; only teammates are marked. */
export function turned(tally: AgentTally, id: string, isBusy: boolean): AgentTally {
  const at = tally.teammates.findIndex(t => t.id === id)
  if (at === -1 || tally.teammates[at]?.isBusy === isBusy) {
    return tally
  }

  return { ...tally, teammates: tally.teammates.map(t => (t.id === id ? { id, isBusy } : t)) }
}

/**
 * Drops agents the engine no longer lists (`$.agent.list()`): a teammate that
 * ended, or a subagent whose report this module missed, as across a reload.
 * The list keeps an ended agent for a while, so it only ever prunes.
 */
export function prune(tally: AgentTally, live: ReadonlySet<string>): AgentTally {
  const running = tally.running.filter(id => live.has(id))
  const teammates = tally.teammates.filter(t => live.has(t.id))

  return running.length === tally.running.length && teammates.length === tally.teammates.length
    ? tally
    : { running, teammates }
}

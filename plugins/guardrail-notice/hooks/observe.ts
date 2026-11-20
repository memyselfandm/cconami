// The two hooks that sit in every tool call's path, and the work they start.
// The hooks only observe: each awaits next(e), returns exactly the object it
// resolved to, and starts its work on a zero-delay timer, so nothing runs
// before the hook returns. Exported so the tests can check that the returned
// object is the same one.

import { atom, read, update } from 'claude-code'
import type { CatchHandler, EngineInterface, Hook, ToolCallEnvelope } from 'claude-code'

import type { Refusal } from '../types'
import { addActive, BUILT_IN, MAX_CALLS, callKey, clearKey, describe, isShown, summary, trackCall } from './logic'
import type { Source } from './logic'

const active = atom({ plugin: 'guardrail-notice', key: 'active' } as const, [] as Refusal[])
// The ids of the refused calls that still have a card entry, newest first.
const calls = atom({ plugin: 'guardrail-notice', key: 'calls' } as const, [] as string[])

// How many successes of each call key have been seen, newest keys last and
// at most MAX_CALLS of them. A refusal's write is not one update (two atoms),
// so record compares this against what it saw when the refusal was decided.
const successes = new Map<string, number>()

function markSuccess(key: string): void {
  const count = successes.get(key) ?? 0
  successes.delete(key)
  successes.set(key, count + 1)
  if (successes.size > MAX_CALLS) {
    successes.delete(successes.keys().next().value as string)
  }
}

/** The settings the recorded work reads; register sets them once per load. */
const settings: { sources: readonly Source[]; isToasting: boolean } = { sources: BUILT_IN, isToasting: true }

export function configure(sources: readonly Source[], isToasting: boolean): void {
  settings.sources = sources
  settings.isToasting = isToasting
}

// Called from a .catch: `$.ui.log` returns nothing, so a throw is caught here
// rather than escaping as an unhandled rejection.
function log($: EngineInterface, what: string, error: unknown): void {
  try {
    $.ui.log(`guardrail-notice: ${what}: ${String(error)}`, { to: 'debug' })
  } catch {
    // Nothing more can be reported.
  }
}

async function record($: EngineInterface, e: ToolCallEnvelope, reason: string, seen: number): Promise<void> {
  const refusal = describe({ tool: e.tool, toolUseId: e.tool_use_id, input: e }, reason, settings.sources)
  let evicted: string[] = []
  await update($, calls, ids => {
    const tracked = trackCall(ids, refusal.toolUseId)
    evicted = tracked.evicted

    return tracked.ids
  })
  for (const id of evicted) {
    await update($, atom({ plugin: 'guardrail-notice', key: 'call', id } as const, null), () => null)
  }
  await update($, atom({ plugin: 'guardrail-notice', key: 'call', id: refusal.toolUseId } as const, null), () => refusal)
  let isNew = true
  await update($, active, list => {
    isNew = !isShown(list, refusal)

    return addActive(list, refusal)
  })
  // The entry and the list are two atoms, so they cannot change in one
  // update. If an identical call succeeded while they were written, its
  // clear may have run before the entry existed: clear it again.
  if ((successes.get(refusal.key) ?? 0) !== seen) {
    await update($, active, list => clearKey(list, refusal.key))
  }
  if (settings.isToasting && isNew) {
    $.ui.toast(summary(refusal))
  }
}

// A later call that succeeds with exactly the same command (or the same tool
// and input) clears the waiting refusal.
async function clear($: EngineInterface, e: ToolCallEnvelope): Promise<void> {
  const key = callKey(e.tool, e)
  if ((await read($, active)).some(item => item.key === key)) {
    await update($, active, list => clearKey(list, key))
  }
}

/**
 * The classic.PreToolUse observer. The chain beneath a hooks module is the
 * settings hooks, a plugin's hooks.json command hooks among them, so a
 * refusal by one of them (exit 2, or a JSON deny) arrives here as `deny`.
 */
export const onDecision: Hook<'classic.PreToolUse'> = async ($, e, next) => {
  const result = await next(e)
  if (typeof result.deny === 'string') {
    const reason = result.deny
    const seen = successes.get(callKey(e.tool, e)) ?? 0
    $.clock.after(0, () => {
      record($, e, reason, seen).catch(error => log($, 'could not record a refusal', error))
    })
  }

  return result
}

/** The tool.call observer: a call that succeeded may clear a refusal. */
export const onCall: Hook<'tool.call'> = async ($, e, next) => {
  const result = await next(e)
  if (result.deny === undefined && result.isError !== true) {
    markSuccess(callKey(e.tool, e))
    $.clock.after(0, () => {
      clear($, e).catch(error => log($, 'could not clear a refusal', error))
    })
  }

  return result
}

/**
 * The .catch handlers of the two observers: if one throws, replay next.
 * Where the hook had already called next, `next(e)` answers what that call
 * settled to and runs nothing again; otherwise it runs the chain as if the
 * hook were absent. Either way the call goes on as it would have.
 */
export const replayDecision: CatchHandler<Hook<'classic.PreToolUse'>> = ($, e, next) => next(e)
export const replayCall: CatchHandler<Hook<'tool.call'>> = ($, e, next) => next(e)

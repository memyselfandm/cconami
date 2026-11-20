import type { Hook } from 'claude-code'

import type { Row, Seen } from '../types'

/** What the band tells the person to do. */
export const NEXT_STEP =
  '/mcp to retry. If it fails again, run the server command by hand to see the error.'

/** Failed checks in a row before a server is shown as down. */
export const STRIKES = 2

/** What `$.mcp.connect` answers for one server, reduced to what is judged. */
export type Answer = { isConnected: true } | { isConnected: false; reason: string }

/** The parts of `next.trace` this mod reads: whose link each entry is. */
type TraceLink = { readonly plugin: string }

/**
 * Whether a startup request for a server is one to remember, and if so
 * whether it was held.
 *
 * Only the engine's own request counts: that is the engine starting the
 * server by itself, at the session's start. A plugin's `$.mcp.connect` is not.
 *
 * Held is decided by structure, not by the answer's value: the request was
 * held when a hook beneath answered with `deny`, or when `next.trace` does not
 * end at the engine's link. The trace "ends short of the engine at a link that
 * answered its last call itself", so a hook beneath that did not call `next`
 * leaves no engine entry.
 */
export function shouldRemember(
  origin: { readonly plugin: string },
  server: string,
  result: { readonly deny?: unknown; readonly value?: unknown },
  trace: readonly TraceLink[],
): Seen | null {
  if (origin.plugin !== 'engine') {
    return null
  }
  const reachedEngine = trace.at(-1)?.plugin === 'engine'

  return { server, isHeld: result.deny !== undefined || !reachedEngine }
}

/** What the mcp.connect hook saw since the last flush, oldest first. */
export const sightings: Seen[] = []

/**
 * The `mcp.connect` hook. It passes the request on, returns exactly what
 * `next(e)` resolved to, and makes no `$` call: it only notes what it saw in
 * `sightings`, which the session-start timers write to state.
 */
export const onConnect: Hook<'mcp.connect'> = async (_$, e, next) => {
  const result = await next(e)
  const seen = shouldRemember(next.origin, e.server, result, next.trace)
  if (seen !== null) {
    sightings.push(seen)
  }

  return result
}

/** Trims each name, drops empty ones, keeps each once. */
export function names(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return [...new Set(value.map(name => String(name).trim()))].filter(name => name !== '')
}

/** Folds newer sightings into older ones; the latest sighting of a name wins. */
export function merge(prior: readonly Seen[], newer: readonly Seen[]): Seen[] {
  const byName = new Map(prior.map(seen => [seen.server, seen]))
  for (const seen of newer) {
    byName.set(seen.server, seen)
  }

  return [...byName.values()]
}

/**
 * Which servers to check and which watched names cannot be checked.
 *
 * Candidates are every plugin server seen this session plus the watch list,
 * less the ignore list. Only a candidate this session saw start, unheld, is
 * checked: checking anything else could bring a server in. A watched name
 * that cannot be checked is reported as unseen.
 */
export function plan(
  seen: readonly Seen[],
  watch: readonly string[],
  ignore: readonly string[],
): { check: string[]; unseen: string[] } {
  const skip = new Set(ignore)
  const byName = new Map(seen.map(entry => [entry.server, entry]))
  const plugins = seen.map(entry => entry.server).filter(server => server.startsWith('plugin:'))
  const candidates = [...new Set([...plugins, ...watch])].filter(name => !skip.has(name)).sort()

  return {
    check: candidates.filter(name => byName.get(name)?.isHeld === false),
    unseen: watch.filter(name => !skip.has(name) && byName.get(name)?.isHeld !== false).sort(),
  }
}

/**
 * Judges one round of answers against the failed-in-a-row counts.
 *
 * `failed` counts for every checked server. `auth` (waiting on sign-in) and
 * `unlisted` count only for a name in the watch list. `disabled`, `policy` and
 * `unapproved` are someone's choice, not a fault. A server is down after
 * STRIKES counted answers in a row; one good answer resets it.
 */
export function judge(
  answers: readonly { server: string; answer: Answer }[],
  watch: readonly string[],
  prior: Readonly<Record<string, number>>,
): { down: Row[]; strikes: Record<string, number> } {
  const isNamed = new Set(watch)
  const strikes: Record<string, number> = {}
  const down: Row[] = []
  for (const { server, answer } of answers) {
    const reason = answer.isConnected ? null : answer.reason
    const counts =
      reason === 'failed' || ((reason === 'auth' || reason === 'unlisted') && isNamed.has(server))
    if (!counts || reason === null) {
      continue
    }
    const count = (prior[server] ?? 0) + 1
    strikes[server] = count
    if (count >= STRIKES) {
      down.push({ server, reason })
    }
  }

  return { down, strikes }
}

/** What one row of the band says after the server's name. */
export function label(row: Row): string {
  switch (row.reason) {
    case 'failed':
      return 'not connected'
    case 'auth':
      return 'waiting for sign-in'
    case 'unseen':
      return 'not seen this session'
    default:
      return row.reason
  }
}

/** The band's headline, or null when nothing is down. */
export function headline(down: readonly Row[]): string | null {
  if (down.length === 0) {
    return null
  }

  return down.length === 1 ? 'MCP server not connected' : `${down.length} MCP servers not connected`
}

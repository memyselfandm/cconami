import type { Down } from '../types'

/** What the band tells the person to do. */
export const NEXT_STEP =
  '/mcp to retry. If it fails again, run the server command by hand to see the error.'

/** What `$.mcp.connect` answers for one server, reduced to what is judged. */
export type Answer = { isConnected: true } | { isConnected: false; reason: string }

/**
 * The servers to check: the watch list when one is set, else every plugin
 * server seen; less the ignore list. Sorted, each name once.
 */
export function watched(
  seen: readonly string[],
  watch: readonly string[],
  ignore: readonly string[],
): string[] {
  const names = watch.length > 0 ? watch : seen
  const skip = new Set(ignore.map(name => name.trim()))

  return [...new Set(names.map(name => name.trim()))]
    .filter(name => name !== '' && !skip.has(name))
    .sort()
}

/**
 * The servers that are down, from each server's answer.
 *
 * `failed` (did not connect) and `auth` (waits on sign-in) are down. `unlisted`
 * (no such server) is down only for a server the person named in the watch
 * list: a remembered server that is gone was uninstalled, not broken.
 * `disabled`, `policy` and `unapproved` are someone's choice, not a fault.
 */
export function unhealthy(
  answers: readonly { server: string; answer: Answer }[],
  named: readonly string[],
): Down[] {
  const isNamed = new Set(named)

  return answers.flatMap(({ server, answer }) => {
    if (answer.isConnected) {
      return []
    }
    const isDown =
      answer.reason === 'failed' ||
      answer.reason === 'auth' ||
      (answer.reason === 'unlisted' && isNamed.has(server))

    return isDown ? [{ server, reason: answer.reason }] : []
  })
}

/** The band's headline, or null when nothing is down. */
export function headline(down: readonly Down[]): string | null {
  if (down.length === 0) {
    return null
  }
  const names = down
    .map(({ server, reason }) => (reason === 'failed' ? server : `${server} (${reason})`))
    .join(', ')

  return down.length === 1
    ? `MCP server not connected: ${names}`
    : `${down.length} MCP servers not connected: ${names}`
}

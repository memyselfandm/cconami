import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Health, Seen } from '../types'
import { ANSWER_MS, BLIND, headline, judge, label, merge, names, NEXT_STEP, onConnect, plan, sightings } from './health'
import type { Answer } from './health'

// The first sightings are written soon after the session starts. The first
// check waits for servers to finish starting; then a slow timer. A server is
// shown as down only after two failed checks in a row (STRIKES).
const FLUSH_MS = 1_000
const FIRST_CHECK_MS = 15_000
const CHECK_MS = 60_000

const EMPTY: Health = { down: [], unseen: [], quiet: [], isBlind: false, strikes: {} }
const health = atom({ plugin: 'mcp-health', key: 'status' } as const, EMPTY)
const seen = atom({ plugin: 'mcp-health', key: 'started' } as const, [] as Seen[])

let isChecking = false

async function flush($: EngineInterface): Promise<Seen[]> {
  // Taken at once, so two flushes never write or drop the same sighting.
  const batch = sightings.splice(0)
  if (batch.length === 0) {
    return read($, seen)
  }
  try {
    return await update($, seen, prior => merge(prior, batch))
  } catch (error) {
    // Put back, ahead of anything seen since, for the next flush.
    sightings.unshift(...batch)
    throw error
  }
}

async function check(
  $: EngineInterface,
  watch: readonly string[],
  ignore: readonly string[],
): Promise<void> {
  // An older round never overwrites a newer one: one round at a time.
  if (isChecking) {
    return
  }
  isChecking = true
  try {
    const { check: servers, unseen, isBlind } = plan(await flush($), watch, ignore)
    // Only servers this session saw start, unheld, are asked. For those,
    // `$.mcp.connect` answers as the server stands and dials nothing. An
    // answer that never comes counts as not answering, so a round always ends.
    const quietly: Answer = { isConnected: false, reason: 'timeout' }
    const answers = await Promise.all(
      servers.map(async server => {
        const answer: Answer = await Promise.race([
          $.mcp.connect(server).catch(() => ({ isConnected: false, reason: 'failed' }) as const),
          $.clock.sleep(ANSWER_MS).then(
            () => quietly,
            () => quietly,
          ),
        ])

        return { server, answer }
      }),
    )
    const prior = (await read($, health)).strikes
    const { down, quiet, strikes } = judge(answers, watch, prior)
    await update($, health, () => ({
      down,
      unseen: unseen.map(server => ({ server, reason: 'unseen' })),
      quiet,
      isBlind,
      strikes,
    }))
  } finally {
    isChecking = false
  }
}

function run($: EngineInterface, watch: readonly string[], ignore: readonly string[]): void {
  check($, watch, ignore).catch((error: unknown) => {
    $.ui.log(`mcp-health: check failed: ${String(error)}`, { to: 'debug' })
  })
}

export const register: Register = (on, options) => {
  const watch = names(options.watch)
  const ignore = names(options.ignore)

  // The engine raises this for each server it is about to start by itself, at
  // the session's start, with the name /mcp lists it under. The hook notes the
  // name and whether the start was held, and returns `next(e)`'s result as is.
  // It only watches: if it fails, the server goes on as it would have.
  // This hook sits in every MCP server's startup path: onConnect must always
  // await next and return its result unchanged. No test covers this line.
  on('mcp.connect', onConnect).catch(($, e, next) => next(e))

  on('session.start', async ($, e, next) => {
    $.clock.after(FLUSH_MS, () => {
      flush($).catch((error: unknown) => {
        $.ui.log(`mcp-health: could not save servers: ${String(error)}`, { to: 'debug' })
      })
    })
    $.clock.after(FIRST_CHECK_MS, () => run($, watch, ignore))
    $.clock.every(CHECK_MS, () => run($, watch, ignore))

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const { down, unseen, quiet, isBlind } = await read($, health)
    const title = headline(down)
    const notes = [...quiet, ...unseen]
    if (e.props.hasSurvey || (title === null && notes.length === 0 && !isBlind)) {
      return next(e)
    }
    const { Box, Button, Text } = $.ui.resolve(e)

    return (
      <Box flexDirection="column">
        <Box gap={1}>
          <Text bold color={title === null ? undefined : 'error'} dimColor={title === null}>
            {title ?? 'Watched MCP servers'}
          </Text>
          <Button key="check" label="Check now" onPress={() => run($, watch, ignore)} />
        </Box>
        {down.map(row => (
          <Text key={row.server} color={row.reason === 'failed' ? 'error' : undefined}>
            {row.server}: {label(row)}
          </Text>
        ))}
        {notes.map(row => (
          <Text key={row.server} dimColor>
            {row.server}: {label(row)}
          </Text>
        ))}
        {isBlind && <Text dimColor>{BLIND}</Text>}
        {title !== null && <Text dimColor>{NEXT_STEP}</Text>}
      </Box>
    )
  })
}

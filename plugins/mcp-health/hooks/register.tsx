import { atom, read, update } from 'claude-code'
import type { EngineInterface, PluginOptions, Register } from 'claude-code'

import type { Health } from '../types'
import { headline, NEXT_STEP, unhealthy, watched } from './health'
import type { Answer } from './health'

// The first check waits for the servers a session starts to finish starting;
// after that, a slow timer. The band's button checks at once.
const FIRST_CHECK_MS = 15_000
const CHECK_MS = 60_000
const STORE_KEY = 'seen'

const EMPTY: Health = { down: [], checkedAt: null }
const health = atom({ plugin: 'mcp-health', key: 'health' } as const, EMPTY)
const seen = atom({ plugin: 'mcp-health', key: 'seen' } as const, [] as string[])

function names(value: PluginOptions[string] | undefined): string[] {
  return Array.isArray(value) ? value.map(String) : []
}

function isNames(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(name => typeof name === 'string')
}

async function remember($: EngineInterface, server: string): Promise<void> {
  const all = await update($, seen, prior =>
    prior.includes(server) ? prior : [...prior, server],
  )
  // Kept across sessions too, for a session whose start this mod missed.
  await $.store.set(STORE_KEY, all)
}

async function check(
  $: EngineInterface,
  watch: readonly string[],
  ignore: readonly string[],
): Promise<void> {
  const servers = watched(await read($, seen), watch, ignore)
  // For a server /mcp lists, `$.mcp.connect` answers as the server stands
  // (connected, or failed, waiting on sign-in, off) and dials nothing.
  const answers = await Promise.all(
    servers.map(async server => {
      const answer: Answer = await $.mcp
        .connect(server)
        .catch(() => ({ isConnected: false, reason: 'failed' }) as const)

      return { server, answer }
    }),
  )
  const down = unhealthy(answers, watch)
  const checkedAt = await $.clock.now()
  await update($, health, () => ({ down, checkedAt }))
}

export const register: Register = (on, options) => {
  const watch = names(options.watch)
  const ignore = names(options.ignore)

  // The engine raises this for each server it is about to start by itself, at
  // the session's start. That is how the mod learns the plugin servers'
  // names, a failing one's included, as /mcp lists them.
  on('mcp.connect', async ($, e, next) => {
    const result = await next(e)
    const isEngine = next.origin.plugin === 'engine'
    const isPlugin = !e.provider.plugin.startsWith('mcp:')
    // A refusal here is a hook beneath holding the server back on purpose.
    const isHeld = result.deny !== undefined || result.value?.isConnected === false
    if (isEngine && isPlugin && !isHeld) {
      await remember($, e.server)
    }

    return result
    // This mod only watches: if it fails, the server goes on as it would have.
  }).catch(($, e, next) => next(e))

  on('session.start', async ($, e, next) => {
    const stored = await $.store.get(STORE_KEY)
    if (isNames(stored)) {
      await update($, seen, prior => [...new Set([...prior, ...stored])])
    }
    $.clock.after(FIRST_CHECK_MS, () => {
      void check($, watch, ignore)
    })
    $.clock.every(CHECK_MS, () => {
      void check($, watch, ignore)
    })

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const title = headline((await read($, health)).down)
    if (e.props.hasSurvey || title === null) {
      return next(e)
    }
    const { Box, Button, Text } = $.ui.resolve(e)

    return (
      <Box flexDirection="column">
        <Box gap={1}>
          <Text bold color="error">
            {title}
          </Text>
          <Button
            key="check"
            label="Check now"
            onPress={() => {
              void check($, watch, ignore)
            }}
          />
        </Box>
        <Text dimColor>{NEXT_STEP}</Text>
      </Box>
    )
  })
}

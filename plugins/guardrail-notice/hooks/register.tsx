import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Refusal } from '../types'
import { addActive, addCall, BUILT_IN, clearKind, describe, dismiss, kindOf, parsePatterns, summary } from './logic'
import type { Source } from './logic'

const active = atom({ plugin: 'guardrail-notice', key: 'active' } as const, [] as Refusal[])
const byCall = atom({ plugin: 'guardrail-notice', key: 'byCall' } as const, {} as Record<string, Refusal>)

// The band lists at most this many refusals; the rest are counted.
const BAND_ROWS = 3

function log($: EngineInterface, what: string, error: unknown): void {
  $.ui.log(`guardrail-notice: ${what}: ${String(error)}`, { to: 'debug' })
}

async function note($: EngineInterface, refusal: Refusal, isToasting: boolean): Promise<void> {
  await update($, byCall, calls => addCall(calls, refusal))
  await update($, active, list => addActive(list, refusal))
  if (isToasting) {
    $.ui.toast(summary(refusal))
  }
}

async function clear($: EngineInterface, kind: string): Promise<void> {
  if ((await read($, active)).some(item => item.kind === kind)) {
    await update($, active, list => clearKind(list, kind))
  }
}

export const register: Register = (on, options) => {
  const { sources: extra, skipped } = parsePatterns(options.patterns)
  const sources: Source[] = [...extra, ...BUILT_IN]
  const isToasting = options.toast !== false

  on('session.start', ($, e, next) => {
    for (const entry of skipped) {
      $.ui.log(`guardrail-notice: skipped pattern (not a valid expression): ${entry}`, { to: 'debug' })
    }

    return next(e)
  })

  // OBSERVE ONLY. This hook sits in every tool call's PreToolUse path. It must
  // await next(e) and return that result unchanged, never block, rewrite or
  // delay the call: recording a refusal is started and not awaited. The
  // .catch replays next, so a failure here leaves the call as it would be.
  //
  // How a refusal is seen: the classic.PreToolUse chain is [managed settings
  // hooks, hooks modules, the other settings hooks as core], and a plugin's
  // hooks.json command hook is one of those settings hooks. So next(e) here
  // resolves to the decision of the settings and plugin hooks beneath, and a
  // refusal (a command hook's exit 2, or a JSON deny) arrives as `deny`.
  on('classic.PreToolUse', async ($, e, next) => {
    const result = await next(e)
    if (typeof result.deny === 'string') {
      const kind = kindOf(e.tool, e)
      const call = { tool: e.tool, toolUseId: e.tool_use_id ?? `no-id:${kind}`, input: e }
      note($, describe(call, result.deny, sources), isToasting).catch(error =>
        log($, 'could not record a refusal', error),
      )
    }

    return result
  }).catch(($, e, next) => next(e))

  // OBSERVE ONLY, as above: await next(e), return its result unchanged, and
  // replay next on failure. A call of the same kind that succeeds clears the
  // waiting refusal; the clear is started and not awaited.
  on('tool.call', async ($, e, next) => {
    const result = await next(e)
    if (result.deny === undefined && result.isError !== true) {
      clear($, kindOf(e.tool, e)).catch(error => log($, 'could not clear a refusal', error))
    }

    return result
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const list = await read($, active)
    if (e.props.hasSurvey || list.length === 0) {
      return next(e)
    }
    const { Box, Button, Text } = $.ui.resolve(e)
    const shown = list.slice(0, BAND_ROWS)

    return (
      <Box flexDirection="column">
        {shown.map((refusal, i) => (
          <Box key={`row-${i}`} gap={1}>
            <Text bold color="warning">
              {summary(refusal)}
            </Text>
            <Button
              key={`dismiss-${i}`}
              label="Dismiss"
              onPress={() => update($, active, items => dismiss(items, refusal.toolUseId))}
            />
          </Box>
        ))}
        {list.length > shown.length && <Text dimColor>{list.length - shown.length} more blocked</Text>}
      </Box>
    )
  })

  // The card under a refused call's row. The row itself is kept (await next).
  on('ui.render', { component: 'ToolUse' }, async ($, e, next) => {
    const refusal = (await read($, byCall))[e.props.tool_use_id]
    if (refusal === undefined) {
      return next(e)
    }
    const row = await next(e)
    const isWaiting = (await read($, active)).some(item => item.toolUseId === refusal.toolUseId)
    const { Box, Button, Text } = $.ui.resolve(e)

    return (
      <Box flexDirection="column">
        {row}
        <Box flexDirection="column" borderStyle="round" borderColor="warning" paddingX={1}>
          <Text bold color="warning">
            {summary(refusal)}
          </Text>
          <Text>{refusal.message}</Text>
          {refusal.safeForm !== null && <Text>Safe form: {refusal.safeForm}</Text>}
          {isWaiting ? (
            <Button
              key="dismiss"
              label="Dismiss"
              onPress={() => update($, active, items => dismiss(items, refusal.toolUseId))}
            />
          ) : (
            <Text dimColor>Cleared</Text>
          )}
        </Box>
      </Box>
    )
  })
}

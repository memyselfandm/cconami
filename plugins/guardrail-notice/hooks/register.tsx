import { atom, memberOf, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Refusal } from '../types'
import { BUILT_IN, dismiss, parsePatterns, summary } from './logic'
import { configure, onCall, onDecision, replayCall, replayDecision } from './observe'

// The same state observe.ts writes; the scan needs each file's own consts.
const active = atom({ plugin: 'guardrail-notice', key: 'active' } as const, [] as Refusal[])
// A family: one member per refused call, keyed by its tool_use_id, so a row
// redraws only when its own member changes.
const call = atom({ plugin: 'guardrail-notice', key: 'call' } as const, null as Refusal | null)

// The band lists at most this many refusals; the rest are counted.
const BAND_ROWS = 3

export const register: Register = (on, options) => {
  const { sources, skipped, hinted } = parsePatterns(options.patterns)
  configure([...sources, ...BUILT_IN], options.toast !== false)

  on('session.start', ($, e, next) => {
    // Said once per load, in the transcript, so a mistyped pattern is seen.
    for (const { entry, why } of skipped) {
      $.ui.log(`guardrail-notice: pattern skipped (${why}): ${entry}`, { to: 'transcript' })
    }

    if (hinted.length > 0) {
      $.ui.log(
        `guardrail-notice: plain patterns are matched as text, not as regular expressions; prefix with re: to use one: ${hinted.join(', ')}`,
        { to: 'transcript' },
      )
    }

    return next(e)
  })

  // OBSERVE ONLY. This hook sits in every tool call's PreToolUse path. It
  // awaits next(e) and returns that result unchanged: it never blocks,
  // rewrites or delays the call. All work on a refusal (naming it, matching
  // patterns, writing state) runs on a zero-delay timer after it returns.
  // The .catch replays next, so a failure leaves the call as it was.
  // (hooks/observe.ts)
  on('classic.PreToolUse', onDecision).catch(replayDecision)

  // OBSERVE ONLY, as above: awaits next(e), returns its result unchanged,
  // clears on a timer, and replays next on failure. (hooks/observe.ts)
  on('tool.call', onCall).catch(replayCall)

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

  // The card under a refused call's row. It reads only this row's member, so
  // other rows do not redraw; the row itself is kept (await next).
  on('ui.render', { component: 'ToolUse' }, async ($, e, next) => {
    const refusal = await read($, memberOf(call, e))
    if (refusal === null) {
      return next(e)
    }
    const row = await next(e)
    const isWaiting = (await read($, active)).some(item => item.toolUseId === refusal.toolUseId)
    const { Box, Button, Text } = $.ui.resolve(e)

    // The border is on the Box that holds the row and the card, which is what
    // mobile apps draw as a card under the row.
    return (
      <Box flexDirection="column" borderStyle="round" borderColor="warning" paddingX={1}>
        {row}
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
    )
  })
}

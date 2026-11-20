import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Spend } from '../types'
import {
  add,
  addTokens,
  bandText,
  chooseBudget,
  level,
  malformed,
  RESET_REASONS,
  total,
  ZERO,
} from './budget'

const spent = atom({ plugin: 'token-budget', key: 'spent' } as const, ZERO)

export const register: Register = (on, options) => {
  // Once per load: a change to the setting reloads the mod, so a corrected
  // value is checked again.
  let hasWarned = false

  // The spend lives in `$.state`, which a reload keeps; this hook never
  // touches it. It only names a budget value that cannot be read.
  on('session.start', async ($, e, next) => {
    const problem = malformed(options.budget, await $.env.get('OMC_RUN_BUDGET_TOKENS'))
    if (problem !== null && !hasWarned) {
      hasWarned = true
      $.ui.toast(`token-budget: ignoring ${problem}; a budget is a token count of at least 1`)
    }

    return next(e)
  })

  // Every model turn ends here, the main loop's and each subagent's
  // (`e.agentId`), and `e.usage` is that turn's own requests summed, so adding
  // each one counts every request once. The answer is passed on unchanged; a
  // failed write after `next` leaves the answer as it was.
  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    const usage = e.usage
    if (usage !== undefined) {
      await update($, spent, (prior: Spend) => add(prior, usage))
    }

    return result
  })

  // A compaction's summarising request is not part of any turn's usage. Only
  // observed: the result is returned as `next` resolved it.
  on('session.compact', async ($, e, next) => {
    const result = await next(e)
    const usage = result.skip === undefined ? result.usage : undefined
    if (usage !== undefined) {
      await update($, spent, (prior: Spend) => addTokens(prior, usage))
    }

    return result
  })

  // A /clear or an in-process /resume begins another conversation, with no
  // `session.start` after it. Other endings leave the count alone.
  on('session.end', async ($, e, next) => {
    if (RESET_REASONS.includes(e.reason)) {
      await update($, spent, () => ZERO)
    }

    return next(e)
  })

  // The budget is worked out at each draw from the setting and the variable,
  // so nothing about it can go stale.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) {
      return next(e)
    }
    const limit = chooseBudget(options.budget, await $.env.get('OMC_RUN_BUDGET_TOKENS'))
    if (limit === null) {
      return next(e)
    }
    const tokens = total(await read($, spent))
    const state = level(tokens, limit)
    const { Text } = $.ui.resolve(e)

    return (
      <Text
        bold={state === 'alert'}
        color={state === 'alert' ? 'error' : state === 'warning' ? 'warning' : undefined}
        dimColor={state === 'ok'}
      >
        {bandText(tokens, limit)}
      </Text>
    )
  })
}

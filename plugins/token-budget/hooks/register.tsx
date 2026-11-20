import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Spend } from '../types'
import { add, bandText, chooseBudget, level, total, ZERO } from './budget'

const spent = atom({ plugin: 'token-budget', key: 'spent' } as const, ZERO)
const budget = atom({ plugin: 'token-budget', key: 'budget' } as const, null as number | null)

export const register: Register = (on, options) => {
  // The budget is read when the session starts, and again on each reload: a
  // change to the setting reloads the mod. `$.state` keeps the spend across a
  // reload, so nothing here resets it.
  on('session.start', async ($, e, next) => {
    const chosen = chooseBudget(options.budget, await $.env.get('OMC_RUN_BUDGET_TOKENS'))
    await update($, budget, () => chosen)

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

  // A /clear starts a new conversation with no `session.start` after it.
  on('session.end', async ($, e, next) => {
    if (e.reason === 'clear') {
      await update($, spent, () => ZERO)
    }

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const limit = await read($, budget)
    if (e.props.hasSurvey || limit === null) {
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

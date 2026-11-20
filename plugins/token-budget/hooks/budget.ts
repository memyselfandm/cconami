// The pure half of token-budget: adding a turn's usage to the session's spend,
// choosing the budget, and turning spend and budget into the band's words and
// level. Nothing here reaches `$`, so the tests drive it directly.

import type { ModelUsage } from 'claude-code'

import type { Spend } from '../types'

/** Spend at the start of a session, and after a /clear. */
export const ZERO: Spend = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, turns: 0 }

/** The share of the budget at which the band turns to a warning. */
export const WARN_PERCENT = 90

/** The band's level: below 90%, from 90%, and from 100% of the budget. */
export type Level = 'ok' | 'warning' | 'alert'

/** Adds one turn's usage, all four counts, to the spend so far. */
export function add(spend: Spend, usage: ModelUsage): Spend {
  return {
    input: spend.input + usage.input_tokens,
    output: spend.output + usage.output_tokens,
    cacheRead: spend.cacheRead + usage.cache_read_input_tokens,
    cacheWrite: spend.cacheWrite + usage.cache_creation_input_tokens,
    turns: spend.turns + 1,
  }
}

/**
 * The tokens counted against the budget: input, output, cache read and cache
 * write together, the same four counts OMC's budget guard sums.
 */
export function total(spend: Spend): number {
  return spend.input + spend.output + spend.cacheRead + spend.cacheWrite
}

/**
 * A budget value as a positive number of tokens, or null when it is unset, not
 * a number, zero or negative. Strings are read with `Number`, as OMC's guard
 * reads OMC_RUN_BUDGET_TOKENS, so `1000000` and `1e6` are both a million.
 */
export function parseBudget(value: unknown): number | null {
  if (typeof value === 'string' && value.trim() === '') {
    return null
  }
  const parsed = typeof value === 'number' || typeof value === 'string' ? Number(value) : NaN

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

/** The budget: the setting when it is set, else OMC_RUN_BUDGET_TOKENS, else none. */
export function chooseBudget(setting: unknown, env: string | undefined): number | null {
  return parseBudget(setting) ?? parseBudget(env)
}

/** A token count in the band's short form: 950, 412k, 1.0M, 12.5M. */
export function compact(tokens: number): string {
  if (tokens < 1_000) {
    return String(Math.round(tokens))
  }
  // 999,500 and up would round to "1000k": show it as 1.0M instead.
  if (tokens < 999_500) {
    return `${Math.round(tokens / 1_000)}k`
  }

  return `${(tokens / 1_000_000).toFixed(1)}M`
}

/**
 * The whole percentage of the budget spent, rounded down, so the band never
 * says 90% before the warning or 100% before the alert.
 */
export function percent(spent: number, budget: number): number {
  return Math.floor((spent * 100) / budget)
}

/** Below 90% `ok`, from 90% `warning`, from 100% `alert`. */
export function level(spent: number, budget: number): Level {
  const share = percent(spent, budget)
  if (share >= 100) {
    return 'alert'
  }

  return share >= WARN_PERCENT ? 'warning' : 'ok'
}

/** The band's text, for example `Budget 412k / 1.0M (41%)`. */
export function bandText(spent: number, budget: number): string {
  return `Budget ${compact(spent)} / ${compact(budget)} (${percent(spent, budget)}%)`
}

// The pure half of token-budget: adding usage to the session's spend, choosing
// the budget, and turning spend and budget into the band's words and level.
// Nothing here reaches `$`, so the tests drive it directly.

import type { ModelUsage } from 'claude-code'

import type { Spend } from '../types'

/** Spend at the start of a session, and after a /clear or an in-process /resume. */
export const ZERO: Spend = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, turns: 0 }

/** The share of the budget at which the band turns to a warning. */
export const WARN_PERCENT = 90

/** The band's level: below 90%, from 90%, and from 100% of the budget. */
export type Level = 'ok' | 'warning' | 'alert'

/** The `session.end` reasons after which another conversation's count begins. */
export const RESET_REASONS: readonly string[] = ['clear', 'resume']

/** Adds one turn's usage, all four counts, to the spend so far, and counts the turn. */
export function add(spend: Spend, usage: ModelUsage): Spend {
  return { ...addTokens(spend, usage), turns: spend.turns + 1 }
}

/** Adds usage from a request outside a turn (a compaction); the turn count stays. */
export function addTokens(spend: Spend, usage: ModelUsage): Spend {
  return {
    input: spend.input + usage.input_tokens,
    output: spend.output + usage.output_tokens,
    cacheRead: spend.cacheRead + usage.cache_read_input_tokens,
    cacheWrite: spend.cacheWrite + usage.cache_creation_input_tokens,
    turns: spend.turns,
  }
}

/**
 * The tokens counted against the budget: input, output, cache read and cache
 * write together, the same four counts OMC's budget guard sums.
 */
export function total(spend: Spend): number {
  return spend.input + spend.output + spend.cacheRead + spend.cacheWrite
}

/** Whether a budget value is set at all: not absent, blank or the setting's 0. */
function isSet(value: unknown): boolean {
  if (value === undefined || value === null || value === 0) {
    return false
  }

  return !(typeof value === 'string' && value.trim() === '')
}

/**
 * A budget value as a number of tokens of at least 1, or null when it is unset
 * or malformed. Strings are read with `Number`, as OMC's guard reads
 * OMC_RUN_BUDGET_TOKENS, so `1000000` and `1e6` are both a million.
 */
export function parseBudget(value: unknown): number | null {
  if (!isSet(value)) {
    return null
  }
  const parsed = typeof value === 'number' || typeof value === 'string' ? Number(value) : NaN

  return Number.isFinite(parsed) && parsed >= 1 ? parsed : null
}

/** The budget: the setting when it is set, else OMC_RUN_BUDGET_TOKENS, else none. */
export function chooseBudget(setting: unknown, env: string | undefined): number | null {
  return parseBudget(setting) ?? parseBudget(env)
}

/**
 * What to warn about when a budget value is set but cannot be read, or null.
 * The variable is named only when the setting does not decide the budget.
 */
export function malformed(setting: unknown, env: string | undefined): string | null {
  if (isSet(setting) && parseBudget(setting) === null) {
    return `the budget setting ${JSON.stringify(setting)}`
  }
  if (parseBudget(setting) === null && isSet(env) && parseBudget(env) === null) {
    return `OMC_RUN_BUDGET_TOKENS=${JSON.stringify(env)}`
  }

  return null
}

/**
 * A token count in the band's short form, rounded down so the band never
 * claims a tier early: 950, 412k, 999k, 1.0M, 12.4M, 1.2B.
 */
export function compact(tokens: number): string {
  const tiers: readonly [number, string][] = [
    [1_000_000_000, 'B'],
    [1_000_000, 'M'],
  ]
  for (const [size, suffix] of tiers) {
    if (tokens >= size) {
      // Whole tenths first, so no float error lands below a tenth's boundary.
      return `${(Math.floor(tokens / (size / 10)) / 10).toFixed(1)}${suffix}`
    }
  }
  if (tokens >= 1_000) {
    return `${Math.floor(tokens / 1_000)}k`
  }

  return String(Math.floor(tokens))
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

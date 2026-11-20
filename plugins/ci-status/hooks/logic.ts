// The pure half of ci-status: turning what `git` and `gh` print into a CI
// summary, and a summary into the band's words. Nothing here reaches `$`, so
// the tests drive it with captured output.

import type { Check, CheckState, Summary } from '../types'

/** A GitHub repository, as `owner/name`. */
export type Repo = { owner: string; name: string }

/**
 * The GitHub repository a remote URL names, or null for any other host.
 * Accepts the https, ssh and scp-like forms, with or without `.git`.
 */
export function parseRemote(url: string): Repo | null {
  const match = url
    .trim()
    .match(
      /^(?:https?:\/\/(?:[^@/]+@)?|ssh:\/\/(?:[^@/]+@)?|[^@/\s]+@)github\.com[:/]([^/\s]+)\/([^/\s]+?)(?:\.git)?\/?$/,
    )
  if (match === null) {
    return null
  }

  return { owner: match[1] ?? '', name: match[2] ?? '' }
}

/** The remote an upstream such as `origin/main` lives on, or null. */
export function upstreamRemote(upstream: string): string | null {
  const slash = upstream.trim().indexOf('/')

  return slash > 0 ? upstream.trim().slice(0, slash) : null
}

const FAILING = new Set([
  'failure',
  'timed_out',
  'cancelled',
  'action_required',
  'startup_failure',
  'error',
])
const OK = new Set(['success', 'neutral', 'skipped', 'stale'])

/** A check run's state from its `status` and `conclusion`, either case. */
export function checkRunState(status: unknown, conclusion: unknown): CheckState {
  if (String(status ?? '').toLowerCase() !== 'completed') {
    return 'pending'
  }
  const ended = String(conclusion ?? '').toLowerCase()
  if (FAILING.has(ended)) {
    return 'fail'
  }

  return OK.has(ended) ? 'pass' : 'pending'
}

/** A commit status's state (`success`, `failure`, `error`, `pending`), either case. */
export function statusState(state: unknown): CheckState {
  const value = String(state ?? '').toLowerCase()
  if (value === 'success') {
    return 'pass'
  }

  return FAILING.has(value) ? 'fail' : 'pending'
}

type Row = Record<string, unknown>

function rows(value: unknown): Row[] {
  return Array.isArray(value)
    ? value.filter((row): row is Row => typeof row === 'object' && row !== null)
    : []
}

/** The checks in `gh pr view --json statusCheckRollup`'s `statusCheckRollup`. */
export function fromRollup(rollup: unknown): Check[] {
  return rows(rollup).map(row =>
    row.__typename === 'StatusContext' || ('context' in row && !('status' in row))
      ? { name: String(row.context ?? '?'), state: statusState(row.state) }
      : {
          name: String(row.name ?? '?'),
          state: checkRunState(row.status, row.conclusion),
        },
  )
}

/**
 * The checks on a commit from the REST answers of `commits/{sha}/check-runs`
 * and `commits/{sha}/status`, as parsed JSON.
 */
export function fromRest(checkRuns: unknown, status: unknown): Check[] {
  const runs = rows((checkRuns as Row | null)?.check_runs).map(run => ({
    name: String(run.name ?? '?'),
    state: checkRunState(run.status, run.conclusion),
  }))
  const statuses = rows((status as Row | null)?.statuses).map(row => ({
    name: String(row.context ?? '?'),
    state: statusState(row.state),
  }))

  return [...runs, ...statuses]
}

/** The checks reduced to one state and counts, or null when there are none. */
export function summarize(checks: readonly Check[]): Summary | null {
  if (checks.length === 0) {
    return null
  }
  const failing = checks.filter(check => check.state === 'fail').map(check => check.name)
  const pending = checks.filter(check => check.state === 'pending').length
  const passed = checks.filter(check => check.state === 'pass').length

  return {
    state: failing.length > 0 ? 'fail' : pending > 0 ? 'pending' : 'pass',
    total: checks.length,
    passed,
    done: checks.length - pending,
    failing: [...new Set(failing)],
  }
}

/** The band's words for a summary: `CI ✓ 5/5`, `CI ✗ 2 failing · lint, test`. */
export function ciText(summary: Summary, maxNames: number): string {
  if (summary.state === 'pass') {
    return `CI ✓ ${summary.passed}/${summary.total}`
  }
  if (summary.state === 'pending') {
    return `CI ● running ${summary.done}/${summary.total}`
  }
  const count = summary.failing.length
  const shown = summary.failing.slice(0, Math.max(0, maxNames))
  const rest = count - shown.length
  const names =
    shown.length === 0 ? '' : ` · ${shown.join(', ')}${rest > 0 ? ` +${rest}` : ''}`

  return `CI ✗ ${count} failing${names}`
}

/** The short mark for a PR in the list of PRs the session opened. */
export function shortText(summary: Summary | null, prState: string): string {
  const state = prState.toLowerCase()
  if (state === 'merged' || state === 'closed') {
    return state
  }
  if (summary === null) {
    return 'no checks'
  }
  if (summary.state === 'pass') {
    return `✓ ${summary.passed}/${summary.total}`
  }
  if (summary.state === 'pending') {
    return `● ${summary.done}/${summary.total}`
  }

  return `✗ ${summary.failing.length} failing`
}

/** The PR URLs in a command's output, such as what `gh pr create` prints. */
export function prUrls(text: string): string[] {
  const found = text.match(/https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/pull\/\d+/g) ?? []

  return [...new Set(found)]
}

/** The PR number at the end of a PR URL, or null. */
export function prNumber(url: string): number | null {
  const match = url.match(/\/pull\/(\d+)$/)

  return match === null ? null : Number(match[1])
}

/** Whether a Bash command pushes commits. */
export function isPush(command: string): boolean {
  return /(^|[\s;&|(])git\s+(?:-\S+\s+(?:\S+\s+)?)*push\b/.test(command)
}

/** Whether a Bash command opens a PR. */
export function isPrCreate(command: string): boolean {
  return /(^|[\s;&|(])gh\s+pr\s+create\b/.test(command)
}

/** Parses JSON, or returns null for anything that is not JSON. */
export function json(text: string): unknown {
  try {
    return JSON.parse(text) as unknown
  } catch {
    return null
  }
}

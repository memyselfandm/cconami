// The pure half of ci-status: turning what `git` and `gh` print into a CI
// summary, a summary into the band's words, and the settings into numbers.
// Nothing here reaches `$`, so the tests drive it with captured output.

import type { Check, CheckState, OpenedPr, Summary } from '../types'

/** A GitHub repository, as `owner/name`. */
export type Repo = { owner: string; name: string }

/** The defaults of the userConfig fields in plugin.json. */
export const DEFAULT_POLL_SECONDS = 30
export const DEFAULT_IDLE_POLL_MINUTES = 0
export const DEFAULT_MAX_FAILING_NAMES = 3
/** The most PRs the session list keeps. */
export const MAX_OPENED = 10
/** Reads of an opened PR that may fail before it stops counting as pending. */
export const MAX_OPENED_FAILURES = 3

export type Settings = { pollMs: number; idleMs: number; maxNames: number }

/**
 * The userConfig values as numbers: `pollSeconds` at least 5, `idlePollMinutes`
 * 0 (off) or at least 1, `maxFailingNames` a whole number of at least 0. A value
 * that is not a number takes its default.
 */
export function settings(options: Readonly<Record<string, unknown>>): Settings {
  const number = (value: unknown, fallback: number): number => {
    const parsed = typeof value === 'number' || typeof value === 'string' ? Number(value) : NaN
    return Number.isFinite(parsed) ? parsed : fallback
  }
  const poll = Math.max(5, number(options.pollSeconds, DEFAULT_POLL_SECONDS))
  const idle = number(options.idlePollMinutes, DEFAULT_IDLE_POLL_MINUTES)

  return {
    pollMs: poll * 1000,
    idleMs: idle <= 0 ? 0 : Math.max(1, idle) * 60_000,
    maxNames: Math.max(0, Math.floor(number(options.maxFailingNames, DEFAULT_MAX_FAILING_NAMES))),
  }
}

const NAME_PART = /^[A-Za-z0-9._-]+$/

function isNamePart(part: string): boolean {
  return NAME_PART.test(part) && part !== '.' && part !== '..'
}

/**
 * The GitHub repository a remote URL names, or null for any other host or a
 * name that is not a plain owner and repository. Accepts the https, ssh and
 * scp-like forms, with or without `.git`.
 */
export function parseRemote(url: string): Repo | null {
  const match = url
    .trim()
    .match(
      /^(?:https?:\/\/(?:[^@/]+@)?|ssh:\/\/(?:[^@/]+@)?|[^@/\s]+@)github\.com[:/]([^/\s]+)\/([^/\s]+?)(?:\.git)?\/?$/,
    )
  const owner = match?.[1] ?? ''
  const name = match?.[2] ?? ''

  return isNamePart(owner) && isNamePart(name) ? { owner, name } : null
}

/** An upstream such as `origin/feature/x` as its remote and branch, or null. */
export function parseUpstream(upstream: string): { remote: string; branch: string } | null {
  const value = upstream.trim()
  const slash = value.indexOf('/')
  if (slash <= 0 || slash === value.length - 1) {
    return null
  }

  return { remote: value.slice(0, slash), branch: value.slice(slash + 1) }
}

/** `git rev-parse HEAD --abbrev-ref HEAD`'s two lines, or null. */
export function parseHead(output: string): { sha: string; branch: string } | null {
  const [sha = '', branch = ''] = output.trim().split('\n').map(line => line.trim())

  return /^[0-9a-f]{40}$/.test(sha) && branch !== '' ? { sha, branch } : null
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

/** Whether check run `a` is a later attempt than `b`: by start time, then id. */
function isLater(a: Row, b: Row): boolean {
  const started = String(a.started_at ?? '').localeCompare(String(b.started_at ?? ''))

  return started !== 0 ? started > 0 : Number(a.id ?? 0) > Number(b.id ?? 0)
}

/**
 * The checks on a commit from the REST rows of `commits/{sha}/check-runs`
 * (`check_runs`) and `commits/{sha}/status` (`statuses`).
 *
 * A re-run adds a check run with the same name to the same check suite, and
 * GitHub can return both, so only the latest attempt of each is kept. The
 * combined status already holds one status per context.
 */
export function fromRest(checkRuns: unknown, statuses: unknown): Check[] {
  const latest = new Map<string, Row>()
  for (const run of rows(checkRuns)) {
    const suite = (run.check_suite as Row | null | undefined)?.id ?? ''
    const key = `${String(run.name ?? '?')}\u0000${String(suite)}`
    const seen = latest.get(key)
    if (seen === undefined || isLater(run, seen)) {
      latest.set(key, run)
    }
  }
  const runs = [...latest.values()].map(run => ({
    name: String(run.name ?? '?'),
    state: checkRunState(run.status, run.conclusion),
  }))
  const contexts = rows(statuses).map(row => ({
    name: String(row.context ?? '?'),
    state: statusState(row.state),
  }))

  return [...runs, ...contexts]
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

/** The repository and number of a PR URL, or null. */
export function parsePrUrl(url: string): { slug: string; number: number } | null {
  const match = url.match(/^https:\/\/github\.com\/([^/\s]+)\/([^/\s]+)\/pull\/(\d+)$/)
  if (match === null || !isNamePart(match[1] ?? '') || !isNamePart(match[2] ?? '')) {
    return null
  }

  return { slug: `${match[1]}/${match[2]}`, number: Number(match[3]) }
}

/** Whether an opened PR still needs reading on the pending poll. */
export function isOpenedPending(pr: OpenedPr): boolean {
  if (pr.state === '') {
    return pr.failures < MAX_OPENED_FAILURES
  }

  return pr.state === 'OPEN' && pr.failures === 0 && pr.summary?.state === 'pending'
}

/**
 * The opened-PR list with new URLs added, at most MAX_OPENED long: past that
 * the oldest merged or closed PRs go first, then the oldest of the rest.
 */
export function addOpened(list: readonly OpenedPr[], urls: readonly string[]): OpenedPr[] {
  const added = urls
    .filter(url => !list.some(pr => pr.url === url))
    .flatMap(url => {
      const parsed = parsePrUrl(url)
      return parsed === null
        ? []
        : [{ url, number: parsed.number, state: '', summary: null, failures: 0 }]
    })
  const next = [...list, ...added]
  while (next.length > MAX_OPENED) {
    const finished = next.findIndex(pr => pr.state === 'MERGED' || pr.state === 'CLOSED')
    next.splice(finished === -1 ? 0 : finished, 1)
  }

  return next
}

/** Whether a Bash command pushes commits. */
export function isPush(command: string): boolean {
  return /(^|[\s;&|(])git\s+(?:-\S+\s+(?:\S+\s+)?)*push\b/.test(command)
}

/** Whether a Bash command opens a PR. */
export function isPrCreate(command: string): boolean {
  return /(^|[\s;&|(])gh\s+pr\s+create\b/.test(command)
}

/** Whether `gh api` failed because GitHub has no such commit or repository. */
export function isNotFound(stderr: string): boolean {
  return /HTTP 404|HTTP 422|No commit found|Not Found/i.test(stderr)
}

/** Parses JSON, or returns null for anything that is not JSON. */
export function json(text: string): unknown {
  try {
    return JSON.parse(text) as unknown
  } catch {
    return null
  }
}

/** Parses one JSON value per line, as `gh api --paginate --jq '.x[]'` prints. */
export function jsonLines(text: string): unknown[] {
  return text
    .split('\n')
    .filter(line => line.trim() !== '')
    .map(json)
    .filter(value => value !== null)
}

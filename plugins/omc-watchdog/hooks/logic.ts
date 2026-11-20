// Pure logic for omc-watchdog: where oh-my-claudecode keeps its state, reading
// one mode's state file, judging it stale or looping, and the band's text. No
// engine calls here; register.tsx does the reading and probing.
//
// The rules follow oh-my-claudecode 5.8.6: getOmcRoot() and
// getProjectIdentifier() in src/lib/worktree-paths.ts, and isStaleState() and
// readStateFileWithSession() in scripts/persistent-mode.mjs.

import type { Finding } from '../types'

/** The modes whose stop hook keeps a run going, so a dead or looping run matters. */
export const GUARDED_MODES = ['ralph', 'autopilot', 'team', 'ultragoal'] as const

/** OMC's freshness window: state not touched for two hours is stale. */
export const DEFAULT_STALE_HOURS = 2
/** Reinforcements without the run ending that count as looping. */
export const DEFAULT_REINFORCEMENT_LIMIT = 5

const HOUR_MS = 60 * 60 * 1000

/** OMC's own rule for a session id it will use in a path (validateSessionId). */
export function isSafeSessionId(id: string): boolean {
  return /^[A-Za-z0-9_-]{1,256}$/.test(id)
}

/** The thresholds the judge uses. */
export type Thresholds = { staleMs: number; reinforcementLimit: number }

/** Reads the settings; a missing, non-numeric or non-positive value takes its default. */
export function thresholds(options: { readonly [key: string]: unknown }): Thresholds {
  const hours = positive(options.staleHours) ?? DEFAULT_STALE_HOURS
  const limit = positive(options.reinforcementLimit) ?? DEFAULT_REINFORCEMENT_LIMIT

  return { staleMs: hours * HOUR_MS, reinforcementLimit: limit }
}

function positive(value: unknown): number | null {
  const n = numberOf(value)

  return n !== null && n > 0 ? n : null
}

/** A number, or a numeric string (OMC's state_write tool stores some counts as strings). */
export function numberOf(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value)

    return Number.isFinite(n) ? n : null
  }

  return null
}

// Paths. OMC builds them with Node's path module on POSIX; these do the same
// for the absolute paths the engine hands a mod.

export function basename(path: string): string {
  const trimmed = path.replace(/\/+$/, '')

  return trimmed.slice(trimmed.lastIndexOf('/') + 1)
}

export function dirname(path: string): string {
  const trimmed = path.replace(/\/+$/, '')
  const at = trimmed.lastIndexOf('/')

  return at <= 0 ? '/' : trimmed.slice(0, at)
}

export function join(...parts: string[]): string {
  return parts.join('/').replace(/\/{2,}/g, '/')
}

/**
 * The directories findWorkspaceRoot() checks for a `.omc-workspace` marker,
 * nearest first: `start` and each parent, stopping before `home` (a marker in
 * the home directory or above is never used) and at the filesystem root.
 */
export function markerCandidates(start: string, home: string | null): string[] {
  const out: string[] = []
  let cursor = start.replace(/\/+$/, '') || '/'
  for (;;) {
    if (home !== null && cursor === home.replace(/\/+$/, '')) {
      break
    }
    out.push(cursor)
    const parent = dirname(cursor)
    if (parent === cursor) {
      break
    }
    cursor = parent
  }

  return out
}

/** The `id` a `.omc-workspace` marker names, or null (an empty or unreadable marker names none). */
export function markerId(text: string): string | null {
  try {
    const parsed: unknown = JSON.parse(text.trim() || '{}')
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const id = (parsed as { id?: unknown }).id
      if (typeof id === 'string' && id.trim() !== '') {
        return id.trim()
      }
    }
  } catch {
    // Unparseable: OMC reads it as {}.
  }

  return null
}

/** The first 16 hex digits of the text's SHA-256, as OMC's project identifiers use. */
export async function sha16(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))

  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16)
}

function safeName(text: string): string {
  return text.replace(/[^a-zA-Z0-9_-]/g, '_')
}

/** What getProjectIdentifier() reads. */
export type ProjectFacts = {
  /** The directory it is asked about: the git top level, else the working directory. */
  root: string
  /** The `.omc-workspace` directory above `root`, or null. */
  workspace: string | null
  /** That marker's `id`, or null. */
  workspaceId: string | null
  /** `git remote get-url origin`, or '' when there is none. */
  remoteUrl: string
  /** `git rev-parse --path-format=absolute --git-common-dir`, or '' when it failed. */
  commonDir: string
}

/** OMC's project identifier: the directory under `$OMC_STATE_DIR` that holds a project's state. */
export async function projectIdentifier(facts: ProjectFacts): Promise<string> {
  if (facts.workspace !== null) {
    if (facts.workspaceId !== null) {
      const id = safeName(facts.workspaceId)

      return `${id}-${await sha16(id)}`
    }

    return `${safeName(basename(facts.workspace))}-${await sha16(facts.workspace)}`
  }
  // A linked worktree's common dir is <primary>/.git: use the primary checkout.
  // A submodule's (.git/modules/...) and a bare repository's are not used.
  let primary = facts.root
  const common = facts.commonDir
  if (basename(common) === '.git' && !common.includes('/.git/modules')) {
    primary = dirname(common)
  }

  return `${safeName(basename(primary))}-${await sha16(facts.remoteUrl || primary)}`
}

/** What getOmcRoot() reads. */
export type RootFacts = {
  /** `OMC_STATE_DIR`, or null when unset or empty. */
  stateDir: string | null
  /** The session's working directory. */
  cwd: string
  /** The home directory, or null when unknown. */
  home: string | null
  /** The git top level, climbed to the outermost superproject; null outside a repository. */
  gitTop: string | null
  /** The `.omc-workspace` directory that applies (see below), or null. */
  workspace: string | null
  /** OMC's project identifier; read only when `stateDir` is set and there is a repository or workspace. */
  projectId: string | null
}

/**
 * The OMC state root, the directory holding `state/`, in OMC's order:
 *
 * 1. `$OMC_STATE_DIR/<project id>`, or `$OMC_STATE_DIR/non-git` with neither a
 *    repository nor a workspace marker;
 * 2. the `.omc-workspace` directory's `.omc`;
 * 3. the git top level's `.omc`;
 * 4. outside a repository, `$HOME/.omc` (OMC 5.8.6 no longer uses a
 *    working-directory `.omc` there).
 *
 * Null when the root cannot be named (no home directory outside a repository,
 * or no project identifier).
 */
export function omcRoot(facts: RootFacts): string | null {
  if (facts.stateDir !== null) {
    if (facts.gitTop === null && facts.workspace === null) {
      return join(facts.stateDir, 'non-git')
    }

    return facts.projectId === null ? null : join(facts.stateDir, facts.projectId)
  }
  if (facts.workspace !== null) {
    return join(facts.workspace, '.omc')
  }
  if (facts.gitTop !== null) {
    return join(facts.gitTop, '.omc')
  }

  return facts.home === null ? null : join(facts.home, '.omc')
}

/** Where a mode's state can be: the session's own file first, then the legacy flat file. */
export function statePaths(root: string, sessionId: string, mode: string): { session: string; legacy: string } {
  return {
    session: join(root, 'state', 'sessions', sessionId, `${mode}-state.json`),
    legacy: join(root, 'state', `${mode}-state.json`),
  }
}

/** One mode's state as the judge reads it. */
export type ModeState = {
  isActive: boolean
  sessionId: string | null
  phase: string | null
  iteration: number | null
  maxIterations: number | null
  reinforcement: number | null
  /** The latest activity time in milliseconds, or null when the file records none. */
  activityMs: number | null
}

function time(value: unknown): number | null {
  if (typeof value !== 'string' || value === '') {
    return null
  }
  const ms = Date.parse(value)

  return Number.isFinite(ms) ? ms : null
}

/**
 * Reads a state file's text; null when it is not a JSON object.
 *
 * The phase is `current_phase ?? phase ?? stage`, as OMC reads it. The
 * activity time is the latest of `last_checked_at`, `updated_at` and
 * `started_at` (OMC's isStaleState), and of `_meta.updatedAt`, which OMC's
 * state_write tool stamps on files that carry none of the others.
 */
export function parseState(text: string): ModeState | null {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return null
  }
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return null
  }
  const s = raw as Record<string, unknown>
  const meta = s._meta !== null && typeof s._meta === 'object' ? (s._meta as Record<string, unknown>) : {}
  const rawPhase = s.current_phase ?? s.phase ?? s.stage
  const phase = typeof rawPhase === 'string' && rawPhase.trim() !== '' ? rawPhase.trim() : null
  const times = [s.last_checked_at, s.updated_at, s.started_at, meta.updatedAt]
    .map(time)
    .filter((ms): ms is number => ms !== null)

  return {
    isActive: s.active === true,
    sessionId: typeof s.session_id === 'string' ? s.session_id : null,
    phase,
    iteration: numberOf(s.iteration),
    maxIterations: numberOf(s.max_iterations),
    reinforcement: numberOf(s.reinforcement_count),
    activityMs: times.length === 0 ? null : Math.max(...times),
  }
}

/**
 * Whether a state file belongs to this session. A session-scoped file owns
 * itself unless it names another session; a legacy flat file counts only when
 * it names this one (readStateFileWithSession).
 */
export function belongsTo(state: ModeState, sessionId: string, isLegacy: boolean): boolean {
  return isLegacy ? state.sessionId === sessionId : state.sessionId === null || state.sessionId === sessionId
}

/**
 * What is wrong with an active mode, or null when nothing is (or it is not
 * active). A stale run is reported as stale even when its counters are high:
 * a dead run is not looping.
 */
export function judge(mode: string, state: ModeState, nowMs: number, limits: Thresholds): Finding | null {
  if (!state.isActive) {
    return null
  }
  const base = { mode, phase: state.phase }
  if (state.activityMs === null) {
    return { ...base, kind: 'stale', ageMs: null }
  }
  const ageMs = nowMs - state.activityMs
  if (ageMs > limits.staleMs) {
    return { ...base, kind: 'stale', ageMs }
  }
  const isReinforcing = state.reinforcement !== null && state.reinforcement >= limits.reinforcementLimit
  const isAtLimit =
    state.iteration !== null && state.maxIterations !== null && state.maxIterations > 0 && state.iteration >= state.maxIterations
  if (isReinforcing || isAtLimit) {
    return {
      ...base,
      kind: 'looping',
      reinforcement: state.reinforcement,
      iteration: state.iteration,
      maxIterations: state.maxIterations,
    }
  }

  return null
}

/** A duration as the band says it, rounded down: `45m`, `3h`, `2d`. */
export function age(ms: number): string {
  const minutes = Math.max(0, Math.floor(ms / 60_000))
  if (minutes < 60) {
    return `${minutes}m`
  }
  const hours = Math.floor(minutes / 60)

  return hours < 48 ? `${hours}h` : `${Math.floor(hours / 24)}d`
}

/** The band's line for a finding. */
export function bandText(finding: Finding): string {
  const phase = finding.phase === null ? '' : ` (phase: ${finding.phase})`
  if (finding.kind === 'stale') {
    const since = finding.ageMs === null ? 'with no activity time recorded' : `but stale for ${age(finding.ageMs)}`

    return `${finding.mode} active ${since}; cancel or resume${phase}`
  }
  const parts: string[] = []
  if (finding.reinforcement !== null) {
    parts.push(`reinforcement ${finding.reinforcement}`)
  }
  if (finding.iteration !== null && finding.maxIterations !== null) {
    parts.push(`iteration ${finding.iteration}/${finding.maxIterations}`)
  }

  return `${finding.mode} looping: ${parts.join(', ')}${phase}`
}

// Keys of a tool call's envelope that are not the tool's own input.
const RESERVED = new Set(['tool', 'tool_use_id', 'agentId', 'requestMeta', 'consent'])

/**
 * Whether a tool call may have changed OMC's mode state, so a refresh is
 * worth it: one of OMC's own state or cancel tools, a call naming one of the
 * guarded modes' OMC skills, or any call whose input names `.omc/state`.
 */
export function touchesOmcState(tool: string, envelope: { readonly [key: string]: unknown }): boolean {
  if (/oh-my-claudecode/.test(tool) && /state|cancel/.test(tool)) {
    return true
  }
  const input = Object.fromEntries(Object.entries(envelope).filter(([key]) => !RESERVED.has(key)))
  let text: string
  try {
    text = JSON.stringify(input).slice(0, 4000)
  } catch {
    return false
  }

  return /\.omc\/state|oh-my-claudecode:(?:cancel|ralph|autopilot|team|ultragoal)\b/.test(text)
}

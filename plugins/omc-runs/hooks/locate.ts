// Finding and reading this session's OMC state through the engine: the state
// root as OMC 5.8.6's getOmcRoot() picks it, and one mode's state file as
// readStateFileWithSession() in scripts/persistent-mode.mjs picks it.
//
// Moved here from omc-watchdog's register.tsx, which omc-runs supersedes. The
// one change is that readMode() also returns the file's raw object, which the
// progress fields are read from.
//
// READ ONLY: files are read with $.fs.read, and `git` runs only to locate them
// (`rev-parse` and `remote get-url`).

import type { EngineInterface } from 'claude-code'

import { parseRaw } from './progress'
import type { Raw } from './progress'
import {
  belongsTo,
  isSensitiveLocation,
  join,
  markerCandidates,
  markerId,
  omcRoot,
  parseState,
  projectIdentifier,
  sessionsToScan,
  statePaths,
} from './watch'
import type { ModeState } from './watch'

const GIT_TIMEOUT_MS = 5_000
// Submodule nesting deeper than this is not climbed.
const MAX_SUPERPROJECTS = 8
const MARKER = '.omc-workspace'

type Git = { out: string | null; isSure: boolean }

/**
 * Runs a read-only git command. `out` is its trimmed output when it succeeded.
 * `isSure` is false when it failed for a reason other than "not a git
 * repository" or no such remote (a timeout, git missing), so the answer must
 * not be kept. git runs under `LC_ALL=C` so its messages are in English.
 */
async function git($: EngineInterface, cwd: string, args: string[]): Promise<Git> {
  try {
    const ran = await $.process.run(['git', ...args], { cwd, env: { LC_ALL: 'C' }, timeoutMs: GIT_TIMEOUT_MS })
    const out = ran.stdout.trim()
    if (ran.exitCode === 0) {
      return { out: out === '' ? null : out, isSure: true }
    }

    return { out: null, isSure: /not a git repository|no such remote/i.test(ran.stderr) }
  } catch {
    return { out: null, isSure: false }
  }
}

async function findWorkspace($: EngineInterface, start: string, home: string | null): Promise<string | null> {
  for (const dir of markerCandidates(start, home)) {
    if (await $.fs.exists(join(dir, MARKER)).catch(() => false)) {
      return dir
    }
  }

  return null
}

// OMC anchors `.omc/` at the outermost superproject when run in a submodule.
// Not sure when any probe on the way was not.
async function climb($: EngineInterface, top: string | null): Promise<{ root: string | null; isSure: boolean }> {
  let root = top
  let isSure = true
  for (let i = 0; root !== null && i < MAX_SUPERPROJECTS; i += 1) {
    const probe = await git($, root, ['rev-parse', '--show-superproject-working-tree'])
    isSure &&= probe.isSure
    const parent = probe.out
    if (parent === null || parent === root) {
      break
    }
    root = parent
  }

  return { root, isSure }
}

/**
 * The OMC state root for a working directory, as OMC 5.8.6's getOmcRoot()
 * picks it, and whether the answer may be kept.
 */
export async function resolveRoot($: EngineInterface, cwd: string): Promise<{ root: string | null; isSure: boolean }> {
  const stateDir = (await $.env.get('OMC_STATE_DIR')) || null
  const home = (await $.env.get('HOME')) || null
  const tmp = (await $.env.get('TMPDIR')) || null
  const isMultirepo = (await $.env.get('OMC_DISABLE_MULTIREPO')) !== '1'
  const probe = await git($, cwd, ['rev-parse', '--show-toplevel'])
  const top = probe.out
  const workspace = isMultirepo ? await findWorkspace($, cwd, home) : null
  if (stateDir !== null) {
    // Identity is the literal top level: no superproject climb here.
    const root = top ?? cwd
    let projectId: string | null = null
    let isSure = probe.isSure
    if (top !== null || workspace !== null) {
      const marker = workspace === null ? '' : await $.fs.read(join(workspace, MARKER)).catch(() => '')
      const remote = workspace === null ? await git($, root, ['remote', 'get-url', 'origin']) : null
      const common =
        workspace === null ? await git($, root, ['rev-parse', '--path-format=absolute', '--git-common-dir']) : null
      isSure = isSure && (remote?.isSure ?? true) && (common?.isSure ?? true)
      projectId = await projectIdentifier({
        root,
        workspace,
        workspaceId: typeof marker === 'string' ? markerId(marker) : null,
        remoteUrl: remote?.out ?? '',
        commonDir: common?.out ?? '',
      })
    }

    return { root: omcRoot({ stateDir, cwd, home, gitTop: top, workspace, projectId }), isSure }
  }
  // OMC skips a workspace marker in a sensitive location, with or without git.
  const anchor = workspace !== null && !isSensitiveLocation(workspace, home, tmp) ? workspace : null
  const climbed = anchor === null ? await climb($, top) : { root: top, isSure: true }

  return {
    root: omcRoot({ stateDir: null, cwd, home, gitTop: climbed.root, workspace: anchor, projectId: null }),
    isSure: probe.isSure && climbed.isSure,
  }
}

/** A state file judged and read: the judge's view and the raw object. */
export type ReadState = { state: ModeState; raw: Raw }

function parseBoth(text: unknown): ReadState | null {
  if (typeof text !== 'string') {
    return null
  }
  const state = parseState(text)
  const raw = parseRaw(text)

  return state === null || raw === null ? null : { state, raw }
}

async function readOwned($: EngineInterface, path: string, sessionId: string, isLegacy: boolean): Promise<ReadState | null> {
  const read = parseBoth(await $.fs.read(path).catch(() => null))

  return read !== null && belongsTo(read.state, sessionId, isLegacy) ? read : null
}

/**
 * This session's state for one mode, in readStateFileWithSession's order: its
 * own file; the same file in another session directory that names this
 * session; the root's legacy file, else the global one, when it names this
 * session.
 */
export async function readMode(
  $: EngineInterface,
  root: string,
  sessionId: string,
  mode: string,
  home: string | null,
): Promise<ReadState | null> {
  const paths = statePaths(root, sessionId, mode, home)
  const own = await readOwned($, paths.session, sessionId, false)
  if (own !== null) {
    return own
  }
  const entries = await $.fs.list(paths.sessionsDir).catch(() => [])
  for (const dir of sessionsToScan(entries, sessionId)) {
    const found = await readOwned($, join(paths.sessionsDir, dir, `${mode}-state.json`), sessionId, true)
    if (found !== null) {
      return found
    }
  }
  // OMC reads the global file only when the root's legacy file is missing.
  const legacy = await $.fs.read(paths.legacy).catch(() => null)
  const text = typeof legacy === 'string' ? legacy : paths.global === null ? null : await $.fs.read(paths.global).catch(() => null)
  const read = parseBoth(text)

  return read !== null && belongsTo(read.state, sessionId, true) ? read : null
}

/** ultragoal's plan, `<root>/ultragoal/goals.json`, the file OMC's stop hook reads; null when unreadable. */
export async function readGoals($: EngineInterface, root: string): Promise<string | null> {
  const text = await $.fs.read(join(root, 'ultragoal', 'goals.json')).catch(() => null)

  return typeof text === 'string' ? text : null
}

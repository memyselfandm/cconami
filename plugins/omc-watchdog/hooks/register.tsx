import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Finding } from '../types'
import {
  bandText,
  belongsTo,
  GUARDED_MODES,
  isSafeSessionId,
  join,
  judge,
  markerCandidates,
  markerId,
  omcRoot,
  parseState,
  projectIdentifier,
  statePaths,
  thresholds,
  touchesOmcState,
} from './logic'
import type { ModeState, Thresholds } from './logic'

const findings = atom({ plugin: 'omc-watchdog', key: 'findings' } as const, [] as Finding[])

/** How often the state files are read again. */
export const REFRESH_MS = 60_000
const GIT_TIMEOUT_MS = 5_000
// Submodule nesting deeper than this is not climbed.
const MAX_SUPERPROJECTS = 8
const MARKER = '.omc-workspace'

// Module state; a reload starts it over, and session.start reads again.
let limits: Thresholds = thresholds({})
let cached: { cwd: string; root: string | null } | null = null
let isReading = false
let isAgain = false

async function git($: EngineInterface, cwd: string, args: string[]): Promise<string | null> {
  try {
    const ran = await $.process.run(['git', ...args], { cwd, timeoutMs: GIT_TIMEOUT_MS })
    const out = ran.stdout.trim()

    return ran.exitCode === 0 && out !== '' ? out : null
  } catch {
    return null
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
async function climb($: EngineInterface, top: string | null): Promise<string | null> {
  let root = top
  for (let i = 0; root !== null && i < MAX_SUPERPROJECTS; i += 1) {
    const parent = await git($, root, ['rev-parse', '--show-superproject-working-tree'])
    if (parent === null || parent === root) {
      break
    }
    root = parent
  }

  return root
}

/** The OMC state root for a working directory, as OMC 5.8.6's getOmcRoot() picks it. */
async function resolveRoot($: EngineInterface, cwd: string): Promise<string | null> {
  const stateDir = (await $.env.get('OMC_STATE_DIR')) || null
  const home = (await $.env.get('HOME')) || null
  const isMultirepo = (await $.env.get('OMC_DISABLE_MULTIREPO')) !== '1'
  const top = await git($, cwd, ['rev-parse', '--show-toplevel'])
  if (stateDir !== null) {
    // Identity is the literal top level: no superproject climb here.
    const root = top ?? cwd
    const workspace = isMultirepo ? await findWorkspace($, root, home) : null
    let projectId: string | null = null
    if (top !== null || workspace !== null) {
      const marker = workspace === null ? '' : await $.fs.read(join(workspace, MARKER)).catch(() => '')
      projectId = await projectIdentifier({
        root,
        workspace,
        workspaceId: typeof marker === 'string' ? markerId(marker) : null,
        remoteUrl: workspace === null ? ((await git($, root, ['remote', 'get-url', 'origin'])) ?? '') : '',
        commonDir:
          workspace === null
            ? ((await git($, root, ['rev-parse', '--path-format=absolute', '--git-common-dir'])) ?? '')
            : '',
      })
    }

    return omcRoot({ stateDir, cwd, home, gitTop: top, workspace, projectId })
  }
  const workspace = isMultirepo ? await findWorkspace($, cwd, home) : null
  const gitTop = workspace === null ? await climb($, top) : top

  return omcRoot({ stateDir: null, cwd, home, gitTop, workspace, projectId: null })
}

/** This session's state for one mode: its own file, else a legacy file that names it. */
async function readMode($: EngineInterface, root: string, sessionId: string, mode: string): Promise<ModeState | null> {
  const paths = statePaths(root, sessionId, mode)
  for (const [path, isLegacy] of [
    [paths.session, false],
    [paths.legacy, true],
  ] as const) {
    const text = await $.fs.read(path).catch(() => null)
    const state = typeof text === 'string' ? parseState(text) : null
    if (state !== null && belongsTo(state, sessionId, isLegacy)) {
      return state
    }
  }

  return null
}

async function readAll($: EngineInterface): Promise<void> {
  const sessionId = await $.session.id()
  const cwd = await $.session.cwd()
  if (cached === null || cached.cwd !== cwd) {
    cached = { cwd, root: await resolveRoot($, cwd) }
  }
  const root = cached.root
  const found: Finding[] = []
  if (root !== null && isSafeSessionId(sessionId)) {
    const now = await $.clock.now()
    for (const mode of GUARDED_MODES) {
      const state = await readMode($, root, sessionId, mode)
      const finding = state === null ? null : judge(mode, state, now, limits)
      if (finding !== null) {
        found.push(finding)
      }
    }
  }
  // Redraw only when what the band says changes.
  const drawn = found.map(bandText).join('\n')
  if ((await read($, findings)).map(bandText).join('\n') !== drawn) {
    await update($, findings, () => found)
  }
}

/** Reads now, or once more after the read under way, never two at a time. */
async function refresh($: EngineInterface): Promise<void> {
  if (isReading) {
    isAgain = true

    return
  }
  isReading = true
  try {
    do {
      isAgain = false
      await readAll($)
    } while (isAgain)
  } finally {
    isReading = false
  }
}

function log($: EngineInterface, error: unknown): void {
  try {
    $.ui.log(`omc-watchdog: could not read OMC state: ${String(error)}`, { to: 'debug' })
  } catch {
    // Nothing more can be reported.
  }
}

function later($: EngineInterface): void {
  $.clock.after(0, () => {
    refresh($).catch(error => log($, error))
  })
}

// READ ONLY: the mod reads OMC's state files and runs `git` to find them. It
// never writes or deletes OMC state and never calls OMC's tools.
export const register: Register = (on, options) => {
  limits = thresholds(options)
  cached = null

  on('session.start', async ($, e, next) => {
    cached = null
    later($)
    $.clock.every(REFRESH_MS, () => {
      refresh($).catch(error => log($, error))
    })

    return next(e)
  })

  // A /clear or a /resume goes on under another session id, with no
  // session.start: read again for the new one.
  on('session.end', async ($, e, next) => {
    const result = await next(e)
    later($)

    return result
  })

  // OBSERVE ONLY: awaits next(e) and returns its result unchanged; a call
  // that may have changed OMC's state starts a read on a zero-delay timer.
  on('tool.call', async ($, e, next) => {
    const result = await next(e)
    if (touchesOmcState(e.tool, e)) {
      later($)
    }

    return result
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const list = await read($, findings)
    if (e.props.hasSurvey || list.length === 0) {
      return next(e)
    }
    const { Box, Text } = $.ui.resolve(e)

    return (
      <Box flexDirection="column">
        {list.map(finding => (
          <Text key={`omc-${finding.mode}`} bold color="warning">
            {bandText(finding)}
          </Text>
        ))}
      </Box>
    )
  })
}

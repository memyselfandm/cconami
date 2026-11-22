// Pure logic for what each active OMC mode's row says: its progress, elapsed
// time, workers, plan file and last phase change, read from the state file
// shapes oh-my-claudecode 5.8.6 writes. No engine calls here.
//
// Each mode's state has two writers in OMC 5.8.6, with different shapes, and
// both are read:
//
// - the hooks' generic activation, activateState() in
//   scripts/keyword-detector.mjs, plus whatever the mode's skill later writes
//   through the state_write tool (src/tools/state-tools.ts), which can store
//   values as strings and stamps `_meta.updatedAt`;
// - the TypeScript state modules: initAutopilot() and transitionPhase() in
//   src/hooks/autopilot/state.ts, startLoop() in src/hooks/ralph/loop.ts,
//   initTeamPipelineState() and markTeamPhase() in
//   src/hooks/team-pipeline/state.ts.

import type { AgentTally, Run } from '../types'
import { age, isAwaitingConfirmation, judge, numberOf, warningText } from './watch'
import type { ModeState, Thresholds } from './watch'

/**
 * autopilot's legacy phases in order, from AutopilotPhase in
 * src/hooks/autopilot/types.ts and the phase prompts in
 * src/hooks/autopilot/prompts.ts (OMC numbers them Phase 0 to Phase 4). The
 * row counts them from 1, so the last is 5/5. `complete` and `failed` end the
 * run (transitionPhase() sets `active` false); `ralplan` and `ralph` are named
 * workflow stages, read from `pipelineTracking` instead.
 */
export const AUTOPILOT_PHASES = ['expansion', 'planning', 'execution', 'qa', 'validation'] as const

/** A state file's top-level object. */
export type Raw = { readonly [key: string]: unknown }

/** A state file's text as an object, or null when it is not a JSON object. */
export function parseRaw(text: string): Raw | null {
  try {
    const raw: unknown = JSON.parse(text)

    return raw !== null && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Raw) : null
  } catch {
    return null
  }
}

function objectAt(raw: Raw, key: string): Raw | null {
  const value = raw[key]

  return value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Raw) : null
}

function textAt(raw: Raw | null, key: string): string | null {
  const value = raw === null ? undefined : raw[key]

  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null
}

function timeOf(value: unknown): number | null {
  if (typeof value !== 'string' || value === '') {
    return null
  }
  const ms = Date.parse(value)

  return Number.isFinite(ms) ? ms : null
}

/**
 * A named workflow's stage progress (PipelineTracking in
 * src/hooks/autopilot/pipeline-types.ts): `pipelineTracking` for a profile
 * run, else the legacy `pipeline`. Null unless `stages` is a non-empty array
 * and `currentStageIndex` points into it.
 */
function pipelineOf(raw: Raw): { stages: Raw[]; index: number } | null {
  const tracking = objectAt(raw, 'pipelineTracking') ?? objectAt(raw, 'pipeline')
  if (tracking === null || !Array.isArray(tracking.stages)) {
    return null
  }
  const stages = tracking.stages.filter((s): s is Raw => s !== null && typeof s === 'object' && !Array.isArray(s))
  const index = numberOf(tracking.currentStageIndex)
  if (stages.length === 0 || stages.length !== tracking.stages.length || index === null || !Number.isInteger(index)) {
    return null
  }

  return index >= 0 && index < stages.length ? { stages, index } : null
}

/**
 * autopilot's progress: a named workflow's `stage <n>/<total> <id>` from
 * `pipelineTracking.stages[currentStageIndex]`, else `phase <n>/5 <phase>`
 * for a legacy phase (AUTOPILOT_PHASES), else `phase <phase>` for any other.
 */
export function autopilotProgress(raw: Raw, phase: string | null): string | null {
  const pipeline = pipelineOf(raw)
  if (pipeline !== null) {
    const id = textAt(pipeline.stages[pipeline.index] ?? null, 'id')

    return `stage ${pipeline.index + 1}/${pipeline.stages.length}${id === null ? '' : ` ${id}`}`
  }
  if (phase === null) {
    return null
  }
  const at = (AUTOPILOT_PHASES as readonly string[]).indexOf(phase)

  return at === -1 ? `phase ${phase}` : `phase ${at + 1}/${AUTOPILOT_PHASES.length} ${phase}`
}

/**
 * ralph's progress: `iteration <n>` (startLoop() and activateState() write
 * `iteration`; the stop hook in scripts/persistent-mode.mjs increments it),
 * and `reviewer: <mode>` from `critic_mode` (RalphLoopState in
 * src/hooks/ralph/loop.ts: `architect`, `critic` or `codex`). `max_iterations`
 * is left out: OMC extends it by 10 whenever it is reached, so it is not a
 * limit.
 */
export function ralphProgress(raw: Raw): string[] {
  const out: string[] = []
  const iteration = numberOf(raw.iteration)
  if (iteration !== null) {
    out.push(`iteration ${iteration}`)
  }
  const critic = textAt(raw, 'critic_mode')
  if (critic !== null) {
    out.push(`reviewer: ${critic}`)
  }

  return out
}

/**
 * The workers a team state records: `execution.workers_total` and
 * `execution.workers_active` (TeamPipelineExecution, written by
 * initTeamPipelineState() in src/hooks/team-pipeline/state.ts), else the
 * `agent_count` the team skill stores through state_write, with no busy
 * count. Null when it records neither, or a total of 0.
 */
export function teamWorkers(raw: Raw): { total: number; busy: number | null } | null {
  const execution = objectAt(raw, 'execution')
  const total = numberOf(execution?.workers_total)
  if (total !== null && total > 0) {
    const busy = numberOf(execution?.workers_active)

    return { total, busy }
  }
  const count = numberOf(raw.agent_count)

  return count !== null && count > 0 ? { total: count, busy: null } : null
}

/**
 * ultragoal's progress from its plan, `.omc/ultragoal/goals.json`
 * (UltragoalPlan in src/ultragoal/artifacts.ts), the file OMC's stop hook
 * reads in isUltragoalTerminalState(): `goal <n>/<total>` for the goal
 * `activeGoalId` names, else `<done>/<total> goals done`. Its state file
 * holds no goal index or count (activateState() writes `current_phase:
 * 'executing'` and reinforcement counts only), so without a readable plan the
 * row shows the phase.
 */
export function ultragoalProgress(goalsText: string | null): string | null {
  const plan = goalsText === null ? null : parseRaw(goalsText)
  if (plan === null || !Array.isArray(plan.goals) || plan.goals.length === 0) {
    return null
  }
  const goals = plan.goals.map(g => (g !== null && typeof g === 'object' && !Array.isArray(g) ? (g as Raw) : {}))
  const active = textAt(plan, 'activeGoalId')
  const at = active === null ? -1 : goals.findIndex(g => g.id === active)
  if (at !== -1) {
    return `goal ${at + 1}/${goals.length}`
  }
  const done = goals.filter(g => g.status === 'complete').length

  return `${done}/${goals.length} goals done`
}

/**
 * When the run started: `started_at`, which every writer sets, else the first
 * `phase_history` entry's `entered_at` (TeamPhaseHistoryEntry). The team
 * skill's state_write file carries neither, so its elapsed time is unknown.
 */
export function startedMs(raw: Raw): number | null {
  const started = timeOf(raw.started_at)
  if (started !== null) {
    return started
  }
  const history = Array.isArray(raw.phase_history) ? raw.phase_history : []
  const first: unknown = history[0]

  return first !== null && typeof first === 'object' ? timeOf((first as Raw).entered_at) : null
}

/**
 * The plan file the state names: `plan_path` (autopilot's and team's hook and
 * state_write shapes), else autopilot's `planning.plan_path` (AutopilotPlanning)
 * or team's `artifacts.plan_path` (TeamPipelineArtifacts).
 */
export function planPath(raw: Raw): string | null {
  return textAt(raw, 'plan_path') ?? textAt(objectAt(raw, 'planning'), 'plan_path') ?? textAt(objectAt(raw, 'artifacts'), 'plan_path')
}

/**
 * The latest phase change the state records, as `<phase> at <ISO time>`:
 *
 * - a named workflow's current stage `startedAt` (PipelineStageState);
 * - autopilot's `phase_durations['<phase>_start_ms']`, which transitionPhase()
 *   stamps with `Date.now()` on entering a phase;
 * - team's last `phase_history` entry (markTeamPhase());
 * - the team skill's `stage_history`, a `phase:time,phase:time` string.
 */
export function lastChange(raw: Raw, phase: string | null): string | null {
  const at = (name: string, ms: number | null) => (ms === null ? null : `${name} at ${new Date(ms).toISOString()}`)
  const pipeline = pipelineOf(raw)
  if (pipeline !== null) {
    const stage = pipeline.stages[pipeline.index] ?? {}
    const found = at(textAt(stage, 'id') ?? 'stage', timeOf(stage.startedAt))
    if (found !== null) {
      return found
    }
  }
  const durations = objectAt(raw, 'phase_durations')
  if (phase !== null && durations !== null) {
    const ms = numberOf(durations[`${phase}_start_ms`])
    if (ms !== null) {
      return at(phase, ms)
    }
  }
  const history = Array.isArray(raw.phase_history) ? raw.phase_history : []
  const last: unknown = history[history.length - 1]
  if (last !== null && typeof last === 'object') {
    const name = textAt(last as Raw, 'phase')
    const found = name === null ? null : at(name, timeOf((last as Raw).entered_at))
    if (found !== null) {
      return found
    }
  }
  const stages = textAt(raw, 'stage_history')
  if (stages !== null) {
    const entry = stages.split(',').pop() ?? ''
    const split = entry.indexOf(':')
    if (split > 0) {
      return `${entry.slice(0, split).trim()} at ${entry.slice(split + 1).trim()}`
    }
  }

  return null
}

/**
 * The row's warning: a stale or looping finding (watch.ts's judge(), OMC's
 * own limits), else `awaiting confirmation` while OMC's stop hook holds the
 * run for the person (isAwaitingConfirmation(), two minutes at most), else
 * null.
 */
export function warningOf(mode: string, state: ModeState, nowMs: number, limits: Thresholds): string | null {
  const finding = judge(mode, state, nowMs, limits)
  if (finding !== null) {
    return warningText(finding)
  }

  return isAwaitingConfirmation(state, nowMs) ? 'awaiting confirmation' : null
}

/**
 * One mode's run from its state file, or null when the mode is not active.
 * `goalsText` is ultragoal's plan file, read only for ultragoal.
 */
export function buildRun(
  mode: string,
  state: ModeState,
  raw: Raw,
  goalsText: string | null,
  nowMs: number,
  limits: Thresholds,
): Run | null {
  if (!state.isActive) {
    return null
  }
  const progress: string[] = []
  if (mode === 'autopilot') {
    const p = autopilotProgress(raw, state.phase)
    if (p !== null) {
      progress.push(p)
    }
  } else if (mode === 'ralph') {
    progress.push(...ralphProgress(raw))
  } else if (mode === 'ultragoal') {
    const p = ultragoalProgress(goalsText) ?? state.phase
    if (p !== null) {
      progress.push(p)
    }
  } else if (state.phase !== null) {
    progress.push(state.phase)
  }
  const started = startedMs(raw)

  return {
    mode,
    progress,
    elapsed: started === null ? null : age(nowMs - started),
    workers: mode === 'team' ? teamWorkers(raw) : null,
    warning: warningOf(mode, state, nowMs, limits),
    planPath: planPath(raw),
    lastChange: lastChange(raw, state.phase),
  }
}

/** `1 agent running`, `3 agents running`, or null for none. */
function agentsText(count: number): string | null {
  return count === 0 ? null : `${count} agent${count === 1 ? '' : 's'} running`
}

/**
 * The row's main text, without the warning: the mode, its progress, the
 * elapsed time, team workers and this session's running subagents, joined
 * with ` · `. A team row counts workers from this session's teammates when it
 * has seen any, else from the state file.
 */
export function rowText(run: Run, tally: AgentTally): string {
  const parts = [run.mode, ...run.progress]
  if (run.mode === 'team') {
    const seen = tally.teammates.length
    const workers = seen > 0 ? { total: seen, busy: tally.teammates.filter(t => t.isBusy).length } : run.workers
    if (workers !== null) {
      const busy = workers.busy === null ? '' : ` (${workers.busy} busy)`
      parts.push(`${workers.total} worker${workers.total === 1 ? '' : 's'}${busy}`)
    }
  }
  if (run.elapsed !== null) {
    parts.push(run.elapsed)
  }
  const agents = agentsText(tally.running.length)
  if (agents !== null) {
    parts.push(agents)
  }

  return parts.join(' · ')
}

/** The detail `/omc-runs` prints for one run: plan file, last phase change and the cancel command. */
export function detailText(run: Run, tally: AgentTally): string {
  const lines = [rowText(run, tally)]
  if (run.warning !== null) {
    lines.push(`  warning: ${run.warning}`)
  }
  lines.push(`  plan: ${run.planPath ?? 'none recorded'}`)
  lines.push(`  last phase change: ${run.lastChange ?? 'none recorded'}`)
  lines.push('  cancel: /oh-my-claudecode:cancel')

  return lines.join('\n')
}

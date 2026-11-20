// OMC mode state files, copied from real ones written by oh-my-claudecode
// 5.8.6 (autopilot and ralph by its hooks, team by its state_write tool) with
// the prompts, paths and ids replaced. Times are set relative to the test's
// clock. Field names, types and their mix (team's counts as strings, team
// carrying only `_meta.updatedAt`) are as OMC wrote them.

export const SID = '0b6c1f9e-2d4a-4c7e-9a51-3f8e2d6b7c10'
export const OTHER_SID = '5d2e8a7c-1b3f-4e6a-8c9d-7f0a1b2c3d4e'

const iso = (ms: number) => new Date(ms).toISOString()

/** autopilot-state.json: active, in its execution phase, four reinforcements. */
export function autopilot(lastCheckedMs: number, overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    active: true,
    started_at: iso(lastCheckedMs - 7 * 60 * 60 * 1000),
    original_prompt: '/autopilot finish the migration',
    session_id: SID,
    project_path: '/repo/main',
    reinforcement_count: 4,
    awaiting_confirmation: true,
    awaiting_confirmation_set_at: iso(lastCheckedMs - 9 * 60 * 1000),
    last_checked_at: iso(lastCheckedMs),
    current_phase: 'execution',
    task_description: 'Finish the migration per the plan',
    plan_path: '.omc/plans/migration.md',
    _meta: {
      mode: 'autopilot',
      sessionId: SID,
      updatedAt: iso(lastCheckedMs - 8 * 60 * 1000),
      updatedBy: 'state_write_tool',
    },
    ...overrides,
  })
}

/** ralph-state.json: active, iteration 12 of 100, no phase. */
export function ralph(lastCheckedMs: number, overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    active: true,
    iteration: 12,
    max_iterations: 100,
    started_at: iso(lastCheckedMs - 2 * 60 * 60 * 1000),
    prompt: '/ralph until the work is done',
    session_id: SID,
    project_path: '/repo/main',
    last_checked_at: iso(lastCheckedMs),
    prd_mode: true,
    invocation_source: 'slash',
    ...overrides,
  })
}

/** team-state.json as OMC's state_write tool writes it: counts as strings, only `_meta.updatedAt`. */
export function team(updatedMs: number, overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    active: true,
    current_phase: 'team-exec',
    plan_path: '.omc/plans/next-steps.md',
    team_name: 'rebase-team',
    agent_count: '3',
    agent_types: 'executor',
    task: 'Phases 0-3 of the plan',
    fix_loop_count: '0',
    max_fix_loops: '3',
    linked_ralph: 'false',
    stage_history: 'team-plan:2026-09-30,team-exec:2026-09-30',
    _meta: { mode: 'team', sessionId: SID, updatedAt: iso(updatedMs), updatedBy: 'state_write_tool' },
    ...overrides,
  })
}

/** autopilot-state.json after the run ended. */
export function autopilotDone(lastCheckedMs: number): string {
  return autopilot(lastCheckedMs, { active: false, reinforcement_count: 0, current_phase: undefined })
}

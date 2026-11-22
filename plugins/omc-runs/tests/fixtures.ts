// OMC mode state files in the shapes oh-my-claudecode 5.8.6 writes, with every
// value synthetic. Times are set relative to the test's clock.
//
// Two writers per mode, as in OMC:
// - the hooks: activateState() in scripts/keyword-detector.mjs, and the stop
//   hook in scripts/persistent-mode.mjs that bumps counts and
//   `last_checked_at`; the team skill writes through the state_write tool
//   (counts as strings, only `_meta.updatedAt`);
// - the TypeScript state modules: initAutopilot()/transitionPhase()
//   (src/hooks/autopilot/state.ts), startLoop() (src/hooks/ralph/loop.ts),
//   initTeamPipelineState()/markTeamPhase() (src/hooks/team-pipeline/state.ts).
// The hook-written autopilot, ralph and team files keep the fields and types of
// real files OMC 5.8.6 wrote, as omc-watchdog's fixtures did.

export const SID = '0b6c1f9e-2d4a-4c7e-9a51-3f8e2d6b7c10'
export const OTHER_SID = '5d2e8a7c-1b3f-4e6a-8c9d-7f0a1b2c3d4e'

const MIN = 60 * 1000
const iso = (ms: number) => new Date(ms).toISOString()

/** autopilot-state.json as the hooks write it: active, execution phase, started 14 minutes before `nowMs`. */
export function autopilot(nowMs: number, overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    active: true,
    started_at: iso(nowMs - 14 * MIN),
    original_prompt: '/autopilot example-task',
    session_id: SID,
    project_path: '/example/project',
    reinforcement_count: 4,
    awaiting_confirmation: false,
    awaiting_confirmation_set_at: iso(nowMs - 13 * MIN),
    last_checked_at: iso(nowMs),
    current_phase: 'execution',
    task_description: 'example-task description',
    plan_path: '.omc/plans/example-plan.md',
    _meta: { mode: 'autopilot', sessionId: SID, updatedAt: iso(nowMs - MIN), updatedBy: 'state_write_tool' },
    ...overrides,
  })
}

/** autopilot-state.json as initAutopilot() and transitionPhase() write it: planning phase, entered 5 minutes ago. */
export function autopilotTyped(nowMs: number, overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    active: true,
    phase: 'planning',
    current_phase: 'planning',
    iteration: 1,
    max_iterations: 10,
    originalIdea: 'example idea',
    expansion: { analyst_complete: true, architect_complete: true, spec_path: '.omc/autopilot/spec.md', requirements_summary: '', tech_stack: [] },
    planning: { plan_path: '.omc/plans/autopilot-impl.md', architect_iterations: 1, approved: false },
    execution: { ralph_iterations: 0, tasks_completed: 0, tasks_total: 0, files_created: [], files_modified: [] },
    qa: { build_status: 'pending', lint_status: 'pending', test_status: 'pending' },
    validation: { architects_spawned: 0, verdicts: [], all_approved: false, validation_rounds: 0 },
    started_at: iso(nowMs - 20 * MIN),
    completed_at: null,
    phase_durations: { expansion_start_ms: nowMs - 20 * MIN, expansion: 15 * MIN, planning_start_ms: nowMs - 5 * MIN },
    total_agents_spawned: 2,
    wisdom_entries: 0,
    session_id: SID,
    project_path: '/example/project',
    ...overrides,
  })
}

/** autopilot-state.json for a named workflow: pipelineTracking at its second of four stages. */
export function autopilotPipeline(nowMs: number): string {
  return autopilotTyped(nowMs, {
    phase: 'execution',
    current_phase: 'execution',
    workflow: { id: 'example-workflow' },
    workflowRunId: '00000000-0000-4000-8000-000000000001',
    pipelineTracking: {
      stages: [
        { id: 'ralplan', status: 'complete', startedAt: iso(nowMs - 20 * MIN), completedAt: iso(nowMs - 8 * MIN), iterations: 1 },
        { id: 'execution', status: 'active', startedAt: iso(nowMs - 8 * MIN), iterations: 0 },
        { id: 'ralph', status: 'pending', iterations: 0 },
        { id: 'qa', status: 'pending', iterations: 0 },
      ],
      currentStageIndex: 1,
      trackingRevision: 3,
      activationBoundary: null,
      completionObservations: [],
    },
  })
}

/** ralph-state.json as the hooks write it: iteration 12, no reviewer recorded, started 22 minutes ago. */
export function ralph(nowMs: number, overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    active: true,
    iteration: 12,
    max_iterations: 100,
    started_at: iso(nowMs - 22 * MIN),
    prompt: '/ralph example-task',
    session_id: SID,
    project_path: '/example/project',
    last_checked_at: iso(nowMs),
    prd_mode: true,
    invocation_source: 'slash',
    ...overrides,
  })
}

/** ralph-state.json as startLoop() writes it, after the stop hook took it to iteration 7. */
export function ralphTyped(nowMs: number, overrides: Record<string, unknown> = {}): string {
  return ralph(nowMs, { iteration: 7, max_iterations: 10, critic_mode: 'critic', current_story_id: 'US-002', invocation_source: undefined, ...overrides })
}

/** team-state.json as the team skill's state_write writes it: counts as strings, only `_meta.updatedAt`. */
export function team(updatedMs: number, overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    active: true,
    current_phase: 'team-exec',
    plan_path: '.omc/plans/example-plan.md',
    team_name: 'example-team',
    agent_count: '3',
    agent_types: 'executor',
    task: 'example-task',
    fix_loop_count: '0',
    max_fix_loops: '3',
    linked_ralph: 'false',
    stage_history: 'team-plan:2000-01-01,team-exec:2000-01-02',
    _meta: { mode: 'team', sessionId: SID, updatedAt: iso(updatedMs), updatedBy: 'state_write_tool' },
    ...overrides,
  })
}

/** team-state.json as initTeamPipelineState() and markTeamPhase() write it: 4 workers, 3 active, 9 minutes in. */
export function teamTyped(nowMs: number, overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    schema_version: 1,
    mode: 'team',
    active: true,
    session_id: SID,
    project_path: '/example/project',
    phase: 'team-exec',
    phase_history: [
      { phase: 'team-plan', entered_at: iso(nowMs - 9 * MIN) },
      { phase: 'team-exec', entered_at: iso(nowMs - 4 * MIN), reason: 'plan approved' },
    ],
    iteration: 1,
    max_iterations: 25,
    artifacts: { plan_path: '.omc/plans/team-plan.md', prd_path: null, verify_report_path: null },
    execution: { workers_total: 4, workers_active: 3, tasks_total: 6, tasks_completed: 2, tasks_failed: 0 },
    fix_loop: { attempt: 0, max_attempts: 3, last_failure_reason: null },
    cancel: { requested: false, requested_at: null, preserve_for_resume: true },
    started_at: iso(nowMs - 9 * MIN),
    updated_at: iso(nowMs - MIN),
    completed_at: null,
    ...overrides,
  })
}

/** ultragoal-state.json as activateState() writes it, once confirmed: 31 minutes in. */
export function ultragoal(nowMs: number, overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    active: true,
    started_at: iso(nowMs - 31 * MIN),
    current_phase: 'executing',
    original_prompt: 'ultragoal example-goals',
    session_id: SID,
    project_path: '/example/project',
    reinforcement_count: 3,
    max_reinforcements: 50,
    awaiting_confirmation: false,
    awaiting_confirmation_set_at: iso(nowMs - 31 * MIN),
    last_checked_at: iso(nowMs),
    ...overrides,
  })
}

/** .omc/ultragoal/goals.json (UltragoalPlan): five goals, the second in progress. */
export function goals(overrides: Record<string, unknown> = {}): string {
  const goal = (id: string, status: string) => ({ id, title: `title ${id}`, objective: `objective ${id}`, status })

  return JSON.stringify({
    version: 1,
    createdAt: '2000-01-01T00:00:00.000Z',
    activeGoalId: 'G002',
    goals: [goal('G001', 'complete'), goal('G002', 'in_progress'), goal('G003', 'pending'), goal('G004', 'pending'), goal('G005', 'pending')],
    ...overrides,
  })
}

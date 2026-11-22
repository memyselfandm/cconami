// The row's fields and the agent tally, as pure functions.

import { describe, expect, test } from 'claude-code/testing'

import type { AgentTally, Run } from '../types'
import { EMPTY_TALLY, prune, reported, spawned, turned } from '../hooks/agents'
import {
  AUTOPILOT_PHASES,
  autopilotProgress,
  lastChange,
  parseRaw,
  planPath,
  ralphProgress,
  rowText,
  startedMs,
  teamWorkers,
  ultragoalProgress,
} from '../hooks/progress'
import type { Raw } from '../hooks/progress'
import { autopilotPipeline, autopilotTyped, goals, ralphTyped, team, teamTyped } from './fixtures'

const NOW = Date.parse('2026-11-20T12:00:00.000Z')
const MIN = 60 * 1000
const iso = (ms: number) => new Date(ms).toISOString()

function raw(text: string): Raw {
  const parsed = parseRaw(text)
  if (parsed === null) {
    throw new Error('fixture did not parse')
  }

  return parsed
}

function run(overrides: Partial<Run> = {}): Run {
  return { mode: 'team', progress: [], elapsed: null, workers: null, warning: null, planPath: null, lastChange: null, ...overrides }
}

describe('autopilot', () => {
  test('the legacy phases are OMC’s five, in order, counted from 1', () => {
    expect(AUTOPILOT_PHASES).toEqual(['expansion', 'planning', 'execution', 'qa', 'validation'])
    expect(autopilotProgress({}, 'expansion')).toBe('phase 1/5 expansion')
    expect(autopilotProgress({}, 'validation')).toBe('phase 5/5 validation')
    expect(autopilotProgress({}, 'ralph')).toBe('phase ralph')
    expect(autopilotProgress({}, null)).toBeNull()
  })

  test('a named workflow’s pipelineTracking wins over the phase; the legacy pipeline key is read too', () => {
    expect(autopilotProgress(raw(autopilotPipeline(NOW)), 'execution')).toBe('stage 2/4 execution')
    const tracking = raw(autopilotPipeline(NOW)).pipelineTracking
    expect(autopilotProgress({ pipeline: tracking }, null)).toBe('stage 2/4 execution')
  })

  test('a pipeline with an index out of range, a fractional index, or no stages falls back to the phase', () => {
    const stages = [{ id: 'ralplan' }, { id: 'execution' }]
    for (const currentStageIndex of [-1, 2, 0.5, null, 'x']) {
      expect(autopilotProgress({ pipelineTracking: { stages, currentStageIndex } }, 'qa')).toBe('phase 4/5 qa')
    }
    expect(autopilotProgress({ pipelineTracking: { stages: [], currentStageIndex: 0 } }, 'qa')).toBe('phase 4/5 qa')
    expect(autopilotProgress({ pipelineTracking: { stages: [null], currentStageIndex: 0 } }, 'qa')).toBe('phase 4/5 qa')
    expect(autopilotProgress({ pipelineTracking: { stages: [{}], currentStageIndex: '0' } }, 'qa')).toBe('stage 1/1')
  })
})

describe('ralph', () => {
  test('the iteration, then the reviewer; max_iterations is not shown', () => {
    expect(ralphProgress(raw(ralphTyped(NOW)))).toEqual(['iteration 7', 'reviewer: critic'])
    expect(ralphProgress({ iteration: '9', critic_mode: ' ' })).toEqual(['iteration 9'])
    expect(ralphProgress({})).toEqual([])
  })
})

describe('team', () => {
  test('workers from execution, else agent_count; none for zero or missing', () => {
    expect(teamWorkers(raw(teamTyped(NOW)))).toEqual({ total: 4, busy: 3 })
    expect(teamWorkers(raw(team(NOW)))).toEqual({ total: 3, busy: null })
    expect(teamWorkers({ execution: { workers_total: 0, workers_active: 0 }, agent_count: '2' })).toEqual({ total: 2, busy: null })
    expect(teamWorkers({ execution: { workers_total: 2 } })).toEqual({ total: 2, busy: null })
    expect(teamWorkers({ agent_count: '0' })).toBeNull()
    expect(teamWorkers({})).toBeNull()
  })

  test('the row prefers this session’s teammates to the state file', () => {
    const tally: AgentTally = { running: [], teammates: [{ id: 'a', isBusy: true }, { id: 'b', isBusy: false }] }
    expect(rowText(run({ workers: { total: 4, busy: 3 } }), tally)).toBe('team · 2 workers (1 busy)')
    expect(rowText(run({ workers: { total: 4, busy: 3 } }), EMPTY_TALLY)).toBe('team · 4 workers (3 busy)')
    expect(rowText(run({ workers: { total: 1, busy: null } }), EMPTY_TALLY)).toBe('team · 1 worker')
    expect(rowText(run(), EMPTY_TALLY)).toBe('team')
  })

  test('another mode’s row never counts workers', () => {
    const tally: AgentTally = { running: [], teammates: [{ id: 'a', isBusy: true }] }
    expect(rowText(run({ mode: 'ralph', workers: { total: 4, busy: 3 } }), tally)).toBe('ralph')
  })
})

describe('ultragoal', () => {
  test('the active goal of the plan, else how many are done, else nothing', () => {
    expect(ultragoalProgress(goals())).toBe('goal 2/5')
    expect(ultragoalProgress(goals({ activeGoalId: 'G999' }))).toBe('1/5 goals done')
    expect(ultragoalProgress(goals({ activeGoalId: undefined }))).toBe('1/5 goals done')
    expect(ultragoalProgress(goals({ goals: [] }))).toBeNull()
    expect(ultragoalProgress('not json')).toBeNull()
    expect(ultragoalProgress(null)).toBeNull()
  })
})

describe('the times and the plan', () => {
  test('started_at, else the first phase_history entry', () => {
    expect(startedMs(raw(teamTyped(NOW)))).toBe(NOW - 9 * MIN)
    expect(startedMs({ phase_history: [{ phase: 'team-plan', entered_at: iso(NOW - MIN) }] })).toBe(NOW - MIN)
    expect(startedMs({ started_at: 1234 })).toBeNull()
    expect(startedMs(raw(team(NOW)))).toBeNull()
  })

  test('the plan path from each writer’s field', () => {
    expect(planPath(raw(team(NOW)))).toBe('.omc/plans/example-plan.md')
    expect(planPath(raw(autopilotTyped(NOW)))).toBe('.omc/plans/autopilot-impl.md')
    expect(planPath(raw(teamTyped(NOW)))).toBe('.omc/plans/team-plan.md')
    expect(planPath({ plan_path: '' })).toBeNull()
  })

  test('the last phase change from each writer’s record', () => {
    expect(lastChange(raw(autopilotPipeline(NOW)), 'execution')).toBe(`execution at ${iso(NOW - 8 * MIN)}`)
    expect(lastChange(raw(autopilotTyped(NOW)), 'planning')).toBe(`planning at ${iso(NOW - 5 * MIN)}`)
    expect(lastChange(raw(teamTyped(NOW)), 'team-exec')).toBe(`team-exec at ${iso(NOW - 4 * MIN)}`)
    expect(lastChange(raw(team(NOW)), 'team-exec')).toBe('team-exec at 2000-01-02')
    expect(lastChange({ stage_history: 'nonsense' }, null)).toBeNull()
    expect(lastChange({}, 'execution')).toBeNull()
  })
})

describe('the agent tally', () => {
  test('a subagent counts from spawn to report, once', () => {
    let t = spawned(EMPTY_TALLY, 'a', 'subagent')
    t = spawned(t, 'a', 'subagent')
    t = spawned(t, 'b', 'subagent')
    expect(t.running).toEqual(['a', 'b'])
    t = reported(t, 'a')
    expect(t.running).toEqual(['b'])
    expect(reported(t, 'zz')).toBe(t)
  })

  test('a workflow agent is not tallied; a teammate is a worker, idle until its turn', () => {
    expect(spawned(EMPTY_TALLY, 'w', 'workflow')).toBe(EMPTY_TALLY)
    let t = spawned(EMPTY_TALLY, 'm', 'teammate')
    expect(spawned(t, 'm', 'teammate')).toBe(t)
    expect(t).toEqual({ running: [], teammates: [{ id: 'm', isBusy: false }] })
    t = turned(t, 'm', true)
    expect(t.teammates).toEqual([{ id: 'm', isBusy: true }])
    expect(turned(t, 'm', true)).toBe(t)
    expect(turned(t, 'other', false)).toBe(t)
    expect(turned(t, 'm', false).teammates).toEqual([{ id: 'm', isBusy: false }])
  })

  test('pruning keeps only listed agents, and changes nothing when all are listed', () => {
    const t: AgentTally = { running: ['a', 'b'], teammates: [{ id: 'm', isBusy: true }, { id: 'n', isBusy: false }] }
    expect(prune(t, new Set(['a', 'b', 'm', 'n']))).toBe(t)
    expect(prune(t, new Set(['b', 'n']))).toEqual({ running: ['b'], teammates: [{ id: 'n', isBusy: false }] })
  })
})

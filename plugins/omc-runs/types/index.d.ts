/** What is wrong with one active oh-my-claudecode mode in this session. */
export type Finding =
  | {
      /** The mode, such as `autopilot`. */
      mode: string
      /** The phase its state names (`current_phase`, `phase` or `stage`), or null. */
      phase: string | null
      /** Active, but not touched within the stale threshold. */
      kind: 'stale'
      /** Milliseconds since its latest activity time; null when the file records none. */
      ageMs: number | null
    }
  | {
      mode: string
      phase: string | null
      /** Active and fresh, but at or past OMC's reinforcement ceiling, or ralph near OMC's hard limit. */
      kind: 'looping'
      /** The count, when it is at or past the ceiling; else null. */
      reinforcement: number | null
      /** The ceiling it reached (OMC's, or the setting); null when the count did not. */
      reinforcementLimit: number | null
      /** ralph's iteration, when it is near OMC's hard limit; else null. */
      iteration: number | null
      /** OMC's hard limit for ralph (500, or 200 with OMC_SECURITY=strict), with `iteration`; else null. */
      maxIterations: number | null
    }

/** One active OMC mode of this session, as its row draws it. */
export type Run = {
  /** The mode: `autopilot`, `ralph`, `team` or `ultragoal`. */
  mode: string
  /**
   * The row's progress segments after the mode, from the state file, such as
   * `phase 3/5 execution` or `iteration 7`. Agent counts are not here: they
   * come from this session's events and are added when the row is drawn.
   */
  progress: string[]
  /** Time since `started_at` (or the equivalent), such as `14m`; null when the state records none. */
  elapsed: string | null
  /**
   * Workers the state file records (team only), used when this session has
   * seen no teammates of its own: null when it records none.
   */
  workers: { total: number; busy: number | null } | null
  /** What is wrong, as the row's warning, or null. */
  warning: string | null
  /** The plan file the state names, or null. */
  planPath: string | null
  /** The latest phase or stage change the state records, as `<phase> at <ISO time>`, or null. */
  lastChange: string | null
}

/** This session's agents, counted from its own `agent.spawn`, `agent.report` and `turn.*` events. */
export type AgentTally = {
  /** Subagents started and not yet reported back. */
  running: string[]
  /** Teammates started this session, and whether each is in a turn now. */
  teammates: { id: string; isBusy: boolean }[]
}

declare module 'claude-code' {
  interface PluginState {
    'omc-runs': {
      /** The active modes of the latest read, in GUARDED_MODES order; empty when none is active. */
      runs: Run[]
      /** The session's running agents. */
      agents: AgentTally
    }
  }
}

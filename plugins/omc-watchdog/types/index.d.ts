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

declare module 'claude-code' {
  interface PluginState {
    'omc-watchdog': {
      /** The findings of the latest read, one per mode at most; empty when all is well. */
      findings: Finding[]
    }
  }
}

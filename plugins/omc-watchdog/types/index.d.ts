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
      /** Active and fresh, but reinforced past the limit or at its iteration cap. */
      kind: 'looping'
      reinforcement: number | null
      iteration: number | null
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

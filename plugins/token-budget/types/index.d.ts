/**
 * The session's token spend so far, by the API's four counts, summed over
 * every model turn that reported usage: the main loop's and each subagent's.
 */
export type Spend = {
  /** Uncached input tokens (`input_tokens`). */
  input: number
  /** Generated tokens (`output_tokens`). */
  output: number
  /** Input tokens served from the prompt cache (`cache_read_input_tokens`). */
  cacheRead: number
  /** Input tokens written to the prompt cache (`cache_creation_input_tokens`). */
  cacheWrite: number
  /** How many turns were counted. */
  turns: number
}

declare module 'claude-code' {
  interface PluginState {
    'token-budget': {
      spent: Spend
      /** The budget in tokens, or null when none is set. */
      budget: number | null
    }
  }
}

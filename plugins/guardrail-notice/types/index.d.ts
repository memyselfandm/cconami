/** One tool call that a PreToolUse hook refused. */
export type Refusal = {
  /** The refused call's tool_use_id; the chat card is drawn under that row. */
  toolUseId: string
  /** The tool, as `tool.call` names it (`Bash`, an MCP tool). */
  tool: string
  /** What the band calls the call, such as `git push`: the refusal's own name for it when it gives one. */
  kind: string
  /** What a later successful call must equal to clear it: the normalized command, or the tool and its input. */
  key: string
  /** The hook the refusal is attributed to, such as `OMC guardrail`, or `hook`. */
  source: string
  /** The refusal's text, truncated for display. */
  message: string
  /** The safe form the refusal names, when it names one. */
  safeForm: string | null
}

declare module 'claude-code' {
  interface PluginState {
    'guardrail-notice': {
      /** Refusals still waiting on the person, newest first, one per call key. */
      active: Refusal[]
      /** The refusal behind each refused call's row, keyed by its tool_use_id; null for any other row. */
      call: StateFamily<Refusal | null>
    }
  }
}

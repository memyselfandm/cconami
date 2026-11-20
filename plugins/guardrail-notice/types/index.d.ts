/** One tool call that a PreToolUse hook refused. */
export type Refusal = {
  /** The refused call's tool_use_id; the chat card is drawn under that row. */
  toolUseId: string
  /** The tool, as `tool.call` names it (`Bash`, an MCP tool). */
  tool: string
  /** What the call was, such as `git push`; a later success of the same kind clears it. */
  kind: string
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
      /** Refusals still waiting on the person, newest first, one per kind. */
      active: Refusal[]
      /** Every refusal seen this session by tool_use_id (capped), for the chat cards. */
      byCall: Record<string, Refusal>
    }
  }
}

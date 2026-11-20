/** One watched MCP server that is not connected. */
export type Down = {
  /** The server's name as /mcp lists it, such as plugin:oh-my-claudecode:t. */
  server: string
  /** Why, in one word, as `$.mcp.connect` answers: failed, auth or unlisted. */
  reason: string
}

/** The result of the last check. */
export type Health = {
  down: Down[]
  /** When the last check finished, in milliseconds since the epoch. */
  checkedAt: number | null
}

declare module 'claude-code' {
  interface PluginState {
    'mcp-health': {
      health: Health
      /** The plugin MCP servers this session has been seen to start. */
      seen: string[]
    }
  }
}

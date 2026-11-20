/** One MCP server the engine was seen starting this session. */
export type Seen = {
  /** The server's name as /mcp lists it, such as plugin:oh-my-claudecode:t. */
  server: string
  /** True when a hook held the start back; a held server is never checked. */
  isHeld: boolean
}

/** One row of the band. */
export type Row = {
  server: string
  /**
   * `failed`, `auth` or `unlisted`, as `$.mcp.connect` answers; `timeout`, no
   * answer in time; or `unseen`, a watched name this session did not see
   * start, which is not checked.
   */
  reason: string
}

/** The result of the last check. */
export type Health = {
  down: Row[]
  unseen: Row[]
  /** Servers that did not answer in time: unknown, not healthy. */
  quiet: Row[]
  /** True when every plugin server seen starting was held, so none is checked. */
  isBlind: boolean
  /** Counted failed answers in a row, by server. */
  strikes: Record<string, number>
}

declare module 'claude-code' {
  interface PluginState {
    'mcp-health': {
      status: Health
      /** The servers the engine was seen starting this session. */
      started: Seen[]
    }
  }
}

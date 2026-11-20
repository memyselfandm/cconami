/** One Linear issue that is waiting on the owner. */
export type Ask = {
  /** The issue identifier, such as LAB-611. */
  id: string
  title: string
  url: string
  /** The workflow state's name, such as Todo. */
  state: string
  /** The project's name, or an empty string. */
  project: string
}

/** The inbox as last read from Linear. */
export type Inbox = {
  asks: Ask[]
  /** When Linear last answered, in milliseconds since the epoch. */
  fetchedAt: number | null
  /** Why the last refresh failed, or null when it worked. */
  error: string | null
}

declare module 'claude-code' {
  interface PluginState {
    'owner-inbox': { inbox: Shaped<Inbox> }
  }
}

// The pure half of owner-inbox: the settings and the query the inbox sends to
// Linear. Nothing here reaches `$`, so the tests drive it directly.

/** The default of the `label` userConfig field in plugin.json. */
export const DEFAULT_LABEL = 'owner-action'

export type Settings = { label: string }

/** The userConfig values: a blank or non-string `label` takes the default. */
export function settings(options: Readonly<Record<string, unknown>>): Settings {
  const label = typeof options.label === 'string' ? options.label.trim() : ''

  return { label: label === '' ? DEFAULT_LABEL : label }
}

/** The arguments of the Linear connector's `list_issues` call for one label. */
export function listIssuesArgs(label: string): Record<string, unknown> {
  return {
    label,
    fields: ['id', 'title', 'url', 'status', 'statusType', 'project'],
    // Closed asks come back too and are dropped when the answer is read, so ask
    // for the largest page the connector gives.
    limit: 250,
  }
}

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

/**
 * The title of an issue a tool call files as an ask (it carries `label`, in any
 * case, in `labels` or `addLabels`), or null.
 */
export function filedAsk(label: string, tool: string, input: unknown): string | null {
  if (!/__(save|create)_issue$/.test(tool)) {
    return null
  }
  const fields = (input ?? {}) as Record<string, unknown>
  const labels = [fields.labels, fields.addLabels]
    .flatMap(value => (Array.isArray(value) ? value : []))
    .map(value => String(value).toLowerCase())
  if (!labels.includes(label.toLowerCase())) {
    return null
  }

  return typeof fields.title === 'string' ? fields.title : 'A new ask'
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

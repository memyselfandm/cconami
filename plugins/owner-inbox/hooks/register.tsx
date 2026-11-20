import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Ask, Inbox } from '../types'

// The inbox is the set of open Linear issues that carry this label, whoever
// they are assigned to: agents do not reliably assign the owner. Linear is the
// record, so every session shows the same list.
const LABEL = 'owner-action'
const PANE = 'owner-inbox'
const TITLE = 'Waiting on you'
const REFRESH_MS = 120_000
const STORE_KEY = 'inbox'

const EMPTY: Inbox = { asks: [], fetchedAt: null, error: null }
const inbox = atom({ plugin: 'owner-inbox', key: 'inbox' } as const, EMPTY, {
  shape: 'inbox-1',
})

// The Linear connector, by the name /mcp lists it under. The mod calls it
// with the session's own connection, so it needs no CLI and no credential.
const LINEAR = 'claude.ai Linear'

type LinearIssue = {
  id?: string
  title?: string
  url?: string
  status?: string | null
  statusType?: string | null
  project?: string | null
}

/** The connector's answer is one text block holding `{ issues: [...] }`. */
function toAsks(blocks: readonly unknown[]): Ask[] {
  const text = blocks
    .map(block => (block as { type?: string; text?: string }) ?? {})
    .find(block => block.type === 'text' && typeof block.text === 'string')?.text
  if (text === undefined) {
    throw new Error('the Linear connector answered with no text')
  }
  const rows: LinearIssue[] = (JSON.parse(text) as { issues?: LinearIssue[] }).issues ?? []

  return rows
    .filter(row => !['completed', 'canceled'].includes(row.statusType ?? ''))
    .map(row => ({
      id: row.id ?? '?',
      title: row.title ?? '',
      url: row.url ?? '',
      state: row.status ?? '',
      project: row.project ?? '',
    }))
}

function isInbox(value: unknown): value is Inbox {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as Inbox).asks)
  )
}

async function refresh($: EngineInterface): Promise<Inbox> {
  let fresh: Inbox
  try {
    const answer = await $.mcp.call(LINEAR, 'list_issues', {
      label: LABEL,
      fields: ['id', 'title', 'url', 'status', 'statusType', 'project'],
      // Closed asks come back too and are dropped in toAsks, so ask for the
      // largest page the connector gives.
      limit: 250,
    })
    if (answer.isError) {
      throw new Error('the Linear connector refused the request')
    }
    fresh = {
      asks: toAsks(answer.content),
      fetchedAt: await $.clock.now(),
      error: null,
    }
    // The stored copy is what a new session shows before Linear answers.
    await $.store.set(STORE_KEY, fresh)
  } catch (error) {
    const prior = await read($, inbox)
    const reason = error instanceof Error ? error.message : String(error)
    fresh = { ...prior, error: reason.slice(0, 200) }
  }
  await update($, inbox, () => fresh)

  return fresh
}

/** The title of an issue a tool call files as an ask, or null. */
function filedAsk(tool: string, input: unknown): string | null {
  if (!/__(save|create)_issue$/.test(tool)) {
    return null
  }
  const fields = (input ?? {}) as Record<string, unknown>
  const labels = [fields.labels, fields.addLabels]
    .flatMap(value => (Array.isArray(value) ? value : []))
    .map(value => String(value).toLowerCase())
  if (!labels.includes(LABEL)) {
    return null
  }

  return typeof fields.title === 'string' ? fields.title : 'A new ask'
}

/** Opens the pane if it is closed and closes it if it is open. */
async function toggle($: EngineInterface): Promise<boolean> {
  const isUp = (await $.ui.panes()).some(pane => pane.id === PANE)
  if (isUp) {
    await $.ui.close({ id: PANE })
  } else {
    await $.ui.open({ id: PANE, title: TITLE })
  }

  return !isUp
}

function clock(at: number): string {
  const when = new Date(at)
  const minutes = String(when.getMinutes()).padStart(2, '0')

  return `${when.getHours()}:${minutes}`
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'inbox',
      description: 'Show or hide the panel of issues waiting on you',
    })

    // The panel stays closed until asked for: the band above the prompt is
    // what shows there is something waiting.
    const stored = await $.store.get(STORE_KEY)
    if (isInbox(stored)) {
      await update($, inbox, () => ({ ...stored, error: null }))
    }
    void refresh($)
    $.clock.every(REFRESH_MS, () => {
      void refresh($)
    })

    return next(e)
  })

  on('command.run', { command: 'inbox' }, async $ => {
    const isOpen = await toggle($)
    if (!isOpen) {
      return { text: 'Inbox panel closed.' }
    }
    const { asks, error } = await refresh($)
    if (error !== null) {
      return { text: `Could not read Linear: ${error}` }
    }

    return {
      text:
        asks.length === 0
          ? 'Nothing is waiting on you.'
          : `${asks.length} waiting on you: ${asks.map(ask => ask.id).join(', ')}`,
    }
  })

  // An agent filing an ask: say so at once, and pick it up in the inbox.
  on('tool.call', async ($, e, next) => {
    const ran = await next(e)
    const title = filedAsk(String(e.tool), e)
    if (title !== null && ran.deny === undefined && ran.isError !== true) {
      $.ui.toast(`Action for you: ${title}`)
      void refresh($)
    }

    return ran
  })

  // The same call's row in the chat, drawn as a card so it is not scrolled past.
  on('ui.render', { component: 'ToolUse' }, async ($, e, next) => {
    const title = filedAsk(e.props.tool, e.props.input)
    if (title === null || e.props.isErrored) {
      return next(e)
    }
    const { Box, Text } = $.ui.resolve(e)

    return (
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor="warning"
        paddingX={1}
      >
        <Text bold color="warning">
          ACTION FOR YOU
        </Text>
        <Text>{title}</Text>
        {await next(e)}
      </Box>
    )
  })

  // A reply that names an open ask gets a line above it saying so.
  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => {
    const { asks } = await read($, inbox)
    const named = asks.filter(ask => e.props.text.includes(ask.id)).slice(0, 3)
    if (named.length === 0) {
      return next(e)
    }
    const { Box, Text } = $.ui.resolve(e)

    return (
      <Box flexDirection="column">
        {named.map(ask => (
          <Text bold color="warning" wrap="truncate-end">
            {'> '}Waiting on you: {ask.id} {ask.title}
          </Text>
        ))}
        {await next(e)}
      </Box>
    )
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const { asks } = await read($, inbox)
    if (e.props.hasSurvey || asks.length === 0) {
      return next(e)
    }
    const { Box, Button, Text } = $.ui.resolve(e)
    const ids = asks.slice(0, 4).map(ask => ask.id)
    const rest = asks.length - ids.length

    return (
      <Box gap={1}>
        <Text bold color="warning">
          {asks.length} waiting on you
        </Text>
        <Text dimColor>
          {ids.join(', ')}
          {rest > 0 ? ` +${rest}` : ''}
        </Text>
        <Button
          key="open"
          label="Inbox"
          onPress={() => {
            void toggle($)
          }}
        />
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Button, Link, Text } = $.ui.resolve(e)
    const { asks: all, fetchedAt, error } = await read($, inbox)
    // An ask takes four rows. Draw what fits and say how many are left out,
    // so a long inbox never grows past the panel.
    const room = Math.max(2, Math.floor(((e.viewport?.rows ?? 24) - 5) / 4))
    const asks = all.slice(0, room)
    const hidden = all.length - asks.length

    return (
      <Box flexDirection="column" gap={1}>
        {error !== null && <Text color="error">Linear: {error}</Text>}
        {asks.length === 0 && error === null && (
          <Text dimColor>
            {fetchedAt === null ? 'Reading Linear...' : 'Nothing is waiting on you.'}
          </Text>
        )}
        {asks.map(ask => (
          <Box key={ask.id} flexDirection="column">
            <Box gap={1}>
              <Text bold color="warning">
                {ask.id}
              </Text>
              <Text dimColor>
                {ask.state}
                {ask.project === '' ? '' : ` · ${ask.project}`}
              </Text>
            </Box>
            <Text wrap="wrap">{ask.title}</Text>
            {ask.url !== '' && <Link href={ask.url} label="Open in Linear" />}
          </Box>
        ))}
        {hidden > 0 && <Text dimColor>+{hidden} more in Linear</Text>}
        <Box gap={1}>
          <Button
            key="close"
            label="Close"
            onPress={() => {
              void $.ui.close({ id: PANE })
            }}
          />
          <Button
            key="refresh"
            label="Refresh"
            onPress={() => {
              void refresh($)
            }}
          />
          {fetchedAt !== null && <Text dimColor>read {clock(fetchedAt)}</Text>}
        </Box>
      </Box>
    )
  })
}

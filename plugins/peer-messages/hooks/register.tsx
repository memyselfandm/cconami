import type { Register } from 'claude-code'

// What each sender kind is called on the card. A kind not listed here is not a
// message from someone else (the person's own prompt, a task notification).
const SENDERS: Record<string, string> = {
  peer: 'another session',
  'peer-send-message': 'another session',
  coordinator: 'coordinator',
  'projects-relay': 'coordinator',
  channel: 'channel',
  observer: 'observer',
}

// The card shows the head of a long message; ctrl+o shows all of it.
const MAX_LINES = 14

export const register: Register = on => {
  // By default such a row is one dim line. Draw it as a card instead.
  on('ui.render', { component: 'UserMessage' }, async ($, e, next) => {
    const kind = String(e.props.origin.kind)
    // A teammate's message carries no origin stamp, only its sender.
    const isFromTeammate = kind === 'unclassified' && e.props.from !== undefined
    if (e.props.isExpanded || !(kind in SENDERS || isFromTeammate)) {
      return next(e)
    }
    const { Box, Markdown, Text } = $.ui.resolve(e)
    const role = SENDERS[kind] ?? 'teammate'
    const lines = e.props.text.split('\n')
    const hidden = lines.length - MAX_LINES

    return (
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor="suggestion"
        paddingX={1}
      >
        <Box gap={1}>
          <Text bold color="suggestion">
            MESSAGE from {e.props.from?.name ?? role}
          </Text>
          {e.props.from !== undefined && <Text dimColor>{role}</Text>}
        </Box>
        <Markdown text={lines.slice(0, MAX_LINES).join('\n')} />
        {hidden > 0 && (
          <Text dimColor>
            {hidden} more {hidden === 1 ? 'line' : 'lines'} (ctrl+o)
          </Text>
        )}
      </Box>
    )
  })

  // Say so when one arrives, in case the chat has scrolled on.
  on('prompt.submit', ($, e, next) => {
    const role = SENDERS[String(e.origin.kind)]
    if (role !== undefined) {
      $.ui.toast(`Message from ${role}`)
    }

    return next(e)
  })
}

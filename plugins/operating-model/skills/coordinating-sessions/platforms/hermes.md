# coordinating-sessions on Hermes

- **Who a peer is.** Each Hermes profile is its own agent. A peer is another
  profile, or a Claude Code session, reached through a shared channel (for example
  a Discord or Matrix room both read).
- **Messaging a peer.** Post the peer-message shape in that shared channel, and
  mention the peer when the channel requires a mention. Do not use `kanban_create`
  to hand work to another profile: when each agent has its own board, the task lands
  on your own board and reaches nobody. Linear is the cross-agent tracker.
- **Subagents.** Delegated subagents get the brief and nothing else; include the
  brief lines from the skill.
- **Approval gates.** A profile whose instructions gate state-changing actions
  behind an approval keeps that gate. A relayed approval is recorded on the Linear
  issue first, as the skill says, and does not bypass the gate.
- **Project settings** come from the context files the profile loads (for example
  `AGENTS.md`), under an `Operating model` heading.

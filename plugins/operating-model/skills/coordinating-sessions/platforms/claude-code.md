# coordinating-sessions on Claude Code

- **Naming a session.** Rename it to the issue or project ID (`/rename <name>`), so
  peers and the owner see who owns what.
- **Messaging a peer.** Send the peer-message shape with the cross-session
  messaging tool your setup has (for example `SendMessage` to a named agent or
  session). The `peer-messages` plugin in this marketplace draws incoming messages
  as a card in the chat.
- **Subagents.** Start them with the Agent tool. Its prompt is the whole brief: the
  subagent reads `CLAUDE.md` but not your conversation or memory. Use
  `isolation: "worktree"` for anything that edits files or checks out a branch.
- **Guards.** The plugin's command guard (`hooks/guard-bash-command.py`) refuses
  `gh pr merge --auto` and token-printing `bao`/`vault token lookup`, plus any rules
  the project adds in `.claude/guard-rules.json`. Worktree-isolated sessions also
  refuse commands they cannot verify; split those into plain commands.
- **Project settings** live in the repository's `CLAUDE.md` under an
  `Operating model` heading.

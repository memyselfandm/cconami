# checkpointing-sessions on Hermes

- **Context lost.** A Hermes conversation loses its working context when the
  session is reset or a new session starts, and long conversations are compressed
  into a summary. Treat a compression summary exactly like a Claude Code
  compaction: run Resume, then Save.
- **Posting the checkpoint.** Use the profile's Linear MCP server, if it has one:
  create a project update, or comment on the issue. A profile without Linear access
  cannot checkpoint to Linear; say so to the owner in the channel instead of writing
  a local file, and ask for the checkpoint to be relayed.
- **Do not checkpoint to the kanban board or to memory.** Both are local to one
  agent; another session or the owner cannot read them as the record.
- **Project settings** come from the context files the profile loads (for example
  `AGENTS.md` in the working directory), under an `Operating model` heading.
- **Reloading a skill.** After a reset, load the skill again before you resume.

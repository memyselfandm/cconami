# checkpointing-sessions on Claude Code

- **Context lost.** `/clear` ends the session's memory. Compaction (automatic, or
  `/compact`) replaces it with a summary; a session continued from a summary says
  so at the top of the context.
- **Posting the checkpoint.** With the Linear connector, a project update is
  `save_status_update` (type `project`) and an issue comment is `save_comment`.
  Read the latest with `get_status_updates` or `list_comments`. If the project uses
  a Linear CLI instead, use its equivalent commands.
- **Reloading a skill after compaction.** Invoke it again with the Skill tool
  (`checkpointing-sessions`, and any other skill the session was using).
- **Project settings** live in the repository's `CLAUDE.md` under an
  `Operating model` heading.
- **Credential checks** must not print a secret. The plugin's command guard refuses
  the common token-printing commands; on a refusal, use the safe form it names.

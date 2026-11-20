# ralph-config on Claude Code

## Reading a Linear source (`--from ABC-123`)

Use the Linear MCP connector if the session has it (`mcp__claude_ai_Linear__get_issue`,
then `mcp__claude_ai_Linear__list_comments` for the discussion), or the CLI:

```bash
linctl issue get <ticket-id> --json
linctl comment list <ticket-id> --json
```

## Tracker commands for generated hats

See [../references/tracker-commands.md](../references/tracker-commands.md). Hats run in
Ralph Orchestrator's shell, so they use the CLI even when this session reads Linear
through the connector.

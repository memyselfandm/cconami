# ralph-config on Claude Code

## Reading a Linear source (`--from ABC-123`)

Use the Linear MCP connector if the session has it (`mcp__claude_ai_Linear__get_issue`,
then `mcp__claude_ai_Linear__list_comments` for the discussion), or the CLI:

```bash
linctl issue get <ticket-id> --json
```

## Tracker commands for generated hats

Hats run in Ralph Orchestrator's shell, not in this session, so they need a CLI. For
Linear, write `linctl` commands into the hat instructions:

| Action | Command |
|--------|---------|
| Fetch | `linctl issue get KEY --json` |
| Comment | `linctl comment create KEY --body "message"` |
| Update status | `linctl issue update KEY --state "<status>"` |

Jira and GitHub use `jira issue view/comment` and `gh issue view/comment`, as in the
skill's table.

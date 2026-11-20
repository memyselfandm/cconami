# Linear on Claude Code

## Reaching Linear

Use whichever of these the session has. Check before the first write.

1. **The Linear MCP connector.** Its tools are named `mcp__<server>__<operation>`, for
   example `mcp__claude_ai_Linear__get_issue`, `mcp__claude_ai_Linear__list_issues`,
   `mcp__claude_ai_Linear__save_issue`, `mcp__claude_ai_Linear__list_comments`,
   `mcp__claude_ai_Linear__save_comment`, `mcp__claude_ai_Linear__get_project`,
   `mcp__claude_ai_Linear__save_status_update` and
   `mcp__claude_ai_Linear__get_initiative`. The server name differs between installs
   (`claude_ai_Linear`, `linear`, ...); list the tools to find it. Tools that are
   deferred must be loaded with ToolSearch before the first call.
2. **The `linctl` CLI.** Pass `--json` on every read (`get`, `list`, `search`). Check
   it works with `linctl whoami`. It has gaps (no initiatives, blocking links, labels,
   or comments outside tickets; no project filter on `issue list`); the full mapping
   is in `pm-context/platforms/claude-code.md`.

If neither works, tell the user at once.

`get_issue` does not return comments; call `list_comments` for the discussion.

## Keeping context small

Linear calls return large payloads. When a task makes more than a handful of them
(reading a whole project, a reconciliation, a status report), delegate the reading to
a subagent and keep only its table.

## Ticket mapping

| Model term | Linear object |
|------------|---------------|
| Initiative | Initiative |
| Project | Project |
| Ticket | Issue |
| Sub-issue | Issue with a parent |
| Blocking link | Issue relation `blocks` / `blocked by` |
| Project update | Project status update |

Linear's own "cycles" feature is not used. Leave a team's cycles turned off, and never
assign an issue to one of them when creating or updating it.

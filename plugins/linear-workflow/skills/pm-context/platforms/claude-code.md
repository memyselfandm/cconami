# pm-context on Claude Code

## Linear adapter

Call Linear through the Linear MCP connector when the session has it, or the `linctl`
CLI otherwise. Load deferred MCP tools with ToolSearch before the first call.

| Operation | MCP connector tool | `linctl` |
|-----------|--------------------|----------|
| get_item | `mcp__claude_ai_Linear__get_issue` (pass `includeRelations: true`) | `linctl issue get <key> --json` |
| create_item | `mcp__claude_ai_Linear__save_issue` without `id` | `linctl issue create --team <team> --title ... --project ... --json` |
| update_item, set_parent, assign_to_project, transition_item | `mcp__claude_ai_Linear__save_issue` with `id` (`parentId`, `project`, `state`) | `linctl issue update <key> --parent/--project/--state ... --json` |
| list_items | `mcp__claude_ai_Linear__list_issues` (follow `cursor` while `hasNextPage`) | `linctl issue list --team <team> --project ... --json` |
| search_items | `mcp__claude_ai_Linear__list_issues` with `query` | `linctl issue search "<query>" --team <team> --json` |
| add_blocking_link, remove_blocking_link | `mcp__claude_ai_Linear__save_issue` with `blocks` / `blockedBy` (append-only), or `removeBlocks` / `removeBlockedBy` | not supported; report the step as skipped |
| add_link | `mcp__claude_ai_Linear__save_issue` with `links: [{url, title}]` | not supported |
| get_project, list_projects, create_project | `mcp__claude_ai_Linear__get_project`, `list_projects`, `save_project` | `linctl project get/list/create --json` |
| get_initiative, list_initiatives | `mcp__claude_ai_Linear__get_initiative`, `list_initiatives` | not supported |
| add_comment, list_comments | `mcp__claude_ai_Linear__save_comment`, `list_comments` | `linctl comment create <key> --body ...`, `linctl comment list <key> --json` |
| add_update, list_updates | `mcp__claude_ai_Linear__save_status_update` (without `id`; `type` is `project` or `initiative`), `get_status_updates` | not supported |
| list_statuses | `mcp__claude_ai_Linear__list_issue_statuses` | `linctl state list --team <team> --json` |
| add_label, remove_label | `save_issue` with `addLabels` / `removeLabels` (never `labels`, which replaces the set) | not supported |

Never assign an issue to one of Linear's cycles. The server name in the tool names (`claude_ai_Linear` above) differs between installs.

## Markdown adapter

Read and edit the files with the ordinary file tools. No extra setup.

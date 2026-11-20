# pm-context on Claude Code

## Linear adapter

Call Linear through the Linear MCP connector when the session has it; it covers every
operation. Load deferred MCP tools with ToolSearch before the first call. The `linctl`
CLI is a fallback with gaps, marked below; for a gap, report the step as skipped.

The `linctl` column was checked against `linctl --help` for each subcommand (build
`dev`, 2026-11). Pass `--json` on every read. `--project` takes a project **ID**, not a
name: resolve it first with `linctl project list --json`. `issue list` and `issue search`
only return issues created in the last six months unless given `--newer-than all_time`,
and leave out completed and cancelled ones unless given `--include-completed`.

| Operation | MCP connector tool | `linctl` |
|-----------|--------------------|----------|
| get_item | `mcp__claude_ai_Linear__get_issue` (pass `includeRelations: true`) | `linctl issue get <key> --json` |
| create_item | `mcp__claude_ai_Linear__save_issue` without `id` | `linctl issue create --team <key> --title ... --description ... --priority <0-4> --project <project-id> --json`; no parent, assignee or label flags, so follow with `issue update` |
| update_item, set_parent, assign_to_project, transition_item | `mcp__claude_ai_Linear__save_issue` with `id` (`parentId`, `project`, `state`) | `linctl issue update <key> --title/--description/--assignee/--parent/--priority/--project <project-id>/--state "<state name>" --json` |
| list_items | `mcp__claude_ai_Linear__list_issues` (follow `cursor` while `hasNextPage`) | `linctl issue list --team <key> --state ... --assignee ... --newer-than all_time --json`; **no project or parent filter**: filter `.project` or `.parent` locally |
| search_items | `mcp__claude_ai_Linear__list_issues` with `query` | `linctl issue search "<query>" --team <key> --newer-than all_time --json` |
| get_children | `mcp__claude_ai_Linear__list_issues` with `parentId` | not supported directly: `issue list` then filter `.parent` locally |
| add_blocking_link, remove_blocking_link | `save_issue` with `blocks` / `blockedBy` (append-only), or `removeBlocks` / `removeBlockedBy` | not supported |
| add_link | `save_issue` with `links: [{url, title}]` | not supported |
| get_project, list_projects | `mcp__claude_ai_Linear__get_project`, `list_projects` | `linctl project get <project-id> --json`; `linctl project list --team <key> --state <planned\|started\|paused\|completed\|canceled> --newer-than all_time --json`, plus `--include-completed` for `completed` or `canceled` |
| create_project | `mcp__claude_ai_Linear__save_project` without `id` (`addTeams`, `addInitiatives`) | `linctl project create --team <key> --name ... --description ... --lead ... --state ... --json`; no initiative flag |
| update_project | `save_project` with `id` (`description`, `state`, `lead`, `addInitiatives`) | `linctl project update <project-id> --description/--state/--lead --json`; no initiative flag |
| get_initiative, list_initiatives | `mcp__claude_ai_Linear__get_initiative`, `list_initiatives` | not supported |
| create_initiative, update_initiative | `mcp__claude_ai_Linear__save_initiative` (without or with `id`) | not supported |
| add_comment, list_comments | `mcp__claude_ai_Linear__save_comment` with `issueId`, `projectId` or `initiativeId`; `list_comments` with the same | tickets only: `linctl comment create <key> --body ...`, `linctl comment list <key> --json` |
| add_update, list_updates | `mcp__claude_ai_Linear__save_status_update` (without `id`; `type` is `project` or `initiative`), `get_status_updates` | projects only: `linctl project update-post create <project-uuid> --body ... --health onTrack\|atRisk\|offTrack`, `linctl project update-post list <project-uuid>` |
| list_statuses | `mcp__claude_ai_Linear__list_issue_statuses` | not supported (no state listing command); `--state` takes a state name |
| list_labels, add_label, remove_label | `list_issue_labels`; `save_issue` with `addLabels` / `removeLabels` (never `labels`, which replaces the set) | not supported |

Check `linctl` works with `linctl whoami`. Never assign an issue to one of Linear's
cycles. The server name in the MCP tool names (`claude_ai_Linear` above) differs between
installs.

## Markdown adapter

Read and edit the files with the ordinary file tools. No extra setup.

# pm-context on Hermes

## Linear adapter

Call Linear through the Linear MCP server in the profile's `mcp_servers` config. Its
tools cover every operation in the interface: issues (with relations and attachments),
comments, projects, project and initiative updates, initiatives, statuses and labels.
Use the tool's add-label and remove-label fields; setting the full label list replaces
the issue's other labels.

- No Linear MCP server in the profile means no Linear adapter. Report it; do not fall
  back to the markdown adapter, which would read a different backlog.
- Writes go through the profile's approval rules. A read-only task, such as a status
  report, needs no approval.

## Markdown adapter

Read and edit the files with the file tools, inside the repository the task names.

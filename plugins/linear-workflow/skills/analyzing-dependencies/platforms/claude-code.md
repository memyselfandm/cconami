# analyzing-dependencies on Claude Code

- Invoke as `/analyzing-dependencies <key | --project NAME | --initiative NAME>`.
- Linear calls: see `pm-context/platforms/claude-code.md`. Ask for relations
  explicitly (`includeRelations: true` on `get_issue`); list calls do not return them.
- For an initiative, or a project with more than about fifteen open tickets, delegate
  the reads to a subagent that returns only the edge list (`blocker -> blocked`, with
  each ticket's status and project), then build the graph from that.
- The graph steps can run in the Python REPL tool if one is available; otherwise reason
  over the edge list directly.

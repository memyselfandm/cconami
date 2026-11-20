# Tracker commands for generated hats

Hats run in Ralph Orchestrator's shell, not in the agent that generated the config, so
they call tracker CLIs. Write these into hat instructions.

| Tool | Fetch issue | Comment | Update status |
|------|-------------|---------|---------------|
| Linear | `linctl issue get KEY --json` | `linctl comment create KEY --body "message"` | `linctl issue update KEY --state "<state name>"` |
| Jira | `jira issue view KEY --plain` | `jira issue comment KEY "message"` | `jira issue move KEY "<status>"` |
| GitHub | `gh issue view NUM` | `gh issue comment NUM -b "message"` | `gh issue close NUM` / `gh issue reopen NUM` |

The `linctl` commands were checked against `linctl --help`. `linctl` has no command
for blocking links, labels or initiatives; a hat that needs them must say so in its
output rather than skip silently.

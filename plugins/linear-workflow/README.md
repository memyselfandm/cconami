# linear-workflow

Skills for running agent work in Linear, where projects are workstreams, tickets
are one to three units of value and initiatives cover large efforts (no time
boxes).

```
/plugin install linear-workflow --marketplace memyselfandm/cconami
```

## Skills

| Skill | What it does |
|---|---|
| [linear-workflow](skills/linear-workflow/) | Background context: the project, ticket and initiative model, and the rules for working in Linear |
| [pm-context](skills/pm-context/) | Background context: the tracker abstraction the other skills call, with `linear` and `markdown` adapters |
| [refining-work-items](skills/refining-work-items/) | Turns an idea into a ticket with a "Done when", or a project brief |
| [breaking-down-work](skills/breaking-down-work/) | Splits a project or an oversized ticket into tickets with blocking links |
| [executing-work-items](skills/executing-work-items/) | Implements named tickets with agents, one branch and pull request at a time |
| [analyzing-dependencies](skills/analyzing-dependencies/) | Maps blocking links, finds blockers and the longest chain |
| [reconciling-linear-projects](skills/reconciling-linear-projects/) | Audits a project's tickets against pull requests and the running system; moves leftovers and re-homes tickets |
| [reporting-workstream-status](skills/reporting-workstream-status/) | Reports what is stuck, stale or colliding across projects |

## Tracker configuration

The skills reach the tracker through `pm-context`:

| Tracker | Adapter | Access |
|---|---|---|
| Linear | [linear.md](skills/pm-context/adapters/linear.md) | Linear MCP connector or `linctl`, per platform |
| Markdown | [markdown.md](skills/pm-context/adapters/markdown.md) | filesystem |

Set the tracker in the project's instructions file (`CLAUDE.md` or equivalent):

```markdown
## Project Management
pm_tool: linear
pm_team: YourTeam
```

## Usage

In Claude Code, plugin skills are namespaced by the plugin:

```
/linear-workflow:refining-work-items ABC-123
/linear-workflow:refining-work-items "Sync engine" --type project-lite
/linear-workflow:breaking-down-work "Sync engine"
/linear-workflow:executing-work-items ABC-120 ABC-123
```

---
name: pm-context
description: Provides project management tool abstraction layer. Auto-loads when working with work items, epics, features, tasks, sprints, or backlogs. Detects PM tool (Linear, Jira, GitHub Projects, markdown) from project configuration and loads appropriate adapter for seamless operations across different PM systems.
user-invocable: false
---

# Project Management Context

Provides a unified interface for project management operations across different tools. This skill auto-loads when Claude detects work related to project management.

## PM Tool Detection

Detect the project's PM tool in this order:

1. **CLAUDE.md configuration**:
   ```markdown
   ## Project Management
   pm_tool: linear
   pm_team: Chronicle
   ```

2. **Settings file** (`.claude/settings.json`):
   ```json
   {
     "pm": {
       "tool": "jira",
       "project": "PROJ",
       "api_url": "https://company.atlassian.net"
     }
   }
   ```

3. **File detection**:
   - `.linear/` directory → Linear
   - `.jira.d/` or `jira.config` → Jira
   - `.github/` with projects → GitHub Projects
   - `BACKLOG.md` or `backlog.md` → Markdown

4. **Default**: Markdown (no external tool required)

## Loading the Appropriate Adapter

Once detected, load the corresponding adapter:

| Tool | Adapter File | CLI |
|------|--------------|-----|
| Linear | [adapters/linear.md](adapters/linear.md) | `linctl` |
| Jira | [adapters/jira.md](adapters/jira.md) | `jira` |
| GitHub | [adapters/github.md](adapters/github.md) | `gh` |
| Markdown | [adapters/markdown.md](adapters/markdown.md) | filesystem |

## Operations Interface

All adapters implement the operations defined in [interface.md](interface.md). Use these generic operations in skills rather than tool-specific commands.

## Terminology

Use generic terminology in all skill interactions:

| Generic Term | Description |
|--------------|-------------|
| work item | Any trackable unit (issue, ticket, task) |
| epic | Large body of work containing features |
| feature | Discrete capability within an epic |
| task | Atomic implementation unit |
| sprint | Time-boxed execution container |
| backlog | Prioritized list of work items |
| project | Container for related work |

## Usage in Skills

Skills should:
1. Call pm-context to detect the active PM tool
2. Load the appropriate adapter
3. Use interface operations, not direct CLI calls
4. Use generic terminology in outputs

Example pattern:
```markdown
## Step 1: Get Work Item Context
Use pm-context to fetch the work item:
- Detect PM tool from project config
- Load [interface.md](../pm-context/interface.md) for operation spec
- Call `get_item(item_id)` via the appropriate adapter
```

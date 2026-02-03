# GitHub Adapter

Implements the PM Operations Interface for GitHub Issues and Projects using the `gh` CLI.

## Prerequisites

- `gh` CLI installed and authenticated
- Verify with: `gh auth status`

## Configuration

In CLAUDE.md:
```markdown
## Project Management
pm_tool: github
pm_repo: owner/repo
pm_project: 1  # Project number (optional)
```

Or in `.claude/settings.json`:
```json
{
  "pm": {
    "tool": "github",
    "repo": "owner/repo",
    "project": 1
  }
}
```

---

## Work Item Operations

### get_item(id)
```bash
gh issue view <number> --repo <owner/repo> --json number,title,body,state,labels,assignees,milestone,projectItems,createdAt,updatedAt,url
```

**Field Mapping:**
```yaml
id: .number
key: "#" + .number  # e.g., "#42"
title: .title
description: .body
type: # Derive from labels
  - "epic" label → epic
  - "feature" label → feature
  - "bug" label → bug
  - default → task
status: .state  # OPEN or CLOSED
status_type: # Derive from state + labels
  - CLOSED → done
  - OPEN + "in-progress" label → in_progress
  - OPEN → todo
priority: # Derive from labels: "priority:high", "priority:low", etc.
assignee: .assignees[0].login
parent: # GitHub doesn't have native hierarchy - use task lists or labels
children: # Parse task list from body, or query by label
labels: .labels[].name
project: .projectItems[0].project.title
url: .url
created_at: .createdAt
updated_at: .updatedAt
```

### create_item(params)
```bash
gh issue create \
  --repo <owner/repo> \
  --title "<title>" \
  --body "<description>" \
  --assignee "<username>" \
  --label "<label1>,<label2>" \
  --milestone "<milestone>" \
  --project "<project_name>"
```

**Type Handling:**
Apply type as label: `epic`, `feature`, `task`, `bug`

### update_item(id, params)
```bash
gh issue edit <number> \
  --repo <owner/repo> \
  --title "<title>" \
  --body "<description>" \
  --add-assignee "<username>" \
  --add-label "<label>" \
  --milestone "<milestone>"
```

**Status Changes:**
```bash
# Close issue (done)
gh issue close <number> --repo <owner/repo>

# Reopen issue
gh issue reopen <number> --repo <owner/repo>

# For in-progress, add label
gh issue edit <number> --add-label "in-progress"
```

### list_items(filters)
```bash
gh issue list \
  --repo <owner/repo> \
  --state <open|closed|all> \
  --assignee <username> \
  --label "<label>" \
  --milestone "<milestone>" \
  --limit <n> \
  --json number,title,state,labels,assignees
```

**Filter Mapping:**
```python
args = ['gh', 'issue', 'list', '--repo', repo]
if filters.status_type == 'done':
    args.extend(['--state', 'closed'])
elif filters.status_type in ['todo', 'in_progress']:
    args.extend(['--state', 'open'])
if filters.assignee == 'me':
    args.extend(['--assignee', '@me'])
elif filters.assignee:
    args.extend(['--assignee', filters.assignee])
if filters.type:
    args.extend(['--label', filters.type])  # epic, feature, task, bug
if filters.labels:
    for label in filters.labels:
        args.extend(['--label', label])
```

### search_items(query)
```bash
gh search issues "<query>" --repo <owner/repo> --json number,title,state,url
```

---

## Hierarchy Operations

GitHub doesn't have native parent-child relationships. Use these patterns:

### Pattern 1: Task Lists in Body
```markdown
## Tasks
- [ ] #123 Implement authentication
- [ ] #124 Add login UI
- [x] #125 Database schema
```

### Pattern 2: Labels for Grouping
```bash
# Mark issue as part of epic
gh issue edit <child> --add-label "epic:auth-system"

# Query children
gh issue list --label "epic:auth-system"
```

### Pattern 3: Milestones as Epics
```bash
# Create milestone for epic
gh api repos/<owner>/<repo>/milestones -f title="Auth System Epic"

# Assign issues to milestone
gh issue edit <number> --milestone "Auth System Epic"
```

### set_parent(child_id, parent_id)
```bash
# Using label pattern
gh issue edit <child_id> --add-label "parent:#<parent_id>"

# Or update parent's body with task list reference
```

### get_children(parent_id)
```bash
# Using label pattern
gh issue list --label "parent:#<parent_id>" --json number,title,state

# Or parse task list from parent body
gh issue view <parent_id> --json body | jq -r '.body' | grep -oE '#[0-9]+'
```

---

## Project Operations

GitHub Projects (v2) provide Kanban/sprint-like functionality.

### get_project(id)
```bash
gh project view <number> --owner <owner> --json title,shortDescription,url,items
```

**Field Mapping:**
```yaml
id: .number
name: .title
description: .shortDescription
status: # Projects don't have status - derive from items
items: .items[].content.number
url: .url
```

### create_project(params)
```bash
gh project create --owner <owner> --title "<name>" --body "<description>"
```

### assign_to_project(item_id, project_id)
```bash
# Add issue to project
gh project item-add <project_number> --owner <owner> --url <issue_url>
```

### list_projects(filters)
```bash
gh project list --owner <owner> --json number,title,url
```

---

## Comment Operations

### add_comment(item_id, body)
```bash
gh issue comment <number> --repo <owner/repo> --body "<body>"
```

### list_comments(item_id)
```bash
gh issue view <number> --repo <owner/repo> --comments --json comments
```

---

## Status Operations

GitHub has simple status: OPEN or CLOSED. Use labels for workflow states.

### Recommended Label Workflow
| Label | Generic Status |
|-------|---------------|
| (none) | backlog |
| `ready` | todo |
| `in-progress` | in_progress |
| `review` | in_review |
| (closed) | done |
| `wontfix` | cancelled |

### list_statuses()
```bash
# Return static list based on label convention
gh label list --repo <owner/repo> --json name,color,description
```

### transition_item(id, status)
```bash
# Map status to action
case "$status" in
  "done")
    gh issue close <id>
    ;;
  "cancelled")
    gh issue close <id> --reason "not planned"
    ;;
  "in_progress")
    gh issue edit <id> --add-label "in-progress" --remove-label "ready"
    ;;
  "todo")
    gh issue edit <id> --add-label "ready" --remove-label "in-progress"
    ;;
esac
```

---

## Label Operations

### list_labels()
```bash
gh label list --repo <owner/repo> --json name,color,description
```

### add_label(item_id, label)
```bash
gh issue edit <item_id> --add-label "<label>"
```

### remove_label(item_id, label)
```bash
gh issue edit <item_id> --remove-label "<label>"
```

---

## GitHub-Specific Considerations

### No Native Hierarchy
- Use milestones for epic grouping
- Use task lists in issue body for sub-tasks
- Use labels with prefixes (`epic:`, `parent:`) for relationships

### Projects vs Milestones
- **Milestones**: Time-based grouping with due dates
- **Projects**: Kanban boards with custom fields

### Issue vs PR
- This adapter focuses on Issues
- PRs can be linked but are separate entities

---

## Error Handling

| Error | Meaning | Recovery |
|-------|---------|----------|
| "Could not resolve" | Issue not found | Verify issue number |
| "HTTP 401" | Auth expired | Run `gh auth login` |
| "HTTP 403" | No permission | Check repo access |
| "HTTP 404" | Repo not found | Verify owner/repo |

---

## Examples

### Create Epic with Features
```bash
# Create epic issue
epic_num=$(gh issue create \
  --repo owner/repo \
  --title "User Authentication" \
  --label "epic" \
  --body "## Overview
Implement complete authentication system.

## Features
- [ ] JWT tokens
- [ ] OAuth providers
- [ ] Session management" \
  --json number | jq -r '.number')

# Create feature issue
gh issue create \
  --repo owner/repo \
  --title "JWT Token Implementation" \
  --label "feature,parent:#$epic_num" \
  --body "Implement JWT token generation and validation."
```

### Sprint via Project
```bash
# Create sprint project
gh project create --owner owner --title "Sprint 2025-01"

# Add issues to sprint
gh project item-add 1 --owner owner --url "https://github.com/owner/repo/issues/42"
gh project item-add 1 --owner owner --url "https://github.com/owner/repo/issues/43"
```

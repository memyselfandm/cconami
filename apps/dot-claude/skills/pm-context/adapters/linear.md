# Linear Adapter

Implements the PM Operations Interface for Linear using the `linctl` CLI.

## Prerequisites

- `linctl` CLI installed and authenticated
- Verify with: `linctl me --json`

## Configuration

In CLAUDE.md:
```markdown
## Project Management
pm_tool: linear
pm_team: TeamName
```

Or in `.claude/settings.json`:
```json
{
  "pm": {
    "tool": "linear",
    "team": "TeamName"
  }
}
```

---

## Work Item Operations

### get_item(id)
```bash
linctl issue get <id> --json
```

**Field Mapping:**
```yaml
id: .id
key: .identifier
title: .title
description: .description
type: # Derive from labels
  - epic label → epic
  - feature label → feature
  - bug label → bug
  - default → task
status: .state.name
status_type: .state.type  # Maps: backlog→backlog, unstarted→todo, started→in_progress, completed→done, canceled→cancelled
priority: # Map .priority: 0→none, 1→urgent, 2→high, 3→normal, 4→low
assignee: .assignee.email
parent: .parent.identifier
children: # Requires separate query
labels: .labels[].name
project: .project.name
url: .url
created_at: .createdAt
updated_at: .updatedAt
```

### create_item(params)
```bash
linctl issue create \
  --team "<team>" \
  --title "<title>" \
  --description "<description>" \
  --parent "<parent_id>" \
  --project "<project_id>" \
  --priority <0-4> \
  --assignee "<email>" \
  --json
```

**Type Handling:**
- After creation, add appropriate label: `epic`, `feature`, `task`, `bug`
- Linear doesn't have native issue types; labels define type

### update_item(id, params)
```bash
linctl issue update <id> \
  --title "<title>" \
  --description "<description>" \
  --parent "<parent_id>" \
  --project "<project_id>" \
  --priority <0-4> \
  --assignee "<email>" \
  --state "<status_name>" \
  --json
```

### list_items(filters)
```bash
# Base query
linctl issue list --team "<team>" --json

# With filters
linctl issue list \
  --team "<team>" \
  --project "<project>" \
  --parent "<parent_id>" \
  --state "<status>" \
  --assignee "<email>" \
  --json
```

**Note:** Some filters may require post-processing in memory.

### search_items(query)
```bash
linctl issue search "<query>" --team "<team>" --json
```

---

## Hierarchy Operations

### set_parent(child_id, parent_id)
```bash
# Set parent
linctl issue update <child_id> --parent "<parent_id>"

# Remove parent
linctl issue update <child_id> --parent "none"
```

### get_children(parent_id)
```bash
linctl issue list --parent "<parent_id>" --json
```

### get_ancestors(id)
```python
# Requires iterative fetching
ancestors = []
current = get_item(id)
while current.parent:
    parent = get_item(current.parent)
    ancestors.append(parent)
    current = parent
return ancestors
```

---

## Project/Sprint Operations

### get_project(id)
```bash
linctl project get "<id>" --json
```

**Field Mapping:**
```yaml
id: .id
name: .name
description: .description
status: .state  # planned | active | completed | cancelled
start_date: .startDate
end_date: .targetDate
items: # Requires: linctl issue list --project "<id>"
url: .url
```

### create_project(params)
```bash
linctl project create \
  --team "<team>" \
  --name "<name>" \
  --description "<description>" \
  --start-date "<YYYY-MM-DD>" \
  --target-date "<YYYY-MM-DD>" \
  --json
```

### assign_to_project(item_id, project_id)
```bash
# Assign to project
linctl issue update <item_id> --project "<project_id>"

# Unassign
linctl issue update <item_id> --project "unassigned"
```

### list_projects(filters)
```bash
linctl project list --team "<team>" --json
```

---

## Comment Operations

### add_comment(item_id, body)
```bash
linctl comment create <item_id> --body "<body>"
```

### list_comments(item_id)
```bash
linctl comment list <item_id> --json
```

---

## Status Operations

### list_statuses()
```bash
linctl state list --team "<team>" --json
```

**Field Mapping:**
```yaml
name: .name
type: .type  # backlog | unstarted | started | completed | canceled
color: .color
```

**Type Mapping to Generic:**
| Linear | Generic |
|--------|---------|
| backlog | backlog |
| unstarted | todo |
| started | in_progress |
| completed | done |
| canceled | cancelled |

### transition_item(id, status)
```bash
linctl issue update <id> --state "<status_name>"
```

---

## Label Operations

### list_labels()
```bash
linctl label list --team "<team>" --json
```

### add_label(item_id, label)
```bash
# Get current labels, add new one
current_labels=$(linctl issue get <item_id> --json | jq -r '.labels[].name')
# Linear MCP or API call required for label addition
# linctl doesn't have direct label add command yet
```

### remove_label(item_id, label)
```bash
# Similar to add - requires API-level operation
```

---

## Type Label Conventions

Linear uses labels to indicate work item types:

| Type | Label Name | Color (suggested) |
|------|------------|-------------------|
| epic | `epic` | Purple |
| feature | `feature` | Blue |
| task | `task` | Gray |
| bug | `bug` | Red |
| chore | `chore` | Yellow |

When creating items, apply the appropriate label after creation.

---

## Error Handling

| Error | Meaning | Recovery |
|-------|---------|----------|
| Exit code 1 | General error | Check stderr for details |
| "not found" | Item doesn't exist | Verify ID/key |
| "unauthorized" | Auth issue | Run `linctl auth` |
| "rate limited" | API throttled | Wait and retry |

---

## Examples

### Create an Epic with Features
```bash
# Create epic
epic=$(linctl issue create --team Chronicle --title "User Auth" --json)
epic_id=$(echo $epic | jq -r '.identifier')

# Add epic label
# (requires label API - for now, include in title or description)

# Create feature under epic
linctl issue create \
  --team Chronicle \
  --title "JWT Implementation" \
  --parent "$epic_id" \
  --json
```

### Move Items to Sprint
```bash
# Get sprint project ID
project_id=$(linctl project list --team Chronicle --json | jq -r '.[] | select(.name=="Sprint 2025-01") | .id')

# Assign items
linctl issue update CCC-123 --project "$project_id"
linctl issue update CCC-124 --project "$project_id"
```

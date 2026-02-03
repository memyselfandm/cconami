# Jira Adapter

Implements the PM Operations Interface for Jira using the `jira` CLI (jira-cli).

## Prerequisites

- `jira` CLI installed: `brew install jira-cli` or from [github.com/ankitpokhrel/jira-cli](https://github.com/ankitpokhrel/jira-cli)
- Authenticated: `jira init`
- Verify with: `jira me`

## Configuration

In CLAUDE.md:
```markdown
## Project Management
pm_tool: jira
pm_project: PROJ
pm_board: "Team Board"
```

Or in `.claude/settings.json`:
```json
{
  "pm": {
    "tool": "jira",
    "project": "PROJ",
    "api_url": "https://company.atlassian.net"
  }
}
```

---

## Work Item Operations

### get_item(id)
```bash
jira issue view <id> --json
```

**Field Mapping:**
```yaml
id: .key  # Jira uses key as primary identifier
key: .key
title: .fields.summary
description: .fields.description  # May be ADF format
type: .fields.issuetype.name  # Epic | Story | Task | Bug | Sub-task
status: .fields.status.name
status_type: .fields.status.statusCategory.key  # new→todo, indeterminate→in_progress, done→done
priority: .fields.priority.name  # Highest→urgent, High→high, Medium→normal, Low/Lowest→low
assignee: .fields.assignee.emailAddress
parent: .fields.parent.key  # For sub-tasks and stories under epics
children: # Requires JQL: "parent = <key>" or epic link query
labels: .fields.labels[]
project: .fields.project.key
url: # Construct: https://<domain>/browse/<key>
created_at: .fields.created
updated_at: .fields.updated
```

**Type Mapping:**
| Jira Type | Generic |
|-----------|---------|
| Epic | epic |
| Story | feature |
| Task | task |
| Sub-task | task |
| Bug | bug |

### create_item(params)
```bash
jira issue create \
  --project "<project>" \
  --type "<type>" \
  --summary "<title>" \
  --body "<description>" \
  --priority "<priority>" \
  --assignee "<email>" \
  --label "<label>" \
  --json
```

**Type Mapping for Creation:**
| Generic | Jira Type |
|---------|-----------|
| epic | Epic |
| feature | Story |
| task | Task |
| bug | Bug |

**Setting Parent (Epic Link):**
```bash
# For stories under epics
jira issue create \
  --project PROJ \
  --type Story \
  --summary "Feature title" \
  --parent "<epic-key>" \
  --json

# For sub-tasks
jira issue create \
  --project PROJ \
  --type Sub-task \
  --summary "Task title" \
  --parent "<story-key>" \
  --json
```

### update_item(id, params)
```bash
jira issue edit <id> \
  --summary "<title>" \
  --body "<description>" \
  --priority "<priority>" \
  --assignee "<email>" \
  --json
```

**Note:** Some fields require specific commands:
```bash
# Change status
jira issue move <id> "<status>"

# Add labels
jira issue edit <id> --label "label1" --label "label2"
```

### list_items(filters)
```bash
# Using JQL
jira issue list --jql "<jql_query>" --json

# Common JQL patterns:
# By project: project = PROJ
# By type: issuetype = Story
# By status: status = "In Progress"
# By assignee: assignee = currentUser()
# By sprint: sprint = "Sprint 1"
# By epic: "Epic Link" = PROJ-100 OR parent = PROJ-100
# Combined: project = PROJ AND status = "To Do" AND assignee = currentUser()
```

**Filter to JQL Mapping:**
```python
jql_parts = []
if filters.project:
    jql_parts.append(f'project = {filters.project}')
if filters.type:
    type_map = {'epic': 'Epic', 'feature': 'Story', 'task': 'Task', 'bug': 'Bug'}
    jql_parts.append(f'issuetype = {type_map[filters.type]}')
if filters.status:
    jql_parts.append(f'status = "{filters.status}"')
if filters.assignee == 'me':
    jql_parts.append('assignee = currentUser()')
elif filters.assignee:
    jql_parts.append(f'assignee = "{filters.assignee}"')
if filters.parent:
    jql_parts.append(f'parent = {filters.parent}')

jql = ' AND '.join(jql_parts)
```

### search_items(query)
```bash
jira issue list --jql "text ~ \"<query>\"" --json
```

---

## Hierarchy Operations

### set_parent(child_id, parent_id)
```bash
# For epic link (stories under epics)
jira issue edit <child_id> --parent "<parent_id>"

# For sub-task relationship - must create as sub-task initially
# Cannot convert regular issue to sub-task via CLI
```

### get_children(parent_id)
```bash
# For epics (get stories)
jira issue list --jql "parent = <parent_id>" --json

# Or using epic link field
jira issue list --jql "\"Epic Link\" = <parent_id>" --json
```

### get_ancestors(id)
```python
# Iterative fetch
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
# Jira projects are different from sprints
# For project info:
jira project list --json | jq '.[] | select(.key == "<id>")'

# For sprint info:
jira sprint list --board "<board_id>" --json | jq '.[] | select(.name == "<id>")'
```

**Sprint Field Mapping:**
```yaml
id: .id
name: .name
status: .state  # future→planned, active→active, closed→completed
start_date: .startDate
end_date: .endDate
items: # Requires: jira sprint list --board <board> --jql "sprint = <id>"
```

### create_project(params)
```bash
# Creating Jira projects requires admin permissions
# Typically done via Jira UI

# For sprints:
jira sprint create \
  --board "<board_id>" \
  --name "<name>" \
  --start "<YYYY-MM-DD>" \
  --end "<YYYY-MM-DD>" \
  --json
```

### assign_to_project(item_id, project_id)
```bash
# For sprint assignment (project_id = sprint name or ID)
jira issue move <item_id> --sprint "<sprint_id>"
```

### list_projects(filters)
```bash
# Jira projects
jira project list --json

# Sprints for a board
jira sprint list --board "<board_id>" --state "<active|future|closed>" --json
```

---

## Comment Operations

### add_comment(item_id, body)
```bash
jira issue comment add <item_id> "<body>"
```

### list_comments(item_id)
```bash
jira issue view <item_id> --comments --json
# Or
jira issue comment list <item_id> --json
```

---

## Status Operations

### list_statuses()
```bash
# Statuses are project-specific
jira project status <project_key> --json
```

**Status Category Mapping:**
| Jira Category | Generic |
|---------------|---------|
| To Do | todo |
| In Progress | in_progress |
| Done | done |

### transition_item(id, status)
```bash
jira issue move <id> "<status_name>"

# List available transitions
jira issue move <id> --list
```

---

## Label Operations

### list_labels()
```bash
# Jira labels are created on-the-fly
# No dedicated list command - derive from issues
jira issue list --jql "project = <project>" --json | jq '[.[].fields.labels[]] | unique'
```

### add_label(item_id, label)
```bash
jira issue edit <item_id> --label "<label>"
```

### remove_label(item_id, label)
```bash
# Requires removing and re-adding all labels except the one to remove
# Or use Jira API directly
```

---

## Jira-Specific Concepts

### Boards vs Projects
- **Project**: Container for issues (PROJ)
- **Board**: Visualization of issues (Kanban/Scrum)
- Sprints are associated with boards, not projects

### Issue Types Hierarchy
```
Epic
├── Story (linked via Epic Link or parent)
│   └── Sub-task (child of story)
├── Task
│   └── Sub-task
└── Bug
    └── Sub-task
```

### Epic Link vs Parent
- **Epic Link**: Traditional way to link stories to epics (custom field)
- **Parent**: New way (next-gen projects) - direct parent relationship
- Check project type to determine which to use

---

## Error Handling

| Error | Meaning | Recovery |
|-------|---------|----------|
| "Issue does not exist" | Invalid key | Verify issue key |
| "Unauthorized" | Auth expired | Run `jira init` |
| "Field 'X' cannot be set" | Workflow/permission issue | Check field editability |
| "Transition 'X' not valid" | Status transition blocked | Check workflow |

---

## Examples

### Create Epic with Stories
```bash
# Create epic
epic_key=$(jira issue create \
  --project PROJ \
  --type Epic \
  --summary "User Authentication" \
  --body "Implement complete auth system" \
  --json | jq -r '.key')

# Create story under epic
jira issue create \
  --project PROJ \
  --type Story \
  --summary "JWT Token Implementation" \
  --parent "$epic_key" \
  --json
```

### Query Sprint Items
```bash
# Get all items in current sprint
jira issue list \
  --jql "project = PROJ AND sprint in openSprints()" \
  --json

# Get items by status
jira issue list \
  --jql "project = PROJ AND sprint in openSprints() AND status = 'In Progress'" \
  --json
```

### Transition Issue Through Workflow
```bash
# Start work
jira issue move PROJ-123 "In Progress"

# Submit for review
jira issue move PROJ-123 "In Review"

# Complete
jira issue move PROJ-123 "Done"
```

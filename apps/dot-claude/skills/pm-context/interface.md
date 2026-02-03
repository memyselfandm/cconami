# PM Operations Interface

All PM tool adapters implement these operations. Skills use these generic operations rather than tool-specific commands.

## Work Item Operations

### get_item(id) → WorkItem
Fetch a work item by ID or key.

**Parameters:**
- `id`: Work item identifier (e.g., "CCC-123", "PROJ-456", "#42")

**Returns:**
```yaml
WorkItem:
  id: string           # Unique identifier
  key: string          # Human-readable key (CCC-123)
  title: string        # Summary/title
  description: string  # Full description (markdown)
  type: enum           # epic | feature | task | bug | chore
  status: string       # Current status name
  status_type: enum    # backlog | todo | in_progress | in_review | done | cancelled
  priority: enum       # urgent | high | normal | low | none
  assignee: string?    # Assignee name or email
  parent: string?      # Parent work item key
  children: string[]   # Child work item keys
  labels: string[]     # Applied labels/tags
  project: string?     # Project/sprint name
  url: string          # Web URL to view item
  created_at: datetime
  updated_at: datetime
```

### create_item(params) → WorkItem
Create a new work item.

**Parameters:**
```yaml
CreateItemParams:
  type: enum           # epic | feature | task | bug | chore
  title: string        # Required
  description: string? # Markdown description
  parent: string?      # Parent work item key
  project: string?     # Project/sprint to assign
  priority: enum?      # urgent | high | normal | low
  assignee: string?    # Assignee email or "me"
  labels: string[]?    # Labels to apply
```

**Returns:** Created WorkItem

### update_item(id, params) → WorkItem
Update an existing work item.

**Parameters:**
- `id`: Work item identifier
- `params`: Fields to update (same as CreateItemParams, all optional)

**Returns:** Updated WorkItem

### list_items(filters) → WorkItem[]
Query work items with filters.

**Parameters:**
```yaml
ListFilters:
  project: string?     # Filter by project/sprint
  parent: string?      # Filter by parent item
  type: enum?          # Filter by type
  status: string?      # Filter by status name
  status_type: enum?   # Filter by status category
  assignee: string?    # Filter by assignee ("me" for current user)
  labels: string[]?    # Filter by labels (AND)
  limit: int?          # Max results (default: 50)
```

**Returns:** Array of WorkItem

### search_items(query) → WorkItem[]
Full-text search across work items.

**Parameters:**
- `query`: Search string

**Returns:** Array of matching WorkItem

---

## Hierarchy Operations

### set_parent(child_id, parent_id) → void
Set parent-child relationship.

**Parameters:**
- `child_id`: Child work item key
- `parent_id`: Parent work item key (or null to remove)

### get_children(parent_id) → WorkItem[]
Get all direct children of a work item.

**Parameters:**
- `parent_id`: Parent work item key

**Returns:** Array of child WorkItem

### get_ancestors(id) → WorkItem[]
Get parent chain up to root.

**Parameters:**
- `id`: Work item key

**Returns:** Array of WorkItem (immediate parent first)

---

## Project/Sprint Operations

### get_project(id) → Project
Fetch project or sprint details.

**Parameters:**
- `id`: Project identifier or name

**Returns:**
```yaml
Project:
  id: string
  name: string
  description: string?
  status: enum         # planned | active | completed | cancelled
  start_date: date?
  end_date: date?
  items: string[]      # Work item keys in this project
  url: string
```

### create_project(params) → Project
Create a new project or sprint.

**Parameters:**
```yaml
CreateProjectParams:
  name: string         # Required
  description: string?
  start_date: date?
  end_date: date?
```

**Returns:** Created Project

### assign_to_project(item_id, project_id) → void
Add a work item to a project/sprint.

**Parameters:**
- `item_id`: Work item key
- `project_id`: Project identifier (or null to unassign)

### list_projects(filters) → Project[]
List projects with optional filters.

**Parameters:**
```yaml
ProjectFilters:
  status: enum?        # planned | active | completed
  limit: int?
```

---

## Comment Operations

### add_comment(item_id, body) → Comment
Add a comment to a work item.

**Parameters:**
- `item_id`: Work item key
- `body`: Comment text (markdown)

**Returns:**
```yaml
Comment:
  id: string
  body: string
  author: string
  created_at: datetime
```

### list_comments(item_id) → Comment[]
Get all comments on a work item.

**Parameters:**
- `item_id`: Work item key

**Returns:** Array of Comment (newest first)

---

## Status Operations

### list_statuses() → Status[]
Get available statuses for the team/project.

**Returns:**
```yaml
Status:
  name: string         # Display name
  type: enum           # backlog | todo | in_progress | in_review | done | cancelled
  color: string?       # Hex color
```

### transition_item(id, status) → WorkItem
Move work item to a new status.

**Parameters:**
- `id`: Work item key
- `status`: Target status name

**Returns:** Updated WorkItem

---

## Label Operations

### list_labels() → Label[]
Get available labels for the team/project.

**Returns:**
```yaml
Label:
  name: string
  color: string?
  description: string?
```

### add_label(item_id, label) → void
Add a label to a work item.

### remove_label(item_id, label) → void
Remove a label from a work item.

---

## Terminology Mapping Reference

| Generic | Linear | Jira | GitHub | Markdown |
|---------|--------|------|--------|----------|
| work item | issue | issue | issue | entry |
| epic | issue + epic label | Epic issue type | milestone | `# Heading` |
| feature | issue + feature label | Story issue type | issue | `## Heading` |
| task | issue + task label | Task/Sub-task | issue | `- [ ] item` |
| bug | issue + bug label | Bug issue type | issue + bug label | `- [ ] [BUG]` |
| sprint | project | sprint | project | `## Sprint N` section |
| backlog | no project | backlog | no project | unsectioned items |
| status_type:todo | Backlog/Todo | To Do | open | `- [ ]` |
| status_type:in_progress | In Progress | In Progress | open + label | `- [~]` |
| status_type:done | Done | Done | closed | `- [x]` |

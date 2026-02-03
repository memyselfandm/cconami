# Markdown Adapter

Implements the PM Operations Interface using local markdown files. No external PM tool required.

## Prerequisites

- None! Works with any filesystem.

## Configuration

In CLAUDE.md:
```markdown
## Project Management
pm_tool: markdown
pm_backlog: ./BACKLOG.md
pm_sprints_dir: ./sprints/
```

Or in `.claude/settings.json`:
```json
{
  "pm": {
    "tool": "markdown",
    "backlog": "./BACKLOG.md",
    "sprints_dir": "./sprints/"
  }
}
```

---

## Backlog File Format

The primary backlog file uses a structured markdown format:

```markdown
# Project Backlog

## Epics

### [EPIC-001] User Authentication {#epic-001}
**Status:** in_progress | **Priority:** high | **Assignee:** @developer

Implement complete user authentication system with OAuth support.

#### Acceptance Criteria
- [ ] Users can sign up with email
- [ ] Users can log in with Google OAuth
- [ ] Sessions persist across browser restarts

#### Features
- [FEAT-001] JWT Implementation
- [FEAT-002] OAuth Providers

---

## Features

### [FEAT-001] JWT Implementation {#feat-001}
**Status:** todo | **Priority:** high | **Parent:** EPIC-001

Implement JWT token generation and validation.

#### Tasks
- [ ] [TASK-001] Create token generation utility
- [ ] [TASK-002] Implement token validation middleware
- [x] [TASK-003] Add refresh token support

---

## Tasks

### [TASK-001] Create token generation utility {#task-001}
**Status:** in_progress | **Priority:** normal | **Parent:** FEAT-001 | **Assignee:** @dev

Generate JWT tokens with configurable expiration.

---

## Bugs

### [BUG-001] Login fails on Safari {#bug-001}
**Status:** todo | **Priority:** urgent

Users on Safari cannot complete login flow.

---
```

---

## Work Item ID Convention

IDs follow the pattern: `TYPE-NNN`
- `EPIC-001`, `EPIC-002`, ...
- `FEAT-001`, `FEAT-002`, ...
- `TASK-001`, `TASK-002`, ...
- `BUG-001`, `BUG-002`, ...

---

## Work Item Operations

### get_item(id)
Parse the backlog file and find the section with matching ID.

```python
def get_item(id):
    content = read_file(backlog_path)

    # Find section starting with ### [ID]
    pattern = rf'### \[{id}\].*?(?=\n### |\n## |\Z)'
    match = re.search(pattern, content, re.DOTALL)

    if not match:
        return None

    section = match.group()
    return parse_item_section(section)

def parse_item_section(section):
    # Extract title: ### [ID] Title {#anchor}
    title_match = re.search(r'### \[[\w-]+\] (.+?) \{', section)
    title = title_match.group(1) if title_match else ""

    # Extract metadata line: **Status:** X | **Priority:** Y | ...
    metadata = {}
    meta_match = re.search(r'\*\*Status:\*\* (\w+)', section)
    if meta_match:
        metadata['status'] = meta_match.group(1)

    # Extract description (text after metadata, before ####)
    desc_match = re.search(r'\n\n(.+?)(?=\n####|\Z)', section, re.DOTALL)
    description = desc_match.group(1).strip() if desc_match else ""

    return WorkItem(
        id=id,
        key=id,
        title=title,
        description=description,
        status=metadata.get('status', 'backlog'),
        # ... etc
    )
```

**Field Mapping:**
```yaml
id: [ID] from header
key: same as id
title: text after [ID] before {#anchor}
description: paragraph(s) after metadata line
type: derived from ID prefix (EPIC/FEAT/TASK/BUG)
status: parsed from **Status:** field
status_type: map status string to enum
priority: parsed from **Priority:** field
assignee: parsed from **Assignee:** @username
parent: parsed from **Parent:** field
children: items referencing this as parent
labels: parsed from **Labels:** field (comma-separated)
project: directory name if in sprints/
url: file path + anchor
```

### create_item(params)
Append new section to appropriate part of backlog file.

```python
def create_item(params):
    content = read_file(backlog_path)

    # Generate next ID
    type_prefix = {'epic': 'EPIC', 'feature': 'FEAT', 'task': 'TASK', 'bug': 'BUG'}
    prefix = type_prefix[params.type]
    next_num = get_next_id_number(content, prefix)
    new_id = f"{prefix}-{next_num:03d}"

    # Create section
    section = f"""
### [{new_id}] {params.title} {{#{new_id.lower()}}}
**Status:** todo | **Priority:** {params.priority or 'normal'}"""

    if params.parent:
        section += f" | **Parent:** {params.parent}"
    if params.assignee:
        section += f" | **Assignee:** @{params.assignee}"

    section += f"\n\n{params.description}\n\n---\n"

    # Insert into appropriate section
    insert_position = find_section_end(content, params.type)
    new_content = content[:insert_position] + section + content[insert_position:]

    write_file(backlog_path, new_content)
    return get_item(new_id)
```

### update_item(id, params)
Find and replace the item section.

```python
def update_item(id, params):
    content = read_file(backlog_path)

    # Find existing section
    pattern = rf'(### \[{id}\].+?)(?=\n### |\n## |\Z)'
    match = re.search(pattern, content, re.DOTALL)

    if not match:
        raise NotFound(id)

    old_section = match.group(1)
    new_section = rebuild_section(old_section, params)

    new_content = content.replace(old_section, new_section)
    write_file(backlog_path, new_content)

    return get_item(id)
```

### list_items(filters)
Parse all items and filter in memory.

```python
def list_items(filters):
    content = read_file(backlog_path)

    # Find all item sections
    pattern = r'### \[([\w-]+)\]'
    all_ids = re.findall(pattern, content)

    items = [get_item(id) for id in all_ids]

    # Apply filters
    if filters.type:
        items = [i for i in items if i.type == filters.type]
    if filters.status:
        items = [i for i in items if i.status == filters.status]
    if filters.parent:
        items = [i for i in items if i.parent == filters.parent]
    # ... etc

    return items[:filters.limit or 50]
```

---

## Hierarchy Operations

### set_parent(child_id, parent_id)
Update the child's **Parent:** metadata field.

### get_children(parent_id)
```python
def get_children(parent_id):
    all_items = list_items({})
    return [i for i in all_items if i.parent == parent_id]
```

---

## Project/Sprint Operations

Sprints are separate markdown files in the sprints directory:

```
sprints/
├── 2025-01.md
├── 2025-02.md
└── 2025-03.md
```

### Sprint File Format
```markdown
# Sprint 2025-01

**Status:** active
**Start:** 2025-01-06
**End:** 2025-01-17

## Sprint Goal
Complete authentication foundation.

## Items
- [x] [FEAT-001] JWT Implementation
- [ ] [FEAT-002] OAuth Providers
- [ ] [TASK-005] Write auth tests
```

### get_project(id)
```python
def get_project(id):
    sprint_path = f"{sprints_dir}/{id}.md"
    content = read_file(sprint_path)

    # Parse sprint metadata
    return Project(
        id=id,
        name=f"Sprint {id}",
        status=parse_field(content, 'Status'),
        start_date=parse_field(content, 'Start'),
        end_date=parse_field(content, 'End'),
        items=parse_item_list(content)
    )
```

### create_project(params)
Create new sprint file.

### assign_to_project(item_id, project_id)
Add item to sprint's Items list.

---

## Comment Operations

Comments are stored as sub-sections under items:

```markdown
### [TASK-001] Some task {#task-001}
...

#### Comments
> **@developer** (2025-01-15): Started working on this.

> **@reviewer** (2025-01-16): Looks good, but add tests.
```

### add_comment(item_id, body)
Append to Comments section.

### list_comments(item_id)
Parse Comments section.

---

## Status Values

| Status String | Type |
|---------------|------|
| `backlog` | backlog |
| `todo` | todo |
| `in_progress` | in_progress |
| `in_review` | in_review |
| `done` | done |
| `cancelled` | cancelled |

---

## Advantages

1. **No external dependencies** - Works offline
2. **Version controlled** - Full git history of changes
3. **Human readable** - Edit in any text editor
4. **Portable** - Move between systems easily
5. **Searchable** - Use grep, ripgrep, etc.

## Limitations

1. **Manual ID management** - Must track next ID
2. **No real-time sync** - Single-user or requires git workflow
3. **Limited querying** - No database-style queries
4. **No notifications** - Must poll for changes

---

## Examples

### Initialize Backlog
```bash
cat > BACKLOG.md << 'EOF'
# Project Backlog

## Epics

---

## Features

---

## Tasks

---

## Bugs

---
EOF
```

### Create Sprint
```bash
cat > sprints/2025-01.md << 'EOF'
# Sprint 2025-01

**Status:** planned
**Start:** 2025-01-06
**End:** 2025-01-17

## Sprint Goal
TBD

## Items
EOF
```

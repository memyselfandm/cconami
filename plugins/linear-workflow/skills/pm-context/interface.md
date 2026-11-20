# PM operations interface

Every adapter implements these operations. Skills call them and nothing else.

The model: an **initiative** groups **projects**; a project holds **tickets**; a ticket
may have **sub-issues**; **blocking links** order tickets. Projects and initiatives carry
dated **updates**. There is no time-box object and no operation that creates one.

An adapter that cannot support an operation says so in its own file. A skill that hits
an unsupported operation reports the step as skipped.

---

## Tickets

### get_item(key) → WorkItem

Fetch one ticket by key (`ABC-123`) or URL.

```yaml
WorkItem:
  id: string            # Tool's internal id
  key: string           # ABC-123
  title: string
  description: string   # Markdown; holds the "Done when" section
  type: enum            # ticket | bug | chore   (from labels; default ticket)
  status: string        # The team's status name
  status_type: enum     # backlog | todo | in_progress | in_review | done | cancelled
  priority: enum        # urgent | high | normal | low | none
  assignee: string?
  parent: string?       # Parent ticket key
  children: string[]    # Sub-issue keys
  project: string?      # Project name
  labels: string[]
  blocks: string[]      # Keys this ticket blocks
  blocked_by: string[]  # Keys that block this ticket
  links: Link[]         # Attached pull requests and other URLs
  branch: string?       # Suggested branch name, <user>/<team-key>-<n>-<slug>
  url: string
  created_at: datetime
  updated_at: datetime
  completed_at: datetime?

Link:
  url: string
  title: string?
  kind: enum            # pull_request | document | other
```

### create_item(params) → WorkItem

```yaml
CreateItemParams:
  title: string         # Required
  project: string       # Required; ask the user if it is unclear
  description: string?  # Include a "Done when" section
  type: enum?           # ticket | bug | chore
  parent: string?       # Makes it a sub-issue; inherits the parent's project
  priority: enum?
  assignee: string?     # A name, an email or "me"
  labels: string[]?
  blocked_by: string[]?
  blocks: string[]?
```

### update_item(key, params) → WorkItem

Change any field of `CreateItemParams`, plus `status`. Only the fields given change.

### list_items(filters) → WorkItem[]

```yaml
ListFilters:
  project: string?
  initiative: string?   # Tickets in any project of this initiative
  parent: string?
  status_type: enum?    # Or a list of them
  assignee: string?     # "me" for the current user
  labels: string[]?     # All must match
  updated_before: datetime?  # For staleness checks
  include_closed: bool? # Default false (done and cancelled left out)
  limit: int?           # Default 50; the adapter pages until it has this many
```

### search_items(query) → WorkItem[]

Full-text search over titles and descriptions.

---

## Hierarchy and order

### set_parent(child, parent | null)

### get_children(key) → WorkItem[]

### add_blocking_link(blocker, blocked)

"`blocker` blocks `blocked`". Adding a link that already exists is not an error.

### remove_blocking_link(blocker, blocked)

### add_link(key, url, title?)

Attach a URL (usually a pull request) to a ticket.

---

## Projects

### get_project(name_or_id) → Project

```yaml
Project:
  id: string
  name: string
  description: string?  # The project brief
  status: enum          # planned | in_progress | paused | completed | cancelled
  lead: string?
  initiative: string?
  milestones: string[]  # Stage names, if the project ships in stages
  url: string
  updated_at: datetime
```

### list_projects(filters) → Project[]

```yaml
ProjectFilters:
  status: enum?         # Or a list
  initiative: string?
  limit: int?
```

### create_project(params) → Project

```yaml
CreateProjectParams:
  name: string          # Required
  description: string?
  lead: string?
  initiative: string?
```

### assign_to_project(key, project | null)

Moves a ticket and, unless told otherwise, its sub-issues.

---

## Initiatives

### get_initiative(name_or_id) → Initiative

```yaml
Initiative:
  id: string
  name: string
  description: string?
  status: enum          # planned | in_progress | completed
  projects: string[]    # Project names
  url: string
```

### list_initiatives(filters) → Initiative[]

Filter by `status`.

---

## Comments and updates

### add_comment(key, body) → Comment

### list_comments(key) → Comment[]

```yaml
Comment:
  id: string
  body: string
  author: string
  created_at: datetime
```

Newest first.

### add_update(target, body, health?) → Update

Post a dated update on a project or an initiative. `target` is `{project: name}` or
`{initiative: name}`. `health` is `on_track | at_risk | off_track`. Updates are
append-only: post a new one rather than editing an old one.

### list_updates(target, limit?) → Update[]

```yaml
Update:
  id: string
  body: string
  author: string
  health: enum?
  created_at: datetime
```

Newest first.

---

## Statuses and labels

### list_statuses() → Status[]

```yaml
Status:
  name: string
  type: enum            # backlog | todo | in_progress | in_review | done | cancelled
```

### transition_item(key, status) → WorkItem

`status` is a status name or a `status_type`; the adapter picks the team's first status
of that type.

### list_labels() → string[]

### add_label(key, label) / remove_label(key, label)

---

## Terms by tool

| Interface | Linear | Markdown adapter |
|-----------|--------|------------------|
| ticket | issue | `### [ABC-12]` entry in a project file |
| sub-issue | issue with a parent | entry with `**Parent:**` |
| project | project | one file in `backlog/projects/` |
| initiative | initiative | one file in `backlog/initiatives/` |
| blocking link | `blocks` relation | `**Blocked by:**` field |
| update | project or initiative update | `## Updates` section of the file |
| status_type | the status's type | `**Status:**` value |

The Jira and GitHub adapters are archived in `docs/archive/pm-context-adapters/` and
are not shipped.

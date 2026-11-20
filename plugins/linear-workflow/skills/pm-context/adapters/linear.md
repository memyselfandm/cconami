# Linear adapter

Maps the [interface](../interface.md) onto Linear's objects. This file says *what* to
read or write in Linear. *How* to call Linear (a connector, a CLI, an MCP server) is a
platform matter: see `../platforms/<platform>.md`.

## Configuration

```markdown
## Project Management
pm_tool: linear
pm_team: ABC            # Team key; also the ticket prefix and the branch prefix
pm_catchall: Maintenance  # Optional: project for tickets with no clear home
```

## Objects

| Interface | Linear |
|-----------|--------|
| ticket | Issue |
| sub-issue | Issue with `parent` set |
| project | Project (belongs to one or more teams) |
| initiative | Initiative |
| blocking link | Issue relation of type `blocks` |
| link | Issue attachment (pull requests attach here automatically when the GitHub integration is on) |
| update | Project update or initiative update |

Linear's cycles are not used. Never assign an issue to one, even when a team has the
feature switched on.

## Field mapping for WorkItem

```yaml
id: id
key: identifier            # ABC-123
title: title
description: description
type:                      # From labels
  bug label   -> bug
  chore label -> chore
  otherwise   -> ticket
status: state.name
status_type: state.type    # backlog->backlog, unstarted->todo, started->in_progress
                           # (or in_review when the state name says review),
                           # completed->done, canceled->cancelled
priority: priority         # 0 none, 1 urgent, 2 high, 3 normal, 4 low
assignee: assignee.name
parent: parent.identifier
children: children[].identifier
project: project.name
labels: labels[].name
blocks: relations where type = blocks, from this issue
blocked_by: inverse relations where type = blocks, to this issue
links: attachments[] (url, title; kind pull_request when the url is a pull request)
branch: branchName         # Linear's suggested git branch, built from the team key
url: url
created_at / updated_at / completed_at: createdAt / updatedAt / completedAt
```

Comments are not part of an issue read. Fetch them with `list_comments`.

## Operations

| Operation | What to do in Linear |
|-----------|----------------------|
| get_item | Read the issue, including relations and attachments |
| create_item | Create an issue in `pm_team` with `project` set; then add relations for `blocks` / `blocked_by` |
| update_item | Update the issue; only the given fields |
| list_items | List issues filtered by team, project, parent, state type, assignee, labels; page until `limit`. For `initiative`, list the initiative's projects and query each |
| search_items | Issue search, scoped to the team |
| set_parent | Set or clear the issue's parent |
| get_children | List issues whose parent is the key |
| add_blocking_link / remove_blocking_link | Create or delete a `blocks` relation |
| add_link | Create an attachment with the URL |
| get_project / list_projects / create_project | Project read, list (by state, by initiative), create (in `pm_team`, attached to the initiative if given) |
| update_project | Update the project's description, status, lead, or add it to an initiative |
| assign_to_project | Set the issue's project, then each sub-issue's |
| get_initiative / list_initiatives | Initiative read and list, with its projects |
| create_initiative / update_initiative | Initiative create or update (description, status, owner) |
| add_comment / list_comments | Comments on the issue, project or initiative named by `target` (Linear supports top-level comment threads on all three) |
| add_update / list_updates | Project updates or initiative updates, with health |
| list_statuses / transition_item | The team's workflow states; set the issue's state |
| list_labels / add_label / remove_label | Team and workspace labels. Adding a label must keep the issue's other labels |

Project status values map as: backlog/planned -> planned, started -> in_progress,
paused -> paused, completed -> completed, canceled -> cancelled.

Initiative status values map as: Proposed/Planned -> planned, Active -> in_progress,
Completed -> completed, Canceled -> cancelled.

## Conventions

| Label | Meaning |
|-------|---------|
| `bug` | A defect |
| `chore` | Maintenance with no user-visible change |
| `owner-action` | Only the owner can do it |

There are no type labels for size. A ticket is a ticket; if it is too big, split it.

## Errors

| Symptom | Meaning | What to do |
|---------|---------|------------|
| Not found | Wrong key, or no access to that team | Check the key; say which team you tried |
| Unauthorised | Credential missing or expired | Tell the user; do not retry |
| Rate limited | Too many calls | Wait, then batch reads |
| A write returns success but nothing changed | Usually a field the tool silently ignores | Read the issue back after every write that matters |

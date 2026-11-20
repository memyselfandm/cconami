# Markdown adapter

Implements the [interface](../interface.md) with markdown files in the repository. It
needs no external tool, works offline and keeps the backlog in git history. It also
proves that the skills depend on the interface, not on Linear.

## Configuration

```markdown
## Project Management
pm_tool: markdown
pm_team: ABC            # Ticket prefix and branch prefix
pm_dir: ./backlog       # Default ./backlog
```

## Layout

```
backlog/
├── projects/
│   ├── sync-engine.md        # one file per project
│   └── maintenance.md
├── initiatives/
│   └── version-2.md          # one file per initiative
└── NEXT_ID                   # the next ticket number, a single integer
```

`BACKLOG.md` at the repository root is accepted as a single project named `Backlog`,
for small repositories.

## Project file

```markdown
# Project: Sync engine

**Status:** in_progress | **Lead:** @alice | **Initiative:** Version 2
**Milestones:** Log format, Replay

Brief: why this workstream exists and what "finished" means.

## Tickets

### [ABC-101] Store changes as an append-only log {#abc-101}
**Status:** done | **Priority:** high | **Assignee:** @alice
**Links:** https://github.com/org/repo/pull/41

Description.

#### Done when
- [x] Writes append to the log; nothing rewrites it (PR #41)

### [ABC-102] Replay the log on start {#abc-102}
**Status:** in_progress | **Priority:** high | **Blocked by:** ABC-101
**Branch:** alice/abc-102-replay-log-on-start

Description.

#### Done when
- [ ] Start-up replays the log and the state matches a fresh build

#### Comments
> **@alice** (2026-01-15): Started; the reader is in PR #44.

### [ABC-103] Conflict rule for concurrent edits {#abc-103}
**Status:** todo | **Parent:** ABC-102 | **Blocked by:** ABC-102

## Comments

> **@bob** (2026-01-17): Ruling: ABC-103 goes before ABC-110; both change the merge
> code and the conflict rule must land first. — Status runner

## Updates

### 2026-01-16, on_track, @alice
Log format merged; replay under review.
```

## Initiative file

```markdown
# Initiative: Version 2

**Status:** in_progress
**Projects:** Sync engine, Settings page

Goal of the effort.

## Comments

## Updates

### 2026-01-16, @bob
Sync engine on track; settings page waiting on design.
```

## Fields

| Interface field | Where it lives |
|-----------------|----------------|
| key, title | `### [ABC-12] Title {#abc-12}` |
| status_type | `**Status:**` value: `backlog`, `todo`, `in_progress`, `in_review`, `done`, `cancelled` |
| priority, assignee, labels | `**Priority:**`, `**Assignee:** @name`, `**Labels:** a, b` |
| parent | `**Parent:** ABC-11` |
| blocked_by | `**Blocked by:** ABC-9, ABC-10` |
| blocks | derived: every ticket whose `Blocked by` names this one |
| links | `**Links:**` URLs, comma-separated |
| branch | `**Branch:**`, default `<user>/<team-key>-<n>-<slug>` in lower case |
| project | the file the entry is in |
| type | `**Labels:**` containing `bug` or `chore`, otherwise ticket |
| description | text after the metadata lines, up to the next `####` heading |
| children | derived: every ticket whose `Parent` is this one |

## Operations

| Operation | What to do |
|-----------|------------|
| get_item | Find `### [KEY]` in any project file; parse the entry |
| create_item | Read `NEXT_ID`, write it back plus one, append the entry under `## Tickets` in the project file. Refuse without a project |
| update_item, transition_item | Rewrite the metadata line or section of the entry |
| list_items | Parse every project file (or one); filter in memory |
| search_items | Text search over the project files |
| set_parent | Set or remove `**Parent:**` |
| get_children | Entries whose `Parent` is the key |
| add_blocking_link | Add the blocker to the blocked entry's `**Blocked by:**` |
| remove_blocking_link | Remove it |
| add_link | Append to `**Links:**` |
| get_project, list_projects | Parse the header of each project file |
| create_project | Write a new project file with empty `## Tickets`, `## Comments` and `## Updates` sections; add its name to the initiative file's `**Projects:**` if given |
| update_project | Rewrite the project file's header line or brief; for `initiative`, also update `**Projects:**` in both initiative files |
| assign_to_project | Move the entry, and its sub-issues, to the other file |
| get_initiative, list_initiatives | Parse the initiative files |
| create_initiative | Write a new initiative file with empty `**Projects:**`, `## Comments` and `## Updates` |
| update_initiative | Rewrite the initiative file's header or goal |
| add_comment, list_comments | For a ticket, the entry's `#### Comments` block; for a project or initiative, the file's `## Comments` section. One dated blockquote per comment, newest last in the file |
| add_update, list_updates | Append a dated `###` entry under `## Updates`; never edit an old one |
| list_statuses | The six values above |
| list_labels, add_label, remove_label | The `**Labels:**` field; labels are free text |

`updated_at` is the date of the entry's latest comment or update, or the file's last
commit when there is none (`git log -1 --format=%cI -- <file>`).

## Limits

- Ticket numbers come from `NEXT_ID`. Two sessions creating tickets on different
  branches can collide; resolve it at merge by renumbering the later one.
- No notifications. Other sessions see changes when they pull.
- Staleness is coarse: a ticket's activity is its latest dated comment.

## Initialising a backlog

```sh
mkdir -p backlog/projects backlog/initiatives
echo 1 > backlog/NEXT_ID
printf '# Project: Maintenance\n\n**Status:** in_progress\n\nSmall, unrelated tickets.\n\n## Tickets\n\n## Comments\n\n## Updates\n' \
  > backlog/projects/maintenance.md
```

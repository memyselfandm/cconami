# Linear workflow reference

The life of a piece of work under the project, ticket and initiative model. Each
stage names the skill that does it. No stage involves a time box.

## 1. Capture

An idea becomes a ticket in the project it belongs to, or a project brief if it is a
workstream of its own.

- One idea, one to three units of value: `refining-work-items <idea> --type ticket`.
- A new workstream: `refining-work-items <idea> --type project` writes the brief into
  the project description.
- A large effort spanning several workstreams: create an initiative with its goal as
  the description (`create_initiative`), and attach each project as it appears
  (`update_project(name, {initiative})`).

## 2. Shape

A project brief, or a ticket that turned out too big, is split into tickets.

- `breaking-down-work <project or ticket>` proposes tickets, each with a "Done when",
  and the blocking links between them. It creates them after you agree.
- `analyzing-dependencies <project>` shows the order the links imply, the longest
  chain, and what can start now.

## 3. Do

- A session picks up a ticket: it assigns itself, moves the ticket to in progress and
  comments that it has started.
- `executing-work-items <keys...>` implements one or more tickets. It works on a branch
  named from the team key, opens one pull request at a time (a ticket may take up to
  three), and hands off to review.
- Long work leaves checkpoints as project updates, so another session can continue it.

## 4. Keep the record true

- `reconciling-linear-projects <project>` compares every ticket with its pull requests
  and the running system, fixes what the evidence settles, and moves leftovers to a
  named open ticket before anything closes. Run it at the end of a workstream, before
  a checkpoint, or whenever a project's status is in doubt.
- `reporting-workstream-status` reads all projects and initiatives in progress and
  posts what is stuck, stale or colliding. It runs on a schedule and writes nothing to
  Linear.

## 5. Close

- A ticket closes when every "Done when" line is met, with the evidence in a comment
  (`add_comment`, then `transition_item(key, "done")`).
- A project closes when its lead decides the workstream is done, after a final
  reconciliation (`update_project(name, {status: completed})`). Its leftovers live on in
  open tickets in other projects.
- An initiative closes when its projects are closed. Its last update (`add_update`) says
  what was delivered and where the follow-ups went; then
  `update_initiative(name, {status: completed})`.

## Example

Team `ABC`, a product team.

```
Initiative: Version 2
├── Project: Sync engine            (workstream, lead: a session)
│   ├── ABC-101  Store changes as an append-only log        Done
│   ├── ABC-102  Replay the log on start                     In Progress, blocked by ABC-101 (done)
│   └── ABC-103  Conflict rule for concurrent edits          Todo, blocked by ABC-102
└── Project: Settings page           (workstream)
    └── ABC-110  Move settings to the new layout             In Review, PR #88
Project: Maintenance                 (bucket, no initiative)
    └── ABC-120  Bump the test runner                        Todo
```

- ABC-102's branch is `<user>/abc-102-replay-log-on-start`.
- ABC-103 waits on a blocking link, not on a date.
- When the sync engine is finished, a reconciliation moves any unmet "Done when" lines
  to an open ticket (in Maintenance, or a Version 2 follow-up project) before the
  Sync engine project closes.

## Patterns

**Parallel workstreams.** Two projects with no blocking links between them can be
worked at the same time by different sessions. The status report flags them when their
pull requests touch the same files.

**A bucket project.** Small, unrelated tickets (maintenance, chores) go in one open
project per team. It never closes; reconcile it now and then.

**Staged delivery.** When a project ships in stages, use project milestones to mark
each stage. A milestone is a scope boundary, not a time box.

---
name: reconciling-linear-projects
description: Audit one project's tickets against pull requests and the running system, fix the statuses the evidence settles, move tickets between projects when work is re-homed, and move leftovers to a named open ticket before anything is closed, cancelled or folded. Rolls the result up to the initiative. Use when a project's status is in doubt, before closing or folding tickets, at the end of a workstream, before a checkpoint, when priorities move work between projects, or when asked "is Linear up to date", "what is actually done", "audit this project", "reconcile the tickets".
argument-hint: "<project> [--repos owner/a,owner/b] [--move-to <project> --tickets KEY,KEY] [--dry-run]"
version: 1.0.0
metadata:
  hermes:
    category: productivity
    tags: [linear, project-management, audit]
    related_skills: [pm-context, linear-workflow, reporting-workstream-status]
---

# Reconciling Linear projects

Ticket status drifts from the work in both directions: done in Linear with the pull
request still open, or in progress with the work merged days ago. Work also gets lost
outright, when tickets are folded into one that then closes. This skill makes one
project's record match the facts.

The model is the one in `linear-workflow`: a project is a workstream or a bucket, a
ticket is one to three units of value, an initiative groups projects. Do not propose
time boxes. All reads and writes go through [pm-context](../pm-context/SKILL.md).

## Settings

Each project that uses this skill supplies these, in its instructions file or in the
request. Ask for any that are missing and needed.

- **Repositories**: where the pull requests live (`owner/repo`, one or more).
- **Team key**: the ticket prefix, which is also the branch prefix:
  `<user>/<team-key>-<number>-<slug>`.
- **Live-state check** (optional): how to confirm a merged change is actually running,
  for example "the deploy pipeline applies `main` within ten minutes, so merged config is
  live" or "run `<health command>` against the service". With none, every "Done when"
  line about a running system is reported as not verified.

## Scope

One project per run. If the project belongs to an initiative in progress, finish the
project, then roll the result up (step 7). Delegate the reading when the project has more
than about fifteen open tickets, and keep only the resulting table.

## Steps

### 1. Collect

- The project: brief, latest updates, every ticket that is not cancelled, with status,
  assignee, blocking links and attached pull requests.
- Each ticket's pull requests, from three sources, because each misses some:
  1. the ones attached to the ticket;
  2. a search of each repository for the ticket key in titles and bodies, all states;
  3. branch names starting `<user>/<team-key>-<number>-` (lower case), because a title
     only starts with the key when the pull request finishes the ticket.
- Open `owner-action` tickets that block tickets in the project.

### 2. Classify each ticket

Compare the status with the evidence and give each ticket one verdict.

| Verdict | Evidence |
|---|---|
| **Matches** | Status agrees with the pull requests and, where relevant, the running system |
| **Behind** | Work merged, or the "Done when" is met, but the ticket is still open |
| **Ahead** | Marked done, but a pull request is open or unmerged, a "Done when" line is unmet, or the change is not on the running system |
| **Stalled** | In progress, with no pull-request activity and no comment since the last project update |
| **Orphaned** | A merged pull request or a running change with no ticket, or a ticket blocked by something already closed |

**Merged is not done.** Read the ticket's "Done when". If a line names a running system
(a deployed service, a completed cutover, a live test), apply the project's live-state
check, or mark the line "not verified" in the report.

### 3. Find leftovers before closing anything

For every ticket you intend to close, cancel or fold into another, list what it still
owes: unmet "Done when" lines, follow-ups named in its comments or pull request, and
anything recorded as "not done" or "not verified".

**Each leftover must sit on a named open ticket before the first one closes.** Create
the ticket, or add the leftover to an existing open one, and link the two. Never fold a
ticket into one that is itself about to close.

### 4. Move tickets between projects (when asked, or when the evidence says so)

When work is re-homed (priorities change, a project closes with open tickets, a ticket
sits in the wrong workstream):

1. **Check the links.** For each ticket to move, list its blockers and the tickets it
   blocks. A blocker left behind in a closing project is a leftover (step 3). A link
   across two open projects is fine; report it so both leads know.
2. **Preview.** Show the tickets, from and to, the links that now cross projects, and
   each project's open count before and after. With `--dry-run`, stop here.
3. **Move.** `assign_to_project` for each ticket; sub-issues move with their parent.
4. **Record.** Comment on each moved ticket: "Moved from <project> to <project>:
   <reason>".

Never move a ticket another session is working on; tell that session instead.

### 5. Fix what the evidence settles

You may, without asking:

- move **Behind** tickets to done, with a comment naming the pull request and the check;
- move **Ahead** tickets back to in progress or in review, with a comment saying what is
  still owed;
- attach a pull request to its ticket, and add missing blocking links;
- create the leftover tickets from step 3;
- cancel or fold a ticket of your own workstream, once step 3 is done for it, with a
  comment naming where each leftover went;
- move tickets as in step 4 when the request asked for it.

Not yours to change:

- **A ticket another session is working on.** Tell that session what you found and let
  it make the change. That is peer coordination, not an ask for the owner.
- **A project's or initiative's status.** The workstream's lead sets it. If there is no
  lead, file an owner action (the `assigning-owner-actions` skill, where installed;
  otherwise an open ticket labelled `owner-action`).

### 6. Report on the project

Post a project update with this shape. Leave out an empty section.

```markdown
## Reconciliation, <date, in the owner's time zone>

**Changed.** <Ticket: old status to new status, and the evidence.>
**Moved.** <Ticket: from project, to project, and why.>
**Leftovers moved.** <Leftover, from which ticket, to which open ticket.>
**Stalled.** <Ticket, last activity, what it is waiting on.>
**Needs the owner.** <Each owner action filed, with its ticket.>
**Not verified.** <Each claim not checked against the running system.>
```

### 7. Roll up to the initiative

If the project's initiative is in progress, add one line per project to an initiative
update: project, done and open counts, and the one thing blocking it. Do not copy the
project report.

## Rules

- Evidence comes from the repositories and the running system, not from ticket comments
  or a session's memory of what it did.
- Report what you could not verify. An unverified "done" is worse than an honest "open".
- One reconciliation per update. Do not edit an earlier one.

## Example settings

A filled-in set of settings for a GitOps-deployed infrastructure repository is in
[examples/gitops-settings.md](examples/gitops-settings.md).

## Platform notes

- [platforms/claude-code.md](platforms/claude-code.md)
- [platforms/hermes.md](platforms/hermes.md)

---
name: reporting-workstream-status
description: "Read Linear (and pull requests, where readable) and post one report of which workstreams are stuck, stale or colliding, naming the ticket for every item. Also covers settling a sequencing question between workstream leads with one recorded ruling. Load this when a scheduled status run starts, when asked for a cross-project status, or when workstream leads ask you to rule on the order of their work."
argument-hint: "[--window DAYS] [--repos owner/a,owner/b] [--initiative NAME]"
version: 1.0.0
metadata:
  hermes:
    category: productivity
    tags: [linear, status, coordination]
    related_skills: [linear-workflow, reconciling-linear-projects, pm-context]
---

# Workstream status report

Each workstream has a lead (a person or a lead session) that keeps its own project
current. No one reads across them, so collisions surface late. This report reads **the
record, not the traffic**: the tracker and the pull requests, on a schedule. It posts what
is stuck, stale or colliding, takes no messages and gives no orders.

The model is the one in `linear-workflow`: projects are workstreams, tickets are one to
three units of value, initiatives group projects. Reads go through
[pm-context](../pm-context/SKILL.md).

## Settings

The project or the scheduled job supplies these. Defaults in brackets.

- **Staleness window** [3 days]. The owner may change it.
- **Repositories**: where pull requests live (`owner/repo`, one or more). With none,
  pull requests are not read.
- **Status channel**: where the report is posted. Set by the platform's job, see
  Platform notes.
- **Time zone** [the owner's]: every time in the report uses it.
- **Scope** [all projects in progress]: optionally one initiative.

## Inputs

Read these, and only these (`list_projects`, `list_initiatives`, `list_updates`,
`list_items`, `get_item`, `list_comments`):

1. **Projects and initiatives in progress**, each with its latest update and its open
   tickets, plus each ticket's status, last activity and blocking links.
2. **Open pull requests** for those tickets: number, check state and last push. Take them
   from the ticket's links, then from the repositories in the settings. If pull-request
   checks or pushes cannot be read, judge staleness from the tracker alone and say so in
   the report's first line: `Pull request checks not read: judged from Linear only.`
3. **Open tickets labelled `owner-action`**, and the tickets each one blocks.

## Output

Post one message per run. It has three sections in this order, and an empty section is
left out. If all three are empty, the whole message is the single line
`Workstreams: nothing stuck, stale or colliding.`

```
Workstreams, <date and time, owner's time zone>

Stuck
- ABC-123 (<project>): blocked on ABC-130 "Rotate the deploy key" (owner action).
- ABC-140 (<project>): pull request #512 failing `test`.

Stale
- ABC-150 (<project>): In Progress, no pull request or comment since <date>.
- ABC-131 (owner action): the ticket it blocks, ABC-128, is already closed.

Colliding
- ABC-160 (<project A>) and ABC-171 (<project B>) both change
  `src/config/schema.ts`; neither project records an order.
```

| Section | An item belongs here when |
|---|---|
| **Stuck** | An in-progress ticket is blocked by an open ticket (an owner action or another workstream's ticket), or its pull request has a failed check. |
| **Stale** | An in-progress or in-review ticket has had no comment, status change or pull-request push for longer than the staleness window; or an `owner-action` ticket blocks only closed tickets; or a project in progress has had no update within the window. |
| **Colliding** | Two tickets in different projects have open pull requests that change the same file or name the same system (a service, host or environment); or two tickets block each other. |

Rules for each item:

- **Name the ticket.** Every item has a ticket key. An item about a whole project names
  the project and its oldest in-progress ticket.
- **One line per item**, saying what and why. No advice and no instructions.
- **State the evidence, not a guess:** "no activity since <date>", not "seems abandoned".
- **At most ten items per section.** If there are more, list the ten oldest and end the
  section with the count of the rest. In **Stuck**, tickets blocked by an owner action
  come first, so the cap cannot hide what is waiting on the owner.

## What the report does not do

- It does not comment on, edit, move or create any ticket. The one exception is the
  ruling comment below.
- It does not dispatch work, start a job or tell a session what to do.
- If a finding needs a write, the report says so, and the request goes to the owner in
  the usual way.
- If an input cannot be read, the message is one line naming that input. Do not retry in
  a loop.

## Sequencing rulings

Workstream leads may ask you to settle the order of work they cannot agree on. Do this
only where the owner has pre-approved this one write for the runner:

1. Read both workstreams' tickets and pull requests, then decide the order.
2. Answer where you were asked, with the ruling and its reasons.
3. Record the ruling as **one comment** on the affected project or initiative
   (`add_comment({project: ...} | {initiative: ...}, body)`), naming
   the tickets it orders, and sign it as your platform note says. Do not wait for
   further approval.

That comment is the whole write. Do not edit, re-status, re-label or create tickets as
part of a ruling, and do not comment anywhere else. If a ruling needs any of those, say
so and leave the change to the leads or the owner. Without the owner's pre-approval,
post the ruling as a recommendation and do not write it to the tracker.

## Limits

- A collision is visible only when both sides have an open pull request or an explicit
  blocking link. Two sessions about to touch the same system with nothing pushed are
  invisible.
- A project update counts as activity for the project, but a ticket is judged by its own
  activity.
- "In progress" comes from the tracker. If a project's statuses are wrong, the report is
  wrong in the same way; `reconciling-linear-projects` is the fix.

## Platform notes

How to schedule the run, where it posts and how to sign a ruling:

- [platforms/claude-code.md](platforms/claude-code.md)
- [platforms/hermes.md](platforms/hermes.md)

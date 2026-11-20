---
name: linear-workflow
description: How work is organized in Linear - initiatives for large efforts, projects for workstreams, tickets of one to three units of value, blocking links for order, and Linear as the place orchestration state lives. Background context for any skill or session that reads or writes Linear. Work is not planned in time boxes.
user-invocable: false
version: 2.0.0
metadata:
  hermes:
    category: productivity
    tags: [linear, project-management, workflow]
    related_skills: [pm-context, reconciling-linear-projects, reporting-workstream-status]
---

# Linear workflow

How work is organized in Linear, and the rules every skill and session follows when
it reads or writes it. The other skills in this plugin assume this model.

## The model

```
Team (a product or a body of work, owns the ticket prefix, e.g. ABC)
└── Initiative   a large effort: a platform rebuild, a major new version
    └── Project  a workstream, or a bucket of related work
        └── Ticket   one to three units of value, with a "Done when"
            └── Sub-issue   only when a ticket genuinely needs separate steps
```

- **Initiatives** group the projects of one large effort. An initiative has a status
  and short updates that roll up its projects. Most work does not need one.
- **Projects** are workstreams or buckets of work, not time boxes. A project has a
  description, a lead (a person or a lead session) and a stream of project updates.
  It stays open while its workstream is live and closes when the work is done, not
  when a date passes.
- **Tickets** are issues. Each one is roughly one to three units of value: something
  a reviewer can check and a user or operator would notice. A ticket that needs more
  than about three pull requests, or more than one person's judgement to finish, is
  two tickets.
- **Sub-issues** are optional. Use them for steps that must be tracked separately
  (an owner action, a follow-up in another repository), not to plan a schedule.

**There are no sprints and no cycles.** Do not create time-boxed projects, do not
assign tickets to iterations, and do not propose either. Order comes from blocking links and
priority, not from time boxes. Project milestones are fine when a project ships in
stages; they mark a stage, not a period.

## Linear holds orchestration state

A session can be lost at any time. Anything another session would need to continue
the work goes in Linear, not in a chat thread or a session's memory:

- the plan for a project: its description, or a project update;
- who is doing what: the ticket assignee, and a comment when a session picks it up;
- rulings and decisions: a comment on the ticket, project or initiative they affect;
- checkpoints: a project update (see the `checkpointing-sessions` skill);
- leftovers: a named open ticket, never a line in a closed one.

## Rules for tickets

- **Refer to tickets by key**, `ABC-123`. The prefix is the team key.
- **Every ticket has a "Done when" section**: checkable lines, each naming the
  evidence (a merged pull request, a passing check, a live behaviour). See the
  `refining-work-items` skill.
- **Create a ticket in a project.** If the project is unclear, ask, or put it in the
  team's catch-all project if the team has one. Sub-issues inherit the parent's project.
- **Order with blocking links**, not with ticket titles or descriptions.
- **Branch names come from the team key**: `<user>/<team-key>-<number>-<slug>`, all
  lower case (`mike/abc-123-add-retry`). Linear suggests this name for each ticket.
  A pull request that finishes a ticket starts its title with the key.
- **Progress goes in comments.** Keep the description as the current spec: when a
  checklist item in it is done, tick it there; anything more is a comment.
- **Before closing, cancelling or folding a ticket, move its leftovers** to a named
  open ticket and link the two. The `reconciling-linear-projects` skill owns this rule.
- **A project's or initiative's status belongs to its lead.** Other sessions report
  what they see; they do not change it.
- If Linear cannot be reached, tell the user at once. Do not keep a private list
  and sync it later.

## Which skill does what

| Need | Skill |
|------|-------|
| Read or write Linear through one interface | `pm-context` |
| Turn an idea into a ticket or a project brief | `refining-work-items` |
| Split a project or an oversized ticket into tickets | `breaking-down-work` |
| See what blocks what, and what can run in parallel | `analyzing-dependencies` |
| Implement one or more tickets | `executing-work-items` |
| Make a project's tickets match the pull requests and the running system | `reconciling-linear-projects` |
| Report what is stuck, stale or colliding across projects | `reporting-workstream-status` |

The life of a piece of work, from idea to closed project, is in
[workflow-reference.md](workflow-reference.md).

## Platform notes

How to reach Linear and how to post on each agent platform:

- [platforms/claude-code.md](platforms/claude-code.md)
- [platforms/hermes.md](platforms/hermes.md)

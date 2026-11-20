---
name: executing-work-items
description: Implements one or more named tickets with agents - checks each is ready, orders them by blocking links, groups tickets that touch the same files, runs independent ones in parallel on branches named from the team key, opens one pull request per ticket, and hands off to checkpointing and pull-request review. Use when asked to implement specific tickets. Has side effects; invoke explicitly.
argument-hint: "<ticket-key...> [--dry-run] [--force] [--skip-prep] [--max-parallel N]"
disable-model-invocation: true
version: 2.0.0
metadata:
  hermes:
    category: productivity
    tags: [project-management, execution, agents]
    related_skills: [pm-context, analyzing-dependencies, reconciling-linear-projects]
---

# Executing work items

Implement specific tickets, in the right order, with agents working in parallel where
the blocking links and the files allow. Ticket reads and writes go through
[pm-context](../pm-context/SKILL.md).

## Arguments

- **Ticket keys** (required): `ABC-123 ABC-124` or `ABC-123,ABC-124`.
- `--dry-run`: show the plan; change nothing.
- `--force`: run despite unmet blockers outside the batch. Say which, in the plan and in
  each affected ticket's comment.
- `--skip-prep`: skip the readiness check.
- `--max-parallel N`: agents at once, default 4.

## Steps

### 1. Gather

For each key: `get_item` (with blocking links and links), `list_comments`, its project
and its sub-issues. Note the suggested branch name; if the tool gives none, build it from
the team key: `<user>/<team-key>-<number>-<slug>`, lower case.

### 2. Check readiness (unless `--skip-prep`)

A ticket is ready when:

- it has a "Done when" section with checkable lines;
- every blocker is done, or is in this batch;
- it is not assigned to another person or session (if it is, stop for that ticket and
  tell that session; do not take it over);
- it is in a project.

Report the tickets that are not ready and why. Suggest `refining-work-items` for a
missing "Done when".

### 3. Plan

- **Order** by blocking links (see `analyzing-dependencies`): blockers first.
- **Group** tickets likely to touch the same files into one agent, run in order, so two
  agents never edit the same file at once.
- **Parallelise** the remaining groups up to `--max-parallel`.

```
Plan (4 tickets, 3 agents)
Wave 1: agent A: ABC-120  | agent B: ABC-123
Wave 2: agent A: ABC-121 (blocked by ABC-120), then ABC-122 (same files)
External blockers: none
```

With `--dry-run`, stop here.

### 4. Claim

For each ticket, before any code changes: assign it, move it to in progress, and
comment that work has started, naming the branch. This is what tells other sessions
the ticket is taken.

### 5. Implement

Each agent, per ticket:

1. Starts a branch from the up-to-date default branch, named as in step 1, in its own
   isolated working copy, so parallel agents do not share files.
2. Implements the change and the tests its "Done when" asks for.
3. Runs the project's checks (build, tests, lint) and keeps the output.
4. Commits with the ticket key in the message and opens one pull request per ticket,
   titled `<KEY> <ticket title>`, linking the ticket. Attach the pull request to the
   ticket (`add_link`) if the tracker does not do it automatically.
5. Comments on the ticket: the pull request, the checks run and their result, and any
   "Done when" line it could not satisfy or verify.

An agent that hits something outside the ticket's scope records it as a new ticket in
the same project (or a comment if it is trivial) and carries on. It does not widen the
pull request.

### 6. Hand off

- **Review.** Each pull request goes to review through the `reviewing-pull-requests`
  skill, run by a reviewer separate from the agent that wrote it. Fix findings on the
  same branch.
- **Checkpoint.** If the work will outlast the session, or the session is about to stop
  with work in flight, write a checkpoint with the `checkpointing-sessions` skill, so
  another session can continue from Linear alone.
- **Merging** follows the project's own rules; this skill does not merge.

### 7. Status

- Leave a ticket **in review** while its pull request is open.
- Move it to **done** only when the pull request is merged *and* every "Done when"
  line is met, with the evidence in a comment. A line about a running system needs the
  live check, not just the merge. If a line cannot be verified, leave the ticket open and
  say so; `reconciling-linear-projects` settles it later.

### 8. Report

```
Executed 4 tickets

| Ticket  | Pull request | Checks | Status    | Not verified |
|---------|--------------|--------|-----------|--------------|
| ABC-120 | #51          | pass   | In Review | -            |
| ABC-121 | #53          | pass   | In Review | live replay  |
| ABC-122 | #54          | fail   | In Progress | -          |
| ABC-123 | #52          | pass   | In Review | -            |

New tickets filed: ABC-130 (found while doing ABC-121)
Next: reviewing-pull-requests on #51-#54; fix ABC-122's failing test
```

## Rules

- Never mark a ticket done on a session's word; mark it on evidence.
- Never work on a ticket another session holds.
- One ticket, one branch, one pull request.

## Platform notes

- [platforms/claude-code.md](platforms/claude-code.md)
- [platforms/hermes.md](platforms/hermes.md)

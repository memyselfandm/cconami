---
name: breaking-down-work
description: Splits a project brief, an initiative's scope or an oversized ticket into tickets within a project - each one to three units of value with its own "Done when" - and sets the blocking links between them. Includes a coverage check of what already exists, optional parallel codebase analysis, and a proposal you approve before anything is created. Use when a new project needs its tickets, or a ticket is too big for one to three pull requests.
argument-hint: "<project | initiative | ticket-key> [--project <name>] [--dry-run] [--no-analysis] [--max-tickets N]"
version: 2.0.0
metadata:
  hermes:
    category: productivity
    tags: [project-management, tickets, decomposition]
    related_skills: [pm-context, refining-work-items, analyzing-dependencies]
---

# Breaking down work

Turn a body of work into tickets inside a project, ordered by blocking links. All reads
and writes go through [pm-context](../pm-context/SKILL.md). A ticket here means what
`linear-workflow` says: one to three units of value, with a checkable "Done when".

## Arguments

- **Source**, one of:
  - a **project**: break its brief (the description) into tickets in that project;
  - an **initiative**: propose which projects it needs, then break each down in turn
    (one project per run; say which come next);
  - a **ticket key**: split an oversized ticket into tickets in the same project.
- `--project <name>`: put the tickets in a different project from the source's.
- `--dry-run`: propose only; create nothing.
- `--no-analysis`: skip the codebase analysis.
- `--max-tickets N`: stop the proposal at N tickets and list what is left out.

```
breaking-down-work "Sync engine"
breaking-down-work ABC-140 --dry-run
breaking-down-work "Version 2" --no-analysis
```

## Steps

### 1. Gather context

- The source: `get_project`, `get_initiative` or `get_item`, with its description,
  comments and latest updates.
- What already exists: `list_items({project})`, including closed tickets, so nothing
  is proposed twice. For a ticket, also its sub-issues and blocking links.
- Coverage check, detailed in [preparation.md](preparation.md): match each goal or
  "Done when" line of the source to an existing ticket, and list the goals with none.

### 2. Check the source is ready

The source needs a stated problem, a description of "finished" (a project's "Finished
when", a ticket's "Done when") and enough scope to split. If it does not have them,
report what is missing, suggest `refining-work-items`, and stop.

### 3. Analyse the codebase (unless `--no-analysis`)

Identify the technical areas the work touches. Analyse each area in parallel with the
prompt in [prompts/code-analysis.md](prompts/code-analysis.md). Collect, per area, the
current state, the patterns to follow, the risks, the likely files and the suggested
tickets. See Platform notes for how to run the analyses in parallel.

### 4. Propose tickets

Merge the suggestions into one list. For each ticket:

- an imperative title that says what changes;
- a description built from [../refining-work-items/ticket-template.md](../refining-work-items/ticket-template.md),
  with "Why", "Scope" and three to six "Done when" lines that name their evidence;
- its blocking links to other proposed or existing tickets;
- the files or areas it is likely to touch.

Sizing rules:

- **One to three pull requests per ticket.** Bigger means split; split by behaviour, so
  each piece is useful alone, not by layer.
- **Few blockers.** Keep the tickets that others wait on small and few, so most tickets
  can start at once.
- **No ticket for "write tests" or "update docs" alone.** Tests and docs belong in the
  "Done when" of the ticket whose change needs them.
- **Owner actions are their own tickets**, labelled `owner-action`, blocking the work
  that needs them.
- **Sub-issues only for steps that need their own owner or status.**

Check the links form no loop (see `analyzing-dependencies`), and flag pairs of tickets
likely to touch the same files: they should be ordered or merged.

Present the proposal as a table and **wait for agreement** before creating anything:

```
Proposed tickets for "Sync engine" (5; 2 goals already covered by ABC-101, ABC-104)

| # | Title                                   | Blocked by | Likely files        |
|---|-----------------------------------------|------------|---------------------|
| 1 | Store changes as an append-only log     | -          | src/store/*         |
| 2 | Replay the log on start                 | 1          | src/boot.ts         |
| 3 | Conflict rule for concurrent edits      | 2          | src/merge/*         |
| 4 | Show sync state in the status bar       | -          | src/ui/status.tsx   |
| 5 | Owner: enable the sync flag in prod     | 2, 3       | -  (owner action)   |

Parallel now: 1, 4. Longest chain: 1 -> 2 -> 3 -> 5.
```

With `--dry-run`, stop here.

### 5. Create

For each agreed ticket, in blocker-first order:

```
create_item({title, project, description, labels, blocked_by})
```

Then add any links to existing tickets with `add_blocking_link`. When splitting a
ticket, comment on the original naming the new tickets, and either close it once every
one of its "Done when" lines is carried by a new ticket, or keep it as the parent. Never
close it with a line left uncarried.

Read back one created ticket to check the description and links landed.

### 6. Report

```
Created 5 tickets in "Sync engine": ABC-120 .. ABC-124
- Blocking links: 4
- Parallel now: ABC-120, ABC-123
- Longest chain: ABC-120 -> ABC-121 -> ABC-122 -> ABC-124
- Goals still uncovered: none
- Overlapping files flagged: ABC-121 and ABC-122 (src/merge/state.ts), ordered
Next: analyzing-dependencies "Sync engine", or executing-work-items ABC-120 ABC-123
```

## Checks before finishing

- [ ] Every goal of the source is covered by a ticket, or listed as uncovered
- [ ] Every ticket has three to six "Done when" lines
- [ ] No ticket needs more than three pull requests
- [ ] The blocking links form no loop
- [ ] Every ticket is in a project

## Errors

| Problem | What to do |
|---------|------------|
| Source not ready | Report what is missing; suggest `refining-work-items` |
| An analysis fails | Retry once; otherwise propose without that area and say so |
| A loop in the links | Show it; drop or reverse one link before creating |
| Rate limit while creating | Slow down; report which tickets were created |

## Platform notes

- [platforms/claude-code.md](platforms/claude-code.md)
- [platforms/hermes.md](platforms/hermes.md)

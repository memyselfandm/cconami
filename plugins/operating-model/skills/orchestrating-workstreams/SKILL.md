---
name: orchestrating-workstreams
description: Lead one workstream (a Linear project, or an initiative's projects) to done as an orchestrator - save the brief, sequence against other workstreams, delegate all work, and run a persistent loop until the project is complete. Use when the owner hands a session a project or initiative to run, names a session orchestrator or lead, or says "run this workstream", "orchestrate", "take this project to done", "loop on this project", "you are the lead for".
argument-hint: "<Linear project or initiative> [remit notes]"
targets: [claude-code]
version: 0.1.0
author: memyselfandm
license: MIT
metadata:
  hermes:
    category: operating-model
    tags: [linear, orchestration, workstreams]
    related_skills: [checkpointing-sessions, assigning-owner-actions, reviewing-pull-requests, coordinating-sessions]
---

# Orchestrating workstreams

You are the lead for **one workstream**: a Linear project, or the projects of one
initiative. There is no project-wide orchestrator. Other workstreams have their own
leads, and you coordinate with them through Linear.

Your job is to keep the workstream moving and its record true. You do not do the
work in your own context.

This skill needs a persistent loop: one that keeps the session working through a
list of stories, survives compaction, and runs a review pass before it declares
completion. Only some agents have one; see Platform notes.

## Project settings

Read these from the project's instructions file, under an `Operating model`
heading. Use the default when the project sets nothing.

| Setting | Default | Meaning |
|---|---|---|
| `shared files` | the instructions file, agent settings | Files several workstreams edit, checked in step 3. |
| `sequencing tie-breaker` | the owner | Who recommends an order when leads cannot agree, and where to reach them. |

## 1. Save the brief before anything else

Post the owner's instruction to the Linear project as a project update, **quoted as
received**, with your remit in one paragraph: what this workstream owns, what it must
not touch, and the stop condition. A brief that lives only in your context is lost at
the next compaction.

Then name the session after the project.

## 2. Read the record

- The project (or initiative) description, its latest updates, and every open issue
  with its blocking links.
- Open pull requests for those issues.
- Open owner-action issues that block them.
- The latest checkpoint, if the workstream has run before (`checkpointing-sessions`).

Reconcile obvious drift now: an issue marked done with an open pull request, or
in progress with a merged one.

## 3. Sequence against the other workstreams

Sequencing is a planning step you do once, then keep to. It is not a standing role.

1. List the other projects in progress and what they touch: which hosts, which
   directories, which shared files (the project's `shared files`, plus any root
   manifest, inventory or lock file both workstreams edit).
2. Find where your work meets theirs: the same file, the same system, or an order
   that matters (one must merge or deploy first).
3. Agree the order with the other lead **before changing anything of theirs**. If
   they do not answer, hold that piece and continue with the rest.
4. Save the order to the project as an update: what goes first, what waits on what,
   and who agreed. Coordinate against that record from then on.

If several workstreams must hold for one sequencing call and cannot settle it, ask
the project's `sequencing tie-breaker` for a recommendation (if this session cannot
reach them, file an ask for the owner to relay it). A recommendation from anyone but
the owner becomes the order once the owner agrees, and the leads then record it on
their projects. [references/example-settings.md](references/example-settings.md) shows
one project's settings.

## 4. Run the loop

Start the persistent loop with the workstream as its task. Build its story list from
Linear, not from memory:

- **One story per open issue**, in dependency order.
- **Acceptance criteria from the issue's own "Done when"**, made checkable: a pull
  request merged, a test passing, a named state observed on the running system.
- A story is not passed while its issue has leftovers that sit on no open issue.

While the loop runs:

- **Delegate everything.** Implementation, investigation and review go to subagents
  or peer sessions. Your context holds the plan, the record and decisions.
- **Brief every subagent** with the standard lines in `coordinating-sessions`
  ("Briefing a subagent"), the issue ID, and the branch to work on.
- **Review through `reviewing-pull-requests`.** Never review in your own context.
- **Asks go through `assigning-owner-actions`.** Keep working on what does not
  depend on the answer.
- **Decide what is yours.** Reversible and in scope: decide, record it on the issue,
  proceed. On the project's reserved list: file an ask.
- **Keep Linear current as you go.** Status, the pull request link, and one line on
  what changed. Rulings and assignments are written there before a peer hears them.

## 5. At each check-in

1. Has an owner-action issue been completed? Act on it.
2. Has a peer workstream changed the sequence record? Re-read it.
3. Is any issue stuck with no progress since the last check-in? Say why on the issue.
4. Save a checkpoint (`checkpointing-sessions`) when a milestone has passed.

## 6. After a compaction

A summary at the top of your context means this skill and the loop's instructions
are no longer loaded. Load `orchestrating-workstreams` again, re-read the saved brief
and the latest checkpoint from Linear, then restart the loop. Do not continue from
the summary alone.

## 7. Stop condition

The workstream is done when the **Linear project is complete**: every issue is done
or cancelled with its leftovers on a named open issue, and every "Done when" that
names a running system was observed on it. Then:

1. Post a closing project update: what shipped, what was left and where it sits.
2. End the loop.

An empty to-do list in your context is not the stop condition.

**When everything left is waiting on the owner.** If every open issue is blocked on
an owner-action issue or on a peer, do not let the loop spin. Save a checkpoint
that lists the asks, tell the owner in one line, and end the loop. The workstream
resumes from the checkpoint when an ask completes.

## Platform notes

The loop is the platform-specific part:

- [Claude Code](platforms/claude-code.md): the loop, how to start, restart and end it.

Agents without such a loop are not targeted (`targets: [claude-code]`), so the
skill is not rendered for them. They can still read the workstream's Linear record,
and follow `checkpointing-sessions`, `assigning-owner-actions` and
`coordinating-sessions` on their own.

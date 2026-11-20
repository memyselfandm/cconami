---
name: checkpointing-sessions
description: Save a session's state to Linear before context is lost, and resume from that record. Use before the context is cleared, before or after compaction, at sign-off, when context is running low, when handing work to another session, or when starting a session that continues earlier work. Triggers - "checkpoint", "save state", "is state saved", "before I clear", "hand off", "resume", "pick up where we left off", "continue from the last session".
version: 0.1.0
author: memyselfandm
license: MIT
metadata:
  hermes:
    category: operating-model
    tags: [linear, sessions, handoff]
    related_skills: [assigning-owner-actions, coordinating-sessions]
---

# Checkpointing sessions

A session's memory ends when its context is cleared and thins at compaction. The
remit, the brief and the open asks have all been lost that way. **The checkpoint is
a Linear update.** A local file is not a checkpoint: another session, another
machine or the owner's phone cannot read it.

There are two halves. Run the first before context is lost and the second when a
session starts.

## Project settings

Read these from the project's instructions file, under an `Operating model`
heading. Use the default when the project sets nothing.

| Setting | Default | Used in |
|---|---|---|
| `credential checks` | none | Resume, step 3 |
| `owner time zone` | the owner's local time zone | the checkpoint heading |

`credential checks` is a list. Each entry is a command that prints how long a
credential has left, or whether it still works, **without printing the credential
itself**. [references/example-settings.md](references/example-settings.md) shows one project's list.

## Save

Run this before the context is cleared, at sign-off, when context is running low,
and right after a compaction (while the summary still holds the detail).

1. **Reconcile your issues against what was done.** For each issue this session
   touched, compare its status with the facts: pull request open, merged or absent,
   and for anything deployed, the running state. Fix the status. Do not close an
   issue whose leftovers are not on a named open issue.
2. **Write the checkpoint.** Post a project update on the Linear project. If the
   work has no project, comment on the issue instead. Use the template below.
3. **Hand the owner one line:** `Checkpoint saved: <link>. Resume from this link.`
   Say it without being asked. The owner should never have to ask whether state
   was saved.

### Template

```markdown
## Checkpoint: <session name>, <date and time, owner time zone>

**Remit.** <What this session owns and what it must not touch.>

**Brief as received.** <The owner's instruction, quoted. Do not paraphrase it.>

**Done since the last checkpoint.** <Issue, pull request, state. One line each.>

**Open work.** <Issue, branch, head SHA, CI state, what is left.>

**Open asks.** <Each owner-action issue this session filed, and each peer it is
waiting on.>

**Not verified.** <Anything stated above that was not checked against the
running system or the repository.>

**Next step.** <The first action for whoever resumes.>
```

Rules for the content:

- Quote the brief. A paraphrase drifts a little at every checkpoint.
- Name every issue and pull request by its ID. No "the migration PR".
- Never include a secret, a token or a command's secret-bearing output.
- A later checkpoint is a new update. Do not edit an old one.

## Resume

Run this when a session starts on existing work, after the context was cleared, or
when the owner gives you a checkpoint link.

1. **Read the latest checkpoint** on the project (or the issue). If there are
   several, the newest wins; read the one before it only for context.
2. **Fetch `main`** and check where your branch stands against it:
   `git fetch origin main`, then
   `git rev-list --left-right --count origin/main...HEAD` (behind, then ahead).
3. **Check your credentials still work**, without printing them. Run each of the
   project's `credential checks`, and these common ones. Skip a line whose tool is
   not installed where you are running:
   - SSH certificate: `ssh-keygen -L -f <certificate>` and read the `Valid:` line
   - GitHub: `gh auth status`
4. **Verify before you repeat.** The checkpoint says what was true when it was
   written. Before you state that something is merged, running or blocked, check it:
   the pull request, the running system, the owner-action issue. Report differences.
5. **Check your asks.** List the owner-action issues the checkpoint names. Act on
   any that are Done (see the `assigning-owner-actions` skill).
6. **Say where you are in three lines:** the remit, what changed since the
   checkpoint, and the next step. Then take the next step.

## Compaction

Compaction happens without warning, so do not wait for it:

- When a long task passes a milestone (a pull request opened, a cutover step done),
  save a checkpoint then.
- If a summary at the top of your context says the session was continued, run
  **Resume** from step 1 and then **Save**. The summary is not the checkpoint: read
  the saved brief from Linear, not the summary's account of it. A skill that was
  loaded before the compaction is no longer loaded: load it again.

## Platform notes

How to post the update, what clears or compacts a context, and how to reload a
skill differ by agent:

- [platforms/claude-code.md](platforms/claude-code.md)
- [platforms/hermes.md](platforms/hermes.md)

---
name: coordinating-sessions
description: Work alongside other agent sessions in one repository - Linear as the shared state, a fixed peer-message shape, relayed approvals, closing and merging rules, guard refusals, subagent briefs, and the project's list of items reserved for the owner. Use when several sessions or subagents work at once, before messaging or answering a peer, when an approval arrives through another session, before closing someone else's issue, before briefing a subagent, or before any action that might be reserved for the owner. Triggers - "peer message", "tell the other session", "relay", "another session", "multi-session", "who owns this", "brief a subagent", "is this reserved".
version: 0.1.0
author: memyselfandm
license: MIT
metadata:
  hermes:
    category: operating-model
    tags: [sessions, coordination, approvals]
    related_skills: [checkpointing-sessions, assigning-owner-actions, reviewing-pull-requests]
---

# Coordinating sessions

Several sessions and subagents work in one repository at once. **Linear is the
shared state; a session's memory and its messages are not.**

## Project settings

Read these from the project's instructions file, under an `Operating model`
heading.

| Setting | Default | Meaning |
|---|---|---|
| `reserved items` | the general list below | Actions no session decides alone. |
| `subagent brief lines` | the four lines in "Briefing a subagent" | Lines added to every brief. |
| `merge method` | `--squash` | How an approved pull request is merged. |

### Reserved for the owner

Decide anything reversible and in scope yourself, record the decision, and proceed.
Items on the project's `reserved items` list are not yours to decide: ask first,
every time, through `assigning-owner-actions`.

When the project sets no list, these are reserved:

- **Anything that weakens security.** Exposing a service more widely, widening a
  permission or credential, turning off an approval gate or a guard.
- **Taking down shared infrastructure** that other people or sessions depend on,
  such as the network, DNS, the ingress or the secret store.
- **Deleting data**, and anything a pull request cannot undo.

A project's list names its own systems.
[references/example-settings.md](references/example-settings.md) shows one project's
list.

## Working alongside other sessions

- **Name a session after its issue**, or after its project when it leads a
  workstream, so a peer can tell who owns what.
- **Linear first.** A plan, a ruling, an assignment or a relayed approval is written
  to the issue or project before a peer hears it. A lost session then loses nothing.
- **Relayed approval.** If the owner's approval reaches you through another session,
  record it on the issue, with who relayed it, before any irreversible step.
- **Peer messages have one shape** (below). Report a peer's or a subagent's result
  once, and check running state yourself before you state it as fact.
- **Closing an issue.** An issue is not closed, cancelled or folded into another
  until each leftover sits on a named open issue. With that done, closing your own
  issue is yours to decide. Another session's issue is theirs: ask that session.
- **Pull request titles.** A title starts with an issue ID only when the pull
  request finishes that issue. Otherwise name the issue in the body.
- **Merging.** Watch the checks, then merge, as one chained command
  (`gh pr checks <pr> --watch && gh pr merge <pr> --squash`). Never `--auto`: where
  the default branch has no required checks it merges before CI finishes.
- **A cutover is done** when a real reply comes through a real channel, not when
  the manifest applies or the service reports healthy.

## The peer message

Every message to a peer session has these fields, in this order, and one line of
substance after them:

```
<issue> | PR <#n or none> @ <head SHA, 7 chars> | CI <green, red, pending or none> | reply <needed: the question, or not needed>
<one line: what happened, or what you need>
```

For example:

```
ABC-412 | PR #88 @ 3f9c2e1 | CI green | reply not needed
Merged; the migration in ABC-413 can start.
```

Put anything longer on the issue and link it. A message that changes a plan, an
assignment or a ruling is written to Linear first.

## Guards and hooks

Some commands are refused by hooks, and an isolated session may refuse commands it
cannot verify. On a refusal, use the safe form the message names, split the command
into plain ones, or report the refusal. **Never retry through another tool or wrap
the command in a script.**

## Briefing a subagent

A subagent reads the project's instructions file but not your memory or your
conversation. Every brief states:

- the refusal rule above;
- no configuration-management runs, infrastructure applies, or remote shells against
  live hosts, unless that is the task;
- no server or CLI that writes to the real home directory (run test servers against
  a scratch `HOME`);
- a timeout on anything that waits;

plus the project's `subagent brief lines`, the issue ID, and the branch to work on.

## Platform notes

How to name a session, message a peer and start a subagent differ by agent:

- [platforms/claude-code.md](platforms/claude-code.md)
- [platforms/hermes.md](platforms/hermes.md)

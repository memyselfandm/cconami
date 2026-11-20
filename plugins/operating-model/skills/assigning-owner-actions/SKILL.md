---
name: assigning-owner-actions
description: File an ask for the owner as its own Linear issue in the owner's inbox view, and pick up the answer when it is done. Use whenever work needs the owner's hands or decision - a command only they can run, an approval, a choice between options, a reserved action. Triggers - "ask the owner", "needs the owner", "waiting on the owner", "owner action", "needs approval", "operator step", blocked on a human.
version: 0.1.0
author: memyselfandm
license: MIT
metadata:
  hermes:
    category: operating-model
    tags: [linear, owner, approvals]
    related_skills: [checkpointing-sessions, coordinating-sessions]
---

# Assigning owner actions

An ask written in chat or in a ticket comment gets buried while agents keep working.
So every ask is **its own Linear issue**, assigned to the owner, carrying the
owner-action label. One saved view, the owner's inbox, shows them all. Chat only
links to the issue.

## Project settings

Read these from the project's instructions file, under an `Operating model`
heading. Use the default when the project sets nothing.

| Setting | Default | Meaning |
|---|---|---|
| `owner` | the person who runs the project | Who asks are assigned to. |
| `owner-action label` | `owner-action` | The label every ask carries. |
| `owner inbox view` | `Waiting on Mike` | The saved Linear view that lists open asks. |

Keep the label at `owner-action` unless the project says otherwise: the
`owner-inbox` mod lists open issues with exactly that label.

Below, "the label" and "the inbox view" mean these settings.

## When to file one

File an ask when the work cannot move without the owner:

- a command only they can run (host root, an admin write to the secret store, an
  unseal or other break-glass step);
- a decision reserved for them (see the project's reserved items, in the
  `coordinating-sessions` skill);
- a choice between options where no default is clearly right.

Do not file one for something you can decide. If the choice is reversible and in
scope, decide, record it on the work issue, and proceed.

## Steps

1. **Search first.** List open issues with the label and look for the same ask. If
   one exists, link your work issue to it and stop.
2. **Create the issue** in the team that owns the work:
   - `assignee`: the owner. `labels`: the label. `state`: Todo.
   - `project`: the same project as the work issue.
   - `blocks`: the work issue. This keeps the work issue's own thread clean.
   - Title and body as below.
3. **Tell the owner in one line**, with the link. Do not restate the ask in chat.
4. **Carry on** with everything that does not depend on the answer.
5. **Check your asks** at each check-in and whenever you resume: list open and
   recently completed issues with the label that block your work issues. When one is
   Done, read its last comment, act, and say on the work issue what you did.

## Title

The action as an imperative, so the inbox reads as a to-do list.

- `Run the database migration on the production host`
- `Decide: keep the v1 API for one more release?`
- `Approve the wording of the release announcement`

## Body

Use these four headings, in this order, and nothing else.

```markdown
## Do this

<For a command: where to run it, then the exact command in a code block, ending
in `2>&1 | tee <path>` so the output lands in a file and is not pasted into chat.
If the agent cannot read that host, say so and ask for the file to be attached to
this issue.>

<For a decision: the options as a short list, then "Recommended: <option>,
because <one reason>".>

## What it unblocks

<The work issue and what proceeds once this is done.>

## Who is asking

<Session name and work issue.>

## What happens next

<What the agent does when this is marked Done.>
```

Rules for the body:

- A command must be safe to paste as written. No placeholders the owner has to fill.
- Never put a secret in the body. Name where it is stored (the secret store and
  its path) instead.
- One ask per issue. Two commands that must run together are one ask; two
  independent decisions are two issues.

## Rules

- **You own your ask.** Cancel it when it is no longer needed, with one line saying why.
- **Do not comment on an ask.** If the command or the options change, edit the body.
  The owner should never have to read a thread to find the current version.
- **The owner completes it** by marking it Done, with a one-line comment when it is a
  decision. Treat that comment as the decision and copy it to the work issue.
- **Relayed answers.** If the answer reaches you through another session, record it
  on the ask and the work issue before you act on it.

## Limits

- The inbox view is a saved Linear view: the label, assigned to the owner, open. It
  is made once by hand in the Linear UI.
- An agent with no Linear access cannot file here. Its asks arrive through its own
  channel and do not appear in the view.
- Nothing notifies a session when an ask completes. Step 5 is how you find out.

## Platform notes

How to call Linear and where to tell the owner differ by agent:

- [platforms/claude-code.md](platforms/claude-code.md)
- [platforms/hermes.md](platforms/hermes.md)

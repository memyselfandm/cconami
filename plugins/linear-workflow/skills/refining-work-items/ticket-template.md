# Ticket template

A ticket is one to three units of value: something a reviewer can check and a user or
operator would notice. Use this template for any ticket that is not a quick bug or chore
(those use [task-template.md](task-template.md)).

## Template

```markdown
## Why

{One short paragraph: the problem, and who notices when it is fixed.}

## Scope

- {What this ticket changes}
- {What it deliberately leaves out, and which ticket has it, if any}

## Done when

- [ ] {Checkable line naming its evidence: "a pull request merges that ..."}
- [ ] {Checkable line: "`<command>` passes", "the page shows ..."}
- [ ] {If it changes a running system: "the change is live and <check> shows it"}

## Context

- Project: {project}; initiative: {initiative, if any}
- Blocked by: {keys, if any}. Blocks: {keys, if any}
- Files or areas likely to change: `{path}`, `{path}`
- Links: {spec, design, earlier discussion}

## Notes for the implementer

- {Patterns to follow, traps to avoid}
```

The title is an imperative sentence that says what changes: "Replay the log on start",
not "Log replay".

## "Done when" rules

The "Done when" section is what `reconciling-linear-projects` checks before it closes a
ticket, so write it to be checked:

- **Each line names its evidence.** A merged pull request, a passing command, a visible
  behaviour, a live system state.
- **Merged is not done when the ticket changes a running system.** Add a line for the
  live check, so a merged-but-not-deployed change stays open.
- **Three to six lines.** Fewer usually means the ticket is vague; more usually means it
  is two tickets.
- **No line depends on another open ticket.** Use a blocking link instead.

Good: "`make test` passes with the new replay test", "start-up after a crash restores
the last saved state (manual check, steps in the PR)".

Bad: "works correctly", "tests written", "users are happy".

## Size

A ticket should finish in one to three pull requests. Split it when:

- it needs more than three pull requests, or several independent reviewers;
- its "Done when" has two groups of lines that could each be released on their own;
- part of it waits on someone else (make that part its own ticket, linked as a blocker).

Each half must still be a unit of value on its own. Do not split into "backend" and
"frontend" tickets that are useless apart; split by behaviour.

## Sub-issues

Create sub-issues only for steps that need their own owner or status: an owner action,
a change in another repository, a follow-up that can ship later. Implementation steps
belong in the pull request, not in sub-issues.

## Validation checklist

- [ ] Title says what changes
- [ ] "Why" names who notices
- [ ] "Done when" has three to six checkable lines, each with its evidence
- [ ] A live-check line, if a running system changes
- [ ] In a project; blocking links set
- [ ] Small enough for one to three pull requests

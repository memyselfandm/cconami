---
name: reviewing-pull-requests
description: 'Review a pull request in an isolated subagent, post findings on the pull request, and return a one-line verdict to the lead. Use when a pull request needs review before merge, when a lead or orchestrator is asked to review or approve a PR, when a PR head changes after review, or for "review PR", "review #123", "is this ready to merge", "approve this", "second pair of eyes".'
argument-hint: "<PR number> [more PR numbers]"
version: 0.1.0
author: memyselfandm
license: MIT
metadata:
  hermes:
    category: operating-model
    tags: [github, review, pull-requests]
    related_skills: [coordinating-sessions, assigning-owner-actions]
---

# Reviewing pull requests

A lead that reviews in its own context fills that context with a diff and judges the
change through the author's eyes, often its own. So **the lead never reviews**. It
starts one reviewer per pull request head and reads back one line.

## Project settings

Read these from the project's instructions file, under an `Operating model`
heading. Use the default when the project sets nothing.

| Setting | Default | Meaning |
|---|---|---|
| `blocking classes` | the four below | The only kinds of finding that block a merge. |
| `merge method` | `--squash` | How the lead merges an approved pull request. |

## Lead: start the review

For each pull request:

1. Get the head: `gh pr view <n> --json number,headRefOid,headRefName,title,isDraft`.
2. Start **one isolated reviewer per pull request**: a subagent with its own
   checkout, so it cannot disturb yours. Several pull requests are several
   reviewers, started together.
3. Give it the brief below, with the project's blocking classes pasted in.
   **Do not give it your opinion of the change**, your plan, or what you expect it
   to find. A reviewer handed a conclusion returns it.
4. When it finishes, read only its verdict line. The findings are on the pull
   request, not in your context.

A verdict belongs to one head. If the pull request gets a new commit, the verdict is
void: start a new reviewer.

### Brief for the reviewer

```
Review pull request #<n> in <owner>/<repo>, head <sha>.

1. Check out the head in your own checkout: gh pr checkout <n> --detach (detached,
   because the branch is usually checked out in the author's checkout). Confirm
   git rev-parse HEAD equals <sha>. If it does not, stop and report the mismatch.
2. Read the pull request body and the linked issue's "Done when". Judge the change
   against what it claims, not against what you would have built.
3. Run the review engine on the pull request so that it posts its findings there.
4. Apply the blocking bar below to the findings and to anything else you saw.
   Blocking classes for this project: <paste the project's list>.
5. Post one summary comment on the pull request: the verdict line, then
   "Blocking" (if any), then "Follow-ups" (short list).
6. Return ONLY the verdict line to me.

Rules: read-only apart from PR comments. Do not push, merge, approve in GitHub's
review UI, or edit files. Do not deploy, apply, or connect to any live host. On a
hook or guard refusal, use the safe form it names or report it; never wrap the
command in a script. Give anything that waits a timeout.
```

## Reviewer: the blocking bar

A finding blocks only if it falls in one of the project's blocking classes, **and
you reproduced it or can point at the exact lines that make it certain**.

When the project sets no list, use these four:

- **Data loss.** A deleted or overwritten volume, database, backup or secret; a
  migration with no way back.
- **A broken agent or service.** Something the change touches that will fail to
  start, lose its connection or its credentials, or halt at a startup check.
- **Wider access.** A broader permission, role, network path or exposed port than
  the change says it needs; a secret in the diff, a log or a generated file with
  wider read access.
- **An outage of something the owner reserves.** If merging deploys the change, a
  change that would take down anything on the project's reserved list (see the
  `coordinating-sessions` skill) blocks.

[references/example-settings.md](references/example-settings.md) shows one
project's list.

Everything else is a **follow-up**: style, naming, missing tests for behaviour that
works, documentation, simplification, a theoretical failure you could not reproduce.
Keep the follow-up list short: the five that matter most.

How to reproduce without touching a live system: run the change's own tests; render
the manifest, the template or the policy and read the output; run a script against a
scratch `HOME` or a stub; trace the exact code path. Do not contact production to
prove a finding.

## The verdict line

Exactly one line, in one of these three forms. `<sha>` is the first seven characters
of the head you reviewed.

```
#<n>@<sha>: APPROVE on green CI
#<n>@<sha>: APPROVE on green CI, <k> follow-ups
#<n>@<sha>: BLOCK: <the reason in one clause>
```

"On green CI" is part of the verdict. The review does not replace the checks: the
lead still watches them finish before merging, and never merges with `--auto`.

## Lead: act on the verdict

- **APPROVE:** `gh pr checks <n> --watch && gh pr merge <n> --squash` (or the
  project's merge method), if merging is yours to do. Otherwise pass the verdict
  line to whoever merges. Right after a push the checks may not have registered yet;
  if the watch reports none, wait and run it again rather than merging.
- **APPROVE with follow-ups:** the same, and put the follow-ups on a named open
  issue before the pull request's issue closes.
- **BLOCK:** send the verdict line to the author. After the fix, review the new head
  with a new reviewer.
- Record the verdict line on the Linear issue. Report it to peers once.

## Rules

- Pass the review engine no effort level unless the owner asked for one; never
  choose the most expensive levels yourself.
- Never review a pull request you wrote in the same context that wrote it.
- A reviewer that could not run the engine, or could not check out the head, returns
  `#<n>@<sha>: BLOCK: review did not run (<why>)`. It does not guess.

## Platform notes

How to start an isolated reviewer and which review engine to run differ by agent:

- [platforms/claude-code.md](platforms/claude-code.md)
- [platforms/hermes.md](platforms/hermes.md)

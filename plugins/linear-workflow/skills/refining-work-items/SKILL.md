---
name: refining-work-items
description: Turns a rough idea or an existing ticket into a ticket an agent can pick up - one to three units of value, with a "Done when" section that names its evidence - or writes a project brief for a new workstream. Use when capturing an idea, tightening a vague ticket, adding acceptance criteria, or starting a project. Supports --type (ticket|small|bug|chore|project|project-lite), --analyze-codebase and --interactive.
argument-hint: "[ticket-key | idea] [--type ticket|small|bug|chore|project|project-lite] [--project <name>] [--analyze-codebase] [--interactive] [--validate-only]"
version: 2.0.0
metadata:
  hermes:
    category: productivity
    tags: [project-management, tickets, refinement]
    related_skills: [pm-context, linear-workflow, breaking-down-work]
---

# Refining work items

Make a ticket ready for an agent, or a project brief ready for a workstream. Every
operation goes through [pm-context](../pm-context/SKILL.md); the model is the one in
`linear-workflow`.

## Arguments

- **Ticket key** (`ABC-123`) or URL: refine that ticket. **An idea in words**: create one.
- `--type`:
  - `ticket` (default): one to three units of value, [ticket-template.md](ticket-template.md);
  - `small`, `bug`, `chore`: quick items, [task-template.md](task-template.md);
  - `project`: a full brief for a new workstream or initiative, [project-brief.md](project-brief.md);
  - `project-lite`: a one-page brief, [project-brief-lite.md](project-brief-lite.md).
- `--project <name>`: the project a new ticket goes in. Required to create a ticket; ask
  if it is missing and unclear, or use the team's catch-all project if it has one.
- `--parent <key>`: make the new ticket a sub-issue (only for steps that need their own
  owner or status).
- `--analyze-codebase`: add technical context from the repository.
- `--interactive`: walk through each section with questions.
- `--validate-only`: report gaps, change nothing.

Examples:

```
refining-work-items ABC-123
refining-work-items "retry failed uploads" --project "Sync engine"
refining-work-items ABC-140 --type bug --interactive
refining-work-items "Version 2 settings" --type project-lite
```

## Steps

### 1. Detect the tool and the mode

Load pm-context. A key means **refine**; text means **create**; neither means ask.

### 2. Gather context

- **Refine:** `get_item(key)`, `list_comments(key)`, its project (`get_project`), its
  parent and children, and its blocking links.
- **Create:** take the idea, suggest a title (an imperative sentence that says what
  changes), and find the project. `search_items` for an existing ticket with the same
  intent before creating a second one.
- **Project brief:** `list_projects` to check the workstream does not already exist, and
  `list_initiatives` to see whether it belongs to one.

### 3. Pick the type and template

If `--type` is absent, infer it: a `bug` or `chore` label or wording means those
templates; an idea that is clearly several units of value, or a whole workstream, means
`project` (say so and confirm); otherwise `ticket`.

### 4. Check readiness

**Ticket:**
- [ ] Title says what changes
- [ ] "Why" names who notices the result
- [ ] "Done when" has three to six checkable lines, each naming its evidence
- [ ] A live-check line if a running system changes (merged is not done)
- [ ] In a project; blocking links set
- [ ] Small enough for one to three pull requests; otherwise propose a split

**Small ticket, bug, chore:** clear title, context, "Done when", priority, project.
A bug also needs reproduction steps and expected versus actual behaviour.

**Project brief:** the problem, what "finished" means for the workstream, a lead, the
first three to six tickets with their blocking links, and the initiative if any.

Report the gaps. In `--validate-only` mode, stop here.

### 5. Fill the template

- **Interactive:** ask for each missing section in turn.
- **Default:** fill what the existing text and comments support, and mark each section
  that needs a human answer as `{needs input: ...}` rather than inventing it.

### 6. Add codebase context (with `--analyze-codebase`)

For each technical area the ticket names, search the repository for the existing
implementation, the patterns to follow and the constraints, in parallel where the
platform allows. Summarise in a paragraph per area under "Context" and list the likely
files. See Platform notes for how to run parallel searches.

### 7. Write it back

- **Refine a ticket:** `update_item(key, {title, description})`. Keep the original text
  that still applies; do not discard someone's notes. Add a comment saying what changed.
- **Create a ticket:** `create_item({title, project, description, type, parent,
  blocked_by, blocks})`.
- **Project brief:** write it into the project description (`create_project` or update
  the existing one). Do not create the first tickets here; that is `breaking-down-work`.

Read the ticket back after writing and check the description landed.

### 8. Report

```
ABC-123 refined: "Replay the log on start"
- Project: Sync engine (initiative: Version 2)
- Done when: 4 lines, 1 live check
- Blocked by: ABC-101 (done)
- Needs input: none
<url>
```

## Next steps

- **A project brief:** run `breaking-down-work <project>` to create its tickets.
- **A ticket that turned out too big:** run `breaking-down-work <key>`.
- **A ready ticket:** it can be picked up, or run with `executing-work-items <key>`.

## Errors

| Problem | What to do |
|---------|------------|
| Ticket not found | Check the key and which team you can read |
| No project for a new ticket | Ask; never create a ticket outside a project |
| Not enough context | Use `--interactive`, or leave `{needs input}` markers |
| A near-duplicate exists | Show it and ask whether to refine that one instead |

## Platform notes

- [platforms/claude-code.md](platforms/claude-code.md)
- [platforms/hermes.md](platforms/hermes.md)

---
name: pm-context
description: One interface for project-management operations - tickets, projects, initiatives, blocking links, comments and project updates - with a Linear adapter and a markdown adapter. Auto-loads when a skill reads or writes work items. Detects the project's tool from its configuration and loads the matching adapter, so skills never call a tracker directly.
user-invocable: false
version: 2.0.0
metadata:
  hermes:
    category: productivity
    tags: [project-management, linear, markdown]
    related_skills: [linear-workflow]
---

# Project management context

The skills in this plugin are written against the operations in
[interface.md](interface.md), never against one tracker. An adapter maps each
operation onto a tool. Two adapters ship: Linear and markdown. The markdown adapter
exists partly to prove the interface holds without Linear.

The model is the one in the `linear-workflow` skill: initiatives group projects,
projects are workstreams or buckets, tickets are one to three units of value, and order
comes from blocking links. There are no time boxes in the interface.

## Detecting the tool

Check, in this order, and stop at the first hit:

1. **The project's instructions file** (for example `CLAUDE.md` or `AGENTS.md`):
   ```markdown
   ## Project Management
   pm_tool: linear
   pm_team: ABC
   ```
2. **The agent's settings**, under a `pm` key:
   ```json
   { "pm": { "tool": "linear", "team": "ABC" } }
   ```
3. **Files in the repository**: `BACKLOG.md` or `backlog/` means markdown.
4. **Default**: markdown, which needs no external tool.

## Adapters

| Tool | Adapter | How it is reached |
|------|---------|-------------------|
| Linear | [adapters/linear.md](adapters/linear.md) | Per platform, see Platform notes |
| Markdown | [adapters/markdown.md](adapters/markdown.md) | Files in the repository |

The Jira and GitHub adapters are archived in `docs/archive/pm-context-adapters/`.
Their rewrites against this interface are tracked separately and are not shipped.

## Terms

Use these words in every skill's output, whatever the tool:

| Term | Meaning |
|------|---------|
| ticket | One work item, one to three units of value |
| sub-issue | A ticket with a parent ticket |
| project | A workstream or a bucket of related tickets |
| initiative | A large effort that groups projects |
| blocking link | "A blocks B": B cannot finish before A |
| project update | A dated note on a project: a checkpoint, a reconciliation, a status |
| owner action | A ticket only the owner can do, labelled `owner-action` |

## How a skill uses it

1. Detect the tool as above and load its adapter.
2. Call operations from [interface.md](interface.md), for example
   `list_items({project: "Sync engine", status_type: "in_progress"})`.
3. Report in the terms above, not the tool's.

If an operation is not supported by the active adapter (the adapter says so), report
that the step was skipped and why. Do not fall back to calling the tool directly.

## Platform notes

How to reach Linear from each agent platform:

- [platforms/claude-code.md](platforms/claude-code.md)
- [platforms/hermes.md](platforms/hermes.md)

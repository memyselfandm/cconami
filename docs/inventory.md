# Repository inventory

CCC-132, part of the CCC-126 overhaul. Read from `main` on 2026-11-19. The inventory also covers open PR #7, whose files are not in `main` yet. Each shipped path has one decision:

- **keep**: stays, and may be moved into the plugin layout.
- **rewrite**: stays, but its content changes.
- **convert**: becomes a skill.
- **merge**: folded into another skill.
- **retire**: deleted.
- **move**: kept in the repository but not shipped, under `docs/archive/`.

The ticket that carries out each decision is in the last column. The target layout and the cross-platform rule are in the CCC-126 plan.

## Findings

1. **The Linear commands exist in three copies in this repository.** These are `.claude/commands/`, `apps/dot-claude/commands/` and, since CCC-125 (PR #4), the skills in `apps/dot-claude/skills/`. The two command directories have drifted:
   - `epic-breakdown`, `epic-prep`, `refine-epic`, `refine-epic-lite` and `sprint-execute` differ between them.
   - `sprint-plan`, `sprint-status`, `refine-feature`, `refine-issue`, `dependency-map` and `release-plan` are identical.
   - The agent copies in `.claude/agents/` and `apps/dot-claude/agents/` differ for `subagent-architect`, `notion-workspace-architect` and `slash-command-architect`.
2. **The copies installed on the owner's machine have drifted too.** `~/.claude/commands/linear/` holds 14 hand-copied commands. `sprint-review` and `linear-migrate` are in neither repository copy. `issue-execute` exists only in the `apps/` copy. `~/.claude/skills/linear-workflow/` is not in this repository at all.
3. **Several files are empty or point at nothing.** Three files are 0 bytes. `settings.base.json` registers eight `uv run .claude/hooks/*.py` hooks, and none of those scripts exist here. `CLAUDE.md` describes an `ai_docs/knowledge/` folder that does not exist.
4. **There are three packaging attempts.** `pacc.json` lists 13 commands and one agent. `converted_plugins/` holds one plugin. PR #7 adds `.claude-plugin/marketplace.json`, which is the direction kept.

## Commands

| Path | Decision | Replaced by | Ticket |
|---|---|---|---|
| `.claude/commands/linear/refine-{epic,epic-lite,feature,issue}.md`, `apps/dot-claude/commands/product/ops/linear/refine-*/` | retire | `refining-work-items` | CCC-134 |
| `.claude/commands/linear/{epic-prep,epic-breakdown}.md`, `apps/.../linear/{epic-prep,epic-breakdown}/` | retire | `breaking-down-work` | CCC-134 |
| `.claude/commands/dependency-map.md`, `apps/.../linear/dependency-map/` | retire | `analyzing-dependencies` | CCC-134 |
| `apps/.../linear/issue-execute/` | retire | `executing-work-items` | CCC-134 |
| `.claude/commands/linear/sprint-{plan,execute,status}.md`, `apps/.../linear/sprint-*/`, `apps/.../product/ops/sprint/` (with docs) | retire | `orchestrating-workstreams`, `reporting-workstream-status` | CCC-134 |
| `.claude/commands/release-plan.md`, `apps/.../linear/{release-plan,release-execute}/` | retire | The initiative model in `linear-workflow` | CCC-134 |
| `apps/.../linear/project-shuffle/` | retire | `shuffling-projects`, later merged into `reconciling-linear-projects` | CCC-134 |
| `.claude/commands/linear/tag-manager.md` | retire | Nothing. It managed checkpoint tags for the sprint flow | CCC-134 |
| `apps/.../linear/{LINEAR_COMMANDS,README}.md`, `apps/dot-claude/commands/COMMANDS_README.md` | retire | `README.md` plugin catalog | CCC-134 |
| `.claude/commands/feature-prioritization.md`, `.claude/commands/product-overview.md` | convert, then merge | New modes of `workshopping-prds`. Kept in `docs/archive/commands/` until then | CCC-134 |
| `apps/.../product/ops/prd-meeting/` (with docs) | retire | `workshopping-prds` | CCC-134 |
| `apps/.../uiux/ui_design/design_brainstorm/` | retire | `brainstorming-designs` | CCC-134 |
| `apps/.../eng/dev/subagent-build/` (with docs) | retire | `building-subagents` | CCC-134 |
| `apps/.../eng/dev/git_status.md` | retire | Built into Claude Code | CCC-134 |

`apps/...` stands for `apps/dot-claude/commands`.

Four of the replacements are not in this repository yet: `orchestrating-workstreams`, `reporting-workstream-status`, `reconciling-linear-projects` and `linear-workflow`. They arrive with CCC-127, CCC-133 and CCC-136 (see the last table).

## Skills (`apps/dot-claude/skills/`)

| Skill | Decision | Notes | Ticket |
|---|---|---|---|
| `refining-work-items` | rewrite | Remove the sprint and cycle language | CCC-127 |
| `breaking-down-work` | rewrite | Breaks work into tickets within a project, not into sprints | CCC-127 |
| `analyzing-dependencies` | rewrite | Remove the sprint planning framing | CCC-127 |
| `executing-work-items` | rewrite | Remove "outside a formal sprint". Add the checkpoint and review hand-offs | CCC-127 |
| `managing-sprints` (7 files) | retire | Sprint model | CCC-134 |
| `shuffling-projects` | merge | Into `reconciling-linear-projects` | CCC-127 |
| `pm-context` (interface + `linear`, `markdown` adapters) | rewrite | Against the project, ticket and initiative model | CCC-127 |
| `pm-context/adapters/{jira,github}.md` | move | Archived. Rewrites deferred by the owner | CCC-134; later CCC-138, CCC-139 |
| `workshopping-prds`, `brainstorming-designs`, `scraping-documentation` | keep | Already platform-neutral | CCC-133 |
| `building-skills`, `building-subagents` | keep, update | Add the cross-platform rule | CCC-135 |
| `ralph-config` (Ralph Orchestrator) | keep | Only the sprint wording in its examples changes | CCC-127 |
| `README.md` | rewrite | Becomes part of the plugin catalog | CCC-137 |
| `external/` (13 git submodules, `README.md`, `update-skills.sh`) | retire | URLs move to `docs/recommended-external.md`. Each upstream installs directly | CCC-134 |

## Subagents

| Path | Decision | Notes | Ticket |
|---|---|---|---|
| `apps/dot-claude/agents/{subagent-architect,context-engineering-subagent,notion-workspace-architect,frontend-designer,database-engineer,langgraph-engineer}/` | keep | Move to the `authoring` plugin | CCC-133 |
| `apps/dot-claude/agents/SUBAGENTS_README.md` | rewrite | Becomes part of the plugin catalog | CCC-137 |
| `apps/dot-claude/agents/slash-command-architect/`, `.claude/agents/slash-command-architect.md` | retire | Commands are no longer the unit. `building-skills` replaces it | CCC-134 |
| `.claude/agents/{subagent-architect,notion-workspace-architect}.md` | retire | Duplicates of the `apps/` copies. Both pairs have drifted, and the `apps/` copy is kept | CCC-134 |
| `.claude/agents/program-manager.md` | retire | Persona for sprint and release planning | CCC-134 |
| `.claude/agents/command-architect.md` | retire | 0 bytes | CCC-134 |

## Hooks and settings

| Path | Decision | Notes | Ticket |
|---|---|---|---|
| `apps/dot-claude/hooks/HOOKS_README.md` | retire | Describes hook scripts that are not in the repository | CCC-134 |
| `apps/dot-claude/settings/settings.base.json` | retire | Registers eight hooks that do not exist | CCC-134 |
| `apps/dot-claude/settings/settings.chronicle.json` | retire | 0 bytes | CCC-134 |
| `apps/dot-claude/settings/SETTINGS_README.md` | retire | Documents the two files above | CCC-134 |
| (new) guard hook as a rule table | add | Generalised from the homelab hook (LAB-602) | CCC-136 |

## Packaging, mods and the rest of the root

| Path | Decision | Notes | Ticket |
|---|---|---|---|
| `.claude-plugin/marketplace.json`, `apps/dot-claude/mods/{owner-inbox,peer-messages}/` (open PR #7, not yet in `main`) | keep | Mods move to `plugins/` | CCC-133 |
| `pacc.json` | retire | Replaced by the marketplace | CCC-134 |
| `converted_plugins/subagent-architect/` | retire | Earlier single-plugin attempt | CCC-134 |
| `apps/agent-app-wrapper/` (`README.md`, empty `init-agentic-layer.sh`) | retire | The script is 0 bytes | CCC-134 |
| `CCC-24_context_report.md` | move | Historical report | CCC-134 |
| `ai_docs/` (PRDs, research reports) | move | Historical. Not shipped | CCC-134 |
| `README.md`, `CLAUDE.md` | rewrite | For the plugin layout | CCC-137 |
| `.gitignore` | keep | — | — |
| Submodule configuration file | retire | Goes with the submodules | CCC-134 |
| `docs/inventory.md` | keep | This file | CCC-132 |

## Pieces that are not in this repository

| Location | Decision | Ticket |
|---|---|---|
| `~/.claude/skills/linear-workflow/` (owner's machine) | Copy in unchanged, then rewrite | CCC-133, CCC-127 |
| `~/.claude/commands/linear/` (owner's machine, 14 files) | The owner backs it up and removes it after installing the plugins (owner action) | CCC-137 |
| Homelab Linear skills: `reconciling-linear-projects`, and the `reporting-workstream-status` spec | Backport in general form after each homelab PR merges | CCC-127 |
| Homelab operating-model skills: `checkpointing-sessions`, `assigning-owner-actions`, `reviewing-pull-requests`, `orchestrating-workstreams`, and the multi-session protocol | Backport in general form after each homelab PR merges | CCC-136 |

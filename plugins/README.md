# Claude Code Skills

This directory contains Claude Code skills following the Agent Skills specification. Skills are tool-agnostic workflow definitions that work across different project management tools.

## Skill Catalog

### Project Management Context

| Skill | Description |
|-------|-------------|
| [pm-context](linear-workflow/skills/pm-context/) | **Background context skill** - Provides PM tool abstraction layer. Auto-loads when working with work items. Supports Linear and markdown backlogs. |

### Work Item Lifecycle

| Skill | Description |
|-------|-------------|
| [refining-work-items](linear-workflow/skills/refining-work-items/) | Refines epics, features, tasks into AI-ready specifications with templates |
| [breaking-down-work](linear-workflow/skills/breaking-down-work/) | Breaks down epics into features and tasks with parallel codebase analysis |
| [executing-work-items](linear-workflow/skills/executing-work-items/) | Executes specific items ad-hoc with dependency resolution |

### Analysis & Organization

| Skill | Description |
|-------|-------------|
| [analyzing-dependencies](linear-workflow/skills/analyzing-dependencies/) | Maps dependencies, finds blockers and critical paths |
| [shuffling-projects](linear-workflow/skills/shuffling-projects/) | Reorganizes work items between projects/sprints |

### Development Utilities

| Skill | Description |
|-------|-------------|
| [scraping-documentation](authoring/skills/scraping-documentation/) | Scrapes docs sites to organized markdown |
| [building-subagents](authoring/skills/building-subagents/) | Creates production-ready Claude Code subagents |

### Operating Model

How sessions work with each other and the owner. The `operating-model` plugin also
installs a command guard hook; see [operating-model/hooks/README.md](operating-model/hooks/README.md).

| Skill | Description |
|-------|-------------|
| [checkpointing-sessions](operating-model/skills/checkpointing-sessions/) | Saves a session's state to Linear before context is lost, and resumes from it |
| [assigning-owner-actions](operating-model/skills/assigning-owner-actions/) | Files each ask for the owner as its own labelled Linear issue and picks up the answer |
| [reviewing-pull-requests](operating-model/skills/reviewing-pull-requests/) | Reviews each pull request head in an isolated subagent and returns one verdict line |
| [orchestrating-workstreams](operating-model/skills/orchestrating-workstreams/) | Leads one Linear project to done on a persistent loop (Claude Code only) |
| [coordinating-sessions](operating-model/skills/coordinating-sessions/) | The multi-session protocol: Linear first, one peer-message shape, reserved items, subagent briefs |

### Product & Design

| Skill | Description |
|-------|-------------|
| [workshopping-prds](product/skills/workshopping-prds/) | Interactive PRD workshops with multi-phase workflow |
| [brainstorming-designs](product/skills/brainstorming-designs/) | Design ideation and exploration sessions |

## PM Tool Support

All skills use the `pm-context` abstraction layer, supporting:

| Tool | Adapter | CLI |
|------|---------|-----|
| Linear | [linear.md](linear-workflow/skills/pm-context/adapters/linear.md) | `linctl` |
| Markdown | [markdown.md](linear-workflow/skills/pm-context/adapters/markdown.md) | filesystem |

Configure in your project's CLAUDE.md:
```markdown
## Project Management
pm_tool: linear
pm_team: YourTeam
```

## Skill Structure

Each skill follows the Agent Skills specification:

```
skill-name/
├── SKILL.md           # Main skill file with frontmatter
├── *.md               # Supporting documentation (progressive disclosure)
├── templates/         # Template files
└── prompts/           # Agent prompt templates
```

### Frontmatter Fields

```yaml
---
name: skill-name                    # Lowercase, hyphens only
description: What it does...        # Third person, <1024 chars
user-invocable: true                # Can user invoke directly?
disable-model-invocation: true      # Prevent auto-invocation?
---
```

## Installation

These skills can be installed via Claude Code plugins:

```bash
# Install all skills
/plugin install cconami/skills

# Or install specific skills
/plugin install cconami/skills/refining-work-items
```

## Usage

Invoke skills with slash commands:

```bash
# Refine a work item
/refining-work-items CCC-123 --type epic

# Break down an epic
/breaking-down-work CCC-123

# Execute a work item
/executing-work-items CCC-123
```

## Development

### Adding a New Skill

1. Create directory: `skills/your-skill-name/`
2. Create `SKILL.md` with required frontmatter
3. Add supporting files for progressive disclosure
4. Test invocation and auto-discovery

### Skill Guidelines

- Use gerund naming (e.g., `refining-work-items` not `work-item-refiner`)
- Write descriptions in third person
- Keep SKILL.md under 500 lines
- Use progressive disclosure for large content
- Reference pm-context for PM operations

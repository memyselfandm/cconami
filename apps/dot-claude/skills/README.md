# Claude Code Skills

This directory contains Claude Code skills following the Agent Skills specification. Skills are tool-agnostic workflow definitions that work across different project management tools.

## Skill Catalog

### Project Management Context

| Skill | Description |
|-------|-------------|
| [pm-context](pm-context/) | **Background context skill** - Provides PM tool abstraction layer. Auto-loads when working with work items. Supports Linear, Jira, GitHub Projects, and markdown backlogs. |

### Work Item Lifecycle

| Skill | Description |
|-------|-------------|
| [refining-work-items](refining-work-items/) | Refines epics, features, tasks into AI-ready specifications with templates |
| [breaking-down-work](breaking-down-work/) | Breaks down epics into features and tasks with parallel codebase analysis |
| [executing-work-items](executing-work-items/) | Executes specific items ad-hoc with dependency resolution |

### Sprint Management

| Skill | Description |
|-------|-------------|
| [managing-sprints](managing-sprints/) | Complete sprint lifecycle: planning, execution, monitoring, review |

### Analysis & Organization

| Skill | Description |
|-------|-------------|
| [analyzing-dependencies](analyzing-dependencies/) | Maps dependencies, finds blockers and critical paths |
| [shuffling-projects](shuffling-projects/) | Reorganizes work items between projects/sprints |

### Development Utilities

| Skill | Description |
|-------|-------------|
| [scraping-documentation](scraping-documentation/) | Scrapes docs sites to organized markdown |
| [building-subagents](building-subagents/) | Creates production-ready Claude Code subagents |

### Product & Design

| Skill | Description |
|-------|-------------|
| [workshopping-prds](workshopping-prds/) | Interactive PRD workshops with multi-phase workflow |
| [brainstorming-designs](brainstorming-designs/) | Design ideation and exploration sessions |

## PM Tool Support

All skills use the `pm-context` abstraction layer, supporting:

| Tool | Adapter | CLI |
|------|---------|-----|
| Linear | [linear.md](pm-context/adapters/linear.md) | `linctl` |
| Jira | [jira.md](pm-context/adapters/jira.md) | `jira` |
| GitHub | [github.md](pm-context/adapters/github.md) | `gh` |
| Markdown | [markdown.md](pm-context/adapters/markdown.md) | filesystem |

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
/plugin install cconami/skills/managing-sprints
```

## Usage

Invoke skills with slash commands:

```bash
# Refine a work item
/refining-work-items CCC-123 --type epic

# Break down an epic
/breaking-down-work CCC-123

# Plan sprints
/managing-sprints plan CCC-123

# Execute a sprint
/managing-sprints execute CCC-123.S01
```

## Development

### Adding a New Skill

1. Create directory: `skills/your-skill-name/`
2. Create `SKILL.md` with required frontmatter
3. Add supporting files for progressive disclosure
4. Test invocation and auto-discovery

### Skill Guidelines

- Use gerund naming (e.g., `managing-sprints` not `sprint-manager`)
- Write descriptions in third person
- Keep SKILL.md under 500 lines
- Use progressive disclosure for large content
- Reference pm-context for PM operations

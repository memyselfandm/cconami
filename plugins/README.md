# Claude Code Skills

This directory contains Claude Code skills following the Agent Skills specification. Skills are tool-agnostic workflow definitions that work across different project management tools.

## Skill Catalog

### Project Management Context

| Skill | Description |
|-------|-------------|
| [linear-workflow](linear-workflow/skills/linear-workflow/) | **Background context skill** - The project, ticket and initiative model, and the rules for working in Linear. |
| [pm-context](linear-workflow/skills/pm-context/) | **Background context skill** - Provides PM tool abstraction layer. Auto-loads when working with work items. Supports Linear and markdown backlogs. |

### Work Item Lifecycle

| Skill | Description |
|-------|-------------|
| [refining-work-items](linear-workflow/skills/refining-work-items/) | Turns an idea into a ticket with a "Done when", or a project brief |
| [breaking-down-work](linear-workflow/skills/breaking-down-work/) | Splits a project or an oversized ticket into tickets with blocking links |
| [executing-work-items](linear-workflow/skills/executing-work-items/) | Implements named tickets with agents, one pull request per ticket |

### Analysis & Organization

| Skill | Description |
|-------|-------------|
| [analyzing-dependencies](linear-workflow/skills/analyzing-dependencies/) | Maps blocking links, finds blockers and the longest chain |
| [reconciling-linear-projects](linear-workflow/skills/reconciling-linear-projects/) | Audits a project's tickets against pull requests and the running system; moves leftovers and re-homes tickets |
| [reporting-workstream-status](linear-workflow/skills/reporting-workstream-status/) | Reports what is stuck, stale or colliding across projects |

### Development Utilities

| Skill | Description |
|-------|-------------|
| [scraping-documentation](authoring/skills/scraping-documentation/) | Scrapes docs sites to organized markdown |
| [building-subagents](authoring/skills/building-subagents/) | Creates production-ready Claude Code subagents |

### Product & Design

| Skill | Description |
|-------|-------------|
| [workshopping-prds](product/skills/workshopping-prds/) | Interactive PRD workshops with multi-phase workflow |
| [brainstorming-designs](product/skills/brainstorming-designs/) | Design ideation and exploration sessions |

## PM Tool Support

All skills use the `pm-context` abstraction layer, supporting:

| Tool | Adapter | CLI |
|------|---------|-----|
| Linear | [linear.md](linear-workflow/skills/pm-context/adapters/linear.md) | Linear MCP connector or `linctl` (per platform) |
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

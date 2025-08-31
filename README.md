# Claude Code Cheat Codes

This is my personal system of Claude Code enhancements that enable me to get the most out of the tool. 
It provides a structured approach to extending Claude Code's capabilities through hooks, custom commands, subagents, and settings configurations.



## Some Cool Things You'll Find Here (i.e. My Favorites)
### Linear Product Ops
Transform ideas into execution-ready Linear issues with AI-optimized templates:
- **Issue Refinement Suite** (`/refine-*` commands) - Dual-mode commands that refine existing issues OR create new ones from scratch
  - `/refine-epic` - Full PRD template for comprehensive epics
  - `/refine-epic-lite` - Quick 1-pager for MVPs and personal projects
  - `/refine-feature` - Right-sized features with automatic subtask generation
  - `/refine-issue` - Flexible refinement for tasks, bugs, and chores
- **Sprint Management** - Parallel AI agent execution for entire sprints
- **Epic Breakdown** - Automatically decompose epics into features and tasks

You'll need to tweak them to work with your Linear setup.



## Project Structure

```
cconami-dev/
├── ai_docs/                       # AI context and documentation
├── apps/
│   ├── agent-app-wrapper/         # "Agentic layer" initialization tools
│   │   ├── README.md
│   │   └── init-agentic-layer.sh
│   └── dot-claude/                # .claude directory templates
│       ├── agents/                # Subagent definitions
│       │   └── subagent-architect/
│       ├── commands/              # Custom slash commands
│       │   ├── eng/               # Engineering commands
│       │   │   ├── architecture/
│       │   │   ├── dev/
│       │   │   ├── scale/
│       │   │   └── security/
│       │   ├── product/           # Product management commands
│       │   │   ├── marketing/
│       │   │   ├── ops/           # Operational commands (Linear, sprint, etc.)
│       │   │   ├── research/
│       │   │   └── strategy/
│       │   └── uiux/              # UI/UX design commands
│       │       ├── ui_design/
│       │       ├── ui_systems/
│       │       └── ux_research/
│       ├── hooks/                 # Hook scripts
│       └── settings/              # Configuration templates
├── .claude/                       # Local Claude Code configuration (gitignored)
└── CLAUDE.md                      # Project-specific Claude instructions
```

## Key Features

- **Linear Issue Refinement Suite**: Transform ideas into AI-ready Linear issues with dual-mode commands
- **Custom Slash Commands**: 15+ commands organized by domain (engineering, product, UI/UX)
- **Subagents**: Specialized AI assistants for specific tasks
- **Hooks**: Event-driven automation for Claude Code lifecycle
- **Settings Repo**: Snippets for different use cases
- **Agentic Layer Wrapper**: Framework for AI-friendly project structure

## Commands

See [COMMANDS_README.md](./apps/dot-claude/commands/COMMANDS_README.md) for available custom slash commands and their documentation.

## Subagents

See [SUBAGENTS_README.md](./apps/dot-claude/agents/SUBAGENTS_README.md) for specialized AI subagents and their capabilities.

## Quick Start: Idea to Execution

```bash
# Create and refine an epic from an idea
/refine-epic --team "Your Team"

# Break it down into features and tasks
/epic-breakdown --epic CCC-123

# Refine individual features if needed
/refine-feature CCC-124

# Execute the sprint with AI agents
/sprint-execute sprint-2024-12
```

## Getting Started

1. Copy templates from `apps/dot-claude/` to your project or home folder's `.claude/` directory
2. Configure settings in `.claude/settings.json` based on templates in `apps/dot-claude/settings/`
3. Add custom commands to `.claude/commands` and agents to `.claude/agents` 

**Coming Soon!:** `pacc` cli [todo: link to pacc cli] support! I made a package manager for Claude Code, called Pacc. Pretty soon, this repo will be pacc-compatible. 

## What is Claude Code
claude-code [todo: link to cc homepage] is, to most people, an AI coding agent that lives in the terminal - and a damn good one IMO.
However, because of my obsession with agentic AI and because of the superb work of the Anthropic and Claude Code teams, I've come to see it for what it truly is: an extensible agentic AI platform. 

"Through Claude (code with a Max Plan), all things are possible."
- The Bib... wait...

## Credits
- IndieDevDan [todo: add a link to his youtube]: I was inspired to create this system by the Cracked AI Engineering Legend IndieDevDan. A few things here I took directly from him (the agentic wrapper), so I definitely want to give credit where credit is due. Check him out.
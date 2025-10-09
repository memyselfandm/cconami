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

### Domain-Organized Subagents

**Meta-Agents** (Claude Code Enhancement)
- **[Subagent Architect](./apps/dot-claude/agents/meta/claude-code/subagent-architect/)** - Builds Claude Code subagents using best practice patterns from Anthropic and others
- **[Slash Command Architect](./apps/dot-claude/agents/meta/claude-code/slash-command-architect/)** - Creates and reviews Claude Code slash commands using best practice patterns
- **[Context Engineering Subagent](./apps/dot-claude/agents/meta/claude-code/context-engineering-subagent/)** - Uses research-backed patterns for researching and compiling context (based on arxiv 2508.08322v1)

**Engineering Agents** (Technical Implementation)
- **[Engineering Agent](./apps/dot-claude/agents/eng/core/engineering-agent/)** - Full-stack development and architecture specialist
- **[LangGraph Engineer](./apps/dot-claude/agents/eng/ai/langgraph-engineer/)** - Multi-agent orchestration and LangGraph framework specialist
- **[Database Engineer](./apps/dot-claude/agents/eng/data/database-engineer/)** - Multi-database design and optimization specialist
- **[Claude Agent SDK Python](./apps/dot-claude/agents/eng/ai/claude-agent-sdk-python/)** - Python SDK development specialist

**Product Agents** (Product Management)
- **[Notion Workspace Architect](./apps/dot-claude/agents/product/ops/notion-workspace-architect/)** - Designs and implements Notion workspace structures

**UI/UX Agents** (Design & User Experience)
- **[Frontend Designer](./apps/dot-claude/agents/uiux/design/frontend-designer/)** - UI/UX implementation and design systems specialist


## Claude Code Extensions

| Type | Count | Folder | Description |
|------|-------|--------|-------------|
| [Commands](./apps/dot-claude/commands/COMMANDS_README.md) | 22 | `apps/dot-claude/commands/` | Custom slash commands organized by domain |
| [Subagents](./apps/dot-claude/agents/SUBAGENTS_README.md) | 10 | `apps/dot-claude/agents/` | Specialized AI agents organized by domain |
| [Hooks](./apps/dot-claude/hooks/) | Templates | `apps/dot-claude/hooks/` | Event-driven automation scripts |
| [Settings](./apps/dot-claude/settings/) | 2 configs | `apps/dot-claude/settings/` | Configuration templates and examples |

## Other Project Components

- **AI Documentation** (`ai_docs/`) - Context and knowledge for AI agents
- **Agentic Layer Wrapper** (`apps/agent-app-wrapper/`) - Project initialization tools
- **Project Instructions** (`CLAUDE.md`) - Project-specific Claude configuration
- **Package Config** (`pacc.json`) - Pacc package manager configuration

## Key Features

- **Linear Issue Refinement Suite**: Transform ideas into AI-ready Linear issues with dual-mode commands
- **Custom Slash Commands**: 22 commands organized by domain (engineering, product, UI/UX)
- **Specialized Subagents**: 10 domain-organized agents across 4 specialization areas (eng/, product/, uiux/, meta/)
- **Hooks System**: Event-driven automation for Claude Code lifecycle
- **Settings Templates**: Configuration examples for different use cases
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

**Coming Soon!:** [`pacc` cli](https://github.com/memyselfandm/pacc-cli) support! I made a package manager for Claude Code, called Pacc. You can *kinda* use this repo with `pacc` now, but soon full `pacc` support is coming.

## What is Claude Code
[claude-code](https://www.anthropic.com/claude-code) is, to most people, an AI coding agent that lives in the terminal - and a damn good one IMO.
However, because of my obsession with agentic AI and because of the superb work of the Anthropic and Claude Code teams, I've come to see it for what it truly is: an extensible agentic AI platform. 

"Through Claude (code with a Max Plan), all things are possible."
- The Bib... wait...

## Credits
- [IndieDevDan](https://www.youtube.com/@indydevdan): I was inspired to create this system by the Cracked AI Engineering Legend IndieDevDan. A few things here I took directly from him (e.g., the agentic wrapper idea) and some things are just inspired by his ideas, so I definitely want to give credit where credit is due. Check him out.
- [Context Engineering for Multi-Agent LLM Code Assistants](https://arxiv.org/html/2508.08322v1): My context engineering subagent was based on this paper. It's a solid bit of work. (2025, Muhammad Haseeb)
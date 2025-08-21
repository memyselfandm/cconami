# Claude Code Enhancements

This is my personal system of Claude Code enhancements inspired by IndieDevDan's work. It provides a structured approach to extending Claude Code's capabilities through hooks, custom commands, subagents, and settings configurations.

## Project Structure

```
cconami-dev/
├── ai_docs/                       # AI context and documentation
│   ├── knowledge/                 # Claude Code feature documentation
│   │   ├── claude-code-hooks-docs.md
│   │   ├── claude-code-settings-docs.md
│   │   ├── claude-code-slash-commands-docs.md
│   │   └── claude-code-subagents-docs.md
│   └── prds/                      # Product requirements and specs
│       ├── archive/               # Archived PRDs
│       └── needs-pm/              # Backlog items needing PM input
├── apps/
│   ├── agent-app-wrapper/         # Agentic layer initialization tools
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

- **Custom Slash Commands**: Organized by domain (engineering, product, UI/UX)
- **Subagents**: Specialized AI assistants for specific tasks
- **Hooks System**: Event-driven automation for Claude Code lifecycle
- **Settings Management**: Hierarchical configuration system
- **Agentic Layer Wrapper**: Framework for AI-friendly project structure

## Commands

See [COMMANDS_README.md](./apps/dot-claude/commands/COMMANDS_README.md) for available custom slash commands and their documentation.

## Getting Started

1. Copy templates from `apps/dot-claude/` to your project's `.claude/` directory
2. Configure settings in `.claude/settings.json` based on templates in `apps/dot-claude/settings/`
3. Add custom commands and agents as needed
4. Use the agentic layer wrapper for new projects

## Credits
- IndieDevDan: Much of this system is adapted or inspired by IDD's groundbreaking work on Claude Code enhancements
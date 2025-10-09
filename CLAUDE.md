# Claude Code Enhancements System

## Project Overview
This is a personal system of Claude Code enhancements inspired by IndieDevDan's work. It provides a structured approach to extending Claude Code's capabilities through hooks, custom commands, subagents, and settings configurations.

## Project Goals
- The goal of this project is to develop my personal enhancements to Claude Code

## Architecture Overview

### Core Components

1. **Hooks System** (`apps/dot-claude/hooks/`)
   - Event-driven automation for Claude Code lifecycle
   - Uses UV single-file scripts for dependency isolation
   - Configured in `.claude/settings.json`
   - Available hooks: PreToolUse, PostToolUse, Notification, Stop, SubagentStop, UserPromptSubmit, PreCompact, SessionStart

2. **Custom Commands** (`apps/dot-claude/commands/`)
   - Slash commands as Markdown files with YAML frontmatter
   - Example: `/git_status` command for git repository state
   - Supports bash command execution with `!` prefix
   - File references with `@` prefix

3. **Subagents** (`apps/dot-claude/agents/`)
   - Specialized AI assistants for specific tasks
   - Markdown files with YAML frontmatter defining name, description, and allowed tools
   - Can be project-level or user-level

4. **Settings Management** (`apps/dot-claude/settings/`)
   - JSON configuration files for permissions, hooks, and environment
   - Hierarchical precedence: Enterprise > CLI > Local > Project > User
   - Example configurations provided (settings.base.json)

5. **Agentic Layer Wrapper** (`apps/agent-app-wrapper/`)
   - Framework for wrapping applications with AI-friendly structure
   - Creates standard directories: `ai_docs/`, `apps/`, `.claude/`
   - Designed for maximum AI coding agent effectiveness

## Key Features

### UV Single-File Scripts Architecture
- All hooks implemented as standalone Python scripts
- Dependencies declared inline within each script
- No virtual environment management required
- Fast execution with UV's dependency resolution
- Complete isolation from main project dependencies

### Permission System
- Fine-grained control over tool access
- Allow/deny lists for specific commands and file patterns
- Configurable through settings.json
- Example permissions in settings.base.json

### Event-Driven Automation
- Hooks execute automatically at various Claude Code lifecycle points
- Can block operations (PreToolUse) or react to events (PostToolUse)
- Notification hooks for custom alerting
- Session management hooks for initialization and cleanup

## Project Structure

```
claudecode-dev/
├── README.md                    # Basic project overview
├── ai_docs/                     # AI context and documentation
│   ├── knowledge/               # Claude Code feature documentation
│   │   ├── claude-code-hooks-docs.md
│   │   ├── claude-code-settings-docs.md
│   │   ├── claude-code-slash-commands-docs.md
│   │   └── claude-code-subagents-docs.md
│   └── prds/                    # Product requirements (empty)
└── apps/
    ├── agent-app-wrapper/       # Agentic layer initialization
    │   ├── README.md
    │   └── init-agentic-layer.sh
    └── dot-claude/              # .claude directory templates
        ├── agents/              # Subagent definitions
        ├── commands/            # Custom slash commands
        │   └── git_status.md
        ├── hooks/               # Hook scripts
        │   └── HOOKS_README.md
        └── settings/            # Configuration templates
            ├── SETTINGS_README.md
            ├── settings.base.json
            └── settings.chronicle.json

```

## Usage Instructions

### Setting Up Hooks
1. Copy desired settings from `apps/dot-claude/settings/` to your project's `.claude/settings.json`
2. Implement hook scripts in `.claude/hooks/` using UV single-file script format
3. Configure hook matchers and commands in settings.json

### Creating Custom Commands
1. Create Markdown files in `.claude/commands/` or `~/.claude/commands/`
2. Add YAML frontmatter with allowed-tools, description, argument-hint
3. Use `!` for bash commands and `@` for file references
4. Access with `/command-name` in Claude Code

### Developing Subagents
1. Create Markdown files in `.claude/agents/` or `~/.claude/agents/`
2. Define name, description, and tools in YAML frontmatter
3. Write detailed system prompts for specialized behavior
4. Claude will automatically delegate appropriate tasks

### Using the Agentic Layer
1. Run the init-agentic-layer.sh script in your project
2. Populate `ai_docs/knowledge/` with relevant documentation
3. Add PRDs and specs to `ai_docs/prds/`
4. Place application code in `apps/`

## Development Guidelines

### Claude Code Documentation
- Local markdown copies of Claude Code documentation can be referenced at @~/.claude/context/docs/claude-code/

### Hook Development
- Keep hooks focused and fast-executing
- Use UV's inline dependency declarations
- Handle errors gracefully to avoid blocking Claude Code
- Test hooks thoroughly before deployment

### Command Best Practices
- Use @slash-command-architect when creating, reviewing, or improving Clade Code custom commands (aka slash-commands).
- Make commands reusable and parameterized with $ARGUMENTS
- Include clear descriptions for discoverability
- Limit tool access to what's necessary
- Use bash execution for dynamic context

### Subagent Design
- Use @subagent-architect when creating, reviewing, or improving Claude Code subagents.
- Create specialized agents for distinct domains
- Write comprehensive system prompts
- Grant minimal necessary tools
- Use proactive language in descriptions

## Security Considerations
- Review all hook implementations before use
- Limit tool permissions appropriately
- Be cautious with bash command execution
- Use deny lists to protect sensitive files

## Future Enhancements
- Framework for hook script organization by type
- Standard PRD format for ai_docs
- Task management integration for requirements
- Shell script support in hook system
- Automated safety checks in init script
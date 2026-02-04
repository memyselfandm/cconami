# Skill Build Command - Documentation Index

## Overview

The `/skill-build` command creates production-ready skills for Claude Code and/or the AgentSkills.io format through a 3-phase Research-Draft-Refine process.

> **Note**: Claude Code has unified slash commands and skills. `.claude/skills/<name>/SKILL.md` is the modern standard. Both formats use the [Agent Skills](https://agentskills.io) open standard, with Claude Code adding extensions for invocation control, subagent execution, and hooks.

## Documentation

| Document | Description |
|----------|-------------|
| [Quick Reference](skill-build-quick-reference.md) | Common patterns, format comparison, flags |
| [Format Reference](skill-build-format-reference.md) | Complete spec for Claude Code skills and AgentSkills.io format |
| [Usage Guide](skill-build-usage-guide.md) | Detailed usage, invocation control, troubleshooting |

## Command Location

```
apps/dot-claude/commands/eng/dev/skill-build/
├── skill-build.md                           # Main command file
└── docs/
    ├── skill-build-documentation-index.md   # This file
    ├── skill-build-quick-reference.md       # Quick patterns
    ├── skill-build-format-reference.md      # Format specifications
    └── skill-build-usage-guide.md           # Detailed usage
```

## Key Concepts

- **Skills = Commands**: Claude Code unified them. `.claude/skills/` is the modern path.
- **Two formats**: Claude Code skills (with extensions) and AgentSkills.io (portable).
- **Invocation control**: `disable-model-invocation`, `user-invocable`, `context: fork`.
- **3-phase process**: Research → Draft → Refine using subagent delegation.

# Skill Build - Quick Reference

## Common Patterns

### Create a simple Claude Code command
```bash
/skill-build "Git commit helper that follows conventional commits"
```

### Create an AgentSkills.io skill
```bash
/skill-build "CSV data analysis and visualization" --format agentskills
```

### Create both formats
```bash
/skill-build "API documentation generator" --format both
```

### With reference implementation
```bash
/skill-build "Terraform module scaffolding" \
  --context https://registry.terraform.io/docs \
  --depth deep
```

### Multiple skills at once
```bash
/skill-build "lint-fix: auto-fix linting" "test-runner: smart tests" \
  --depth normal,deep
```

### Preview without creating
```bash
/skill-build "database migration helper" --dry-run
```

## Format Comparison

| Aspect | Claude Code | AgentSkills.io |
|--------|-------------|----------------|
| File | `command-name.md` | `SKILL.md` in directory |
| Frontmatter | `allowed-tools`, `description`, `argument-hint` | `name`, `description`, optional fields |
| Body | Instructions with `$ARGUMENTS`, `!`, `@` | Markdown instructions, any structure |
| Extras | `docs/` subdirectory | `scripts/`, `references/`, `assets/` |
| Discovery | Via `/help` in Claude Code | Agent-specific loading |
| Portability | Claude Code only | Cross-agent compatible |

## Phase Overview

```
Phase 1: RESEARCH (context-engineering-subagent)
    └── Produces research report with domain patterns

Phase 2: DRAFT (slash-command-architect)
    └── Produces initial skill implementation

Phase 3: REFINE (slash-command-architect in review mode)
    └── Polishes for production deployment
```

## Output Locations

| Format | Location |
|--------|----------|
| Claude Code | `apps/dot-claude/commands/{namespace}/{name}/{name}.md` |
| AgentSkills.io | `apps/dot-claude/skills/{name}/SKILL.md` |

## Flags

| Flag | Default | Values | Purpose |
|------|---------|--------|---------|
| `--format` | `claude` | `claude`, `agentskills`, `both` | Output format |
| `--depth` | `normal` | `light`, `normal`, `deep` | Research depth |
| `--context` | none | URL(s) | Reference implementation |
| `--dry-run` | false | flag | Preview execution plan |

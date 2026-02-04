# Skill Build - Quick Reference

## Common Patterns

### Create a Claude Code skill
```bash
/skill-build "Git commit helper that follows conventional commits"
```

### Create a portable AgentSkills.io skill
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

| Aspect | Claude Code Skill | AgentSkills.io |
|--------|-------------------|----------------|
| Location | `.claude/skills/<name>/SKILL.md` | Any directory with `SKILL.md` |
| Frontmatter | name (opt), description (rec), + extensions | name (req), description (req) |
| Extensions | invocation control, subagent exec, hooks | None (portable) |
| Body syntax | `$ARGUMENTS`, `$N`, `!`cmd`, `${CLAUDE_SESSION_ID}` | Plain markdown |
| Supporting files | Any structure | `scripts/`, `references/`, `assets/` |
| Discovery | `/help` + Claude auto-loads | Agent-specific |
| Portability | Claude Code only | Cross-agent |

## Phase Overview

```
Phase 1: RESEARCH (context-engineering-subagent)
    └── Produces research report with domain patterns

Phase 2: DRAFT (slash-command-architect)
    └── Produces initial skill implementation

Phase 3: REFINE (slash-command-architect in review mode)
    └── Polishes for production deployment
```

## Output Location

All skills go to: `apps/dot-claude/skills/<name>/SKILL.md`

Deploy by copying to:
- Personal: `~/.claude/skills/<name>/`
- Project: `.claude/skills/<name>/`

## Invocation Control Quick Reference

| Behavior | Frontmatter |
|----------|-------------|
| User + Claude can invoke (default) | (no special fields) |
| User only (side-effect skills) | `disable-model-invocation: true` |
| Claude only (background knowledge) | `user-invocable: false` |
| Run in isolation | `context: fork` + `agent: Explore` |

## Flags

| Flag | Default | Values | Purpose |
|------|---------|--------|---------|
| `--format` | `claude` | `claude`, `agentskills`, `both` | Output format |
| `--depth` | `normal` | `light`, `normal`, `deep` | Research depth |
| `--context` | none | URL(s) | Reference implementation |
| `--dry-run` | false | flag | Preview execution plan |

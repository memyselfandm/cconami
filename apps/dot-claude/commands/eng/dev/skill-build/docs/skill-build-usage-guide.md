# Skill Build - Usage Guide

## Overview

The `/skill-build` command creates production-ready skills through a 3-phase Research-Draft-Refine process. It supports two output formats and can generate both simultaneously.

> **Note**: Claude Code has unified skills and slash commands. `.claude/skills/<name>/SKILL.md` is the current standard. Legacy `.claude/commands/` files still work but skills offer additional features like invocation control, subagent execution, and supporting file directories.

## Choosing a Format

### Claude Code Format (`--format claude`)
Use when:
- The skill will be used within Claude Code sessions
- You need Claude Code extensions (invocation control, `context: fork`, hooks)
- You want Claude to auto-discover and load the skill when relevant
- You need dynamic context injection (`!`command`` syntax)
- You want positional argument access (`$0`, `$1`, `$ARGUMENTS[N]`)

### AgentSkills.io Format (`--format agentskills`)
Use when:
- The skill should work across multiple AI agents (not just Claude Code)
- You want to publish or share the skill broadly
- You need strict format validation (`skills-ref validate`)

### Both Formats (`--format both`)
Use when:
- Maximum compatibility is important
- The skill's core logic works in both contexts

## Skill Content Types

When designing a skill, consider which type of content it provides:

### Reference Content (Knowledge)
Conventions, patterns, style guides, domain knowledge that Claude applies to your current work. Runs inline in the main conversation.

```yaml
---
name: api-conventions
description: API design patterns for this codebase. Use when writing or reviewing API endpoints.
---

When writing API endpoints:
- Use RESTful naming conventions
- Return consistent error formats
- Include request validation
```

### Task Content (Actions)
Step-by-step instructions for specific actions like deployments, commits, or code generation. Often paired with `disable-model-invocation: true`.

```yaml
---
name: deploy
description: Deploy the application to production
disable-model-invocation: true
---

Deploy $ARGUMENTS to production:
1. Run the test suite
2. Build the application
3. Push to the deployment target
```

## Invocation Control

One of the most important design decisions for Claude Code skills:

### Default (Both Can Invoke)
Most skills. Both you and Claude can trigger them.

### User-Only (`disable-model-invocation: true`)
For skills with side effects. Claude cannot auto-trigger these.
- Deploy workflows
- Commit/push operations
- Sending messages
- Destructive operations

### Model-Only (`user-invocable: false`)
For background knowledge that isn't actionable as a command.
- Legacy system context
- Domain conventions
- Architectural decisions

### Isolated Execution (`context: fork`)
For skills that should run in their own context window.
- Long research tasks
- Heavy processing
- Tasks that produce verbose output

Choose an agent type with the `agent` field:
- `Explore`: Read-only, fast (Haiku)
- `Plan`: Read-only, inherits model
- `general-purpose`: All tools

## Research Depth Guide

### Light Depth
- **Sources**: 2-3 (official docs only)
- **Best for**: Well-understood domains, simple utility skills

### Normal Depth (Default)
- **Sources**: 5 (docs + examples + community)
- **Best for**: Standard production skills

### Deep Depth
- **Sources**: 8-10 (comprehensive analysis)
- **Best for**: Complex domains, safety-critical skills

## Using Reference Contexts

Reference contexts tell the research phase to focus on an existing implementation:

```bash
# Adapt an existing tool's pattern
/skill-build "terraform plan reviewer" \
  --context https://github.com/terraform-linters/tflint

# Reference official documentation
/skill-build "docker compose validator" \
  --context https://docs.docker.com/compose/
```

When a reference is provided:
- 70-80% of research focuses on analyzing the reference
- 20-30% covers alternatives and validation

## Multi-Skill Builds

Build multiple skills concurrently:

```bash
# Same depth for all
/skill-build "lint-fix: auto-fix linting" "test-run: smart test execution" \
  --depth deep

# Different depths per skill
/skill-build "simple-util: quick helper" "complex-tool: advanced analyzer" \
  --depth light,deep

# Different references per skill
/skill-build "tool-a" "tool-b" "tool-c" \
  --context https://ref-a.com,,https://ref-c.com
```

## Spec Files

For complex skill specifications:

```bash
/skill-build @specs/my-skill-spec.md
```

### Spec File Format
```markdown
# Skill Name

## Purpose
What the skill does and why it exists.

## Target Users
Who will use this skill and in what context.

## Key Features
- Feature 1: Description
- Feature 2: Description

## Workflow
1. Step one
2. Step two

## Input/Output Examples
Input: "example input"
Output: "expected output"

## Invocation Preference
- Should Claude auto-invoke? (yes/no)
- Should it run in isolation? (yes/no)
```

## Post-Build Checklist

After the skill is generated:

1. **Review the output** - Read all generated files
2. **Check invocation control** - Is `disable-model-invocation` set for side-effect skills?
3. **Test with representative inputs** - Try the skill with real scenarios
4. **Check tool permissions** - Are they truly minimal?
5. **Validate description** - Does it include trigger keywords for auto-discovery?
6. **Deploy**:
   - Personal: Copy to `~/.claude/skills/<name>/`
   - Project: Copy to `.claude/skills/<name>/`
   - AgentSkills.io: Run `skills-ref validate ./skill-name`
7. **Test discovery** - Ask Claude "What skills are available?" to verify it appears

## Troubleshooting

### Skill not triggering
- Check the description includes keywords users would naturally say
- Verify the skill appears via "What skills are available?"
- Try invoking directly with `/skill-name`

### Skill triggers too often
- Make the description more specific
- Add `disable-model-invocation: true` for manual-only invocation

### Claude doesn't see all skills
- Skill descriptions may exceed the character budget (default 15,000 chars)
- Run `/context` to check for warnings about excluded skills
- Set `SLASH_COMMAND_TOOL_CHAR_BUDGET` env var to increase limit

### `context: fork` skill returns nothing useful
- Ensure the skill has actionable task instructions, not just guidelines
- Guidelines-only skills should NOT use `context: fork`

### Supporting files not loading
- Reference them from SKILL.md with relative paths
- Keep references one level deep (no nested chains)

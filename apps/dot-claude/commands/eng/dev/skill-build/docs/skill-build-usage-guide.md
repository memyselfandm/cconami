# Skill Build - Usage Guide

## Overview

The `/skill-build` command creates production-ready skills through a systematic 3-phase process that ensures quality and completeness. It supports two output formats and can generate both simultaneously.

## Choosing a Format

### Claude Code Format (`--format claude`)
Use when:
- The skill will be used exclusively within Claude Code sessions
- You need Claude Code-specific features (`$ARGUMENTS`, `!` bash, `@` file refs)
- The skill involves interactive workflows with the user
- You want the skill accessible via `/skill-name` in Claude Code

### AgentSkills.io Format (`--format agentskills`)
Use when:
- The skill should be portable across different AI agents
- You want to use progressive disclosure with separate reference files
- The skill includes executable utility scripts
- You plan to share or publish the skill

### Both Formats (`--format both`)
Use when:
- You want maximum compatibility
- The skill's core logic works in both contexts
- You're developing for a mixed agent environment

## Research Depth Guide

### Light Depth
- **Sources**: 2-3 (official docs only)
- **Best for**: Well-understood domains, simple utility commands
- **Example**: `/skill-build "git branch cleanup" --depth light`

### Normal Depth (Default)
- **Sources**: 5 (docs + examples + community)
- **Best for**: Standard production skills, most use cases
- **Example**: `/skill-build "API testing with curl"`

### Deep Depth
- **Sources**: 8-10 (comprehensive analysis)
- **Best for**: Complex domains, safety-critical skills, novel implementations
- **Example**: `/skill-build "kubernetes rollback orchestrator" --depth deep`

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
- The draft phase inherits patterns from the reference

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
# (empty between commas means no reference for tool-b)
```

## Spec Files

For complex skill specifications, use a markdown file:

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
3. Step three

## Input/Output Examples
Input: "example input"
Output: "expected output"

## Constraints
- Must handle X
- Cannot do Y
- Should support Z
```

## Understanding the 3-Phase Process

### Phase 1: Research
A context-engineering-subagent researches:
- Similar existing commands/skills
- Domain knowledge for the skill's purpose
- Best practices for interaction models
- Tool permissions and security considerations
- Progressive disclosure opportunities
- Error handling patterns

### Phase 2: Draft
A slash-command-architect creates the initial implementation using:
- The original specification
- The research report from Phase 1
- Format-specific best practices

### Phase 3: Refine
A slash-command-architect in review mode polishes:
- Standards compliance
- Production readiness
- Discovery trigger optimization
- Tool permission minimization
- Documentation completeness
- Token budget adherence

## Post-Build Checklist

After the skill is generated:

1. **Review the output** - Read through all generated files
2. **Test with representative inputs** - Try the skill with real-world scenarios
3. **Check tool permissions** - Ensure they're truly minimal
4. **Validate descriptions** - Confirm they enable proper discovery
5. **Deploy**:
   - Claude Code: Copy to `.claude/commands/` (or symlink)
   - AgentSkills.io: Run `skills-ref validate ./skill-name`
6. **Iterate** - Refine based on real usage patterns

## Troubleshooting

### Skill not discovered
- Check that the description includes relevant keywords
- Verify the file is in the correct location
- For Claude Code: ensure the file has `.md` extension

### Tool permissions too broad
- Replace `Bash` with specific patterns: `Bash(git:*)`
- Remove tools not actually needed by the instructions
- Review each tool grant against actual usage

### Skill too large
- Move detailed content to reference files
- Use progressive disclosure patterns
- Keep main file under 500 lines

### Research phase returns thin results
- Increase depth: `--depth deep`
- Provide a reference context: `--context <url>`
- Use more specific skill descriptions

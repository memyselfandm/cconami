---
name: skill-building
description: Build production-ready Claude Code skills through a structured Research-Draft-Refine process. Use when creating new skills, converting slash commands to skills, or generating AgentSkills.io-compatible skills from specifications.
argument-hint: <description or @spec-file> [--format claude|agentskills|both] [--depth light|normal|deep]
disable-model-invocation: true
allowed-tools: Task, Read, Write, MultiEdit, Bash(mkdir:*), Glob, Grep, WebFetch
---

# Skill Building

Build production-ready skills through a 3-phase process: Research, Draft, Refine.

## Supported Output Formats

- **Claude Code skills** (`.claude/skills/<name>/SKILL.md`) - current standard with invocation control, subagent execution, hooks
- **AgentSkills.io skills** - portable cross-agent format following the open standard

## Input

- `$ARGUMENTS` - skill specification: natural language description, `@filepath` to a spec file, or `name: description` format
- `--format` - output format: `claude` (default), `agentskills`, or `both`
- `--depth` - research depth: `light` (2-3 sources), `normal` (5 sources, default), `deep` (8-10 sources)
- `--dry-run` - preview the execution plan without creating files

Multiple skills can be specified separated by spaces. Use comma-separated `--depth` values for per-skill depth.

## Process Overview

1. Parse input and configure
2. Phase 1: Research (context-engineering-subagent)
3. Phase 2: Draft (engineering-agent)
4. Phase 3: Refine and validate
5. Write files and summarize

## Step 1: Parse Input and Configure

Determine what skills to build and how.

**Parse specifications**:
- If input starts with `@`, read the referenced file as the spec
- If input contains `name: description`, split on first colon
- Otherwise, generate a kebab-case name from the description

**Parse flags**:
- Extract `--format`, `--depth`, `--dry-run` from arguments
- Default format: `claude`
- Default depth: `normal`

**Dry run**: If `--dry-run`, print the execution plan (skill names, formats, depths, output paths) and stop.

**Confirm with user**: Present the plan and ask for approval before proceeding. Show:
- Skill name(s) and description(s)
- Output format(s) and location(s)
- Research depth

**Wait for explicit user confirmation before continuing.**

## Step 2: Phase 1 - Research

Deploy one `context-engineering-subagent` per skill specification, concurrently.

Each research agent receives:
- The skill's purpose and description
- The target format(s)
- The research depth setting

Research should cover:
- Similar existing skills and their patterns
- Domain knowledge needed for the skill's purpose
- Appropriate invocation model (who triggers it, does it need isolation?)
- Tool permissions needed (minimal and specific)
- Whether supporting files would help (progressive disclosure)
- Error handling patterns for the domain

Launch all research agents in a single response for concurrent execution.

Collect results before proceeding to Phase 2.

## Step 3: Phase 2 - Draft

Deploy one `engineering-agent` per skill and format combination, concurrently.

Each drafting agent receives the research report and must produce a complete skill following the format specification. Reference [format-spec.md](references/format-spec.md) for the complete format requirements for both Claude Code and AgentSkills.io skills.

**Critical drafting rules**:
- SKILL.md must be under 500 lines
- Description must state WHAT the skill does AND WHEN to use it
- Description must include trigger keywords for auto-discovery
- Tool permissions must be specific (`Bash(git:*)` not `Bash`)
- Supporting files referenced from SKILL.md with relative paths
- No secrets, credentials, or time-sensitive information
- Professional language (no slang in generated content)

**Invocation control decision**:
- Side-effect skills (deploy, commit, send): `disable-model-invocation: true`
- Background knowledge (conventions, patterns): `user-invocable: false`
- Isolated/heavy tasks: `context: fork` with appropriate `agent`
- Most skills: default (both user and Claude can invoke)

Launch all drafting agents in a single response for concurrent execution.

Collect results before proceeding to Phase 3.

## Step 4: Phase 3 - Refine and Validate

Review each drafted skill against the quality checklist. Reference [quality-checklist.md](references/quality-checklist.md) for the complete validation criteria.

**Core validation**:
- [ ] SKILL.md under 500 lines
- [ ] Frontmatter is correct for target format
- [ ] Description covers what AND when, with trigger keywords
- [ ] Tool permissions are minimal and specific
- [ ] Invocation control matches the skill's behavior
- [ ] Supporting files are referenced from SKILL.md
- [ ] No security issues (secrets, injection, etc.)

**Format-specific validation**:

For Claude Code skills:
- [ ] `$ARGUMENTS` / `$N` used correctly if accepting input
- [ ] `!`command\` used for preprocessing only (not Claude-executed)
- [ ] `context: fork` only used with actionable task instructions
- [ ] All frontmatter fields are valid per the spec

For AgentSkills.io skills:
- [ ] `name` is present, lowercase, kebab-case, max 64 chars, no `--`, no leading/trailing `-`
- [ ] `description` is present, max 1024 chars
- [ ] `allowed-tools` is space-delimited (not comma-separated)
- [ ] Body under 5000 tokens recommended

Fix any issues found during validation.

## Step 5: Write Files and Summarize

**Create the skill directory**:

```
apps/dot-claude/skills/<skill-name>/
├── SKILL.md
├── [supporting files as needed]
```

**Write all files** using the Write tool.

**Validate the written files**:
- Read back SKILL.md and verify frontmatter parses correctly
- Confirm line count is under 500
- Verify all referenced supporting files exist

**Present summary to user**:

```
## Skill Build Summary

| Skill | Format | Location | Invocation |
|-------|--------|----------|------------|
| name  | format | path     | mode       |

### Files Created
- [list all files with paths]

### Next Steps
- Review generated skill(s)
- Test with representative inputs
- Deploy to ~/.claude/skills/ (personal) or .claude/skills/ (project)
```

## Error Handling

- **Research fails**: Continue with general best practices, note limited context
- **Draft fails**: Retry once with simplified prompt; if still fails, report and skip
- **Validation fails**: Fix issues in-place; if unfixable, report to user
- **Partial success**: Report which skills succeeded and which failed

## Additional Resources

- For complete format specifications, see [references/format-spec.md](references/format-spec.md)
- For the quality validation checklist, see [references/quality-checklist.md](references/quality-checklist.md)
- For example skill structures, see [examples/](examples/)

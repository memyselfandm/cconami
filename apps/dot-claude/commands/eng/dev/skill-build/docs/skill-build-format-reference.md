# Skill Build - Format Reference

> Claude Code skills follow the [Agent Skills](https://agentskills.io) open standard with Claude Code extensions. Custom slash commands have been merged into skills. `.claude/commands/` files still work, but `.claude/skills/<name>/SKILL.md` is the modern standard.

## Claude Code Skill Format (Current Standard)

### Directory Structure
```
skill-name/
├── SKILL.md              # Main instructions (required)
├── template.md           # Optional: template for Claude to fill in
├── examples/
│   └── sample.md         # Optional: example output
├── scripts/
│   └── helper.py         # Optional: executable scripts
└── references/
    └── detailed-guide.md # Optional: detailed docs
```

### Where Skills Live

| Location | Path | Applies to | Priority |
|----------|------|------------|----------|
| Enterprise | Managed settings | All users in org | Highest |
| Personal | `~/.claude/skills/<name>/SKILL.md` | All your projects | High |
| Project | `.claude/skills/<name>/SKILL.md` | This project only | Medium |
| Plugin | `<plugin>/skills/<name>/SKILL.md` | Where plugin enabled | Lowest |

Skills sharing the same name: higher-priority locations win. Plugin skills use `plugin-name:skill-name` namespace (no conflicts). If a skill and a legacy command (`.claude/commands/`) share the same name, the skill takes precedence.

Monorepo support: Claude Code auto-discovers skills from nested `.claude/skills/` directories (e.g., `packages/frontend/.claude/skills/`).

### YAML Frontmatter

```yaml
---
name: my-skill
description: What this skill does and when to use it
argument-hint: [issue-number]
disable-model-invocation: true
user-invocable: true
allowed-tools: Read, Grep, Glob
model: sonnet
context: fork
agent: Explore
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/validate.sh"
---
```

#### All Frontmatter Fields

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `name` | No | String | Display name. If omitted, uses directory name. Lowercase letters, numbers, hyphens only. Max 64 chars. |
| `description` | Recommended | String | What it does AND when to use it. Claude uses this for auto-discovery. If omitted, uses first paragraph of content. |
| `argument-hint` | No | String | Hint shown during autocomplete. E.g., `[issue-number]`, `[filename] [format]` |
| `disable-model-invocation` | No | Boolean | `true` = only user can invoke (via `/name`). Claude cannot auto-load. Default: `false` |
| `user-invocable` | No | Boolean | `false` = hidden from `/` menu. Claude can still auto-load. Default: `true` |
| `allowed-tools` | No | String | Tools Claude can use without permission when skill is active |
| `model` | No | String | Model alias (`sonnet`, `opus`, `haiku`) or specific model ID |
| `context` | No | String | Set to `fork` to run in isolated subagent context |
| `agent` | No | String | Subagent type for `context: fork`. Built-in: `Explore`, `Plan`, `general-purpose`. Or custom subagent name. |
| `hooks` | No | Object | Lifecycle hooks scoped to this skill (PreToolUse, PostToolUse, Stop) |

#### Invocation Control Matrix

| Frontmatter | User can invoke | Claude can invoke | Context loading |
|-------------|-----------------|-------------------|-----------------|
| (default) | Yes | Yes | Description always in context; full skill loads on invoke |
| `disable-model-invocation: true` | Yes | No | Description NOT in context; full skill loads on user invoke |
| `user-invocable: false` | No | Yes | Description always in context; full skill loads on invoke |

### String Substitutions

| Variable | Description |
|----------|-------------|
| `$ARGUMENTS` | All arguments passed when invoking |
| `$ARGUMENTS[N]` | Specific argument by 0-based index (e.g., `$ARGUMENTS[0]`) |
| `$N` | Shorthand for `$ARGUMENTS[N]` (e.g., `$0`, `$1`) |
| `${CLAUDE_SESSION_ID}` | Current session ID |

### Dynamic Context Injection (`!` syntax)

Shell commands prefixed with `!` run BEFORE Claude sees the content. Output replaces the placeholder:

```yaml
---
name: pr-summary
description: Summarize changes in a pull request
context: fork
agent: Explore
allowed-tools: Bash(gh *)
---

## Pull request context
- PR diff: !`gh pr diff`
- PR comments: !`gh pr view --comments`
- Changed files: !`gh pr diff --name-only`

## Your task
Summarize this pull request...
```

This is preprocessing - Claude only sees the final rendered output.

### Subagent Execution (`context: fork`)

Add `context: fork` for skills that should run in isolation. The skill content becomes the subagent's task prompt.

```yaml
---
name: deep-research
description: Research a topic thoroughly
context: fork
agent: Explore
---

Research $ARGUMENTS thoroughly:
1. Find relevant files using Glob and Grep
2. Read and analyze the code
3. Summarize findings with specific file references
```

The `agent` field determines the execution environment:
- `Explore`: Read-only, fast (Haiku model)
- `Plan`: Read-only, inherits model
- `general-purpose`: All tools, inherits model
- Any custom subagent name from `.claude/agents/`

**Important**: `context: fork` only makes sense for skills with explicit task instructions. Guidelines-only skills won't produce useful output in a fork.

---

## AgentSkills.io Portable Format

The open standard without Claude Code extensions.

### Directory Structure
```
skill-name/
├── SKILL.md              # Required: instructions + metadata
├── scripts/              # Optional: executable code
├── references/           # Optional: detailed documentation
└── assets/               # Optional: templates, schemas, data files
```

### SKILL.md Frontmatter

```yaml
---
name: pdf-processing
description: Extract text and tables from PDF files, fill forms, merge documents. Use when working with PDF documents.
license: Apache-2.0
compatibility: Requires python3, poppler-utils
metadata:
  author: example-org
  version: "1.0"
allowed-tools: Bash(python:*) Read Write
---
```

#### All Frontmatter Fields

| Field | Required | Constraints |
|-------|----------|-------------|
| `name` | **Yes** | Max 64 chars. Lowercase alphanumeric + hyphens only. No start/end hyphens. No `--`. Must match directory name. |
| `description` | **Yes** | Max 1024 chars. Non-empty. Describes what + when. Include trigger keywords. |
| `license` | No | Short license reference |
| `compatibility` | No | Max 500 chars. Environment requirements. |
| `metadata` | No | Arbitrary key-value string map |
| `allowed-tools` | No | **Space-delimited** (NOT comma-separated). Experimental. |

#### Name Validation Rules
```
Valid:   pdf-processing, data-analysis, code-review
Invalid: PDF-Processing   (uppercase)
Invalid: -pdf             (starts with hyphen)
Invalid: pdf--processing  (consecutive hyphens)
```

### Progressive Disclosure Budget

| Level | Tokens | Loaded when |
|-------|--------|-------------|
| Metadata | ~100 | At startup for ALL skills |
| Instructions | <5000 recommended | When skill is activated |
| Resources | As needed | On demand from supporting files |

### File Reference Rules
- Use relative paths from skill root
- Keep references one level deep from SKILL.md
- No deeply nested reference chains
- Files >100 lines should have a table of contents

---

## Format Comparison Matrix

| Feature | Claude Code Skill | AgentSkills.io |
|---------|-------------------|----------------|
| Entry point | `SKILL.md` | `SKILL.md` |
| Location | `.claude/skills/<name>/` | Any directory |
| `name` required | No (uses dir name) | **Yes** |
| `description` required | Recommended | **Yes** |
| `argument-hint` | Yes | No |
| `disable-model-invocation` | Yes | No |
| `user-invocable` | Yes | No |
| `context: fork` | Yes | No |
| `agent` | Yes | No |
| `hooks` | Yes | No |
| `model` | Yes | No |
| `license` | No | Yes |
| `compatibility` | No | Yes |
| `metadata` | No | Yes |
| `allowed-tools` delimiter | Comma | **Space** |
| `$ARGUMENTS` / `$N` | Yes | No (agent-dependent) |
| `!` command syntax | Yes (preprocessing) | No |
| `${CLAUDE_SESSION_ID}` | Yes | No |
| Supporting files | Any structure | `scripts/`, `references/`, `assets/` |
| Discovery | `/help`, auto-load by Claude | Agent-specific |
| Validation tool | N/A | `skills-ref validate` |
| Portability | Claude Code only | Cross-agent |

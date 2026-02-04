# Skill Format Specification

Complete format reference for generated skills. Load this when drafting or validating skills.

## Claude Code Skill Format

### Directory Structure

```
skill-name/
├── SKILL.md           # Main instructions (required)
├── template.md        # Template for Claude to fill in
├── examples/
│   └── sample.md      # Example output showing expected format
├── scripts/
│   └── helper.py      # Script Claude can execute
└── references/
    └── guide.md       # Detailed reference documentation
```

### Where Skills Live

| Location | Path | Applies to | Priority |
|----------|------|------------|----------|
| Enterprise | Managed settings | All org users | Highest |
| Personal | `~/.claude/skills/<name>/SKILL.md` | All your projects | High |
| Project | `.claude/skills/<name>/SKILL.md` | This project only | Medium |
| Plugin | `<plugin>/skills/<name>/SKILL.md` | Where plugin enabled | Namespaced |

Higher-priority locations win when names conflict. Plugin skills use `plugin-name:skill-name` namespace. Skills take precedence over legacy `.claude/commands/` files with the same name. Monorepo support: Claude auto-discovers skills from nested `.claude/skills/` directories.

### YAML Frontmatter Fields

All fields are optional. Only `description` is recommended.

| Field | Type | Description |
|-------|------|-------------|
| `name` | String | Display name. Defaults to directory name. Lowercase letters, numbers, hyphens only. Max 64 chars. |
| `description` | String | What it does AND when to use it. Claude uses this for auto-discovery. If omitted, uses first paragraph. |
| `argument-hint` | String | Hint for autocomplete. E.g., `[issue-number]`, `[filename] [format]` |
| `disable-model-invocation` | Boolean | `true` = only user can invoke via `/name`. Default: `false` |
| `user-invocable` | Boolean | `false` = hidden from `/` menu, Claude can still auto-load. Default: `true` |
| `allowed-tools` | String | Tools available without permission when skill is active. Be specific. |
| `model` | String | Model to use: `sonnet`, `opus`, `haiku`, or specific model ID |
| `context` | String | Set to `fork` to run in isolated subagent context |
| `agent` | String | Subagent type for `context: fork`. Options: `Explore`, `Plan`, `general-purpose`, or custom name |
| `hooks` | Object | Lifecycle hooks scoped to this skill (PreToolUse, PostToolUse, Stop) |

### Invocation Control

| Configuration | User invokes | Claude invokes | Context behavior |
|---------------|-------------|----------------|-----------------|
| (default) | Yes | Yes | Description in context; full skill loads on invoke |
| `disable-model-invocation: true` | Yes | No | Description NOT in context; loads on user invoke |
| `user-invocable: false` | No | Yes | Description in context; loads when Claude invokes |

### String Substitutions

| Variable | Description |
|----------|-------------|
| `$ARGUMENTS` | All arguments passed when invoking |
| `$ARGUMENTS[N]` | Specific argument by 0-based index |
| `$N` | Shorthand for `$ARGUMENTS[N]` (`$0`, `$1`, etc.) |
| `${CLAUDE_SESSION_ID}` | Current session ID |

If `$ARGUMENTS` is not in the content, arguments are appended as `ARGUMENTS: <value>`.

### Dynamic Context Injection

`!`command`` runs shell commands BEFORE Claude sees the content. Output replaces the placeholder. This is preprocessing, not something Claude executes.

```yaml
- PR diff: !`gh pr diff`
- Changed files: !`gh pr diff --name-only`
```

### Subagent Execution

`context: fork` runs the skill in isolation. The skill content becomes the subagent's task prompt (no conversation history).

Only use `context: fork` for skills with explicit task instructions. Guidelines-only skills produce no useful output in a fork.

### Supporting Files

Keep SKILL.md under 500 lines. Move detailed material to supporting files. Reference them from SKILL.md with relative paths so Claude knows what each file contains and when to load it.

---

## AgentSkills.io Portable Format

The open standard without Claude Code extensions.

### Directory Structure

```
skill-name/
├── SKILL.md       # Required: instructions + metadata
├── scripts/       # Optional: executable code
├── references/    # Optional: detailed documentation
└── assets/        # Optional: templates, schemas, data files
```

### Required Frontmatter Fields

| Field | Required | Constraints |
|-------|----------|-------------|
| `name` | **Yes** | Max 64 chars. Lowercase alphanumeric + hyphens. No leading/trailing `-`. No `--`. Must match directory name. |
| `description` | **Yes** | Max 1024 chars. Non-empty. Describes what AND when. |
| `license` | No | Short license reference (e.g., "Apache-2.0") |
| `compatibility` | No | Max 500 chars. Environment requirements. |
| `metadata` | No | Arbitrary key-value string map |
| `allowed-tools` | No | **Space-delimited** (NOT comma-separated). Experimental. |

### Name Validation

```
Valid:   pdf-processing, data-analysis, code-review
Invalid: PDF-Processing   (uppercase)
Invalid: -pdf             (starts with hyphen)
Invalid: pdf--processing  (consecutive hyphens)
Invalid: pdf-             (ends with hyphen)
```

### Progressive Disclosure Budget

| Level | Tokens | Loaded when |
|-------|--------|-------------|
| Metadata | ~100 | At startup for ALL skills |
| Instructions | <5000 | When skill is activated |
| Resources | As needed | On demand from supporting files |

---

## Format Comparison

| Feature | Claude Code | AgentSkills.io |
|---------|-------------|----------------|
| Entry point | `SKILL.md` | `SKILL.md` |
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
| `allowed-tools` delimiter | Comma | Space |
| `$ARGUMENTS` / `$N` | Yes | No |
| `!`command`` syntax | Yes | No |
| `${CLAUDE_SESSION_ID}` | Yes | No |
| Supporting file structure | Flexible | `scripts/`, `references/`, `assets/` |
| Portability | Claude Code only | Cross-agent |

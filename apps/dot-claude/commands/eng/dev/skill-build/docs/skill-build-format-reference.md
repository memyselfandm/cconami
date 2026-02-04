# Skill Build - Format Reference

## Claude Code Slash Command Format

### File Structure
```
command-name/
├── command-name.md          # Main command (required)
└── docs/                    # Supporting documentation (optional)
    ├── documentation-index.md
    ├── quick-reference.md
    └── usage-guide.md
```

### YAML Frontmatter
```yaml
---
allowed-tools: Tool1, Tool2, Bash(specific:*)
description: Action-oriented description of command purpose
argument-hint: [required-arg] [--optional-flag <value>]
model: sonnet  # Optional: sonnet, opus, haiku
---
```

#### Frontmatter Fields

| Field | Required | Type | Constraints |
|-------|----------|------|-------------|
| `allowed-tools` | No | String/List | Minimal tool set. Use specific Bash patterns |
| `description` | No | String | Action-oriented, concise, third-person |
| `argument-hint` | No | String | User-friendly parameter guidance |
| `model` | No | String | Model alias or specific ID |

#### Tool Permission Patterns
```yaml
# Specific bash commands
allowed-tools: Bash(git:*), Bash(npm:*)

# Standard tools
allowed-tools: Read, Write, Edit, Glob, Grep

# MCP tools
allowed-tools: mcp__linear__get_issue, mcp__linear__create_issue

# Task delegation
allowed-tools: Task, TodoWrite

# Mixed
allowed-tools: Task, Read, Write, Bash(git:*), mcp__linear__*
```

### Body Syntax

#### Variable Substitution
```markdown
# Use $ARGUMENTS for user input
Fix issue #$ARGUMENTS following our coding standards.
```

#### Bash Execution (! prefix)
```markdown
## Context
- Status: !`git status`
- Branch: !`git branch --show-current`
```

#### File References (@ prefix)
```markdown
## Files
@README.md
@src/config.ts
```

#### Pseudocode Instructions
```markdown
```python
if input_provided:
    mode = "refine"
    data = fetch_data(input)
else:
    mode = "create"
    data = prompt_user()
```
```

### Naming Conventions
- Kebab-case: `my-command-name`
- Verb-first preferred: `analyze-`, `generate-`, `review-`
- Namespaced via directories: `eng/dev/my-command` -> `/eng:dev:my-command`

---

## AgentSkills.io Skill Format

### Directory Structure
```
skill-name/
├── SKILL.md              # Required: instructions + metadata
├── scripts/              # Optional: executable code
│   ├── analyze.py
│   └── validate.sh
├── references/           # Optional: detailed docs
│   ├── REFERENCE.md
│   └── FORMS.md
└── assets/               # Optional: templates, data
    ├── template.json
    └── schema.yaml
```

### SKILL.md Frontmatter
```yaml
---
name: skill-name
description: Extracts data from files and generates reports. Use when working with data files or when the user mentions extraction.
license: Apache-2.0
compatibility: Requires python3, jq
metadata:
  author: org-name
  version: "1.0"
allowed-tools: Bash(git:*) Read Write
---
```

#### Frontmatter Fields

| Field | Required | Constraints |
|-------|----------|-------------|
| `name` | Yes | Max 64 chars. Lowercase alphanumeric + hyphens. No start/end hyphens. No `--`. Must match directory name. No reserved words (anthropic, claude) |
| `description` | Yes | Max 1024 chars. Non-empty. Third person. No XML tags. Include WHAT and WHEN |
| `license` | No | Short license reference |
| `compatibility` | No | Max 500 chars. Environment requirements |
| `metadata` | No | Arbitrary key-value string map |
| `allowed-tools` | No | Space-delimited (experimental) |

#### Name Validation Rules
```
Valid:   pdf-processing, data-analysis, code-review
Invalid: PDF-Processing   (uppercase)
Invalid: -pdf             (starts with hyphen)
Invalid: pdf--processing  (consecutive hyphens)
Invalid: claude-helper    (reserved word)
```

#### Description Best Practices
```yaml
# GOOD: Specific with trigger keywords
description: Extract text and tables from PDF files, fill forms, merge documents. Use when working with PDF files or when the user mentions PDFs, forms, or document extraction.

# BAD: Vague
description: Helps with documents.
```

### Body Content

#### Progressive Disclosure Pattern
```markdown
# Quick Start
[Immediate value - how to get started fast]

## When to Use
[Specific triggers and use cases]

## Step-by-Step
[Core instructions]

## Advanced Features
See [REFERENCE.md](references/REFERENCE.md) for details.
See [FORMS.md](references/FORMS.md) for form handling.
```

#### Token Budget
- Metadata: ~100 tokens (loaded at startup for ALL skills)
- Body: <5000 tokens recommended (loaded on activation)
- References: As needed (loaded on demand)

#### Reference File Rules
- Keep references ONE level deep from SKILL.md
- No nested reference chains (A -> B -> C)
- Files >100 lines should have a table of contents
- Use descriptive filenames: `form_validation_rules.md` not `doc2.md`

### Naming Conventions
- Gerund form preferred: `processing-pdfs`, `analyzing-data`
- Also acceptable: `pdf-processing`, `process-pdfs`
- Avoid: `helper`, `utils`, `tools`, `documents`

---

## Format Comparison Matrix

| Feature | Claude Code | AgentSkills.io |
|---------|-------------|----------------|
| Entry point | `command-name.md` | `SKILL.md` |
| Name location | Filename/directory | `name` in frontmatter |
| Name format | Kebab-case | Kebab-case, max 64 chars |
| Description | `description` in frontmatter | `description` in frontmatter |
| Tool permissions | `allowed-tools` (comma-separated) | `allowed-tools` (space-separated) |
| Dynamic input | `$ARGUMENTS` | N/A (agent-dependent) |
| Bash execution | `!` prefix | Via scripts/ directory |
| File inclusion | `@` prefix | Relative path references |
| Extra files | `docs/` subdirectory | `scripts/`, `references/`, `assets/` |
| Discovery | `/help` command | Agent metadata loading |
| Validation | Manual review | `skills-ref validate` CLI |
| Portability | Claude Code only | Cross-agent |
| Model override | `model` field | N/A |

# Skill Quality Checklist

Use this checklist during Phase 3 (Refine) to validate generated skills.

## Universal Checks

- [ ] SKILL.md exists and is under 500 lines
- [ ] YAML frontmatter parses correctly (between `---` markers)
- [ ] Description states WHAT the skill does AND WHEN to use it
- [ ] Description includes trigger keywords for auto-discovery
- [ ] Content uses professional language (no slang, emojis unless intentional)
- [ ] No secrets, credentials, or API keys
- [ ] No time-sensitive information
- [ ] Consistent terminology throughout
- [ ] Examples are concrete, not abstract
- [ ] Supporting files referenced from SKILL.md with relative paths
- [ ] File references stay one level deep (no nested chains)
- [ ] Single responsibility: skill does one thing well

## Claude Code Format Checks

### Frontmatter
- [ ] `name` (if present): lowercase, hyphens, max 64 chars
- [ ] `description`: covers what AND when, includes keywords
- [ ] `allowed-tools`: specific permissions (`Bash(git:*)` not `Bash`)
- [ ] `model` (if present): valid value (`sonnet`, `opus`, `haiku`)

### Invocation Control
- [ ] Side-effect skills have `disable-model-invocation: true`
- [ ] Background knowledge has `user-invocable: false`
- [ ] Most skills leave both as default
- [ ] `context: fork` only used with actionable task instructions
- [ ] `agent` field set when `context: fork` is used

### Body Content
- [ ] `$ARGUMENTS` / `$ARGUMENTS[N]` / `$N` used correctly for input
- [ ] `!`command`` is preprocessing only (not Claude-executed commands)
- [ ] If `$ARGUMENTS` is expected but not in content, it auto-appends (verify this is acceptable)
- [ ] Instructions are clear and actionable
- [ ] Error handling covers common failure modes
- [ ] Confirmation checkpoints for destructive actions

### Supporting Files
- [ ] SKILL.md explains what each file contains and when to load it
- [ ] Templates have clear placeholders
- [ ] Scripts are self-contained with documented dependencies
- [ ] Examples show expected input and output

## AgentSkills.io Format Checks

### Frontmatter
- [ ] `name`: **required**, lowercase, kebab-case, max 64 chars
- [ ] `name`: no leading/trailing hyphen, no consecutive hyphens (`--`)
- [ ] `name`: matches the directory name
- [ ] `description`: **required**, max 1024 chars, non-empty
- [ ] `license` (if present): valid short reference
- [ ] `compatibility` (if present): max 500 chars
- [ ] `allowed-tools` (if present): **space-delimited** (not comma-separated)

### Content
- [ ] Body under 5000 tokens recommended
- [ ] No Claude Code-specific features (`$ARGUMENTS`, `!`command``, `context: fork`)
- [ ] Unix-style paths only (no backslashes)
- [ ] Supporting files in `scripts/`, `references/`, `assets/` directories

## Security Review

- [ ] No command injection vulnerabilities in generated scripts
- [ ] No hardcoded credentials or tokens
- [ ] Input validation at system boundaries
- [ ] File operations don't escape intended directories
- [ ] Tool permissions are minimally scoped
- [ ] Destructive operations require confirmation

## Common Mistakes to Catch

| Mistake | Fix |
|---------|-----|
| `allowed-tools: Bash` (too broad) | Use `Bash(git:*)`, `Bash(npm:*)`, etc. |
| Description says "I can help..." | Third person: "Extracts data from..." |
| Description is vague: "Helps with files" | Specific: "Extract text from PDFs. Use when working with PDF documents." |
| SKILL.md over 500 lines | Move details to supporting files |
| `context: fork` with only guidelines | Fork needs actionable tasks, not conventions |
| Missing `disable-model-invocation` on deploy | Side-effect skills need manual-only invocation |
| AgentSkills.io: `Read, Write, Grep` | Space-delimited: `Read Write Grep` |
| AgentSkills.io: `name: My-Skill` | Lowercase: `name: my-skill` |

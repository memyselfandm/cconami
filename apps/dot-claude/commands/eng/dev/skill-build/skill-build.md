---
allowed-tools: Task, Read, Write, MultiEdit, Bash(mkdir:*), Glob, Grep
argument-hint: <spec> [--format claude|agentskills|both] [--context <ref>] [--depth light|normal|deep] [--dry-run]
description: Build production-ready Claude Code skills and AgentSkills.io-compatible skills through a 3-phase Research-Draft-Refine process
---

# Skill Build Command

Systematically create production-ready skills through a 3-phase process: Research, Draft, Refine.

Supports two output formats:
- **Claude Code skills** (`.claude/skills/<name>/SKILL.md`) - the current standard, following the [Agent Skills](https://agentskills.io) open standard with Claude Code extensions
- **AgentSkills.io portable skills** - cross-agent compatible format without Claude Code extensions

> **Important**: Claude Code has unified slash commands and skills. `.claude/commands/` files still work but `.claude/skills/<name>/SKILL.md` is the modern standard. Both create `/skill-name` commands. Skills add optional features: a directory for supporting files, invocation control, subagent execution, and automatic loading by Claude.

## Usage

### Basic Usage
```bash
# Build a Claude Code skill from natural language
/skill-build "Create a code review skill that checks for security issues"

# Build a portable AgentSkills.io skill
/skill-build "PDF form extraction and filling" --format agentskills

# Build both formats simultaneously
/skill-build "Database migration helper" --format both
```

### Advanced Usage
```bash
# With reference implementation and deep research
/skill-build "kubernetes deployment skill" \
  --context https://kubernetes.io/docs/concepts/workloads/ \
  --depth deep

# Multiple skills at once
/skill-build "lint-fix: auto-fix linting issues" "test-runner: smart test execution" \
  --depth normal,deep

# From a spec file
/skill-build @specs/new-skill.md --format agentskills
```

## Arguments

- **`<spec>`**: Skill specification(s) - can be:
  - Natural language description(s) in quotes
  - Markdown spec file path with `@` prefix
  - Multiple specs separated by spaces

- **`--format <type>`**: Output format (default: `claude`)
  - `claude`: Claude Code skill (`.claude/skills/` SKILL.md directory)
  - `agentskills`: Portable AgentSkills.io format (no Claude Code extensions)
  - `both`: Generate both formats

- **`--context <ref>`**: Reference implementation URLs (comma-separated)
  - When provided, research biases 70-80% toward the reference

- **`--depth <level>`**: Research depth per skill (comma-separated)
  - `light`: 2-3 sources, quick patterns
  - `normal`: 5 sources, balanced research [default]
  - `deep`: 8-10 sources, exhaustive analysis

- **`--dry-run`**: Preview execution plan without creating files

## Instructions

### Step 0: Determine Output Format

```python
format = args.format || 'claude'
# Valid: 'claude', 'agentskills', 'both'

if format == 'both':
    output_targets = ['claude', 'agentskills']
else:
    output_targets = [format]
```

### Step 1: Parse Input and Configure

1. **Identify Input Type**:
   ```python
   if input.startsWith('@'):
       specs = parse_markdown_file(input)
   else:
       specs = parse_natural_language_descriptions(input)
   ```

2. **Parse Configuration Arrays**:
   ```python
   contexts = (args.context || '').split(',')
   depths = (args.depth || 'normal').split(',')

   for i in range(skill_count):
       skill_config[i] = {
           context: contexts[i] || contexts[0] || '',
           depth: depths[i] || depths[0] || 'normal',
           format: format
       }
   ```

3. **Generate Skill Names**:
   ```python
   for spec in specs:
       if ':' in spec:
           name, description = spec.split(':', 1)
           name = kebab_case(name.strip())
       else:
           name = generate_name_from_description(spec)
   ```

4. **Dry Run Check**:
   ```python
   if args.dry_run:
       print("=== Skill Build Execution Plan ===")
       print(f"Skills to build: {len(specs)}")
       print(f"Output format(s): {', '.join(output_targets)}")
       for i, spec in enumerate(specs):
           print(f"\n  Skill {i+1}: {spec.name}")
           print(f"    Description: {spec.description}")
           print(f"    Research depth: {skill_config[i].depth}")
           if skill_config[i].context:
               print(f"    Reference: {skill_config[i].context}")
           for target in output_targets:
               print(f"    Output: apps/dot-claude/skills/{spec.name}/SKILL.md")
       print(f"\nPhases: Research → Draft → Refine")
       print(f"Concurrent agents per phase: {len(specs)}")
       return
   ```

### Step 2: Phase 1 - Research (context-engineering-subagent)

**Multiplexing**: Deploy N context engineers for N specifications concurrently.

For EACH skill specification, launch a context-engineering-subagent with this prompt:

```
RESEARCH_DEPTH: {skill_config[i].depth}
RESEARCH_FOCUS: Best practices and patterns for building a skill with the following purpose: {spec.description}

{f"REFERENCE_CONTEXT: {skill_config[i].context}" if skill_config[i].context else ""}

OBJECTIVE: Research patterns and best practices for creating an Agent Skills skill with the following specialization:

{spec.full_description}

TARGET FORMAT(S): {', '.join(output_targets)}

Research the following aspects:
1. Similar existing skills and their patterns
2. The domain knowledge needed for this skill's purpose
3. Best practices for the skill's interaction model (arguments, workflows, output)
4. Tool permissions and security considerations
5. Progressive disclosure opportunities (what goes in SKILL.md vs supporting files)
6. Error handling patterns for the domain
7. Whether the skill should use invocation control (disable-model-invocation, user-invocable)
8. Whether the skill benefits from subagent execution (context: fork)

{"Focus 70-80% on analyzing the provided reference implementation." if skill_config[i].context else ""}

IMPORTANT CONTEXT:

Claude Code skills follow the Agent Skills open standard (https://agentskills.io) with extensions.

CLAUDE CODE SKILL FORMAT (current standard):
- Location: .claude/skills/<name>/SKILL.md (replaces the older .claude/commands/ pattern)
- Both create /skill-name slash commands
- YAML frontmatter fields:
  * name (optional, defaults to directory name): max 64 chars, lowercase + hyphens
  * description (recommended): what it does AND when to use it, with trigger keywords
  * argument-hint: hint for autocomplete (e.g., "[issue-number]")
  * disable-model-invocation: true to prevent Claude auto-loading (manual /invoke only)
  * user-invocable: false to hide from / menu (background knowledge only)
  * allowed-tools: tools Claude can use without permission when skill is active
  * model: model to use when skill is active
  * context: set to "fork" to run in a forked subagent context
  * agent: which subagent type to use with context: fork (e.g., Explore, Plan)
  * hooks: lifecycle hooks scoped to this skill
- Body features:
  * $ARGUMENTS for all arguments, $ARGUMENTS[N] or $N for positional, ${CLAUDE_SESSION_ID}
  * !`command` for dynamic shell context injection (runs before Claude sees content)
  * Relative path references to supporting files
  * Progressive disclosure: SKILL.md <500 lines, details in supporting files
- Supporting files: any files in the skill directory (templates, scripts, examples, references)

AGENTSKILLS.IO PORTABLE FORMAT:
- Same SKILL.md core but only standard fields: name (required), description (required), license, compatibility, metadata, allowed-tools (space-delimited)
- No Claude Code extensions (no context, agent, hooks, disable-model-invocation, user-invocable)
- Directory: scripts/, references/, assets/ for optional supporting files

Generate a comprehensive context engineering report optimized for the skill architect in Phase 2.
```

⚠️ Launch ALL research agents concurrently. In a SINGLE response, use MULTIPLE Task tool invocations:

```python
# All in ONE response - do NOT wait between launches
Task.invoke({
    subagent_type: "context-engineering-subagent",
    description: f"Research skill 1: {specs[0].name}",
    prompt: research_prompt_1
})
Task.invoke({
    subagent_type: "context-engineering-subagent",
    description: f"Research skill 2: {specs[1].name}",
    prompt: research_prompt_2
})
# ... one per specification
```

### Step 3: Phase 2 - Draft (slash-command-architect)

**Multiplexing**: Deploy N architects for N specifications concurrently.

For EACH skill specification AND each output target, launch a slash-command-architect with this prompt:

#### For Claude Code format (`claude`):

```
CREATE PRODUCTION-READY CLAUDE CODE SKILL: {spec.name}

SPECIFICATION:
{spec.full_description}

RESEARCH CONTEXT:
{research_reports[i]}

TARGET FORMAT: Claude Code skill (.claude/skills/<name>/SKILL.md)

REQUIREMENTS:

1. SKILL.md frontmatter (YAML between --- markers):
   All fields are optional except description (recommended).

   CORE FIELDS:
   - name: Display name. If omitted, uses directory name. Lowercase letters, numbers, hyphens only. Max 64 chars.
   - description: RECOMMENDED. What the skill does AND when to use it. Include trigger keywords so Claude knows when to load it automatically. Third person. Concise.
   - argument-hint: Shown during autocomplete. E.g., "[issue-number]", "[filename] [format]"
   - allowed-tools: Tools Claude can use without asking permission. Be specific: Bash(git:*) not Bash
   - model: Model to use when skill is active (sonnet, opus, haiku)

   INVOCATION CONTROL FIELDS:
   - disable-model-invocation: Set true for workflows with side effects (deploy, commit, send-message). Prevents Claude from auto-triggering. User must type /name.
   - user-invocable: Set false for background knowledge that shouldn't appear in / menu. Claude can still load it when relevant.

   SUBAGENT EXECUTION FIELDS:
   - context: Set to "fork" to run in an isolated subagent context (no conversation history). The skill content becomes the subagent's task prompt. Only makes sense for skills with explicit task instructions.
   - agent: Which subagent runs the skill when context: fork. Built-in: Explore (read-only, fast), Plan (read-only, inherits model), general-purpose (all tools). Or any custom subagent name.

   HOOKS FIELD:
   - hooks: Lifecycle hooks scoped to this skill (PreToolUse, PostToolUse, Stop events)

2. SKILL.md body (markdown after frontmatter):
   TWO TYPES OF SKILL CONTENT:

   A) Reference content (knowledge/conventions Claude applies to current work):
      - Conventions, patterns, style guides, domain knowledge
      - Runs inline in main conversation context
      - Good default for most skills

   B) Task content (step-by-step instructions for specific actions):
      - Deployments, commits, code generation workflows
      - Often paired with disable-model-invocation: true
      - Consider context: fork for isolation

   BODY REQUIREMENTS:
   - Keep under 500 lines. Move detailed material to supporting files.
   - Use $ARGUMENTS for user input. $ARGUMENTS[N] or $N for positional args. ${CLAUDE_SESSION_ID} for session ID.
   - Use !`command` to inject dynamic shell output (runs BEFORE Claude sees the content).
   - Reference supporting files with relative paths from skill root.
   - Include: purpose, when to use, step-by-step instructions, examples, edge cases.
   - For complex logic, use pseudocode blocks (Python-style).

3. Supporting files (optional):
   Any files in the skill directory that SKILL.md references:
   - Templates for Claude to fill in
   - Example outputs showing expected format
   - Scripts Claude can execute
   - Detailed reference documentation
   Reference them from SKILL.md so Claude knows when to load them.

   ```
   {spec.name}/
   ├── SKILL.md              # Main instructions (required)
   ├── template.md           # Optional: template for Claude
   ├── examples/
   │   └── sample.md         # Optional: example outputs
   ├── scripts/
   │   └── helper.py         # Optional: executable scripts
   └── references/
       └── detailed-guide.md # Optional: detailed docs
   ```

4. Quality standards:
   - Single responsibility principle
   - Idempotent where possible
   - Security-conscious (no secrets, validate inputs)
   - Under 500 lines for SKILL.md
   - Professional language
   - Include trigger keywords in description for auto-discovery

5. Invocation design decision tree:
   ```python
   if skill_has_side_effects:  # deploy, commit, send messages
       set disable-model-invocation: true
   elif skill_is_background_knowledge:  # conventions, patterns
       set user-invocable: false
   elif skill_needs_isolation:  # long research, heavy processing
       set context: fork
       choose agent type based on needs
   else:
       # Default: both user and Claude can invoke
       pass
   ```

TARGET DIRECTORY: apps/dot-claude/skills/{spec.name}/

Generate all files needed for the complete skill directory.
```

#### For AgentSkills.io format (`agentskills`):

```
CREATE PRODUCTION-READY AGENTSKILLS.IO SKILL: {spec.name}

SPECIFICATION:
{spec.full_description}

RESEARCH CONTEXT:
{research_reports[i]}

TARGET FORMAT: AgentSkills.io portable skill (no Claude Code extensions)

REQUIREMENTS:
1. SKILL.md frontmatter (YAML):
   - name: REQUIRED. Lowercase kebab-case, max 64 chars. Must match directory name. Must not start/end with hyphen. No consecutive hyphens (--). Unicode lowercase alphanumeric + hyphens only.
   - description: REQUIRED. Max 1024 chars. Describes WHAT and WHEN. Include trigger keywords. Be specific.
   - license: Optional. Short license reference (e.g., "Apache-2.0")
   - compatibility: Optional. Max 500 chars. Environment requirements.
   - metadata: Optional. Arbitrary key-value string map (author, version, etc.)
   - allowed-tools: Optional/experimental. Space-delimited (NOT comma-separated).

2. SKILL.md body:
   - No format restrictions, but keep under 500 lines
   - Recommended: step-by-step instructions, input/output examples, edge cases
   - Reference supporting files with relative paths
   - Keep file references one level deep (no nested chains)
   - Progressive disclosure: overview in SKILL.md, details in referenced files

3. Directory structure:
   ```
   {spec.name}/
   ├── SKILL.md           # Required: instructions + metadata
   ├── scripts/           # Optional: executable code
   ├── references/        # Optional: detailed documentation
   └── assets/            # Optional: templates, schemas, data files
   ```

4. Progressive disclosure budget:
   - Metadata (~100 tokens): name + description loaded at startup for ALL skills
   - Instructions (<5000 tokens): SKILL.md body loaded on activation
   - Resources (as needed): supporting files loaded only when required

5. Scripts: self-contained, documented deps, helpful error messages, handle edge cases
6. Quality: concise, workflows with checklists, feedback loops, Unix-style paths only

TARGET DIRECTORY: apps/dot-claude/skills/{spec.name}/

Generate ALL files needed for the complete skill directory.
```

⚠️ Launch ALL drafting agents concurrently. In a SINGLE response, use MULTIPLE Task tool invocations:

```python
for i, spec in enumerate(specs):
    for target in output_targets:
        Task.invoke({
            subagent_type: "slash-command-architect",
            description: f"Draft {target} skill: {spec.name}",
            prompt: draft_prompt
        })
```

### Step 4: Phase 3 - Refine (slash-command-architect in review mode)

**Multiplexing**: Deploy N reviewers for N specifications concurrently.

For EACH drafted skill, launch a slash-command-architect in review mode:

```
REVIEW AND REFINE SKILL: {spec.name}
FORMAT: {output_target}

CURRENT IMPLEMENTATION:
{draft_content}

ORIGINAL RESEARCH:
{research_reports[i]}

REVIEW CHECKLIST:

### Core Quality
- [ ] Description is specific, third-person, includes trigger keywords
- [ ] Description covers both WHAT it does and WHEN to use it
- [ ] SKILL.md is under 500 lines
- [ ] Supporting details in separate files (if needed)
- [ ] No time-sensitive information
- [ ] Consistent terminology throughout
- [ ] Examples are concrete, not abstract
- [ ] File references are one level deep
- [ ] Progressive disclosure used appropriately

### Claude Code Format
- [ ] Frontmatter fields are accurate and minimal
- [ ] Tool permissions are minimal and specific (Bash(git:*) not Bash)
- [ ] $ARGUMENTS / $ARGUMENTS[N] / $N used correctly
- [ ] !`command` used for dynamic context injection (preprocessed, not Claude-executed)
- [ ] Invocation control is appropriate:
      * Side-effect skills have disable-model-invocation: true
      * Background knowledge has user-invocable: false
      * Isolated tasks use context: fork with appropriate agent
- [ ] If context: fork, skill has actionable task instructions (not just guidelines)
- [ ] Error handling covers common failure modes
- [ ] Confirmation checkpoints for destructive actions

### AgentSkills.io Format
- [ ] name: required, lowercase, kebab-case, max 64 chars, matches directory, no -- no leading/trailing -
- [ ] description: required, max 1024 chars, specific, includes trigger keywords
- [ ] Directory structure follows spec (SKILL.md + optional scripts/ references/ assets/)
- [ ] Progressive disclosure budget respected (<5000 tokens for body)
- [ ] allowed-tools is space-delimited (NOT comma-separated)
- [ ] Scripts are self-contained with documented deps
- [ ] No Windows-style paths

### Security and Robustness
- [ ] No secrets or credentials
- [ ] Input validation at system boundaries
- [ ] No command injection vulnerabilities
- [ ] Graceful error handling

REFINEMENT GOALS:
- Polish for production deployment
- Ensure optimal discovery triggers in description
- Validate all best practices
- Enhance documentation and examples
- Trim unnecessary verbosity

Generate the refined, production-ready implementation.
```

⚠️ Launch ALL refinement agents concurrently. In a SINGLE response, use MULTIPLE Task tool invocations:

```python
for i, spec in enumerate(specs):
    for target in output_targets:
        Task.invoke({
            subagent_type: "slash-command-architect",
            description: f"Refine {target} skill: {spec.name}",
            prompt: refine_prompt
        })
```

### Step 5: Post-Processing and Deployment

1. **Create Directory Structure**:
   ```python
   for skill in refined_skills:
       mkdir -p apps/dot-claude/skills/{skill.name}
       # Create subdirectories only if the skill has supporting files
       if skill.has_scripts:
           mkdir -p apps/dot-claude/skills/{skill.name}/scripts
       if skill.has_references:
           mkdir -p apps/dot-claude/skills/{skill.name}/references
       if skill.has_assets:
           mkdir -p apps/dot-claude/skills/{skill.name}/assets
       if skill.has_examples:
           mkdir -p apps/dot-claude/skills/{skill.name}/examples
   ```

2. **Write Skill Files**:
   ```python
   for skill in refined_skills:
       Write(f"apps/dot-claude/skills/{skill.name}/SKILL.md", skill.main_content)
       for supporting_file in skill.supporting_files:
           Write(f"apps/dot-claude/skills/{skill.name}/{supporting_file.path}", supporting_file.content)
   ```

3. **Validate Generated Files**:
   ```python
   for skill in refined_skills:
       # Verify YAML frontmatter is present and parseable
       assert skill.main_content.startswith('---')
       assert 'description:' in skill.main_content
       # Verify SKILL.md is under 500 lines
       assert len(skill.main_content.splitlines()) <= 500

       if skill.format == 'agentskills':
           # AgentSkills.io requires name field
           assert 'name:' in skill.main_content
           name_in_frontmatter = extract_name(skill.main_content)
           assert name_in_frontmatter == skill.name
           assert len(name_in_frontmatter) <= 64
           assert name_in_frontmatter == name_in_frontmatter.lower()
           assert not name_in_frontmatter.startswith('-')
           assert not name_in_frontmatter.endswith('-')
           assert '--' not in name_in_frontmatter
   ```

4. **Generate Summary Report**:
   ```markdown
   ## Skill Build Summary

   ### Skills Created: [COUNT]
   | Skill | Format | Location | Invocation | Status |
   |-------|--------|----------|------------|--------|
   | [name] | [claude/agentskills] | [path] | [user+model / user-only / model-only] | [status] |

   ### Execution Metrics
   - Phase 1 (Research): [DEPTH] depth
   - Phase 2 (Draft): Completed
   - Phase 3 (Refine): Completed

   ### Files Created
   - [List of all files created with paths]

   ### Next Steps
   - [ ] Review generated skill(s) before production use
   - [ ] Test with representative inputs
   - [ ] Copy to .claude/skills/ or ~/.claude/skills/ for activation
   - [ ] For AgentSkills.io: validate with `skills-ref validate ./skill-name`
   ```

## Smart Multiplexing

The command scales based on the number of skills being built:

- **1 skill, 1 format**: 1 researcher → 1 drafter → 1 refiner (sequential phases)
- **1 skill, both formats**: 1 researcher → 2 drafters → 2 refiners
- **N skills**: N researchers → N*formats drafters → N*formats refiners (concurrent within phase)

## Error Handling

```python
# Handle errors at each phase without blocking the entire build

# Input validation
if not specs or all_specs_invalid:
    report_error("No valid specifications provided. Expected: natural language in quotes, @filepath, or name:description format")
    return

# Phase 1 failures (research)
for i, result in enumerate(research_results):
    if result.failed:
        log_warning(f"Research for {specs[i].name} incomplete")
        research_reports[i] = "LIMITED CONTEXT: Research phase failed. Rely on general best practices and your existing knowledge."

# Phase 2 failures (draft)
for i, result in enumerate(draft_results):
    if result.failed:
        log_warning(f"Draft for {specs[i].name} failed - retrying once")
        retry_result = retry_draft(specs[i], simplified=True)
        if retry_result.failed:
            failed_skills.append(specs[i].name)
            continue

# Phase 3 failures (refine)
for i, result in enumerate(refine_results):
    if result.failed:
        log_warning(f"Refinement for {specs[i].name} failed - using draft version")
        refined_skills[i] = draft_results[i]

if failed_skills:
    print(f"⚠️ {len(failed_skills)} skill(s) failed: {', '.join(failed_skills)}")
    print(f"✅ {len(specs) - len(failed_skills)} skill(s) created successfully")
```

## Best Practices

1. **Match format to use case**:
   - `claude`: For skills used within Claude Code (supports invocation control, subagent execution, hooks)
   - `agentskills`: For portable skills across multiple AI agents
   - `both`: When you want maximum reach

2. **Use reference contexts** when adapting existing patterns
3. **Choose appropriate depth**: Light for simple domains, Normal for standard skills, Deep for complex/novel implementations
4. **Design invocation control deliberately**:
   - Side-effect skills (deploy, commit): `disable-model-invocation: true`
   - Background knowledge (conventions, patterns): `user-invocable: false`
   - Heavy/isolated tasks: `context: fork` with appropriate `agent`
   - Most skills: default (both user and Claude can invoke)
5. **Review generated skills** before deploying to production

## Anti-Patterns

```bash
# BAD: Vague specification
/skill-build "helper for documents"

# GOOD: Specific scope and purpose
/skill-build "Extract tables from PDF files and convert to CSV format"

# BAD: Too broad
/skill-build "all-in-one: code review, testing, deployment, and monitoring"

# GOOD: Focused single-purpose
/skill-build "code-review: review PR for security and performance issues"
```

### Common Mistakes in Generated Skills

| Mistake | Fix |
|---------|-----|
| `Bash` without specifics | Use `Bash(git:*)` or `Bash(npm:*)` |
| Description says "I can help you..." | Third person: "Extracts data from..." |
| Vague description: "Helps with files" | Specific: "Extract text from PDFs, fill forms. Use when working with PDF documents." |
| Body >500 lines | Move details to supporting files |
| `context: fork` with only guidelines | Fork needs actionable task instructions, not just conventions |
| Missing `disable-model-invocation` on deploy skills | Side-effect skills need manual invocation control |
| AgentSkills.io: comma-separated allowed-tools | Must be space-delimited: `Bash(git:*) Read Write` |
| AgentSkills.io: `name: My-Skill` | Must be lowercase: `name: my-skill` |

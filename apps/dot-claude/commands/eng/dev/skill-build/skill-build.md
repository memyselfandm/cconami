---
allowed-tools: Task, Read, Write, MultiEdit, Bash(mkdir:*), Glob, Grep
argument-hint: <spec> [--format claude|agentskills|both] [--context <ref>] [--depth light|normal|deep] [--dry-run]
description: Build production-ready Claude Code skills/commands and AgentSkills.io-compatible skills through a 3-phase Research-Draft-Refine process
---

# Skill Build Command

Systematically create production-ready skills for Claude Code and/or the AgentSkills.io format through a 3-phase process: Research, Draft, Refine. Supports building slash commands (`.claude/commands/`), AgentSkills.io skills (`SKILL.md` directories), or both simultaneously.

## Usage

### Basic Usage
```bash
# Build a Claude Code slash command from natural language
/skill-build "Create a code review command that checks for security issues"

# Build an AgentSkills.io skill
/skill-build "PDF form extraction and filling" --format agentskills

# Build both formats simultaneously
/skill-build "Database migration helper" --format both
```

### Advanced Usage
```bash
# With reference implementation and deep research
/skill-build "kubernetes deployment command" \
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
  - `claude`: Claude Code slash command (`.claude/commands/` markdown file)
  - `agentskills`: AgentSkills.io format (`SKILL.md` directory structure)
  - `both`: Generate both formats

- **`--context <ref>`**: Reference implementation URLs (comma-separated)
  - When provided, research biases 70-80% toward the reference
  - Useful for adapting existing patterns

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
    # Generate BOTH a Claude Code command AND an AgentSkills.io skill
    # They share the same research phase but diverge at drafting
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
       # Extract or generate kebab-case name
       if ':' in spec:
           name, description = spec.split(':', 1)
           name = kebab_case(name.strip())
       else:
           name = generate_name_from_description(spec)
   ```

4. **Dry Run Check**:
   ```python
   if args.dry_run:
       # Display what WOULD be executed without actually doing it
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
               if target == 'claude':
                   ns = categorize_namespace(spec)
                   print(f"    Output: apps/dot-claude/commands/{ns}/{spec.name}/{spec.name}.md")
               else:
                   print(f"    Output: apps/dot-claude/skills/{spec.name}/SKILL.md")
       print(f"\nPhases: Research → Draft → Refine")
       print(f"Concurrent agents per phase: {len(specs)}")
       return  # Stop here
   ```

### Step 2: Phase 1 - Research (context-engineering-subagent)

**Multiplexing**: Deploy N context engineers for N specifications concurrently.

For EACH skill specification, launch a context-engineering-subagent with this prompt:

```
RESEARCH_DEPTH: {skill_config[i].depth}
RESEARCH_FOCUS: Best practices and patterns for building a skill/command with the following purpose: {spec.description}

{f"REFERENCE_CONTEXT: {skill_config[i].context}" if skill_config[i].context else ""}

OBJECTIVE: Research patterns and best practices for creating a Claude Code skill with the following specialization:

{spec.full_description}

TARGET FORMAT(S): {', '.join(output_targets)}

Research the following aspects:
1. Similar existing commands/skills and their patterns
2. The domain knowledge needed for this skill's purpose
3. Best practices for the skill's interaction model (arguments, workflows, output)
4. Tool permissions and security considerations
5. Progressive disclosure opportunities (what goes in main file vs reference files)
6. Error handling patterns for the domain

{"Focus 70-80% on analyzing the provided reference implementation." if skill_config[i].context else ""}

IMPORTANT CONTEXT FOR YOUR RESEARCH:
- If targeting 'claude' format: Research Claude Code slash command patterns (YAML frontmatter with allowed-tools, description, argument-hint; markdown body with instructions using $ARGUMENTS, ! for bash, @ for file references)
- If targeting 'agentskills' format: Research AgentSkills.io spec (SKILL.md with name/description frontmatter, optional scripts/, references/, assets/ directories, progressive disclosure patterns)
- If targeting 'both': Research patterns that work well across both formats

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
CREATE PRODUCTION-READY CLAUDE CODE SLASH COMMAND: {spec.name}

SPECIFICATION:
{spec.full_description}

RESEARCH CONTEXT:
{research_reports[i]}

TARGET FORMAT: Claude Code slash command (.claude/commands/ markdown file)

REQUIREMENTS:
1. YAML frontmatter with:
   - allowed-tools: MINIMAL set of tools needed. Be specific with Bash permissions (e.g., Bash(git:*) not just Bash)
   - description: Action-oriented, concise. Describes what it does AND when to use it. Third person. Max ~100 chars
   - argument-hint: Clear parameter guidance with sensible defaults shown

2. Command body must include:
   - Clear purpose statement and overview
   - Usage examples (basic and advanced)
   - Step-by-step instructions using pseudocode for complex logic
   - Proper use of $ARGUMENTS for dynamic input
   - Bash context gathering with ! prefix where useful
   - File references with @ prefix where useful
   - Error handling instructions for common failure modes
   - Collaborative checkpoints for destructive or irreversible operations

3. Follow these patterns from proven commands:
   - Phase-based execution for complex workflows (Foundation → Features → Integration)
   - Mode switching for multi-purpose commands (if input_provided: refine_mode else: create_mode)
   - Pseudocode blocks for logic (Python-style, not actual executable code)
   - Concurrency directives for subagent orchestration (if applicable)
   - Confirmation checkpoints before destructive actions

4. Quality standards:
   - Single responsibility principle
   - Idempotent where possible
   - Security-conscious (no secrets in commands, validate inputs)
   - Composable with other commands where applicable
   - Under 500 lines for main file; split to docs/ subdirectory if larger
   - Professional language (no slang in the command itself)

TARGET FILE: apps/dot-claude/commands/{namespace}/{spec.name}/{spec.name}.md
(Where namespace is determined by the skill's domain: eng/dev, product/ops, etc.)

Generate the complete command file with YAML frontmatter and full implementation.
```

#### For AgentSkills.io format (`agentskills`):

```
CREATE PRODUCTION-READY AGENTSKILLS.IO SKILL: {spec.name}

SPECIFICATION:
{spec.full_description}

RESEARCH CONTEXT:
{research_reports[i]}

TARGET FORMAT: AgentSkills.io skill (SKILL.md directory)

REQUIREMENTS:
1. SKILL.md frontmatter (YAML):
   - name: Lowercase kebab-case, max 64 chars. Must match directory name. No reserved words (anthropic, claude). Consider gerund form (e.g., processing-pdfs)
   - description: Max 1024 chars. Third person. Describes WHAT and WHEN. Include trigger keywords for discovery. Be specific, not vague
   - license: Optional. If included, keep short (e.g., "Apache-2.0")
   - compatibility: Optional. Only if specific env requirements exist (e.g., "Requires git, docker")
   - metadata: Optional. author, version, tags
   - allowed-tools: Optional/experimental. Space-delimited (not comma)

2. SKILL.md body:
   - Keep under 500 lines total
   - Use progressive disclosure: overview in SKILL.md, details in reference files
   - Include: quick start, when to use, step-by-step instructions, examples
   - Reference additional files with relative paths: [guide](references/REFERENCE.md)
   - Keep file references ONE level deep (no nested reference chains)
   - Use consistent terminology throughout
   - No time-sensitive information
   - Match freedom level to task fragility:
     * High freedom for flexible tasks (text instructions, general guidelines)
     * Medium freedom for pattern-following tasks (pseudocode, parameterized scripts)
     * Low freedom for fragile tasks (exact scripts, strict sequences)

3. Directory structure:
   ```
   {spec.name}/
   ├── SKILL.md           # Required: main instructions + metadata
   ├── scripts/           # Optional: executable utility scripts
   ├── references/        # Optional: detailed documentation
   └── assets/            # Optional: templates, schemas, data files
   ```

4. Progressive disclosure budget:
   - Metadata (~100 tokens): name + description loaded at startup for ALL skills
   - Instructions (<5000 tokens recommended): SKILL.md body loaded on activation
   - Resources (as needed): scripts/, references/, assets/ loaded on demand

5. If scripts are included:
   - Self-contained with documented dependencies
   - Helpful error messages (solve, don't punt)
   - No magic numbers (document all constants)
   - Clear whether to EXECUTE or READ AS REFERENCE
   - Handle edge cases gracefully

6. Quality standards:
   - Concise: only add context the agent doesn't already have
   - Use workflows with checklists for complex multi-step tasks
   - Include feedback loops for quality-critical operations (run → validate → fix → repeat)
   - Provide input/output examples where output quality matters
   - Use templates for strict output requirements
   - Unix-style paths only (forward slashes)
   - Long reference files get a table of contents
   - Avoid offering too many tool options (provide a default with escape hatch)

TARGET DIRECTORY: apps/dot-claude/skills/{spec.name}/
(Or as specified by the orchestrator)

Generate ALL files needed for the complete skill directory.
```

⚠️ Launch ALL drafting agents concurrently. In a SINGLE response, use MULTIPLE Task tool invocations:

```python
# All in ONE response - do NOT wait between launches
for i, spec in enumerate(specs):
    for target in output_targets:
        Task.invoke({
            subagent_type: "slash-command-architect",
            description: f"Draft {target} skill: {spec.name}",
            prompt: draft_prompt  # Use Claude or AgentSkills prompt template above
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
- [ ] Description includes both WHAT it does and WHEN to use it
- [ ] Main file is under 500 lines
- [ ] Additional details are in separate files (if needed)
- [ ] No time-sensitive information
- [ ] Consistent terminology throughout
- [ ] Examples are concrete, not abstract
- [ ] File references are one level deep
- [ ] Progressive disclosure used appropriately
- [ ] Workflows have clear steps

### Format-Specific (Claude Code)
- [ ] YAML frontmatter has allowed-tools (minimal), description, argument-hint
- [ ] Tool permissions are minimal and specific
- [ ] $ARGUMENTS used correctly for dynamic input
- [ ] ! prefix used for context gathering (not implementation)
- [ ] @ prefix used for file references
- [ ] Pseudocode is Python-style and clear
- [ ] Error handling covers common failure modes
- [ ] Confirmation checkpoints for destructive actions
- [ ] Instructions are clear enough for consistent execution

### Format-Specific (AgentSkills.io)
- [ ] name field: lowercase, kebab-case, max 64 chars, matches directory
- [ ] description field: max 1024 chars, specific, includes keywords
- [ ] Directory structure follows spec (SKILL.md + optional dirs)
- [ ] Progressive disclosure budget respected (<5000 tokens for body)
- [ ] Scripts are self-contained with documented deps
- [ ] No Windows-style paths
- [ ] Reference files have TOC if >100 lines

### Security and Robustness
- [ ] No secrets or credentials in the skill
- [ ] Input validation at system boundaries
- [ ] Sandboxing considerations for script execution
- [ ] No command injection vulnerabilities
- [ ] Graceful error handling

REFINEMENT GOALS:
- Polish for production deployment
- Ensure optimal discovery triggers
- Validate all best practices
- Enhance documentation and examples
- Trim unnecessary verbosity (every token must justify its cost)

Generate the refined, production-ready implementation.
```

⚠️ Launch ALL refinement agents concurrently. In a SINGLE response, use MULTIPLE Task tool invocations:

```python
# All in ONE response - do NOT wait between launches
for i, spec in enumerate(specs):
    for target in output_targets:
        Task.invoke({
            subagent_type: "slash-command-architect",
            description: f"Refine {target} skill: {spec.name}",
            prompt: refine_prompt  # Use review prompt template above
        })
```

### Step 5: Post-Processing and Deployment

1. **Create Directory Structure**:
   ```python
   for skill in refined_skills:
       if skill.format == 'claude':
           # Determine namespace from domain
           namespace = categorize_domain(skill)  # eng/dev, product/ops, uiux, etc.
           mkdir -p apps/dot-claude/commands/{namespace}/{skill.name}
       elif skill.format == 'agentskills':
           mkdir -p apps/dot-claude/skills/{skill.name}
           if skill.has_scripts:
               mkdir -p apps/dot-claude/skills/{skill.name}/scripts
           if skill.has_references:
               mkdir -p apps/dot-claude/skills/{skill.name}/references
           if skill.has_assets:
               mkdir -p apps/dot-claude/skills/{skill.name}/assets
   ```

2. **Write Skill Files**:
   ```python
   for skill in refined_skills:
       if skill.format == 'claude':
           Write(f"apps/dot-claude/commands/{namespace}/{skill.name}/{skill.name}.md", skill.content)
       elif skill.format == 'agentskills':
           Write(f"apps/dot-claude/skills/{skill.name}/SKILL.md", skill.main_content)
           for ref_file in skill.reference_files:
               Write(f"apps/dot-claude/skills/{skill.name}/{ref_file.path}", ref_file.content)
           for script in skill.scripts:
               Write(f"apps/dot-claude/skills/{skill.name}/scripts/{script.name}", script.content)
   ```

3. **Validate Generated Files**:
   ```python
   for skill in refined_skills:
       if skill.format == 'claude':
           # Verify YAML frontmatter is present and parseable
           assert skill.content.startswith('---')
           assert 'description:' in skill.content
           # Verify file is under 500 lines
           assert len(skill.content.splitlines()) <= 500

       elif skill.format == 'agentskills':
           # Verify required frontmatter fields
           assert 'name:' in skill.main_content
           assert 'description:' in skill.main_content
           # Verify name matches directory
           name_in_frontmatter = extract_name(skill.main_content)
           assert name_in_frontmatter == skill.name
           # Verify name constraints
           assert len(name_in_frontmatter) <= 64
           assert name_in_frontmatter == name_in_frontmatter.lower()
           assert not name_in_frontmatter.startswith('-')
           assert not name_in_frontmatter.endswith('-')
           assert '--' not in name_in_frontmatter
           assert 'anthropic' not in name_in_frontmatter
           assert 'claude' not in name_in_frontmatter
   ```

4. **Generate Summary Report**:
   ```markdown
   ## Skill Build Summary

   ### Skills Created: [COUNT]
   | Skill | Format | Location | Status |
   |-------|--------|----------|--------|
   | [name] | [claude/agentskills] | [path] | [status] |

   ### Execution Metrics
   - Phase 1 (Research): [DEPTH] depth
   - Phase 2 (Draft): Completed
   - Phase 3 (Refine): Completed

   ### Files Created
   - [List of all files created with paths]

   ### Next Steps
   - [ ] Review generated skill(s) before production use
   - [ ] Test with representative inputs
   - [ ] If Claude Code format: copy to .claude/commands/ for activation
   - [ ] If AgentSkills.io format: validate with `skills-ref validate ./skill-name`
   ```

## Smart Multiplexing

The command scales based on the number of skills being built:

- **1 skill, 1 format**: 1 researcher → 1 drafter → 1 refiner (sequential phases)
- **1 skill, both formats**: 1 researcher → 2 drafters → 2 refiners
- **N skills**: N researchers → N*formats drafters → N*formats refiners (concurrent within phase)

## Namespace Categorization

When generating Claude Code commands, determine the namespace using this decision tree:

```python
def categorize_namespace(skill):
    name = skill.name.lower()
    desc = skill.description.lower()
    combined = name + ' ' + desc

    # Check for Linear/project management keywords
    if any(kw in combined for kw in ['linear', 'sprint', 'epic', 'issue', 'backlog', 'ticket']):
        return 'product/ops/linear'

    # Check for product management keywords
    if any(kw in combined for kw in ['prd', 'roadmap', 'stakeholder', 'prioritiz', 'product']):
        return 'product/ops'

    # Check for UI/UX keywords
    if any(kw in combined for kw in ['design', 'ui', 'ux', 'figma', 'component', 'layout', 'css']):
        return 'uiux/ui_design'

    # Check for infrastructure/DevOps keywords
    if any(kw in combined for kw in ['deploy', 'docker', 'k8s', 'kubernetes', 'terraform',
                                      'ci/cd', 'pipeline', 'monitor', 'infra', 'helm']):
        return 'eng/infra'

    # Check for documentation keywords
    if any(kw in combined for kw in ['doc', 'readme', 'api-doc', 'changelog', 'wiki']):
        return 'eng/docs'

    # Default: software engineering
    return 'eng/dev'
```

| Domain | Namespace | Keywords | Examples |
|--------|-----------|----------|----------|
| Software engineering | `eng/dev` | git, test, lint, code, build | lint-fix, test-runner |
| Linear/project management | `product/ops/linear` | linear, sprint, epic, issue | refine-issue, sprint-plan |
| Product management | `product/ops` | prd, roadmap, product | prd-meeting |
| UI/UX design | `uiux/ui_design` | design, ui, ux, figma | design-brainstorm |
| DevOps, infrastructure | `eng/infra` | deploy, docker, k8s, terraform | deploy, monitor |
| Documentation | `eng/docs` | doc, readme, changelog | doc-gen, api-docs |

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
        # Continue - don't block draft phase

# Phase 2 failures (draft)
for i, result in enumerate(draft_results):
    if result.failed:
        log_warning(f"Draft for {specs[i].name} failed - retrying once")
        retry_result = retry_draft(specs[i], simplified=True)
        if retry_result.failed:
            failed_skills.append(specs[i].name)
            continue  # Skip to next skill

# Phase 3 failures (refine)
for i, result in enumerate(refine_results):
    if result.failed:
        log_warning(f"Refinement for {specs[i].name} failed - using draft version")
        refined_skills[i] = draft_results[i]  # Fall back to unrefined draft

# Report partial success
if failed_skills:
    print(f"⚠️ {len(failed_skills)} skill(s) failed: {', '.join(failed_skills)}")
    print(f"✅ {len(specs) - len(failed_skills)} skill(s) created successfully")
```

## Best Practices

1. **Match format to use case**:
   - `claude`: For commands used within Claude Code sessions
   - `agentskills`: For portable skills that work across agents
   - `both`: When you want maximum reach

2. **Use reference contexts** when adapting existing patterns
3. **Choose appropriate depth**:
   - Light: Well-understood domains with clear patterns
   - Normal: Standard production skills
   - Deep: Complex, novel, or safety-critical implementations
4. **Review generated skills** before deploying to production
5. **Test with representative inputs** across different scenarios

## Anti-Patterns (Avoid These)

```bash
# BAD: Vague specification - produces generic, unhelpful skills
/skill-build "helper for documents"

# GOOD: Specific scope and purpose
/skill-build "Extract tables from PDF files and convert to CSV format"

# BAD: Too broad - single responsibility violated
/skill-build "all-in-one: code review, testing, deployment, and monitoring"

# GOOD: Focused single-purpose skills
/skill-build "code-review: review PR for security and performance issues"

# BAD: Unnecessary depth for simple domains
/skill-build "hello-world greeter" --depth deep

# GOOD: Match depth to complexity
/skill-build "hello-world greeter" --depth light
```

### Common Mistakes in Generated Skills

| Mistake | Fix |
|---------|-----|
| `Bash` without specifics | Use `Bash(git:*)` or `Bash(npm:*)` |
| Description says "I can help you..." | Use third person: "Extracts data from..." |
| Vague description: "Helps with files" | Specific: "Extract text from PDFs, fill forms" |
| Body >500 lines without splitting | Move details to docs/ or references/ |
| Nested reference chains (A→B→C) | Keep references one level deep from main file |
| Magic numbers in scripts | Document all constants with justification |
| `name: My-Skill` (AgentSkills) | Must be lowercase: `name: my-skill` |

---
name: building-subagents
description: Systematically creates production-ready Claude Code subagents with research, drafting, and refinement phases. Use when you need a new specialized agent for a specific domain or task pattern.
---

# Building Subagents

Create production-ready Claude Code subagents through structured research and refinement.

## Usage

```
/building-subagents <agent-name> [options]
```

## Arguments

**Agent Name** (required):
- Name for the new subagent (kebab-case)

**Options:**
- `--domain DOMAIN`: Primary domain (e.g., frontend, backend, security)
- `--research-depth LEVEL`: quick | medium | thorough (default: medium)
- `--output DIR`: Output directory (default: `.claude/agents/`)
- `--interactive`: Step through creation with prompts

## Examples

```bash
# Create a new agent
/building-subagents database-migration-agent --domain database

# Quick agent creation
/building-subagents api-testing-agent --research-depth quick

# Interactive mode
/building-subagents security-review-agent --interactive
```

## Workflow

### Phase 1: Research

**Understand the Domain:**
```python
research_prompts = [
    "What are the key responsibilities for a {domain} specialist?",
    "What tools and patterns are commonly used in {domain}?",
    "What are common pitfalls and best practices in {domain}?",
    "What existing agents or patterns could inform this design?"
]

# Research existing agents
existing_agents = glob(".claude/agents/*.md")
relevant_agents = find_similar(existing_agents, domain)
```

**Research Depth Levels:**

| Level | Actions |
|-------|---------|
| quick | Review existing agents, basic domain knowledge |
| medium | + Web search for patterns, analyze codebase |
| thorough | + Multiple sources, validate with examples |

### Phase 2: Draft Agent

**Agent Structure:**
```yaml
---
name: {agent-name}
description: {Detailed description in third person, including when to use}
tools:
  - {tool1}
  - {tool2}
---

# {Agent Name}

## Role
{Clear definition of agent's purpose and expertise}

## Capabilities
- {Capability 1}
- {Capability 2}

## Guidelines
{Specific instructions for how agent should operate}

## Workflow
{Step-by-step process agent follows}

## Output Format
{Expected output structure}
```

**Description Best Practices:**
- Write in third person ("Specializes in..." not "I specialize in...")
- Include "when to use" context
- Be specific about capabilities
- Under 1024 characters

### Phase 3: Tool Selection

Select appropriate tools based on agent purpose:

| Category | Tools |
|----------|-------|
| File operations | Read, Write, Edit, MultiEdit, Glob, Grep |
| Execution | Bash, Task |
| Web | WebFetch, WebSearch |
| PM Integration | pm-context tools |
| Code analysis | Bash(ast-grep:*), Bash(rg:*) |

**Principle of Least Privilege:**
Only grant tools the agent actually needs.

### Phase 4: Refinement

**Validation Checks:**
- [ ] Name follows kebab-case
- [ ] Description under 1024 chars
- [ ] Description in third person
- [ ] Tools are minimal and appropriate
- [ ] Guidelines are actionable
- [ ] Workflow is clear

**Test Scenarios:**
```python
test_prompts = [
    "Simple task in domain",
    "Complex multi-step task",
    "Edge case scenario",
    "Error handling scenario"
]

for prompt in test_prompts:
    # Mentally walk through agent's response
    validate_response_quality(agent, prompt)
```

### Phase 5: Output

Write agent file:
```bash
.claude/agents/{agent-name}.md
```

Generate report:
```markdown
## Subagent Created: {agent-name}

### Summary
- Name: {agent-name}
- Domain: {domain}
- Tools: {tool_count} tools granted

### Description
{agent.description}

### File
{output_path}

### Testing Suggestions
1. Test with: "{test_prompt_1}"
2. Test with: "{test_prompt_2}"

### Integration
Add to Task tool calls:
```python
Task.invoke(
    prompt="...",
    subagent_type="{agent-name}"
)
```
```

## Agent Template

```markdown
---
name: {name}
description: {One sentence. What it does and when to use it. Third person. Under 1024 chars.}
tools:
  - Read
  - Glob
  - Grep
  - {additional tools}
---

# {Display Name}

## Role

You are a specialized agent for {domain}. You excel at:
- {Strength 1}
- {Strength 2}
- {Strength 3}

## Guidelines

1. **{Guideline category 1}**
   - {Specific instruction}
   - {Specific instruction}

2. **{Guideline category 2}**
   - {Specific instruction}

## Workflow

1. **Understand**: {What to analyze first}
2. **Plan**: {How to approach the task}
3. **Execute**: {How to perform the work}
4. **Validate**: {How to verify success}
5. **Report**: {What to return to caller}

## Output Format

Return results in this format:

```markdown
## {Task Type} Complete

### Summary
{Brief summary}

### Details
{Detailed findings/results}

### Recommendations
{If applicable}
```
```

## Best Practices

1. **Focused purpose** - One agent, one domain
2. **Clear triggers** - Description says when to use
3. **Minimal tools** - Only what's needed
4. **Actionable guidelines** - Specific, not vague
5. **Structured output** - Consistent format

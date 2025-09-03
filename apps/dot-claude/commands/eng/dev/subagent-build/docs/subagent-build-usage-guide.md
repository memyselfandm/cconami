# Subagent Build Usage Guide

## Introduction

The `subagent-build` command automates the creation of Claude Code subagents using a proven 3-phase methodology that ensures production-ready implementations. This guide covers all aspects of using the command effectively.

## Core Concepts

### 3-Phase Execution Model
1. **Research Phase**: Context engineers gather domain knowledge
2. **Draft Phase**: Subagent architects create initial implementation
3. **Refine Phase**: Second-pass review and polishing

### Smart Multiplexing
The command automatically scales execution based on the number of agents:
- 1 agent = Sequential execution through phases
- N agents = N concurrent workers per phase

### Configurable Research Depth
Control the thoroughness of research based on your needs:
- **Light**: Quick patterns from primary sources
- **Normal**: Balanced research with examples
- **Deep**: Exhaustive analysis with comparisons

## Input Sources

### Natural Language Descriptions
Describe what you want in plain English:
```bash
/subagent-build "Create a Python testing specialist with pytest expertise"
```

The command will:
1. Parse the description
2. Generate an appropriate agent name
3. Research testing patterns
4. Create the subagent

### Linear Issues
Use existing Linear issues as specifications:
```bash
# Single issue
/subagent-build CCC-123

# Multiple issues
/subagent-build CCC-123,CCC-124,CCC-125
```

The command fetches issue details including:
- Title and description
- Acceptance criteria
- Technical requirements
- Labels and metadata

### Markdown Specifications
Create detailed specifications in markdown:
```bash
/subagent-build @specs/security-scanner.md
```

Specification format:
```markdown
# Security Scanner Agent

## Purpose
Automated security vulnerability detection and reporting

## Capabilities
- Static code analysis
- Dependency scanning
- OWASP compliance checking

## Tools Required
- Read, Write, Bash, WebFetch
```

## Configuration Options

### Research Depth (`--depth`)

Choose appropriate depth for your use case:

#### Light Research (2-3 sources, ~2 minutes)
```bash
/subagent-build "simple formatter" --depth light
```
Best for:
- Well-documented domains
- Simple utilities
- Quick prototypes

#### Normal Research (5 sources, ~5 minutes)
```bash
/subagent-build "api handler" --depth normal  # or omit, it's default
```
Best for:
- Production features
- Standard implementations
- Balanced time/quality

#### Deep Research (8-10 sources, ~10 minutes)
```bash
/subagent-build "distributed consensus agent" --depth deep
```
Best for:
- Complex domains
- Critical systems
- Novel implementations

### Reference Context (`--context`)

Bias research toward existing implementations:
```bash
/subagent-build "monitoring agent" \
  --context https://github.com/prometheus/prometheus
```

With reference context:
- 70-80% focus on analyzing the reference
- 20-30% additional research for alternatives
- Extracts patterns and best practices

### Additional Research (`--research`)

Provide supplementary sources:
```bash
/subagent-build "blockchain agent" \
  --research https://ethereum.org/developers,https://docs.soliditylang.org
```

These URLs are included in the research phase regardless of depth setting.

## Multi-Agent Configuration

### Configuring Multiple Agents

When building multiple agents, configurations can be specified per-agent using comma separation:

```bash
/subagent-build "agent1" "agent2" "agent3" \
  --depth light,normal,deep \
  --context https://ref1.com,,https://ref3.com \
  --research https://docs1.com,https://docs2.com,
```

Configuration mapping:
- agent1: light depth, ref1.com context, docs1.com research
- agent2: normal depth, no context, docs2.com research
- agent3: deep depth, ref3.com context, no additional research

### Configuration Expansion

If fewer configurations than agents:
```bash
/subagent-build "agent1" "agent2" "agent3" --depth deep
# All agents get deep research
```

If more configurations than agents:
```bash
/subagent-build "agent1" --depth light,normal,deep
# agent1 gets light, extra configs ignored
```

## Execution Flow

### 1. Input Parsing
```
Input → Parse specs → Extract names → Align configs
```

### 2. Phase 1: Research
```
For each agent:
  → Configure context engineer
  → Set research depth
  → Add reference context (if any)
  → Launch research
```

### 3. Phase 2: Draft
```
For each agent:
  → Pass research results
  → Pass specifications
  → Create initial implementation
  → Follow Claude Code templates
```

### 4. Phase 3: Refine
```
For each agent:
  → Review draft implementation
  → Validate best practices
  → Polish for production
  → Optimize activation triggers
```

### 5. Post-Processing
```
→ Create directory structure
→ Write agent files
→ Update documentation
→ Update Linear issues (if applicable)
→ Generate summary report
```

## Advanced Usage

### Mixed Input Sources
```bash
/subagent-build CCC-123 "custom agent" @spec.md \
  --depth normal,deep,light
```

### Selective Configuration
```bash
# Only agent 2 gets reference context
/subagent-build "a1" "a2" "a3" --context ,https://example.com,
```

### Dry Run Mode
```bash
/subagent-build "complex agent" --depth deep --dry-run
```
Shows execution plan without running agents.

## Best Practices

### 1. Choose Appropriate Depth
- Start with `normal` for most cases
- Use `light` for quick iterations
- Reserve `deep` for critical components

### 2. Leverage Reference Contexts
- Find similar successful implementations
- Let the tool extract patterns
- Saves research time

### 3. Batch Related Agents
```bash
/subagent-build "frontend-agent" "backend-agent" "api-agent"
```
Related agents benefit from shared context.

### 4. Review Before Production
- Check generated implementations
- Verify tool permissions
- Test activation triggers

### 5. Use Linear for Tracking
Create Linear issues for agents, then:
```bash
/subagent-build CCC-301,CCC-302,CCC-303
```

## Troubleshooting

See [Troubleshooting Guide](./subagent-build-troubleshooting.md) for common issues.

## Examples

See [Example Output](./subagent-build-example-output.md) for sample executions.
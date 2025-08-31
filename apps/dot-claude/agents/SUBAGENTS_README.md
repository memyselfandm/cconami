# Claude Code Subagents

Specialized AI agents that extend Claude Code's capabilities for specific domains and tasks.

## Available Subagents

### 🏗️ subagent-architect
**Purpose**: Expert Claude Code subagent architect  
**Use When**: Creating new subagents, optimizing agent definitions, or designing multi-agent workflows  
**Tools**: Read, Write, MultiEdit, Grep  
**Key Features**:
- Designs modular agent profiles with clear role definitions
- Implements context isolation strategies
- Creates straightforward delegation patterns
- Follows Claude Code best practices

### 🔧 slash-command-architect
**Purpose**: Specialist for Claude Code slash commands  
**Use When**: Designing, creating, reviewing, or improving slash commands  
**Tools**: Read, Grep, Glob, Write, WebFetch  
**Key Features**:
- **Creation Mode**: Builds new slash commands from scratch
- **Review Mode**: Validates and improves existing commands
- Ensures minimal tool permissions
- Follows slash command best practices
- Validates security and performance

### 📚 context-engineering-subagent
**Purpose**: Optimizes AI agent context through research and documentation  
**Use When**: Building comprehensive context for AI agents  
**Tools**: WebFetch, Write, MultiEdit, Glob, Grep  
**Key Features**:
- Multi-source research and documentation analysis
- Evidence-based context engineering (arxiv 2508.08322v1)
- Creates optimized CLAUDE.md files
- Synthesizes information from multiple sources

### 📝 notion-workspace-architect
**Purpose**: Designs and implements Notion workspace structures  
**Use When**: Creating or reorganizing Notion workspaces  
**Tools**: Notion MCP tools, Write, MultiEdit  
**Key Features**:
- Creates databases, pages, and templates
- Implements information architecture
- Sets up workflows and automations
- Follows Notion best practices

## Usage

Subagents are automatically invoked by Claude Code when their specialized expertise is needed. They can also be explicitly called using the Task tool.

### Automatic Invocation
Claude Code will proactively use subagents when:
- Their description matches the current task
- The primary agent recognizes the need for specialized expertise
- The task complexity warrants delegation

### Manual Invocation
```bash
# Example: Using Task tool to invoke a subagent
Task.invoke({
  subagent_type: "slash-command-architect",
  description: "Review the git-status command",
  prompt: "Review and validate the existing git-status slash command for best practices"
})
```

## Best Practices

1. **Use Proactively**: Don't wait to be asked - use subagents when their expertise applies
2. **Delegate Complex Tasks**: Let specialists handle domain-specific work
3. **Review Mode**: Use review capabilities to validate existing implementations
4. **Context Isolation**: Each subagent maintains its own focused context
5. **Tool Minimization**: Subagents only have access to necessary tools

## Creating New Subagents

To create a new subagent:

1. Use the `subagent-architect` to design the agent
2. Create a new directory in `apps/dot-claude/agents/`
3. Add a markdown file with YAML frontmatter:

```yaml
---
name: your-agent-name
description: Clear description of when to use this agent
tools: List, Of, Required, Tools
color: optional-color
model: optional-model-preference
---

# Purpose
[Agent's specialized purpose and expertise]

## Instructions
[Detailed operational instructions]

## Best Practices
[Domain-specific best practices]

## Report Format
[Expected output format]
```

## Subagent Selection Criteria

Claude Code selects subagents based on:
- **Task Match**: Description alignment with current task
- **Proactive Keywords**: "Use proactively" in description
- **Specialization Need**: Task requires domain expertise
- **Complexity**: Task warrants delegation

## Updates and Improvements

### Recent Updates (Aug 2025)
- **slash-command-architect**: Added Review Mode for validating existing commands
- **context-engineering-subagent**: Implemented arxiv best practices
- **notion-workspace-architect**: Added support for complex database structures

## Contributing

When adding or modifying subagents:
1. Ensure clear, action-oriented descriptions
2. Minimize tool permissions
3. Include both creation and review capabilities where applicable
4. Document expected inputs and outputs
5. Test with various scenarios

## Related Documentation

- [Claude Code Subagents Documentation](../../ai_docs/knowledge/claude-code-subagents-docs.md)
- [CLAUDE.md Best Practices](../../CLAUDE.md)
- [Commands Documentation](../commands/COMMANDS_README.md)
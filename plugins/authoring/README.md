# authoring

Skills and subagents for building agent tooling.

```
/plugin install authoring --marketplace memyselfandm/cconami
```

## Skills

| Skill | What it does |
|---|---|
| `building-skills` | Researches, drafts and validates new skills, for Claude Code or the AgentSkills.io format |
| `building-subagents` | Creates Claude Code subagent definitions |
| `scraping-documentation` | Scrapes a documentation site into organized markdown |
| `ralph-config` | Generates `ralph.yml` and `PROMPT.md` for Ralph Orchestrator workflows from a plan, ticket or idea |

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

### 🕸️ langgraph-engineer
**Purpose**: Specialist for LangGraph framework implementations and multi-agent systems  
**Use When**: Building production-ready LangGraph applications, hierarchical agent teams, durable execution, checkpointing, or state management  
**Tools**: Read, Write, Edit, MultiEdit, Bash, WebFetch, Grep, Glob, Task  
**Key Features**:
- Multi-agent orchestration (hierarchical, supervisor, collaborative, sequential)
- State management with persistent checkpointing and recovery
- Production deployment patterns for LangGraph Cloud
- Enterprise-grade implementations with monitoring and observability
- Human-in-the-loop workflows and streaming applications

### 🎨 frontend-designer
**Purpose**: UI/UX implementation and frontend architecture specialist  
**Use When**: Building components, design systems, responsive layouts, accessibility compliance, or modern framework development  
**Tools**: Read, Write, Edit, Grep, Glob, LS  
**Key Features**:
- Component architecture with atomic design principles
- WCAG 2.1 AA accessibility compliance built-in
- Modern framework expertise (React/Next.js, Vue/Nuxt.js, Svelte)
- Design system creation and maintenance automation
- Performance optimization and Core Web Vitals improvement

### 🗄️ database-engineer
**Purpose**: Multi-database schema design and optimization specialist  
**Use When**: Database design, query optimization, migration management, or multi-database architecture tasks  
**Tools**: Read, Write, Edit, MultiEdit, Bash, WebFetch, Grep, Glob, Task  
**Key Features**:
- Multi-database expertise (PostgreSQL, MongoDB, Redis, Supabase, cloud-native)
- Automated migration strategies with zero-downtime deployments
- Performance tuning and query optimization across database systems
- Adaptive capabilities with context-aware specialization modes
- Cloud-native integration and vector database support

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
  subagent_type: "subagent-architect",
  description: "Review the context-engineering-subagent definition",
  prompt: "Review and validate the existing subagent definition for best practices"
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
2. Add a markdown file to `plugins/authoring/agents/` (or to a project's `.claude/agents/`) with YAML frontmatter:

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

### Recent Updates (Sep 2025)
- **langgraph-engineer**: NEW - Specialist for LangGraph framework and multi-agent systems
- **frontend-designer**: NEW - UI/UX implementation with accessibility-first approach  
- **database-engineer**: NEW - Multi-database expertise with adaptive specialization modes

### Previous Updates (Aug 2025)
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

- [Claude Code subagents documentation](https://code.claude.com/docs/en/sub-agents)
- [building-subagents](skills/building-subagents/SKILL.md), the skill for writing a new subagent
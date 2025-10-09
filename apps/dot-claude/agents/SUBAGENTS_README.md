# Claude Code Subagents

Specialized AI agents organized by domain that extend Claude Code's capabilities for specific areas of expertise. The system uses a hierarchical Domain-Driven Design (DDD) approach with agents categorized into four primary domains.

## Architecture Overview

### Domain-Based Organization
The subagent system is organized into specialized domains:
- **`meta/`** - Claude Code enhancement and system-level tools
- **`eng/`** - Engineering, technical implementation, and development  
- **`product/`** - Product management, operations, and strategy
- **`uiux/`** - User interface, user experience, and design

This hierarchical structure enables:
- **Scalable Context Loading**: Domain-specific agents load only relevant context
- **Clear Separation of Concerns**: Each domain handles distinct responsibilities
- **Unlimited Domain Expansion**: New domains can be added without affecting existing ones
- **Performance Optimization**: Agents operate independently within their domain scope

## Available Subagents (10 Total)

### 🔧 Meta Domain (3 agents)
**Purpose**: Claude Code enhancement and system-level automation

#### meta/claude-code/subagent-architect
**Purpose**: Expert Claude Code subagent architect  
**Use When**: Creating new subagents, optimizing agent definitions, or designing multi-agent workflows  
**Tools**: Read, Write, MultiEdit, Grep  
**Quality Tier**: ⭐⭐⭐ Top-tier (follows Anthropic XML best practices)
**Key Features**:
- Designs modular agent profiles with clear role definitions
- Implements context isolation strategies
- Creates straightforward delegation patterns
- Follows Claude Code and Anthropic best practices

#### meta/claude-code/slash-command-architect
**Purpose**: Specialist for Claude Code slash commands  
**Use When**: Designing, creating, reviewing, or improving slash commands  
**Tools**: Read, Grep, Glob, Write, WebFetch  
**Quality Tier**: ⭐⭐⭐ Top-tier (follows Anthropic XML best practices)
**Key Features**:
- **Creation Mode**: Builds new slash commands from scratch
- **Review Mode**: Validates and improves existing commands
- Ensures minimal tool permissions and security best practices
- Validates command structure and performance

#### meta/claude-code/context-engineering-subagent
**Purpose**: Optimizes AI agent context through research and documentation  
**Use When**: Building comprehensive context for AI agents or researching domain knowledge  
**Tools**: WebFetch, Write, MultiEdit, Glob, Grep  
**Quality Tier**: ⭐⭐⭐ Top-tier (follows Anthropic XML best practices)
**Key Features**:
- Multi-source research and documentation analysis
- Evidence-based context engineering (based on arxiv 2508.08322v1)
- Creates optimized CLAUDE.md files
- Synthesizes information from multiple sources

### 🛠️ Engineering Domain (4 agents)
**Purpose**: Technical implementation, development, and system architecture

#### eng/core/engineering-agent
**Purpose**: Full-stack development and architecture specialist  
**Use When**: Complex technical tasks requiring broad engineering expertise  
**Tools**: Read, Write, Edit, MultiEdit, Bash, WebFetch, Grep, Glob, Task, ExitPlanMode, NotebookEdit  
**Quality Tier**: ⚠️ Needs Major Work (too many tools, mixed purposes, lacks focus)
**Key Features**:
- Broad technical implementation capabilities
- Full-stack development support
- **Note**: Currently over-permissioned with 11 tools; needs refactoring for focused purpose

#### eng/ai/langgraph-engineer
**Purpose**: Specialist for LangGraph framework implementations and multi-agent systems  
**Use When**: Building production-ready LangGraph applications, hierarchical agent teams, durable execution, checkpointing, or state management  
**Tools**: Read, Write, Edit, MultiEdit, Bash, WebFetch, Grep, Glob, Task  
**Quality Tier**: ⭐⭐ Mid-tier (good structure, could benefit from XML formatting)
**Key Features**:
- Multi-agent orchestration (hierarchical, supervisor, collaborative, sequential)
- State management with persistent checkpointing and recovery
- Production deployment patterns for LangGraph Cloud
- Enterprise-grade implementations with monitoring and observability

#### eng/data/database-engineer
**Purpose**: Multi-database schema design and optimization specialist  
**Use When**: Database design, query optimization, migration management, or multi-database architecture tasks  
**Tools**: Read, Write, Edit, MultiEdit, Bash, WebFetch, Grep, Glob, Task  
**Quality Tier**: ⭐⭐ Mid-tier (comprehensive but could improve structure)
**Key Features**:
- Multi-database expertise (PostgreSQL, MongoDB, Redis, Supabase, cloud-native)
- Automated migration strategies with zero-downtime deployments
- Performance tuning and query optimization across database systems
- Adaptive capabilities with context-aware specialization modes

#### eng/ai/claude-agent-sdk-python
**Purpose**: Python SDK development specialist for Claude Agent SDK  
**Use When**: Building Python applications with Claude Agent SDK, MCP server development, or agent framework implementation  
**Tools**: Read, Write, Bash  
**Quality Tier**: ⚠️ Needs Major Work (minimal tools, unclear scope, lacks comprehensive definition)
**Key Features**:
- Python SDK development and implementation
- **Note**: Needs expansion and better tool permissions

### 🎯 Product Domain (1 agent)
**Purpose**: Product management, operations, and strategy

#### product/ops/notion-workspace-architect
**Purpose**: Designs and implements Notion workspace structures  
**Use When**: Creating or reorganizing Notion workspaces, databases, or productivity systems  
**Tools**: Notion MCP tools, Write, MultiEdit  
**Quality Tier**: ⭐⭐ Mid-tier (specialized tools but could improve structure)
**Key Features**:
- Creates databases, pages, and templates
- Implements information architecture best practices
- Sets up workflows and automations
- Follows Notion workspace organization patterns

### 🎨 UI/UX Domain (1 agent)
**Purpose**: User interface, user experience, and design

#### uiux/design/frontend-designer
**Purpose**: UI/UX implementation and frontend architecture specialist  
**Use When**: Building components, design systems, responsive layouts, accessibility compliance, or modern framework development  
**Tools**: Read, Write, Edit, Grep, Glob, LS  
**Quality Tier**: ⭐⭐ Mid-tier (good scope but needs better tool organization)
**Key Features**:
- Component architecture with atomic design principles
- WCAG 2.1 AA accessibility compliance built-in
- Modern framework expertise (React/Next.js, Vue/Nuxt.js, Svelte)
- Design system creation and maintenance automation

## Quality Analysis & Recommendations

### Quality Tiers
- **⭐⭐⭐ Top-tier (3 agents)**: Follow Anthropic XML best practices, well-defined scope, appropriate tools
- **⭐⭐ Mid-tier (3 agents)**: Good functionality but need structural improvements
- **⚠️ Needs Major Work (3 agents)**: Require significant refactoring or expansion
- **🔴 Concerning (1 agent)**: The engineering-agent has fundamental issues with scope and tool permissions

### Key Issues Identified
1. **Tool Over-Permissioning**: Some agents have 7-11 tools when 3-4 would suffice
2. **Mixed Purposes**: The engineering-agent tries to do too many things
3. **Inconsistent Standards**: Only 3/10 agents follow Anthropic's XML best practices
4. **Variable Tool Counts**: Range from 3-11 tools per agent indicates inconsistent scoping

### Improvement Recommendations
1. **Refactor engineering-agent**: Split into focused, single-purpose agents
2. **Standardize XML Formatting**: Convert all agents to Anthropic's XML best practices
3. **Optimize Tool Permissions**: Reduce tool counts to minimum necessary for each agent
4. **Add Missing Agents**: Consider agents for testing, security, DevOps, product strategy

## Usage

### Automatic Invocation
Claude Code will proactively use subagents when:
- Their description matches the current task
- The primary agent recognizes the need for specialized expertise
- The task complexity warrants delegation to domain specialists

### Manual Invocation
```bash
# Example: Using Task tool to invoke a subagent
@subagent-architect to review and improve the database-engineer agent structure
```

### Domain-Specific Usage Patterns
```bash
# Meta domain: Improving Claude Code system
@subagent-architect for agent creation
@slash-command-architect for command creation/review
@context-engineering-subagent for research and documentation

# Engineering domain: Technical implementation
@langgraph-engineer for multi-agent systems
@database-engineer for data layer work
@engineering-agent for general development (use sparingly due to scope issues)

# Product domain: Product management
@notion-workspace-architect for workspace design

# UI/UX domain: Design and user experience
@frontend-designer for component and design system work
```

## Best Practices

### Agent Selection Guidelines
1. **Choose Domain-Specific Agents**: Prefer specialized agents over general-purpose ones
2. **Consider Quality Tiers**: Prioritize top-tier agents for critical tasks
3. **Review Mode Capabilities**: Use agents with review modes for validating existing work
4. **Tool Requirements**: Match agent tool permissions to task requirements

### Development Standards
1. **Follow Anthropic XML Best Practices**: Use structured XML formatting for agent instructions
2. **Minimal Tool Permissions**: Grant only necessary tools to each agent
3. **Single Responsibility**: Each agent should have a clear, focused purpose
4. **Domain Alignment**: Place agents in appropriate domain hierarchies

## Directory Structure

```
agents/
├── meta/                    # Claude Code enhancement tools
│   └── claude-code/
│       ├── subagent-architect/
│       ├── slash-command-architect/
│       └── context-engineering-subagent/
├── eng/                     # Engineering and technical implementation
│   ├── core/
│   │   └── engineering-agent/
│   ├── ai/
│   │   ├── langgraph-engineer/
│   │   └── claude-agent-sdk-python/
│   └── data/
│       └── database-engineer/
├── product/                 # Product management and operations
│   └── ops/
│       └── notion-workspace-architect/
└── uiux/                   # Design and user experience
    └── design/
        └── frontend-designer/
```

## Creating New Subagents

To create a new subagent:

1. **Use the subagent-architect**: `@subagent-architect` to design the agent
2. **Choose Appropriate Domain**: Place in `meta/`, `eng/`, `product/`, or `uiux/`
3. **Follow Naming Conventions**: Use kebab-case and descriptive names
4. **Implement Best Practices**: Follow Anthropic XML standards and minimal tool permissions

```yaml
---
name: your-agent-name
description: Clear description of when to use this agent (use proactively when...)
tools: [List, Of, Minimal, Required, Tools]
color: optional-color
model: optional-model-preference
---

<purpose>
Agent's specialized purpose and expertise
</purpose>

<instructions>
Detailed operational instructions using XML structure
</instructions>

<best_practices>
Domain-specific best practices and guidelines
</best_practices>
```

## Related Documentation

- [Claude Code Subagents Documentation](../../ai_docs/knowledge/claude-code-subagents-docs.md)
- [CLAUDE.md Best Practices](../../CLAUDE.md)
- [Commands Documentation](../commands/COMMANDS_README.md)
- [Anthropic Agent Best Practices](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/agent-patterns)
---
allowed-tools: Task, Read, Write, MultiEdit, Bash, Glob, Grep
argument-hint: <spec> [context ref-url] [depth light|normal|deep] [research urls] [dry-run]
description: Executes phased building of subagents with extensive context research using a 2-pass drafting system
---

# Subagent Build Command

Systematically create production-ready Claude Code subagents through a 3-phase process: Research → Draft → Refine. This command implements the successful pattern from CCC-16,17,18 with smart multiplexing and configurable research depth.

## Workflow

### Step 1: Parse Arguments
Parse natural language input from $ARGUMENTS to extract:

**Spec** (required):
- Natural language description(s) in quotes
- Linear issue IDs matching `CCC-NNN` pattern (comma-separated)
- Markdown file path with `@` prefix
- Multiple specs separated by spaces or commas

**Keywords** (optional):
- `dry-run` or `dry run` - Preview execution plan without running agents
- `context` followed by URL(s) - Reference implementation URLs (comma-separated)
  - When provided, research biases 70-80% toward the reference
  - Use commas to separate multiple references: `context url1,url2,url3`
  - Leave empty for specific agents to skip: `context url1,,url3`
- `depth` followed by level(s) - Research depth per agent (comma-separated)
  - `light`: 2-3 sources, quick patterns (2 min)
  - `normal`: 5 sources, balanced research (5 min) [default]
  - `deep`: 8-10 sources, exhaustive analysis (10 min)
  - Can specify per-agent: `depth deep,normal,light`
- `research` followed by URL(s) - Additional research URLs (comma-separated)
  - Supplementary sources for context engineers
  - Applied to all agents unless position-specific

**Examples of valid inputs:**
- `"Create testing automation subagent with pytest expertise"` - Single agent from description
- `CCC-123,CCC-124,CCC-125` - Multiple agents from Linear issues
- `@specs/new-agent.md` - From markdown specification file
- `"k8s-operator agent" context https://github.com/operator-framework/operator-sdk depth deep` - With reference and deep research
- `"api-agent: GraphQL specialist" "data-agent: ETL pipelines" depth deep,normal context https://ref1.com,` - Multiple agents with varied configs
- `CCC-123 dry-run` - Preview without execution

### Step 2: Parse Input & Configure

1. **Identify Input Type**:
   ```python
   # Determine specification source
   if input.startsWith('@'):
       specs = parse_markdown_file(input)
   elif input.matches('CCC-\d+'):
       specs = parse_linctl_output(bash(f"linctl issue get {issue_id} --json"))
   else:
       specs = parse_natural_language(input)
   ```

2. **Parse Configuration Arrays**:
   ```python
   # Split configuration by commas, align with agent count
   contexts = (args.context || '').split(',')
   depths = (args.depth || 'normal').split(',')
   research = (args.research || '').split(',')
   
   # Expand or truncate to match agent count
   for i in range(agent_count):
       agent_config[i] = {
           context: contexts[i] || contexts[0] || '',
           depth: depths[i] || depths[0] || 'normal',
           research: research[i] || research[0] || ''
       }
   ```

3. **Generate Agent Names**:
   ```python
   # Extract or generate kebab-case names
   for spec in specs:
       if spec.has_name:
           name = kebab_case(spec.name)
       else:
           name = generate_name_from_description(spec)
   ```

### Step 3: Phase 1 - Research (context-engineering-subagent)

**Multiplexing**: Deploy N context engineers for N specifications concurrently

1. **Configure Each Research Agent**:
   ```python
   for i, spec in enumerate(specs):
       prompts.append(f"""
       RESEARCH_DEPTH: {agent_config[i].depth}
       RESEARCH_FOCUS: {spec.description}
       {f"REFERENCE_CONTEXT: {agent_config[i].context}" if agent_config[i].context else ""}
       {f"ADDITIONAL_SOURCES: {agent_config[i].research}" if agent_config[i].research else ""}
       
       OBJECTIVE: Research patterns and best practices for creating a Claude Code subagent with the following specialization:
       
       {spec.full_description}
       
       {"Focus 70-80% on analyzing the provided reference implementation, using additional research only for validation and alternatives." if agent_config[i].context else ""}
       
       Generate a comprehensive context engineering report following your standard template, optimized for the subagent architect in Phase 2.
       """)
   ```

2. **Launch All Research Agents Concurrently**:
   ```python
   # In a single response, launch all research agents
   for i, prompt in enumerate(prompts):
       Task.invoke({
           subagent_type: "context-engineering-subagent",
           description: f"Research for agent {i+1}: {specs[i].name}",
           prompt: prompt
       })
   ```

3. **Collect Research Reports**:
   - Each agent generates a depth-appropriate research report
   - Light: 1-2 pages with key patterns
   - Normal: 3-5 pages with examples
   - Deep: 5-10 pages with comprehensive analysis

### Step 4: Phase 2 - Draft (subagent-architect)

**Multiplexing**: Deploy N architects for N specifications concurrently

1. **Configure Each Drafting Agent**:
   ```python
   for i, spec in enumerate(specs):
       prompts.append(f"""
       CREATE PRODUCTION-READY SUBAGENT: {spec.name}
       
       SPECIFICATION:
       {spec.full_description}
       
       RESEARCH CONTEXT:
       {research_reports[i]}
       
       REQUIREMENTS:
       - Follow Claude Code subagent template structure
       - Include "Use PROACTIVELY" in description for automatic delegation
       - Grant minimal necessary tool permissions
       - Ensure self-contained operation without external dependencies
       - Create comprehensive documentation in the agent definition
       
       TARGET NAME: {spec.name}
       TARGET FILE: apps/dot-claude/agents/{spec.name}/{spec.name}.md
       
       Generate the complete subagent markdown file with YAML frontmatter and full implementation.
       """)
   ```

2. **Launch All Drafting Agents Concurrently**:
   ```python
   # In a single response, launch all architects
   for i, prompt in enumerate(prompts):
       Task.invoke({
           subagent_type: "subagent-architect",
           description: f"Draft agent {i+1}: {specs[i].name}",
           prompt: prompt
       })
   ```

### Step 5: Phase 3 - Refine (subagent-architect in review mode)

**Multiplexing**: Deploy N architects for refinement concurrently

1. **Configure Each Refining Agent**:
   ```python
   for i, spec in enumerate(specs):
       prompts.append(f"""
       REVIEW AND REFINE SUBAGENT: {spec.name}
       
       CURRENT IMPLEMENTATION:
       {draft_agents[i]}
       
       ORIGINAL RESEARCH:
       {research_reports[i]}
       
       REVIEW CRITERIA:
       - Standards compliance with Claude Code conventions
       - Production readiness and error handling
       - Activation trigger optimization
       - Tool permission minimization
       - Documentation completeness
       - Self-contained operation validation
       
       REFINEMENT GOALS:
       - Polish the implementation for production deployment
       - Ensure optimal activation triggers for delegation
       - Validate all best practices are followed
       - Enhance documentation and examples
       
       Generate the refined, production-ready subagent implementation.
       """)
   ```

2. **Launch All Refining Agents Concurrently**:
   ```python
   # In a single response, launch all refinement agents
   for i, prompt in enumerate(prompts):
       Task.invoke({
           subagent_type: "subagent-architect",  
           description: f"Refine agent {i+1}: {specs[i].name}",
           prompt: prompt
       })
   ```

### Step 6: Post-Processing & Deployment

1. **Create Directory Structure**:
   ```bash
   for agent in refined_agents:
       mkdir -p apps/dot-claude/agents/{agent.name}
   ```

2. **Write Agent Files**:
   ```python
   for agent in refined_agents:
       Write(f"apps/dot-claude/agents/{agent.name}/{agent.name}.md", agent.content)
   ```

3. **Update Documentation**:
   ```python
   # Add new agents to SUBAGENTS_README.md
   update_subagents_readme(refined_agents)
   ```

4. **Update Linear Issues** (if applicable):
   ```python
   for issue_id in linear_issues:
       bash(f'linctl issue update {issue_id} --state "Done"')
       bash(f'linctl comment create {issue_id} --body "✅ Subagent created via subagent-build command"')
   ```

5. **Generate Summary Report**:
   ```markdown
   ## Subagent Build Summary
   
   ### Agents Created: [COUNT]
   - [agent-name]: [description] ✅
   
   ### Execution Metrics
   - Phase 1 (Research): [TIME] with [DEPTH] depth
   - Phase 2 (Draft): [TIME] 
   - Phase 3 (Refine): [TIME]
   - Total Time: [TOTAL]
   
   ### Configuration Used
   - Research Depth: [DEPTHS]
   - Reference Contexts: [CONTEXTS]
   - Multiplexing: [N] concurrent agents per phase
   
   ### Files Created
   - [List of agent files]
   ```

## Smart Multiplexing

The command automatically scales based on the number of agents being built:

- **1 agent**: 1 researcher → 1 drafter → 1 refiner (sequential)
- **3 agents**: 3 researchers → 3 drafters → 3 refiners (all concurrent within phase)
- **N agents**: N workers per phase, all executing concurrently

This ensures maximum efficiency while maintaining quality through the 2-pass implementation system.

## Configuration Examples

### Mixed Depth Configuration
```bash
/subagent-build "agent1" "agent2" "agent3" --depth light,deep,normal
# agent1 gets light research, agent2 gets deep, agent3 gets normal
```

### Selective Reference Context
```bash
/subagent-build "agent1" "agent2" "agent3" --context https://ref1.com,,https://ref3.com
# agent1 uses ref1, agent2 has no reference, agent3 uses ref3
```

### Linear Issue with Custom Depth
```bash
/subagent-build CCC-123 --depth deep --research https://extra-docs.com
# Fetches Linear issue, performs deep research with additional source
```

## Error Handling

- **Invalid Linear IDs**: Skip and report
- **Missing markdown files**: Report error and continue with others
- **Phase failures**: Retry once, then mark as failed
- **Partial success**: Create successful agents, report failures

## Best Practices

1. **Use reference contexts** when adapting existing implementations
2. **Choose appropriate depth**:
   - Light: Simple, well-documented domains
   - Normal: Standard production features
   - Deep: Complex, critical, or novel implementations
3. **Batch related agents** for better context sharing
4. **Review generated agents** before production use
5. **Test in isolated environment** first

## Success Criteria

- ✅ All specified agents created successfully
- ✅ Proper directory structure established
- ✅ Documentation updated automatically
- ✅ Linear issues updated (if applicable)
- ✅ Production-ready implementations on first deployment
- ✅ Execution completed within time targets (2/5/10 min per depth)
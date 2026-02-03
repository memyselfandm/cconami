# Sprint Execution

Launch parallel AI agents to implement sprint work with maximum safe concurrency.

## Usage

```
/managing-sprints execute <sprint-id> [--dry-run] [--max-agents N] [--phase PHASE]
```

## Workflow

### Step 1: Gather Sprint Context

Use Task tool to launch context-gathering agent:

```
Execute the following:
1. Fetch sprint project details via pm-context
2. Get all work items in the sprint
3. For each item, fetch:
   - Description and acceptance criteria
   - Labels (phase, area)
   - Priority
   - Dependencies
   - Child items
   - Comments for context
4. Return structured report of sprint items
```

See [prompts/project-context.md](prompts/project-context.md) for full prompt.

### Step 2: Code Analysis

For each feature, launch parallel analysis agents:

```
CRITICAL: Launch ALL analysis agents in a SINGLE response for parallelization
```

Each agent analyzes:
- Files that will be modified
- New files to create
- Dependencies between files
- Potential conflicts

See [prompts/code-analysis.md](prompts/code-analysis.md) for full prompt.

### Step 3: Conflict Analysis

From analysis results, generate conflict report:

```python
conflicts = []
for i, analysis1 in enumerate(analyses):
    for analysis2 in analyses[i+1:]:
        # Check file overlaps
        shared_files = set(analysis1.files) & set(analysis2.files)
        if shared_files:
            conflicts.append({
                "type": "file_overlap",
                "items": [analysis1.item, analysis2.item],
                "files": shared_files
            })

        # Check dependencies
        if analysis1.depends_on(analysis2) or analysis2.depends_on(analysis1):
            conflicts.append({
                "type": "dependency",
                "items": [analysis1.item, analysis2.item]
            })
```

### Step 4: Plan Execution

**Phase Assignment:**

1. Distribute items by phase labels or dependency chain:
   - Foundation: Must complete first
   - Features: Main work, maximize parallelization
   - Integration: After features complete

2. Validate distribution:
   - Foundation < 10%
   - Features > 70%
   - If unbalanced, re-evaluate parallelization

**Agent Assignment:**

Group items by:
- Stack area (frontend, backend, etc.)
- Codebase area (same files → same agent)
- Tight coupling

Guidelines:
- Max 4 parallel agents
- Complete functional domains per agent
- Balance complexity across agents

```python
agents = []
for group in logical_groups[:4]:
    agent = {
        "number": len(agents) + 1,
        "items": group.items,
        "specialization": determine_specialization(group),
        "files": group.all_files
    }
    agents.append(agent)
```

### Step 5: Validation

Before execution, verify:

```python
# No file conflicts between parallel agents
for i, agent1 in enumerate(parallel_agents):
    for agent2 in parallel_agents[i+1:]:
        shared = set(agent1.files) & set(agent2.files)
        if shared:
            raise ConflictError(f"File conflict: {shared}")

# Dependencies respected
for agent in parallel_agents:
    for item in agent.items:
        for dep in item.blocked_by:
            if dep not in completed_items:
                if dep not in agent.items:
                    raise DependencyError(f"{item} depends on {dep}")
```

### Step 6: Execute Phases

**Foundation Phase (Sequential):**

```python
for item in foundation_items:
    # Update status
    pm_context.transition_item(item.id, "In Progress")

    # Execute with single agent
    result = Task.invoke(
        prompt=execution_prompt(item),
        subagent_type="engineering-agent"
    )

    # Update on completion
    pm_context.transition_item(item.id, "Done")
    pm_context.add_comment(item.id, f"Completed by Agent-1")
```

**Features Phase (Parallel):**

```python
# Launch ALL agents in a SINGLE response
for agent in feature_agents:
    for item in agent.items:
        pm_context.transition_item(item.id, "In Progress")

    Task.invoke(
        prompt=execution_prompt(agent),
        subagent_type=agent.specialization or "engineering-agent",
        run_in_background=True
    )

# Monitor until all complete
while agents_running:
    status = check_agent_status()
    report_progress(status)
    sleep(30)

# Update completed items
for agent in feature_agents:
    for item in agent.items:
        pm_context.transition_item(item.id, "Done")
```

**Integration Phase:**

After features complete, run integration work.

### Step 7: Report Results

```markdown
## Sprint Execution Complete: {sprint_id}

### Summary
- Duration: {duration}
- Features: {completed}/{total}
- Tasks: {tasks_completed}/{tasks_total}

### Phase Results

**Foundation**
- Items: {count}
- Status: Complete

**Features**
- Agents: {agent_count}
- Parallel execution: {parallel_time}
- Items: {count}

**Integration**
- Items: {count}
- Status: Complete

### Agent Activity
{for agent in agents:}
**Agent-{agent.number}** ({agent.specialization})
- Items: {len(agent.items)}
- Files modified: {len(agent.files)}
- Duration: {agent.duration}

### Issues Encountered
{any blockers or problems}

### Next Steps
- Run `/managing-sprints review {sprint_id}`
- Or continue with next sprint
```

## Dry Run Mode

When `--dry-run`:
- Perform all analysis
- Show execution plan
- Don't launch agents
- Don't update items

## Execution Prompt Template

See [prompts/execution-agent.md](prompts/execution-agent.md) for the agent execution prompt.

---
allowed-tools: Bash(date:*), Bash(git status:*), Bash(git commit:*), Bash(mkdir:*), Task, Write, MultiEdit, mcp__linear__*
argument-hint: --issue <issue-id> | --issues <issue-ids> [--team <team-name>] [--force] [--dry-run]
description: (*Run from PLAN mode*) Execute one or more Linear issues using subagents with intelligent dependency analysis and maximum parallelization
---

# Linear Issue Execution Command
Execute specific Linear issues by ID with automatic dependency resolution, phase detection, and parallel subagent orchestration. Perfect for ad-hoc development, hot fixes, or executing individual features outside of sprint cycles.

## Usage
- `--issue <id>`: Execute a single Linear issue by ID (e.g., CCC-123)
- `--issues <ids>`: Execute multiple issues (comma-separated: CCC-123,CCC-124,CCC-125)
- `--team <name>`: (Optional) Specify team context for issue lookup
- `--force`: (Optional) Attempt execution even if blockers exist
- `--dry-run`: (Optional) Preview execution plan without running agents

The command automatically analyzes dependencies, assigns execution phases, and maximizes concurrency for independent issues.

**Agent Assignment Protocol:**
Each sub-agent receives:
1. **Issue Context**: Full Linear issue details with descriptions and acceptance criteria
2. **Dependencies**: Related issues, subtasks, and blocking relationships
3. **Specialization**: Role assignment based on issue labels and content
4. **Quality Standards**: Requirements from Linear issue specifications
5. **Update Protocol**: Linear issue IDs for progress tracking

**Sub-Agent Prompt Template:**
```
VARIABLES:
$agentnumber: [ASSIGNED NUMBER]
$linearIssueIds: [COMMA-SEPARATED LINEAR ISSUE IDS]
$linearIssueDetails: [ISSUE IDENTIFIERS, TITLES, DESCRIPTIONS, ACCEPTANCE CRITERIA]

ROLE: Act as a principal software engineer specializing in [SPECIALIZATIONS BASED ON ISSUE CONTENT]

CONTEXT:
- Linear Issues: $linearIssueIds with full details
- Related Documentation: @ai_docs/knowledge/*
- Execution Goals: Complete implementation of assigned issues

FEATURES TO IMPLEMENT:
[Linear issue descriptions, acceptance criteria, and technical requirements]

INSTRUCTIONS:
1. Implement the assigned Linear issues using test-driven development
2. Write meaningful tests that validate complete implementation
3. Do not git commit your work
4. Use Linear MCP to track progress:
   - Comment "🤖 Agent-$agentnumber starting work on $linearIssueIds" when beginning
   - Update issue status to "In Progress"
   - Comment progress updates at major milestones
   - Update subtask status to "Done" as completed
   - Comment final summary with files modified
5. Update main issue status to "In Review" when complete
6. Report completion with summary of implemented features

IMPORTANT: If you discover anything that prevents you from implementing the feature as described, STOP and report back to the main agent IMMEDIATELY. Do not implement placeholders or fallbacks unless explicitly required in the feature.
```

## Instructions

### Step 1: Parse Arguments & Validate
1. Extract issue ID(s) from command arguments
2. Parse optional team, force, and dry-run flags
3. Verify Linear MCP connectivity with `mcp__linear__list_teams`
4. Validate issue ID format (XXX-NNN pattern)

### Step 2: Fetch Issue Details
1. **Primary Issue Data**:
   ```python
   for issue_id in issue_ids:
       issue = mcp__linear__get_issue(issue_id)
       # Fetch complete details including:
       # - Description and acceptance criteria
       # - Labels (phase:*, area:*, type:*)
       # - Priority and estimates
       # - Parent/child relationships
       # - Blocking/blocked by relationships
       # - Existing comments for context
   ```

2. **Dependency Resolution**:
   ```python
   # For each issue, fetch related issues
   related_issues = set()
   for issue in primary_issues:
       # Fetch blocking issues
       if issue.blockedByIssues:
           related_issues.update(fetch_blocking_issues(issue))
       
       # Fetch subtasks
       if issue.hasChildren:
           subtasks = mcp__linear__list_issues(parentId=issue.id)
           related_issues.update(subtasks)
       
       # Include in execution scope
       execution_scope.add(issue)
       execution_scope.update(related_issues)
   ```

3. **Validation Checks**:
   - Check for circular dependencies
   - Verify all blocking issues are resolved or included
   - Validate issue states (skip if already Done/Closed)
   - Report any issues that cannot be executed

### Step 3: Analyze & Plan Execution

1. **Phase Assignment**:
   ```python
   phases = {
       'foundation': [],  # Must run first
       'features': [],    # Can run in parallel
       'integration': []  # Must run last
   }
   
   for issue in execution_scope:
       if 'phase:foundation' in issue.labels or has_many_dependents(issue):
           phases['foundation'].append(issue)
       elif 'phase:integration' in issue.labels or is_final_step(issue):
           phases['integration'].append(issue)
       else:
           phases['features'].append(issue)  # Default to parallel
   ```

2. **Dependency Graph**:
   ```python
   # Build execution order respecting dependencies
   dependency_graph = {}
   for issue in execution_scope:
       dependency_graph[issue.id] = {
           'blocks': issue.blocks or [],
           'blocked_by': issue.blockedBy or [],
           'subtasks': issue.children or [],
           'can_parallelize': len(issue.blockedBy) == 0
       }
   ```

3. **Agent Assignment**:
   ```python
   # Group issues by technical area for efficiency
   agent_assignments = []
   agent_counter = 1
   
   # Analyze potential file conflicts
   file_impact_map = {}
   for issue in execution_scope:
       estimated_files = estimate_files_touched(issue)  # Based on issue description and area
       for file in estimated_files:
           if file not in file_impact_map:
               file_impact_map[file] = []
           file_impact_map[file].append(issue.id)
   
   # Identify issues that might touch same files
   conflict_groups = [issues for file, issues in file_impact_map.items() if len(issues) > 1]
   
   # Group by area labels or content similarity
   issue_groups = group_by_technical_area(phases['features'])
   
   # Assign whole feature areas to agents, max 4 agents in parallel
   # Each agent should handle complete features or functional areas
   MAX_PARALLEL_AGENTS = 4
   assigned_agents = 0
   
   for group in issue_groups:
       if assigned_agents >= MAX_PARALLEL_AGENTS:
           # Merge remaining groups to avoid too many parallel agents
           agent_assignments[-1]['issues'].extend(group)
       else:
           agent_assignments.append({
               'agent_number': agent_counter,
               'issues': group,  # Assign complete feature groups
               'specialization': determine_specialization(group),
               'phase': 'features'
           })
           agent_counter += 1
           assigned_agents += 1
   ```

4. **Execution Plan Output** (if --dry-run):
   ```markdown
   ## Execution Plan
   
   ### Phase 1: Foundation (Sequential)
   - [ISSUE-ID]: Issue Title (Agent-1)
   
   ### Phase 2: Features (Parallel)
   - [ISSUE-ID]: Issue Title (Agent-2)
   - [ISSUE-ID]: Issue Title (Agent-3)
   - [ISSUE-ID]: Issue Title (Agent-4)
   
   ### Phase 3: Integration (Sequential)
   - [ISSUE-ID]: Issue Title (Agent-5)
   
   Total Agents: 4 (max)
   Estimated Parallel Execution: 70%
   Dependencies Validated: ✓
   ```

### Step 4: Execute Issues

#### Pre-Execution Validation
```python
if not dry_run:
    # Check for blockers unless --force
    if has_blockers and not force:
        print("ERROR: Issues have unresolved blockers:")
        print_blocking_issues()
        exit(1)
    
    # Warn if forcing
    if has_blockers and force:
        print("WARNING: Proceeding despite blockers (--force)")
```

#### Phase 1: Foundation Execution (if needed)
```python
for issue in phases['foundation']:
    agent_prompt = generate_agent_prompt(issue, agent_number)
    
    # Update Linear
    mcp__linear__create_comment(
        issueId=issue.id,
        body=f"🚀 Starting execution with Agent-{agent_number}"
    )
    mcp__linear__update_issue(
        id=issue.id,
        state="In Progress"
    )
    
    # Execute with subagent
    Task.invoke(agent_prompt)
    
    # Wait for completion before next
    wait_for_agent_completion(agent_number)
```

#### Phase 2: Features Execution (Maximum Parallel)
```python
# Launch ALL feature agents simultaneously
agent_prompts = []
for assignment in feature_assignments:
    prompt = generate_batch_prompt(assignment)
    agent_prompts.append(prompt)
    
    # Update Linear for all issues
    for issue_id in assignment['issues']:
        mcp__linear__create_comment(
            issueId=issue_id,
            body=f"🚀 Agent-{assignment['agent_number']} starting parallel execution"
        )

# Execute all in parallel (max 4 agents)
Todo: "Launch all Feature Phase agents concurrently"
# Run multiple Task invocations in a SINGLE message
for prompt in agent_prompts:
    Task.invoke(prompt)  # All in same message

# Wait for all to complete
wait_for_all_agents(feature_agents)
```

#### Phase 3: Integration Execution (if needed)
```python
for issue in phases['integration']:
    # Similar to foundation but runs after features
    execute_integration_issue(issue)
```

### Step 5: Finalize & Report

1. **Verify Completion**:
   ```python
   for issue_id in execution_scope:
       issue = mcp__linear__get_issue(issue_id)
       
       # Check main issue status
       if issue.state.type != "completed":
           incomplete_issues.append(issue_id)
       
       # Check subtasks
       if issue.children:
           for subtask in issue.children:
               if subtask.state.type != "completed":
                   incomplete_subtasks.append(subtask.id)
   ```

2. **Generate Summary Report**:
   ```markdown
   ## Issue Execution Summary
   
   ### Execution Statistics
   - Total Issues: [COUNT]
   - Successfully Completed: [COUNT] ([PERCENTAGE]%)
   - Agents Deployed: [COUNT]
   - Parallel Execution Rate: [PERCENTAGE]%
   
   ### Completed Issues
   - [ISSUE-ID]: [Title] ✅
     - Files Modified: [COUNT]
     - Tests Added: [COUNT]
   
   ### Incomplete Issues (if any)
   - [ISSUE-ID]: [Title] - [Reason]
   
   ### Performance Metrics
   - Total Execution Time: [DURATION]
   - Average Time per Issue: [DURATION]
   - Parallelization Efficiency: [PERCENTAGE]%
   ```

3. **Update Linear Status**:
   ```python
   for issue_id in completed_issues:
       mcp__linear__update_issue(
           id=issue_id,
           state="Done",
       )
       mcp__linear__create_comment(
           issueId=issue_id,
           body=f"✅ Issue completed via issue-execute command\nFiles modified: {file_count}\nTests added: {test_count}"
       )
   ```

## Error Handling

```python
# Retry logic for failed agents
for failed_agent in failed_agents:
    if retry_count < 2:
        print(f"Retrying Agent-{failed_agent['number']}...")
        relaunch_agent(failed_agent)
    else:
        # Mark issues as blocked
        for issue_id in failed_agent['issues']:
            mcp__linear__update_issue(
                id=issue_id,
                state="Blocked"
            )
            mcp__linear__create_comment(
                issueId=issue_id,
                body="❌ Execution failed after retries. Manual intervention required."
            )
```

## Best Practices

**Issue Selection**:
- Execute related issues together for better context
- Include dependencies to avoid blockers
- Consider execution time and complexity

**Dependency Management**:
- Always check dependencies before execution
- Use --dry-run to preview complex executions
- Include blocking issues in execution scope

**Progress Tracking**:
- Monitor Linear for real-time updates
- Check agent comments for detailed progress
- Review final summaries for completeness

**Error Recovery**:
- Use --force sparingly and only when blockers are understood
- Review failed executions before retrying
- Check Linear comments for failure details

## Example Executions

```bash
# Single hot fix
/issue-execute --issue BUG-456

# Multiple related features
/issue-execute --issues CCC-123,CCC-124,CCC-125

# Preview complex execution
/issue-execute --issues EPIC-100,EPIC-101 --dry-run

# Force execution despite blockers
/issue-execute --issue BLOCKED-789 --force

# Team-specific execution
/issue-execute --issue LAB-234 --team "Homelab"
```

## Comparison with sprint-execute

| Feature | sprint-execute | issue-execute |
|---------|---------------|---------------|
| **Scope** | Entire sprint project | Specific issue IDs |
| **Context** | Project/Epic required | Direct issue specification |
| **Use Case** | Planned sprints | Ad-hoc execution |
| **Dependencies** | Project-wide analysis | Issue-specific analysis |
| **Flexibility** | Sprint-bounded | Any issues, any time |
| **Setup Required** | Sprint project setup | None - just issue IDs |
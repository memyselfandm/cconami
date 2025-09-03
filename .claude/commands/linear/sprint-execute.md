---
allowed-tools: Bash(date:*), Bash(git status:*), Bash(git commit:*), Bash(mkdir:*), Task, Write, MultiEdit, mcp__linear__*
argument-hint: --project <project-name> [--epic <epic-id>]
description: (*Run from PLAN mode*) Review Linear project/epic, select sprint work, and execute with subagents maximizing concurrency
---

# Linear Sprint Execution Command
Query Linear for the specified project (and optional epic), analyze the backlog, and execute a sprint using subagents with maximum parallelization.

## Usage
- `--project <name>`: (Required) Linear project name to query for issues
- `--epic <id>`: (Optional) Specific epic ID to build sprint from. If not provided, analyzes project backlog
- `--force-dependencies`: (Optional) Override dependency validation and proceed with blocked issues
- `--skip-validation`: (Optional) Skip dependency validation entirely (not recommended)

The command will always maximize concurrency, identifying independent work streams that can be executed in parallel regardless of any sequential structure suggested by the epic.

**Agent Assignment Protocol:**
Each sub-agent receives:
1. **Sprint Context**: Summary of the overall sprint goals and related issues
2. **Linear Issue Context**: Assigned Linear issue(s) (and sub-issues) with full descriptions, acceptance criteria, and labels
3. **Specialization Directive**: Explicit role keywords based on issue labels and content
4. **Quality Standards**: Requirements from Linear issue descriptions and comments
5. **Linear Issue IDs**: For updating issue state and adding completion comments

**Sub-Agent Prompt Template:**
Use this prompt template for each sub-agent
```
VARIABLES:
$agentnumber: [ASSIGNED NUMBER]
$linearIssueIds: [COMMA-SEPARATED LINEAR ISSUE IDS]
$linearIssueDetails: [ISSUE TITLES, DESCRIPTIONS, ACCEPTANCE CRITERIA]

ROLE: Act as a principal software engineer specializing in [SPECIALIZATIONS BASED ON LINEAR LABELS]

CONTEXT:
- Linear Issues: [ISSUE TITLES AND IDS]
- Related Documentation: @ai_docs/knowledge/*
- Sprint Goals: [OVERALL SPRINT OBJECTIVES]

FEATURES TO IMPLEMENT:
Main Issue: $mainIssueId - $mainIssueTitle
Subtasks (update these to "Done" when complete):
- $subtaskId1 - $subtaskTitle1 (parentId: $mainIssueUUID)
- $subtaskId2 - $subtaskTitle2 (parentId: $mainIssueUUID)

[Linear issue descriptions, acceptance criteria, and technical requirements]

INSTRUCTIONS:
1. Implement the assigned Linear issues using test-driven development
2. Write meaningful tests that validate complete implementation
3. Do not git commit your work
4. Use Linear MCP to add progress comments to your assigned issues:
   - Comment "🤖 Agent-$agentnumber starting work" when beginning
   - Comment progress updates to the Linear issue as you complete major milestones
   - Update status of sub-issues (parentId: $mainIssueUUID) to "Done" as you complete subtasks
   - Comment final summary with files modified when complete
5. Update Linear issue status to "In Review" when complete
6. Use this format for your final Linear comment:
   ```
   🤖 Agent-$agentnumber Complete
   Files Modified:
   - path/to/file1.ts
   - path/to/file2.js
   Tests: Added X, All passing
   Summary: [Brief description of what was implemented]
   ```
7. Report completion with a summary of implemented Linear issues
```

## Instructions

### Step 1: Setup
1. Parse command arguments to extract project and optional epic
2. Verify Linear MCP connectivity with `mcp__linear__list_teams`

### Step 2: Gather Linear Data
1. **Query Project Details**:
   - Use `mcp__linear__get_team` to get team context
   - Use `mcp__linear__list_projects` to find the sprint project
   - Get project ID from the matching sprint project

2. **Fetch Sprint Issues**:
   - Use `mcp__linear__list_issues` with project filter
   - Include all issues in "Backlog", "Planned", or "Todo" states
   - For each issue with children:
     - Fetch subtasks using parent relationship
     - Map subtask IDs to parent IDs for agents
   - Fetch detailed information for each issue including:
     - Description and acceptance criteria
     - Labels (especially phase:* and area:* labels)
     - Priority level
     - Dependencies (blocks/blocked by relationships)
     - Parent/child relationships
     - Any existing comments for context

3. **Pre-Execution Dependency Validation**:
   ```python
   # CRITICAL: Validate dependencies BEFORE any execution
   def validate_dependencies(issues):
       blocked_issues = []
       circular_deps = []
       unresolved_external = []
       
       for issue in issues:
           # Check if issue is blocked by incomplete work
           if issue.blockedBy:
               for blocker_id in issue.blockedBy:
                   blocker = get_issue(blocker_id)
                   if blocker.state not in ['Done', 'Closed']:
                       blocked_issues.append({
                           'issue': issue.id,
                           'blocked_by': blocker_id,
                           'blocker_state': blocker.state
                       })
       
       # Detect circular dependencies using DFS
       circular_deps = detect_circular_dependencies(issues)
       
       # Check external dependencies
       for issue in issues:
           for dep_id in issue.blockedBy:
               if dep_id not in project_issues:
                   external = get_issue(dep_id)
                   if external.state != 'Done':
                       unresolved_external.append(external)
       
       return {
           'can_proceed': len(blocked_issues) == 0 and len(circular_deps) == 0,
           'blocked_issues': blocked_issues,
           'circular_dependencies': circular_deps,
           'external_dependencies': unresolved_external
       }
   ```

4. **Dependency Resolution Decision**:
   ```python
   validation = validate_dependencies(issues)
   
   if not validation['can_proceed']:
       if '--force-dependencies' in arguments:
           print("⚠️ WARNING: Proceeding despite dependencies (--force-dependencies)")
           log_dependency_override(validation)
       else:
           print("🚫 Sprint execution blocked by dependencies:")
           display_dependency_report(validation)
           print("\nResolve these issues or use --force-dependencies to override")
           exit(1)
   ```

5. **Analyze Phase Distribution**:
   - Map blocking relationships between issues
   - Identify issues with "phase:foundation" label (must run first)
   - Identify issues with "phase:integration" label (must run last)
   - All others default to "phase:features" (parallel execution)

### Step 3: Plan Sprint with Maximum Concurrency

1. **Dependency-Aware Phase Distribution**:
   ```python
   # Categorize issues by phase labels
   foundation_issues = [i for i in issues if "phase:foundation" in i.labels]
   integration_issues = [i for i in issues if "phase:integration" in i.labels]
   feature_issues = [all other issues]  # Default to parallel execution
   
   # Verify foundation phase is minimal (< 10% of work)
   # Verify features phase is maximal (> 70% of work)
   ```

2. **Agent Assignment Logic**:
   ```python
   # Group issues by technical area for agent efficiency
   groups = {}
   for issue in issues:
       area = extract_area_label(issue)  # area:frontend, area:backend, etc.
       if area not in groups:
           groups[area] = []
       groups[area].append(issue)
   
   # Assign 1-3 related issues per agent with subtask mapping
   agent_assignment = {
       "main_issues": [issue.id for issue in group],
       "subtasks": {
           subtask.id: parent.uuid
           for parent in group
           for subtask in parent.subtasks
       },
       "specialization": area
   }
   # Balance complexity across agents
   ```

3. **Concurrency Validation**:
   - Ensure no circular dependencies
   - Verify blocked issues are in later phases than blockers
   - Confirm maximum parallelization in features phase
   - Default assumption: everything can run in parallel unless proven otherwise

4. **Generate Execution Plan**:
   ```
   Foundation: 1 issue (5%) - 1 agent
   Features: 15 issues (75%) - 8 agents (ALL PARALLEL)
   Integration: 4 issues (20%) - 2 agents
   ```

### Step 4: Execute the Sprint

#### Phase 1: Foundation (Sequential - Only if Required)
1. **Check if foundation phase exists**:
   - Skip entirely if no foundation issues
   - This phase should be rare and minimal

2. **If foundation issues exist**:
   - Update Linear issues to "In Progress" state
   - Launch foundation agents sequentially
   - Each agent posts starting comment to Linear
   - On failure: retry up to 2 times
   - On success:
      - Run `git status` to check for uncommitted changes
      - Parse Linear comments from agents for file lists
      - Stage all modified files: `git add .`
      - Make commits with Linear references:
        `git commit -m "Implement ISSUE-123, ISSUE-124: Description"`
      - Verify clean working directory: `git status`
      - Update issues to "In Review" state

#### Phase 2: Features (Maximum Parallel Execution)
1. **CRITICAL PARALLELIZATION REQUIREMENT**:
   ```markdown
   ⚠️ ALL feature agents MUST run simultaneously
   - Create ONE todo: "Launch all Feature Phase agents"
   - Use MULTIPLE Task invocations in a SINGLE response
   - DO NOT wait between agent launches
   - DO NOT create separate todos per agent
   ```

2. **Launch All Feature Agents**:
   ```python
   # Example structure (in ONE response):
   Todo: "Launch all Feature Phase agents simultaneously"
   
   Task.invoke(agent_1_prompt)
   Task.invoke(agent_2_prompt)
   Task.invoke(agent_3_prompt)
   Task.invoke(agent_4_prompt)
   Task.invoke(agent_5_prompt)
   # ... continue for all feature agents
   ```

3. **Monitor Parallel Execution**:
   - Track agent progress via Linear comments
   - Retry failed agents up to 2 times
   - Wait for ALL agents to complete

4. **Update Linear on Completion**:
   - Run `git status` to check for uncommitted changes
   - Parse Linear comments from agents for file lists
   - Stage all modified files: `git add .`
   - Make commits with Linear references:
     `git commit -m "Implement ISSUE-123, ISSUE-124: Description"`
   - Verify clean working directory: `git status`
   - Move completed issues to "Done" state
   - Add summary comments with implementation details
   - Note any issues that couldn't be completed

#### Phase 3: Integration (Final Validation)
1. **Launch integration agents** (if any):
   - Similar parallel launch as features phase
   - Focus on testing and documentation tasks

2. **Final validation**:
   - Review all changes for consistency
   - Ensure all acceptance criteria met
   - Update final Linear issues

### Step 5: Finalize and Report

1. **Linear Updates**:
   ```python
   For each completed issue:
   - Update state to "Done"
   - Add completion comment with:
     - Agent number that completed it
     - Files modified
     - Tests added/passed
     - Any notes or warnings
   ```

2. **Sprint Project Updates**:
   - Add summary comment to project description
   - Update project status if all issues complete
   - Calculate completion percentage

3. **Code Finalization**:
   - Make commits with Linear issue references
   - Format: `git commit -m "Implement [ISSUE-KEY]: Description"`
   - Group related changes logically

4. **Generate Sprint Report**:
   ```markdown
   ## Sprint Execution Complete: [Project Name]
   
   ### Execution Summary
   - Total Issues: [COUNT]
   - Completed: [COUNT] ([PERCENTAGE]%)
   - Blocked/Deferred: [COUNT]
   
   ### Phase Breakdown
   - Foundation: [X]/[Y] issues (1 agent, sequential)
   - Features: [X]/[Y] issues (8 agents, parallel)
   - Integration: [X]/[Y] issues (2 agents, parallel)
   
   ### Parallelization Metrics
   - Max concurrent agents: [NUMBER]
   - Parallel execution percentage: [PERCENTAGE]%
   - Total execution phases: 3
   
   ### Completed Issues
   - [ISSUE-KEY]: [Title] ✅
     - [SUBTASK-KEY]: [Subtask Title] ✅
     - [SUBTASK-KEY]: [Subtask Title] ✅
   - [ISSUE-KEY]: [Title] ✅
   - [Continue for all completed...]
   
   ### Subtask Completion Rate
   - Total Subtasks: [COUNT]
   - Completed: [COUNT] ([PERCENTAGE]%)
   
   ### Blocked/Incomplete Issues
   - [ISSUE-KEY]: [Title] - [Reason]
   
   ### Code Changes
   - Files modified: [COUNT]
   - Tests added: [COUNT]
   - All tests passing: [YES/NO]
   
   ### Linear Project
   URL: [Linear project URL]
   ```

## Error Handling

### Agent Failure Recovery
```python
For each failed agent:
  if retry_count < 2:
    - Check Linear for any partial progress on main issue
    - Check subtask completion status
    - Relaunch agent with uncompleted subtasks only
    - Note retry in Linear comments
  else:
    - Mark issues as "Blocked"
    - Mark incomplete subtasks as "Blocked"
    - Add comment explaining failure
    - Continue with other agents
```

### Dependency Conflicts
- If circular dependency detected: Stop and report
- If blocked issue in wrong phase: Replan phases
- If critical blocker fails: Stop sprint execution

### Linear API Failures
- Implement exponential backoff for rate limits
- Cache issue data locally for resilience
- Fall back to manual status updates if needed

## Optimization Guidelines

### Maximize Parallelization
- Challenge every sequential assumption
- Default to parallel execution
- Only sequence when explicitly required
- Aim for 70-90% of work in parallel phase

### Agent Efficiency
- Group related issues by technical area
- Minimize context switching per agent
- Balance workload across agents
- Provide clear, complete context upfront

### Linear Integration
- Use comments for all progress tracking
- Update statuses in real-time
- Link commits to issues
- Maintain audit trail in Linear

## Example Execution Flow

```
$ /sprint-execute --project "Sprint 2024-12-001: Authentication"

🔍 Fetching sprint from Linear...
📋 Found 20 issues in sprint project

⚡ Parallelization Analysis:
  Foundation: 1 issue (5%) - 1 agent required
  Features: 15 issues (75%) - 8 agents (ALL PARALLEL)
  Integration: 4 issues (20%) - 2 agents

🚀 Phase 1: Foundation
  ✅ Agent-1 completed database migrations (ISSUE-101)

🚀 Phase 2: Features (LAUNCHING 8 AGENTS IN PARALLEL)
  [Creating single todo with 8 parallel Task invocations]
  ⏳ Agents 2-9 working simultaneously...
  ✅ All feature agents completed successfully

🚀 Phase 3: Integration
  ✅ Agent-10 completed E2E tests (ISSUE-118)
  ✅ Agent-11 completed documentation (ISSUE-119)

📊 Sprint Execution Complete!
  Completed: 20/20 issues (100%)
  Parallel execution: 75% of work
  Linear Project: https://linear.app/team/project/sprint-2024-12-001

✅ All changes committed with Linear references
```
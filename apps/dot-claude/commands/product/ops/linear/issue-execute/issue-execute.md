---
allowed-tools: Bash(date:*), Bash(git status:*), Bash(git commit:*), Bash(mkdir:*), Bash(rg:*), Bash(linctl:*), Todo, Task, Write, Glob, Grep, MultiEdit
argument-hint: <issue-ids> [team name] [force] [dry-run]
description: (*Run from PLAN mode*) Execute one or more Linear issues using subagents with intelligent dependency analysis and maximum parallelization
---

# Linear Issue Execution Command
Execute specific Linear issues by ID with automatic dependency resolution, phase detection, and parallel subagent orchestration.

The command intelligently analyzes dependencies, assigns execution phases, and maximizes concurrency for independent issues while rigorously validating for file conflicts and dependencies.

Perfect for ad-hoc development, hot fixes, or executing individual features outside of sprint cycles.

## Workflow

### Step 1: Parse Arguments
Parse natural language input from $ARGUMENTS to extract:

**Issue IDs** (required):
- Look for patterns matching `XXX-NNN` format (e.g., CCC-123, PROJ-456)
- Can be single ID or comma-separated list: `CCC-123,CCC-124,CCC-125`
- Can also be space-separated: `CCC-123 CCC-124`

**Keywords** (optional):
- `force` - Attempt execution even if blockers exist
- `dry-run` or `dry run` - Preview execution plan without running agents
- `team` followed by a name - Specify team context for issue lookup

**Examples of valid inputs:**
- `CCC-123` - Single issue
- `CCC-123,CCC-124,CCC-125` - Multiple issues, comma-separated
- `CCC-123 CCC-124 dry-run` - Multiple issues with dry-run keyword
- `CCC-123 team Chronicle force` - Single issue with team and force keywords
- `CCC-123,CCC-124 dry run` - Multiple issues with dry-run (space variant)

### Step 2: Setup
1. Validate extracted issue IDs (XXX-NNN pattern)
2. Validate linctl CLI is working with `linctl team list --json`
3. If team name was provided, verify team exists

### Step 3: Issue Analysis
1. Use the Task tool to execute the `issue_context_subagent_prompt` below, replacing variables with actual issue IDs
   <issue_context_subagent_prompt>
      Execute the following steps to analyze the requested issues:

      1. **Fetch Primary Issue Details**:
         For each issue ID in $ISSUE_IDS:
         - Use `linctl issue get <issue-id> --json` to fetch complete issue details including:
           - Description and acceptance criteria
           - Labels (especially phase:*, area:*, type:*)
           - Priority level and estimates
           - Current state and assignee
           - Parent/child relationships
           - Blocking/blocked by relationships
           - Existing comments for additional context (use `linctl comment list --issue <issue-id> --json`)

      2. **Resolve Dependencies**:
         For each primary issue:
         - If issue has blocking issues (`blockedBy`), fetch those issues using `linctl issue get <issue-id> --json`
         - If issue has children, use `linctl issue list --parent <issue-id> --json` to fetch subtasks
         - Build complete execution scope including all related issues

      3. **Validate Execution Readiness**:
         - Check for circular dependencies (Issue A blocks B, B blocks C, C blocks A)
         - Identify issues already in "Done" or "Closed" state (skip these)
         - Verify all blocking issues are either resolved or included in execution scope
         - Report any issues that cannot be executed

      4. Return analysis report to main agent in the following format:
         ```markdown
         # Issue Execution Analysis

         ## Primary Issues
         [For each requested issue:]
         ### [$ISSUE_IDENTIFIER] - $ISSUE_TITLE
         **Status**: $STATE
         **Priority**: $PRIORITY
         **Labels**: $LABELS
         **Summary**:
         [Brief description of what the issue aims to accomplish]

         **Acceptance Criteria**:
         - [Criterion 1]
         - [Criterion 2]

         **Dependencies**:
         - Blocks: [$ISSUE_IDS or "None"]
         - Blocked By: [$ISSUE_IDS or "None"]
         - Subtasks: [$ISSUE_IDS or "None"]

         **Execution Status**: [Ready | Blocked | Skip]

         ## Execution Scope
         **Total Issues**: [COUNT including dependencies and subtasks]
         **Ready for Execution**: [COUNT]
         **Blocked**: [COUNT] - [List blocked issue IDs with blocking reasons]
         **Skip**: [COUNT] - [List already completed issue IDs]

         ## Dependency Validation
         **Circular Dependencies**: [NONE or list cycles]
         **Execution Order Constraints**: [Description of required sequencing]
         ```
   </issue_context_subagent_prompt>

### Step 4: Code Analysis
1. Based on the analysis report from Step 3, use the Task tool to launch a subagent for each issue using the `code_analysis_subagent_prompt` prompt below. Launch the agents **concurrently**, making multiple Task tool calls in a single request.
   <code_analysis_subagent_prompt>
      # ROLE
      You are an s-tier research engineer specializing in identifying relevant code for a given issue.

      # CONTEXT
      Linear Issue: $ISSUE_IDENTIFIER - $ISSUE_TITLE
      Issue Summary:
      $ISSUE_SUMMARY

      Acceptance Criteria:
      $ACCEPTANCE_CRITERIA

      [Dependencies: $DEPENDENCIES]
      [Labels: $LABELS]
      [Notes: $COMMENTS]

      # TASK
      Think hard about the above issue and how it would be implemented in this codebase. Thoroughly analyze the codebase to find all relevant code (including tests) that would be modified during implementation. Additionally, identify new files that would be created during implementation. Identify any dependency relationships in the implementation. Report your findings to the main agent in the provided format.

      # OUTPUT
      Format your report like this:
      ```markdown

      # [$ISSUE_IDENTIFIER] Implementation Analysis

      ## Summary
      [In up to 3 bullet points, summarize the high-level changes to the code]

      ## File Analysis
      ### New Files
      [List every file that will be created in the implementation by relative path, and briefly explain its purpose]

      ### File Changes
      [List every file that will be changed in the implementation by relative path, the type of change (Modified, Deleted, Moved), and briefly explain the change. IF the file will be modified, provide pseudocode or shortened real-code details of the changes as well, with line numbers if possible.]

      ## Dependency Analysis
      [List file and code dependencies for the implementation]
      ```
   </code_analysis_subagent_prompt>

2. Using those analyses, generate a file conflict analysis report that:
   - Maps out potential file i/o overlaps between different issues
   - Maps file dependencies between issues
   - Identifies issues that must run sequentially vs can run in parallel

### Step 5: Plan Execution

Based on the issue analysis from Step 3 and the code analyses from Step 4, create a safe execution plan that balances parallelization with strict avoidance of file i/o and dependency conflicts.

1. **Distribute issues into execution phases**:
   Categorize issues into execution phases based on their phase labels, dependency chain, and file impact:

   - **Foundation Phase**: (Optional) Issues that must be completed first
     - Issues with many dependents (other issues block on them)
     - Issues with `phase:foundation` label
     - Database migrations, core infrastructure changes
     - Issues that block other work

   - **Features Phase**: Issues that represent the main functional changes
     - Issues with no blocking dependencies or dependencies satisfied in Foundation
     - Issues with `phase:features` label or no phase label
     - Majority of issues should be in this phase

   - **Integration Phase**: Issues that require most other work to be complete
     - Issues with `phase:integration` label
     - E2E tests, documentation, deployment configs
     - Issues that depend on many others

   **VALIDATE** that the distribution follows these guidelines:
   - Foundation phase should contain less than 10% of total work (ideally 0-5%)
   - Features phase should contain at least 70% of total work (ideally 75-85%)
   - Integration phase should contain the remaining work (ideally 10-20%)

   If the distribution is heavily weighted toward foundation or integration phases, consider re-evaluating whether some issues could actually run in parallel.

2. **Plan Sub-Agent Assignments**:
   Group and assign issues to individual subagents, by:
   - Stack area (frontend, backend, api, database, etc.) boundaries
   - Area of the codebase (especially touching the same files)
   - Label-based grouping (area:* labels)
   - Tight-coupling, if the issues do not cross stack or phase boundaries

   **Agent Distribution Guidelines**:
   - Assign complete feature areas or functional domains to each agent
   - Each agent should receive a coherent set of related issues that form a logical unit of work
   - Balance the complexity and estimated effort across agents, but prioritize keeping related work together
   - Limit parallel execution to a maximum of 4 agents to avoid resource contention and merge conflicts
   - If there are more than 4 logical groupings, combine the smallest related groups

3. **Plan Sub-Agent Identity**:
   - Assign each agent a number
   - Think about the issues assigned to each subagent and either:
     - Select an existing, available Claude Code Sub-Agent whose description closely matches the assigned issue(s), OR
     - Identify up to 3 specializations to use in the `subagent_prompt_template` below

4. **Strict Validation Checks**:
   Before finalizing the execution plan, perform rigorous validation to ensure safe parallel execution:

   - Check for circular dependencies between issues (Issue A blocks B, B blocks C, C blocks A)
   - Verify that any blocked issues are scheduled in phases after their blocking issues
   - Validate that parent issues are completed before or alongside their sub-issues

   **Parallelization Safety Check**:
   - Only parallelize when file conflicts have been **completely** eliminated
   - Verify no shared state or database schema conflicts between parallel agents
   - Default to sequential execution if validation reveals any uncertainty about conflicts
   - Cross-reference file impact analysis from Step 3 to ensure no overlapping file writes

5. **Generate Validated Execution Plan**:
   Create a comprehensive execution plan that prioritizes safety and correctness:

   - The number of issues in each phase with their percentage of total work
   - The number of agents that will run in each phase
   - **File Conflict Report**: List any files that multiple agents will touch and how conflicts are resolved
   - **Validation Results**: Confirmation that all file conflicts have been eliminated
   - **Dependency Map**: Visual or textual representation of issue dependencies
   - Any identified risks or constraints that affect execution

   Example format:
   ```
   Foundation Phase: X issues (Y%) - Z agent(s) running sequentially
   [Agent and issue assignment details]
   Features Phase: X issues (Y%) - Z agents (parallel execution validated - NO file conflicts)
   [Agent and issue assignment details]
   Integration Phase: X issues (Y%) - Z agents
   [Agent and issue assignment details]

   File Conflict Analysis: [PASS/FAIL with details]
   Dependency Validation: [PASS/FAIL with details]
   ```

6. **Dry-Run Exit** (if dry-run keyword detected):
   If `dry-run` keyword was found in $ARGUMENTS, output the execution plan and exit without executing:
   ```markdown
   ## Execution Plan (DRY-RUN MODE)

   ### Phase Distribution
   - Foundation: X issues (Y%)
   - Features: X issues (Y%)
   - Integration: X issues (Y%)

   ### Agent Assignments
   - Agent-1 (Foundation): [ISSUE-IDS]
   - Agent-2 (Features): [ISSUE-IDS]
   - Agent-3 (Features): [ISSUE-IDS]
   - Agent-4 (Features): [ISSUE-IDS]
   - Agent-5 (Integration): [ISSUE-IDS]

   ### Validation Results
   - File Conflicts: NONE ✅
   - Circular Dependencies: NONE ✅
   - Execution Order: VALIDATED ✅

   Total Agents: 4 parallel (max)
   Estimated Parallel Execution: 75%

   To execute: Run without dry-run keyword
   ```

### Step 6: Execute Issues

<subagent_prompt_template>
```markdown
# Role
You are Agent-[ASSIGNED NUMBER], a principal software engineering agent specializing in [SPECIALIZATIONS BASED ON ASSIGNED ISSUES]

# Assigned Issues
## Execution Goals:
[OVERALL EXECUTION OBJECTIVES]

## Linear Issues:
[LIST ASSIGNED LINEAR ISSUES AND SUB-ISSUES WITH IDENTIFIERS, TITLES, DESCRIPTIONS, ACCEPTANCE CRITERIA, AND TECHNICAL REQUIREMENTS]

# Documentation:
[OPTIONAL: RELEVANT DOCUMENTATION FILES OR URLS]

# Tools:
- `linctl comment create <issue-id> --body "<message>"`: use to note progress on issues
- `linctl issue update <issue-id> --state <state>`: use to update properties (status, labels, etc) of your assigned issues

# Workflow:
## Step 1: Write Unit Tests (TDD)
1. Begin by writing meaningful tests that would pass upon complete implementation of your assigned feature(s).
2. Run the tests - they will fail now, because you have not implemented the feature.

## Step 2: Implement the Feature(s) and Track Progress
1. Implement the assigned feature(s) completely and honestly, ensuring that your tests pass as you implement the functionality.
2. As you implement the features, use linctl to track your progress:
   - Comment "🤖 Agent-$agentnumber starting work" when beginning to work on an issue
   - Comment progress updates as you complete major milestones
   - Update status of sub-issues to "Done" as you complete subtasks
   - Comment final summary with files modified when complete

## Step 3: Test, Test, Test
1. Run the tests from Step 1, and confirm all of the tests pass
2. IF the tests pass, proceed to Step 4
3. IF the tests do not pass, return to step 2

## Step 4: Wrap Up
1. Update Linear issue status to "In Review" when complete
2. Update Linear sub-issue status to "Done" when complete
3. Report back to the main agent with:
   - A summary of the work completed for each assigned issue
   - A list of files created or modified, with a brief summary of what was changed
   - A test report containing the tests you created and the pass/fail rate of the tests

IMPORTANT: If you discover anything that prevents you from implementing the feature as described (e.g. missing dependencies, missing/incorrect env vars, etc), STOP and report back to the main agent IMMEDIATELY. DO NOT implement placeholders, mocks, or fallbacks unless explicitly required in the feature.
```
</subagent_prompt_template>

#### Pre-Execution Validation
Before launching agents, perform final validation:

```python
if not dry_run:
    # Check for blockers unless force keyword detected
    if has_unresolved_blockers and not force_flag:
        print("❌ ERROR: Issues have unresolved blockers:")
        for issue_id, blocker_ids in blockers.items():
            print(f"   {issue_id} blocked by: {', '.join(blocker_ids)}")
        print("\nOptions:")
        print("  1. Include blocking issues in execution: ID1,ID2,BLOCKER_ID")
        print("  2. Force execution (not recommended): add 'force' keyword")
        exit(1)

    # Warn if forcing through blockers
    if has_unresolved_blockers and force_flag:
        print("⚠️  WARNING: Proceeding despite unresolved blockers (force keyword enabled)")
        print("   This may result in incomplete or incorrect implementation")
```

#### Phase 1: Foundation (Sequential - Only if Required)
1. **Check if foundation phase exists**:
   - Skip entirely if no foundation issues
   - This phase should be rare and minimal

2. **If foundation issues exist**:
   - Update Linear issues to "In Progress" state
   - Launch foundation agents sequentially (one at a time)
   - Each agent posts starting comment to Linear
   - On failure: retry up to 2 times
   - On success:
     - Make commits based on subagent work logs in Linear comments
     - Update issues to "In Review" state
     - Wait for completion before next agent

#### Phase 2: Features (Validated Parallel Execution)
1. **Pre-Execution Validation**:
   ⚠️ CRITICAL: Validate file conflicts before launching parallel agents
   - Review file conflict analysis from planning phase
   - Confirm NO two agents will modify the same files
   - If conflicts detected, STOP and replan agent assignments
   - Maximum 4 parallel agents to maintain control and avoid resource contention

2. **Launch Validated Feature Agents**:
   After confirming no file conflicts exist:
   - Create todo: "Launch validated Feature Phase agents"
   - Use multiple Task tool calls in a single message to launch agents concurrently, using the `subagent_prompt_template` above
   - Each agent should have a clear, non-overlapping scope
   - Monitor for any unexpected conflicts during execution

3. **Monitor Parallel Execution**:
   - Track agent progress via Linear comments
   - Retry failed agents up to 2 times
   - Wait for ALL agents to complete before proceeding

4. **Update Linear on Completion**:
   - Make commits based on subagent work logs in Linear comments
   - Move completed issues and sub-issues to "Done" state
   - Add summary comments with implementation details
   - Note any issues that couldn't be completed

#### Phase 3: Integration (Final Validation)
1. **Launch integration agents** (if any):
   - Similar parallel launch as features phase
   - Focus on testing and documentation tasks
   - Can run 2-4 agents in parallel if no file conflicts

2. **Final validation**:
   - Review all changes from all execution phases for consistency
   - Ensure all acceptance criteria met
   - Lint code if applicable, and run new tests if applicable
   - Update final Linear issues

### Step 6: Finalize and Report

1. **Verify Completion**:
   ```python
   for issue_id in execution_scope:
       # Fetch issue with linctl
       issue = linctl issue get issue_id --json

       # Check main issue status
       if issue.state.type != "completed":
           incomplete_issues.append(issue_id)

       # Check subtasks
       subtasks = linctl issue list --parent issue_id --json
       for subtask in subtasks:
           if subtask.state.type != "completed":
               incomplete_subtasks.append(subtask.id)
   ```

2. **Update Linear Status**:
   ```python
   for issue_id in completed_issues:
       # Update issue state
       linctl issue update issue_id --state "Done"

       # Add completion comment
       linctl comment create issue_id --body f"✅ Issue completed via issue-execute command\n\nAgent-{agent_number} Implementation Summary:\n- Files modified: {file_count}\n- Tests added: {test_count}\n- All tests passing: {tests_passing}"
   ```

3. **Generate Execution Report**:
   ```markdown
   ## Issue Execution Summary

   ### Execution Statistics
   - Total Issues Requested: [COUNT]
   - Issues in Execution Scope: [COUNT] (including dependencies)
   - Successfully Completed: [COUNT] ([PERCENTAGE]%)
   - Incomplete/Blocked: [COUNT]
   - Agents Deployed: [COUNT]
   - Parallel Execution Rate: [PERCENTAGE]%

   ### Phase Breakdown
   - Foundation: [X]/[Y] issues (1 agent, sequential)
   - Features: [X]/[Y] issues (4 agents max, parallel)
   - Integration: [X]/[Y] issues (2 agents, parallel)

   ### Parallelization Metrics
   - Max concurrent agents: [NUMBER]
   - Parallel execution percentage: [PERCENTAGE]%
   - Total execution phases: 3

   ### Completed Issues
   - [ISSUE-ID]: [Title] ✅
     - Agent: Agent-[N]
     - Files Modified: [COUNT]
     - Tests Added: [COUNT]
     - Linear: [Issue URL]

   ### Incomplete/Blocked Issues (if any)
   - [ISSUE-ID]: [Title] - [Reason]
     - Action Required: [Specific next steps]

   ### Code Changes
   - Total Files Modified: [COUNT]
   - Total Tests Added: [COUNT]
   - All Tests Passing: [YES/NO]

   ### Performance Metrics
   - Total Execution Time: [DURATION]
   - Average Time per Issue: [DURATION]
   - Parallelization Efficiency: [PERCENTAGE]%
   ```

## Error Handling

### Agent Failure Recovery
```python
for failed_agent in failed_agents:
    if retry_count < 2:
        print(f"⚠️  Retrying Agent-{failed_agent['number']} (attempt {retry_count + 1}/2)...")

        # Check Linear for any partial progress
        for issue_id in failed_agent['issues']:
            comments = linctl comment list --issue issue_id --json
            # Review progress and incorporate into retry

        # Relaunch agent with same assignment
        relaunch_agent(failed_agent)

        # Note retry in Linear comments
        for issue_id in failed_agent['issues']:
            linctl comment create issue_id --body f"🔄 Agent-{failed_agent['number']} retry {retry_count + 1}"
    else:
        # Mark issues as blocked after max retries
        for issue_id in failed_agent['issues']:
            linctl issue update issue_id --state "Blocked"

            linctl comment create issue_id --body f"❌ Execution failed after {retry_count} retries. Manual intervention required.\n\nLast error: {failed_agent['error']}"
```

### Dependency Conflicts
- If circular dependency detected: Stop and report with visualization
- If blocked issue in wrong phase: Replan phases
- If critical blocker fails: Stop execution and report
- If --force used with unresolved blockers: Warn but continue

### Linear API Failures
- Implement exponential backoff for rate limits (2s, 4s, 8s)
- Cache issue data locally for resilience
- Fall back to manual status updates if API consistently fails
- Log all API errors for debugging

### File Conflict Detection
- If file conflicts discovered during execution: Pause and report
- Suggest sequential re-execution of conflicting issues
- Update Linear with conflict details

## Optimization Guidelines

### Safe and Intelligent Parallelization
- Validate file conflicts before any parallel execution
- Balance parallelization with code safety and quality
- Default to sequential if validation reveals any conflicts
- Target 70-80% parallel work only when fully validated
- Use file impact analysis from code analysis step

### Agent Efficiency
- Group related issues by technical area (frontend, backend, etc.)
- Minimize context switching per agent
- Balance workload across agents
- Provide clear, complete context upfront
- Keep agent count at 4 or fewer for manageability

### Linear Integration
- Use comments for all progress tracking
- Update statuses in real-time
- Link commits to issues
- Ensure sub-issues are updated
- Maintain audit trail in Linear for debugging

### Dependency Management
- Always check dependencies before execution
- Use --dry-run to preview complex executions
- Include blocking issues in execution scope when possible
- Validate execution order respects dependencies

## Example Execution Flows

### Example 1: Single Hot Fix
```bash
$ /issue-execute BUG-456

🔍 Analyzing issue BUG-456...
📋 Issue: "Fix authentication timeout on mobile"
   Status: Planned | Priority: P0 | Labels: bug, area:backend

🔍 Dependency Analysis:
   Blocking: None
   Blocked By: None
   Subtasks: None

🔍 Code Analysis:
   Files to modify: 2
   - src/auth/session.ts (Modified)
   - src/auth/session.test.ts (Modified)

🔍 Validation Analysis:
   File Conflicts: NONE ✅
   Dependencies: VALIDATED ✅
   Phase: Features (100%)

🚀 Execution Plan:
   - Features Phase: 1 issue (100%) - 1 agent
   - Agent-1: BUG-456 (Backend specialist)

🚀 Launching Agent-1...
   ✅ Agent-1 completed (files: 2, tests: 3)

📊 Execution Complete!
   Completed: 1/1 issues (100%)
   Time: 3m 42s

✅ Issue BUG-456 moved to Done
```

### Example 2: Multiple Related Features
```bash
$ /issue-execute FEAT-123,FEAT-124,FEAT-125

🔍 Analyzing issues FEAT-123, FEAT-124, FEAT-125...
📋 Execution Scope: 5 issues (3 primary + 2 subtasks)

🔍 Dependency Analysis:
   FEAT-123: No blockers (2 subtasks)
   FEAT-124: Blocked by FEAT-123
   FEAT-125: No blockers

🔍 Code Analysis:
   Parallel file conflicts: NONE ✅
   Technical areas: frontend (2), backend (2), testing (1)

🔍 Validation Analysis:
   File Conflicts: NONE DETECTED ✅
   Dependencies: VALIDATED ✅
   Phase Distribution:
   - Foundation: 0 issues (0%)
   - Features: 4 issues (80%)
   - Integration: 1 issue (20%)

🚀 Execution Plan:
   Phase 1: Features - 3 agents (parallel)
     - Agent-1: FEAT-123 + subtasks (backend)
     - Agent-2: FEAT-125 (frontend)
     - Agent-3: FEAT-124 (depends on FEAT-123, will wait)
   Phase 2: Integration - 1 agent
     - Agent-4: E2E tests

🚀 Phase 1: Features (Validated Parallel Execution)
   [File conflicts validated - safe to proceed]
   ⏳ Launching Agents 1-2 in parallel...
   ✅ Agent-1 completed FEAT-123
   🚀 Agent-3 now launching (dependency satisfied)...
   ✅ Agent-2 completed FEAT-125
   ✅ Agent-3 completed FEAT-124

🚀 Phase 2: Integration
   ✅ Agent-4 completed E2E tests

📊 Execution Complete!
   Completed: 5/5 issues (100%)
   Parallel execution: 80%
   Time: 12m 18s

✅ All issues moved to Done
```

### Example 3: Dry-Run Preview
```bash
$ /issue-execute EPIC-100,EPIC-101 dry-run

🔍 Analyzing issues EPIC-100, EPIC-101...
📋 Execution Scope: 23 issues (2 epics + 21 children)

🔍 Dependency Analysis:
   Complex dependency chain detected
   6 blocking relationships
   3 layers of dependencies

🔍 Code Analysis:
   Potential file conflicts: 3 conflicts identified
   Technical areas: frontend (8), backend (10), database (3), testing (2)

🔍 Validation Analysis:
   File Conflicts: 3 CONFLICTS DETECTED ⚠️
   - src/models/user.ts: touched by EPIC-100-TASK-5, EPIC-101-TASK-3
   - src/api/routes.ts: touched by EPIC-100-TASK-2, EPIC-101-TASK-8
   - database/migrations/: touched by EPIC-100-TASK-1, EPIC-101-TASK-1

   Resolution: Sequential execution of conflicting issues

📊 EXECUTION PLAN (DRY-RUN MODE)

### Phase Distribution
- Foundation: 2 issues (9%) - Database migrations
- Features: 18 issues (78%) - Main implementation
- Integration: 3 issues (13%) - Testing and docs

### Agent Assignments
- Agent-1 (Foundation, Sequential): EPIC-100-TASK-1
- Agent-2 (Foundation, Sequential): EPIC-101-TASK-1
- Agent-3 (Features, Parallel): EPIC-100-TASK-2, EPIC-100-TASK-5
- Agent-4 (Features, Parallel): EPIC-100-TASK-6, EPIC-100-TASK-7, EPIC-100-TASK-8
- Agent-5 (Features, Sequential): EPIC-101-TASK-3, EPIC-101-TASK-8 (conflicts resolved)
- Agent-6 (Features, Parallel): EPIC-101-TASK-4, EPIC-101-TASK-5
- Agent-7 (Integration, Parallel): Testing issues

### Validation Results
- File Conflicts: RESOLVED (sequential execution for conflicts) ✅
- Circular Dependencies: NONE ✅
- Execution Order: VALIDATED ✅

Total Agents: 7 (4 max parallel)
Estimated Parallel Execution: 65%
Estimated Time: 45-60 minutes

To execute: /issue-execute EPIC-100,EPIC-101
```

### Example 4: Forced Execution (Blockers Override)
```bash
$ /issue-execute BLOCKED-789 force

🔍 Analyzing issue BLOCKED-789...

❌ WARNING: Issue BLOCKED-789 has unresolved blockers:
   - Blocked by: AUTH-500 (In Progress)
   - Blocked by: DB-301 (Planned)

⚠️  force keyword enabled: Proceeding anyway

🔍 Code Analysis:
   May require incomplete dependencies from blockers

🚀 Launching Agent-1...
   ⚠️  Agent-1 encountered missing dependency: AUTH-500 not complete
   ⚠️  Implementing placeholder for AUTH-500 integration
   ✅ Agent-1 completed with warnings

📊 Execution Complete (with warnings)
   Completed: 1/1 issues (100%)
   ⚠️  Implementation may be incomplete due to blockers

Action Required:
   - Complete AUTH-500 and DB-301
   - Review BLOCKED-789 implementation
   - Re-test integration after blockers resolved
```

## Comparison with sprint-execute

| Feature | sprint-execute | issue-execute |
|---------|---------------|---------------|
| **Scope** | Entire sprint project with planned issues | Specific issue IDs (arbitrary selection) |
| **Context** | Linear project/epic required | Direct issue specification by ID |
| **Use Case** | Planned sprint execution | Ad-hoc development, hot fixes, features |
| **Dependencies** | Project-wide analysis from sprint plan | Dynamic analysis of arbitrary issue set |
| **Flexibility** | Sprint-bounded, pre-planned | Any issues, any time, no setup required |
| **Setup Required** | Sprint project must exist | None - just issue IDs |
| **Entry Point** | Linear project name | Linear issue identifier(s) |
| **Planning** | Sprint planning precedes execution | Dynamic planning during execution |

## Best Practices

**Issue Selection**:
- Execute related issues together for better context
- Include dependencies to avoid blockers (or use force keyword sparingly)
- Consider execution time and complexity when grouping
- Use dry-run keyword for complex multi-issue executions

**Dependency Management**:
- Always check dependencies before execution (automatic in Step 3)
- Use dry-run keyword to preview complex executions
- Include blocking issues in execution scope when possible
- Understand impact before using force keyword

**Progress Tracking**:
- Monitor Linear for real-time updates from agents
- Check agent comments for detailed progress
- Review final summaries for completeness
- Use Linear issue views to track execution status

**Error Recovery**:
- Use force keyword sparingly and only when blockers are understood
- Review failed executions before retrying
- Check Linear comments for detailed failure information
- Consider breaking large issue sets into smaller batches

**Performance Optimization**:
- Group related issues by technical area for better parallelization
- Limit to 4 parallel agents for optimal performance
- Use dry-run keyword to identify potential conflicts before execution
- Execute issues in logical groupings (all frontend, then all backend, etc.)

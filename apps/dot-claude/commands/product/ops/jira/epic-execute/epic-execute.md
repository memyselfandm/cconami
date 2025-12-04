---
allowed-tools: Bash(date:*), Bash(git status:*), Bash(git commit:*), Bash(mkdir:*), Bash(rg:*), Bash(jira:*), Todo, Task, Write, Glob, Grep, MultiEdit
argument-hint: <epic-key> [skip-prep] [dry-run] [force]
description: (*Run from PLAN mode*) Execute a Jira epic and its child stories using subagents with intelligent dependency analysis and maximum parallelization
---

# Jira Epic Execution Command
Execute an entire Jira epic by analyzing its child stories, resolving dependencies, and orchestrating parallel subagent execution. This command treats the epic as the execution scope, similar to how sprint-execute treats a sprint.

The command intelligently analyzes the epic's story hierarchy, assigns execution phases, and maximizes concurrency for independent stories while rigorously validating for file conflicts and dependencies.

Perfect for executing complete features, initiatives, or releases organized as Jira epics.

## Variables
- `$1` (epic-key): (Required) Jira epic issue key (e.g., CHR-100, PROJ-50)
- `$2` (skip-prep): (Optional) Pass "yes" or "skip-prep" to skip epic readiness validation
- `$3` (dry-run): (Optional) Pass "dry-run" to preview execution plan without running agents
- `$4` (force): (Optional) Pass "force" to proceed despite blockers or incomplete dependencies

## Workflow

### Step 1: Parse Arguments and Setup

1. **Parse Command Arguments**:
   ```python
   epic_key = $1  # Required: Epic issue key (e.g., CHR-100)

   # Parse optional flags from remaining arguments
   skip_prep = "skip-prep" in [$2, $3, $4] or "yes" in [$2, $3, $4]
   dry_run = "dry-run" in [$2, $3, $4]
   force_flag = "force" in [$2, $3, $4]

   # Validate epic key format
   if not re.match(r'^[A-Z]+-\d+$', epic_key):
       print(f"ERROR: Invalid epic key format: {epic_key}")
       print("Expected format: PROJECT-NUMBER (e.g., CHR-100)")
       exit(1)
   ```

2. **Validate Environment**:
   ```bash
   # Verify jira-cli is working
   if ! jira me --json &>/dev/null; then
       echo "ERROR: jira-cli authentication failed"
       echo "Run 'jira init' to configure authentication"
       exit 1
   fi

   # Verify epic exists
   if ! jira issue view "$1" --json &>/dev/null; then
       echo "ERROR: Epic $1 not found"
       exit 1
   fi

   # Verify issue is an epic type
   issue_type=$(jira issue view "$1" --json | jq -r '.fields.issuetype.name')
   if [ "$issue_type" != "Epic" ]; then
       echo "WARNING: Issue $1 is a $issue_type, not an Epic"
       echo "Proceeding anyway - will execute all child issues"
   fi
   ```

### Step 2: Epic Context Analysis

1. Use the Task tool to execute the `epic_context_subagent_prompt` below, replacing `$EPIC_KEY` with the epic key:
   <epic_context_subagent_prompt>
      Execute the following steps to gather epic context:

      1. **Fetch Epic Details**:
         Use `jira issue view $EPIC_KEY --json` to get complete epic information:
         - Epic summary and description
         - Acceptance criteria
         - Labels and priority
         - Status and assignee
         - Comments for additional context

      2. **Fetch Child Stories**:
         Use `jira issue list --jql="parent=$EPIC_KEY" --json` to get all direct children:
         - Include stories, tasks, and bugs under the epic
         - Capture description and acceptance criteria for each
         - Note priority and current status
         - Extract labels (especially technical area labels)

      3. **Fetch Subtasks for Each Story**:
         For each child story/task, fetch subtasks:
         ```bash
         for issue in child_issues:
             subtasks=$(jira issue list --jql="parent=${issue.key}" --json)
         ```

      4. **Analyze Dependencies**:
         For each child issue, check `.fields.issuelinks` for:
         - Blocking relationships (blocks/is blocked by)
         - Related issues
         - External dependencies outside the epic

      5. **Return Epic Analysis Report**:
         ```markdown
         # Epic [$EPIC_KEY] Analysis

         ## Epic Overview
         **Title**: [Epic summary]
         **Status**: [Current status]
         **Priority**: [Priority level]
         **Labels**: [Labels list]

         **Description Summary**:
         [Brief summary of epic goals and scope]

         **Acceptance Criteria**:
         - [Criterion 1]
         - [Criterion 2]

         ## Child Issues Summary
         **Total Stories/Tasks**: [COUNT]
         **Total Subtasks**: [COUNT]
         **Status Distribution**:
         - To Do: [COUNT]
         - In Progress: [COUNT]
         - Done: [COUNT]

         ## Issue Details
         <foreach issue>
         ### [$ISSUE_KEY]: $ISSUE_SUMMARY
         **Type**: [Story/Task/Bug]
         **Status**: [Current status]
         **Priority**: [Priority]
         **Labels**: [Labels]

         **Summary**:
         [Brief description of the issue]

         **Acceptance Criteria**:
         - [Criterion 1]
         - [Criterion 2]

         **Subtasks**: [COUNT]
         - [SUBTASK-KEY]: [Summary] ([Status])

         **Dependencies**:
         - Blocks: [ISSUE-KEYS or "None"]
         - Blocked By: [ISSUE-KEYS or "None"]

         **Execution Status**: [Ready | Blocked | Skip (already done)]
         </foreach>

         ## Dependency Map
         **Internal Dependencies**: [Dependencies within epic]
         **External Dependencies**: [Dependencies on issues outside epic]
         **Circular Dependencies**: [NONE or list cycles]

         ## Execution Readiness
         **Ready for Execution**: [COUNT] issues
         **Blocked**: [COUNT] issues - [List with blockers]
         **Already Complete**: [COUNT] issues - [Will be skipped]
         ```
   </epic_context_subagent_prompt>

### Step 3: Epic Readiness Validation

1. **Check Epic Readiness** (unless skip-prep is set):
   ```python
   if not skip_prep:
       readiness_criteria = {
           "has_child_issues": child_issue_count > 0,
           "all_issues_have_acceptance_criteria": all_have_criteria,
           "no_circular_dependencies": not has_circular_deps,
           "executable_issues_exist": ready_issue_count > 0,
           "blockers_resolved_or_included": external_blockers == 0 or force_flag
       }

       if not all(readiness_criteria.values()):
           print_readiness_report(readiness_criteria)
           if not force_flag:
               print("\nUse 'force' flag to proceed anyway")
               exit(1)
   ```

2. **Readiness Report** (if not ready):
   ```markdown
   ❌ Epic Not Ready for Execution

   Missing Requirements:
   - [ ] Child Issues: Epic has no child stories/tasks to execute
   - [ ] Acceptance Criteria: X issues missing acceptance criteria
   - [ ] Circular Dependencies: Detected circular dependency chain
   - [ ] External Blockers: X issues blocked by issues outside this epic

   Recommendations:
   1. Run `/jira-epic-breakdown PROJECT EPIC-KEY` to create stories
   2. Add acceptance criteria to all issues
   3. Resolve external dependencies first
   4. Use `force` flag to proceed despite issues

   Blocked Issues:
   - [ISSUE-KEY]: Blocked by [EXTERNAL-KEY] (not in epic scope)
   ```

### Step 4: Code Analysis

1. Based on the epic analysis from Step 2, use the Task tool to launch a subagent for each story using the `code_analysis_subagent_prompt` prompt below. Launch the agents **concurrently**, making multiple Task tool calls in a single request.
   <code_analysis_subagent_prompt>
      # ROLE
      You are an s-tier research engineer specializing in identifying relevant code for a given feature.

      # CONTEXT
      Epic: $EPIC_KEY - $EPIC_TITLE

      Jira Issue: $ISSUE_KEY - $ISSUE_SUMMARY
      Issue Description:
      $ISSUE_DESCRIPTION

      Acceptance Criteria:
      $ACCEPTANCE_CRITERIA

      [Subtasks: $SUBTASKS]
      [Dependencies: $DEPENDENCIES]
      [Labels: $LABELS]

      # TASK
      Think hard about the above issue and how it would be implemented in this codebase. Thoroughly analyze the codebase to find all relevant code (including tests) that would be modified during implementation. Additionally, identify new files that would be created during implementation. Identify any dependency relationships in the implementation. Report your findings to the main agent in the provided format.

      # OUTPUT
      Format your report like this:
      ```markdown

      # [$ISSUE_KEY] Implementation Analysis

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

### Step 5: Plan Epic Execution

Based on the epic analysis from Step 2 and the code analyses from Step 4, create a safe execution plan that balances parallelization with strict avoidance of file i/o and dependency conflicts.

1. **Distribute issues into execution phases**:
   Categorize epic child issues into execution phases based on their labels, dependency chain, and file impact:

   - **Foundation Phase**: (Optional) Issues that must be completed first
     - Issues with many dependents (other issues block on them)
     - Issues with `foundation` or `infrastructure` labels
     - Database migrations, core infrastructure changes
     - Issues that block other work within the epic

   - **Features Phase**: Issues that represent the main functional changes
     - Issues with no blocking dependencies or dependencies satisfied in Foundation
     - Stories and tasks that form the core epic work
     - Majority of issues should be in this phase

   - **Integration Phase**: Issues that require most other work to be complete
     - Issues with `integration` or `testing` labels
     - E2E tests, documentation, deployment configs
     - Issues that depend on many others within the epic

   **VALIDATE** that the distribution follows these guidelines:
   - Foundation phase should contain less than 10% of total work (ideally 0-5%)
   - Features phase should contain at least 70% of total work (ideally 75-85%)
   - Integration phase should contain the remaining work (ideally 10-20%)

   If the distribution is heavily weighted toward foundation or integration phases, consider re-evaluating whether some issues could actually run in parallel.

2. **Plan Sub-Agent Assignments**:
   Group and assign issues to individual subagents, by:
   - Stack area (frontend, backend, api, database, etc.) boundaries
   - Area of the codebase (especially touching the same files)
   - Component-based grouping
   - Story with its subtasks (keep together for context)
   - Tight-coupling, if the issues do not cross stack or phase boundaries

   **Agent Distribution Guidelines**:
   - Assign complete stories with their subtasks to each agent
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
   - Validate that parent issues are completed before or alongside their subtasks

   **Parallelization Safety Check**:
   - Only parallelize when file conflicts have been **completely** eliminated
   - Verify no shared state or database schema conflicts between parallel agents
   - Default to sequential execution if validation reveals any uncertainty about conflicts
   - Cross-reference file impact analysis from Step 4 to ensure no overlapping file writes

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
   Epic Execution Plan: [EPIC-KEY] - [Epic Title]

   Foundation Phase: X issues (Y%) - Z agent(s) running sequentially
   [Agent and issue assignment details]
   Features Phase: X issues (Y%) - Z agents (parallel execution validated - NO file conflicts)
   [Agent and issue assignment details]
   Integration Phase: X issues (Y%) - Z agents
   [Agent and issue assignment details]

   File Conflict Analysis: [PASS/FAIL with details]
   Dependency Validation: [PASS/FAIL with details]
   ```

6. **Dry-Run Exit** (if dry-run flag detected):
   If `dry-run` was specified, output the execution plan and exit without executing:
   ```markdown
   ## Epic Execution Plan (DRY-RUN MODE)

   ### Epic: [EPIC-KEY] - [Epic Title]

   ### Phase Distribution
   - Foundation: X issues (Y%)
   - Features: X issues (Y%)
   - Integration: X issues (Y%)

   ### Agent Assignments
   - Agent-1 (Foundation): [ISSUE-KEYS with subtasks]
   - Agent-2 (Features): [ISSUE-KEYS with subtasks]
   - Agent-3 (Features): [ISSUE-KEYS with subtasks]
   - Agent-4 (Features): [ISSUE-KEYS with subtasks]
   - Agent-5 (Integration): [ISSUE-KEYS with subtasks]

   ### Validation Results
   - File Conflicts: NONE
   - Circular Dependencies: NONE
   - Execution Order: VALIDATED

   Total Agents: X (4 max parallel)
   Estimated Parallel Execution: Y%

   To execute: Run without dry-run flag
   ```

### Step 6: Execute Epic

<subagent_prompt_template>
```markdown
# Role
You are Agent-[ASSIGNED NUMBER], a principal software engineering agent specializing in [SPECIALIZATIONS BASED ON ASSIGNED ISSUES]

# Epic Context
**Epic**: [EPIC-KEY] - [Epic Title]
**Epic Goals**: [Brief summary of epic objectives]

# Assigned Issues
## Execution Goals:
[OVERALL EXECUTION OBJECTIVES FOR THIS AGENT'S SCOPE]

## Jira Issues:
[LIST ASSIGNED JIRA ISSUES WITH THEIR SUBTASKS]

For each issue:
- Issue Key and Summary
- Description and acceptance criteria
- Subtasks with their details
- Technical requirements

# Documentation:
[OPTIONAL: RELEVANT DOCUMENTATION FILES OR URLS]

# Tools:
- `jira issue comment add <issue-key> --message "<text>"`: use to note progress on issues
- `jira issue move <issue-key> --status "<status>"`: use to update status of your assigned issues

# Workflow:
## Step 1: Write Unit Tests (TDD)
1. Begin by writing meaningful tests that would pass upon complete implementation of your assigned feature(s).
2. Run the tests - they will fail now, because you have not implemented the feature.

## Step 2: Implement the Feature(s) and Track Progress
1. Implement the assigned feature(s) completely and honestly, ensuring that your tests pass as you implement the functionality.
2. As you implement the features, use jira-cli to track your progress:
   - Comment "Agent-$agentnumber starting work on [ISSUE-KEY]" when beginning to work on an issue
   - Move issue status to "In Progress" when starting work
   - Comment progress updates as you complete major milestones
   - Move subtasks to "Done" as you complete them
   - Comment final summary with files modified when complete

## Step 3: Test, Test, Test
1. Run the tests from Step 1, and confirm all of the tests pass
2. IF the tests pass, proceed to Step 4
3. IF the tests do not pass, return to step 2

## Step 4: Wrap Up
1. Move Jira issue to "In Review" status when complete
2. Move all subtasks to "Done" when complete
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
    # Check for blockers unless force flag detected
    if has_unresolved_blockers and not force_flag:
        print("ERROR: Issues have unresolved blockers:")
        for issue_key, blocker_keys in blockers.items():
            print(f"   {issue_key} blocked by: {', '.join(blocker_keys)}")
        print("\nOptions:")
        print("  1. Include blocking issues in epic or resolve them first")
        print("  2. Force execution (not recommended): add 'force' flag")
        exit(1)

    # Warn if forcing through blockers
    if has_unresolved_blockers and force_flag:
        print("WARNING: Proceeding despite unresolved blockers (force flag enabled)")
        print("   This may result in incomplete or incorrect implementation")
```

#### Phase 1: Foundation (Sequential - Only if Required)
1. **Check if foundation phase exists**:
   - Skip entirely if no foundation issues
   - This phase should be rare and minimal

2. **If foundation issues exist**:
   - Move Jira issues to "In Progress" status
   - Launch foundation agents sequentially (one at a time)
   - Each agent posts starting comment to Jira
   - On failure: retry up to 2 times
   - On success:
     - Make commits based on subagent work logs in Jira comments
     - Move issues to "In Review" status
     - Wait for completion before next agent

#### Phase 2: Features (Validated Parallel Execution)
1. **Pre-Execution Validation**:
   CRITICAL: Validate file conflicts before launching parallel agents
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
   - Track agent progress via Jira comments
   - Retry failed agents up to 2 times
   - Wait for ALL agents to complete before proceeding

4. **Update Jira on Completion**:
   - Make commits based on subagent work logs in Jira comments
   - Move completed issues and subtasks to "Done" status
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
   - Update final Jira issues

### Step 7: Finalize and Report

1. **Verify Completion**:
   ```bash
   # Check all issues in epic scope
   for issue_key in $EPIC_CHILD_ISSUES; do
       # Fetch issue with jira-cli
       issue=$(jira issue view "$issue_key" --json)

       # Check main issue status
       status_category=$(echo "$issue" | jq -r '.fields.status.statusCategory.key')
       if [ "$status_category" != "done" ]; then
           incomplete_issues+=("$issue_key")
       fi

       # Check subtasks
       subtasks=$(jira issue list --jql "parent=$issue_key" --json)
       echo "$subtasks" | jq -r '.issues[] | select(.fields.status.statusCategory.key != "done") | .key' | while read subtask; do
           incomplete_subtasks+=("$subtask")
       done
   done
   ```

2. **Update Jira Status**:
   ```bash
   for issue_key in $COMPLETED_ISSUES; do
       # Move issue to Done
       jira issue move "$issue_key" --status "Done"

       # Add completion comment
       jira issue comment add "$issue_key" --message "Issue completed via epic-execute command

Agent-$AGENT_NUMBER Implementation Summary:
- Epic: $EPIC_KEY
- Files modified: $FILE_COUNT
- Tests added: $TEST_COUNT
- All tests passing: $TESTS_PASSING"
   done

   # Update epic with completion summary if all children complete
   if all_children_complete; then
       jira issue comment add "$EPIC_KEY" --message "Epic execution complete via epic-execute command

Execution Summary:
- Total issues: $TOTAL_COUNT
- Completed: $COMPLETED_COUNT
- Agents deployed: $AGENT_COUNT
- Parallel execution rate: $PARALLEL_PERCENT%"
   fi
   ```

3. **Generate Execution Report**:
   ```markdown
   ## Epic Execution Complete: [EPIC-KEY] - [Epic Title]

   ### Execution Statistics
   - Total Issues in Epic: [COUNT]
   - Issues Executed: [COUNT]
   - Successfully Completed: [COUNT] ([PERCENTAGE]%)
   - Incomplete/Blocked: [COUNT]
   - Already Complete (Skipped): [COUNT]
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
   - [ISSUE-KEY]: [Summary]
     - Agent: Agent-[N]
     - Subtasks: [COUNT] completed
     - Files Modified: [COUNT]
     - Tests Added: [COUNT]

   ### Incomplete/Blocked Issues (if any)
   - [ISSUE-KEY]: [Summary] - [Reason]
     - Action Required: [Specific next steps]

   ### Code Changes
   - Total Files Modified: [COUNT]
   - Total Tests Added: [COUNT]
   - All Tests Passing: [YES/NO]

   ### Epic Status
   - Epic Progress: [PERCENTAGE]% complete
   - Remaining Work: [COUNT] issues
   - Jira Epic: [URL]
   ```

## Error Handling

### Agent Failure Recovery
```python
for failed_agent in failed_agents:
    if retry_count < 2:
        print(f"Retrying Agent-{failed_agent['number']} (attempt {retry_count + 1}/2)...")

        # Check Jira for any partial progress
        for issue_key in failed_agent['issues']:
            comments = jira_get_comments(issue_key)
            # Review progress and incorporate into retry

        # Relaunch agent with same assignment
        relaunch_agent(failed_agent)

        # Note retry in Jira comments
        for issue_key in failed_agent['issues']:
            jira_comment(issue_key, f"Agent-{failed_agent['number']} retry {retry_count + 1}")
    else:
        # Mark issues as blocked after max retries
        for issue_key in failed_agent['issues']:
            jira_move(issue_key, "Blocked")

            jira_comment(issue_key, f"Execution failed after {retry_count} retries. Manual intervention required.\n\nLast error: {failed_agent['error']}")
```

### Dependency Conflicts
- If circular dependency detected: Stop and report with visualization
- If blocked issue in wrong phase: Replan phases
- If critical blocker fails: Stop execution and report
- If force used with unresolved blockers: Warn but continue

### Jira API Failures
- Implement exponential backoff for rate limits (2s, 4s, 8s)
- Cache issue data locally for resilience
- Fall back to manual status updates if API consistently fails
- Log all API errors for debugging

### File Conflict Detection
- If file conflicts discovered during execution: Pause and report
- Suggest sequential re-execution of conflicting issues
- Update Jira with conflict details

## Optimization Guidelines

### Safe and Intelligent Parallelization
- Validate file conflicts before any parallel execution
- Balance parallelization with code safety and quality
- Default to sequential if validation reveals any conflicts
- Target 70-80% parallel work only when fully validated
- Use file impact analysis from code analysis step

### Agent Efficiency
- Group stories with their subtasks for complete context
- Group related issues by technical area (frontend, backend, etc.)
- Minimize context switching per agent
- Balance workload across agents
- Provide clear, complete context upfront
- Keep agent count at 4 or fewer for manageability

### Jira Integration
- Use comments for all progress tracking
- Update statuses in real-time
- Link commits to issues
- Ensure subtasks are updated
- Maintain audit trail in Jira for debugging
- Update epic with summary when complete

### Epic-Specific Considerations
- Keep stories with their subtasks together for context
- Respect epic-level dependencies
- Consider epic completion when all children are done
- Provide epic-level summary in final report

## Example Execution Flows

### Example 1: Small Epic (3-5 Stories)
```bash
$ /jira-epic-execute CHR-100

Analyzing epic CHR-100...
Epic: "User Authentication System"
   Status: In Progress | Priority: High | Labels: auth, security

Found 4 child stories with 12 subtasks
Status: 3 ready, 1 blocked (external dependency)

Code Analysis:
   Launching 3 parallel analysis agents...
   File conflicts: NONE DETECTED
   Technical areas: backend (2), frontend (1), testing (1)

Validation Analysis:
   File Conflicts: NONE
   Dependencies: VALIDATED (1 external blocker noted)
   Phase Distribution:
   - Foundation: 0 issues (0%)
   - Features: 3 issues (75%)
   - Integration: 1 issue (25%) - blocked, will skip

Execution Plan:
   Phase 1: Features - 2 agents (parallel)
     - Agent-1: CHR-101 + 3 subtasks (backend auth)
     - Agent-2: CHR-102 + 2 subtasks (backend API)
     - Agent-3: CHR-103 + 2 subtasks (frontend login)

Phase 1: Features (Validated Parallel Execution)
   [File conflicts validated - safe to proceed]
   Launching Agents 1-3 in parallel...
   Agent-1 completed CHR-101
   Agent-2 completed CHR-102
   Agent-3 completed CHR-103

Epic Execution Complete!
   Completed: 3/4 issues (75%)
   Skipped: 1 issue (blocked by external dependency)
   Parallel execution: 100%
   Time: 15m 42s

Epic CHR-100 progress: 75%
Remaining: CHR-104 (blocked by AUTH-500)
```

### Example 2: Large Epic with Multiple Phases
```bash
$ /jira-epic-execute PROJ-200

Analyzing epic PROJ-200...
Epic: "Payment Processing System"
   Status: To Do | Priority: Highest | Labels: payments, core

Found 12 child stories with 45 subtasks
Status: 11 ready, 1 already complete (skipped)

Code Analysis:
   Launching 11 parallel analysis agents...
   File conflicts: 2 DETECTED
   - src/models/payment.ts: CHR-201, CHR-204
   - database/migrations/: CHR-201, CHR-205
   Resolution: Sequential execution for conflicting issues

Validation Analysis:
   File Conflicts: RESOLVED (sequential execution)
   Dependencies: VALIDATED
   Phase Distribution:
   - Foundation: 2 issues (17%) - DB migrations
   - Features: 8 issues (66%)
   - Integration: 2 issues (17%) - E2E tests

Execution Plan:
   Phase 1: Foundation - 1 agent (sequential)
     - Agent-1: CHR-201 (DB schema), CHR-205 (migrations)
   Phase 2: Features - 4 agents (parallel, conflicts resolved)
     - Agent-2: CHR-202, CHR-203 (payment core)
     - Agent-3: CHR-204 (sequential after Agent-2)
     - Agent-4: CHR-206, CHR-207 (API endpoints)
     - Agent-5: CHR-208, CHR-209 (frontend)
   Phase 3: Integration - 2 agents (parallel)
     - Agent-6: CHR-210 (E2E tests)
     - Agent-7: CHR-211 (documentation)

Phase 1: Foundation
   Agent-1 completed CHR-201, CHR-205

Phase 2: Features (Validated Parallel Execution)
   Launching Agents 2, 4, 5 in parallel...
   Agent-2 completed CHR-202, CHR-203
   Agent-3 now launching (conflict resolved)...
   Agent-4 completed CHR-206, CHR-207
   Agent-5 completed CHR-208, CHR-209
   Agent-3 completed CHR-204

Phase 3: Integration
   Launching Agents 6-7 in parallel...
   Agent-6 completed CHR-210
   Agent-7 completed CHR-211

Epic Execution Complete!
   Completed: 11/12 issues (92%)
   Skipped: 1 issue (already complete)
   Parallel execution: 65%
   Time: 48m 15s

Epic PROJ-200 marked as complete
All tests passing
```

### Example 3: Dry-Run Preview
```bash
$ /jira-epic-execute FEAT-50 dry-run

Analyzing epic FEAT-50...
Epic: "Dashboard Redesign"
   Status: To Do | Priority: Medium

Found 8 child stories with 28 subtasks
Status: 8 ready

Code Analysis:
   Launching 8 parallel analysis agents...
   File conflicts: NONE
   Technical areas: frontend (6), backend (1), testing (1)

EPIC EXECUTION PLAN (DRY-RUN MODE)

### Epic: FEAT-50 - Dashboard Redesign

### Phase Distribution
- Foundation: 0 issues (0%)
- Features: 7 issues (87.5%)
- Integration: 1 issue (12.5%)

### Agent Assignments
- Agent-1 (Features): FEAT-51 + 4 subtasks (layout components)
- Agent-2 (Features): FEAT-52 + 3 subtasks (chart widgets)
- Agent-3 (Features): FEAT-53, FEAT-54 + 6 subtasks (data panels)
- Agent-4 (Features): FEAT-55, FEAT-56 + 5 subtasks (API integration)
- Agent-5 (Features): FEAT-57 + 3 subtasks (responsive design)
- Agent-6 (Integration): FEAT-58 + 4 subtasks (E2E tests)

### Validation Results
- File Conflicts: NONE
- Circular Dependencies: NONE
- Execution Order: VALIDATED

Total Agents: 6 (4 max parallel in features phase)
Estimated Parallel Execution: 85%

To execute: /jira-epic-execute FEAT-50
```

### Example 4: Force Execution with Blockers
```bash
$ /jira-epic-execute HOTFIX-10 force

Analyzing epic HOTFIX-10...
Epic: "Critical Security Patches"
   Status: To Do | Priority: Highest

Found 3 child stories with 8 subtasks
Status: 2 ready, 1 blocked

WARNING: Issue HOTFIX-12 has unresolved blockers:
   - Blocked by: CORE-999 (In Progress, outside epic)

force flag enabled: Proceeding anyway

Execution Plan:
   Phase 1: Features - 2 agents (parallel)
     - Agent-1: HOTFIX-11 + 3 subtasks
     - Agent-2: HOTFIX-13 + 2 subtasks
   Phase 2: Features - 1 agent (forced)
     - Agent-3: HOTFIX-12 + 3 subtasks (blocker ignored)

Phase 1: Features
   Launching Agents 1-2 in parallel...
   Agent-1 completed HOTFIX-11
   Agent-2 completed HOTFIX-13

Phase 2: Features (Forced)
   Agent-3 starting HOTFIX-12...
   Agent-3 completed with warnings (partial implementation)

Epic Execution Complete (with warnings)
   Completed: 3/3 issues (100%)
   Warnings: HOTFIX-12 may be incomplete due to blocker

Action Required:
   - Complete CORE-999 external dependency
   - Review HOTFIX-12 implementation
   - Re-test after blocker resolved
```

## Comparison with Related Commands

| Feature | epic-execute | sprint-execute | issue-execute |
|---------|-------------|----------------|---------------|
| **Scope** | Entire epic with all children | Sprint iteration | Specific issue keys |
| **Context** | Epic issue key | Sprint name/ID | Issue key(s) |
| **Use Case** | Feature/initiative completion | Time-boxed iteration | Ad-hoc, hot fixes |
| **Dependencies** | Epic-wide analysis | Sprint-bounded | Dynamic per issue |
| **Entry Point** | Epic key | Sprint identifier | Issue key(s) |
| **Children** | All stories/tasks under epic | Issues in sprint | Specified + deps |
| **Typical Size** | 5-20+ issues | 10-25 issues | 1-5 issues |

## Best Practices

**Epic Selection**:
- Ensure epic has been broken down into stories with subtasks
- Run `/jira-epic-breakdown` first if epic is high-level
- Verify acceptance criteria exist on all children
- Check for and resolve external dependencies when possible

**Dependency Management**:
- Resolve external blockers before execution when possible
- Use dry-run to preview complex epics
- Understand impact before using force flag
- Keep related stories together in agent assignments

**Progress Tracking**:
- Monitor Jira for real-time updates from agents
- Check agent comments for detailed progress
- Review final epic summary for completeness
- Use epic progress percentage to track overall status

**Error Recovery**:
- Use force flag sparingly and only when blockers are understood
- Review failed executions before retrying
- Check Jira comments for detailed failure information
- Consider breaking large epics into multiple execution runs

## Jira CLI Reference

### Epic Operations
```bash
# View epic details
jira issue view EPIC-123 --json

# List epic children
jira issue list --jql="parent=EPIC-123" --json

# Check issue type
jira issue view EPIC-123 --json | jq -r '.fields.issuetype.name'
```

### Issue Operations
```bash
# View issue details
jira issue view CHR-123 --json

# List subtasks
jira issue list --jql="parent=CHR-123" --json

# Move issue status
jira issue move CHR-123 --status "In Progress"
jira issue move CHR-123 --status "Done"

# Add comment
jira issue comment add CHR-123 --message "Progress update..."

# Get issue links (dependencies)
jira issue view CHR-123 --json | jq '.fields.issuelinks'
```

### Dependency Parsing
```bash
# Extract blocking issues
jira issue view CHR-123 --json | jq -r '
  .fields.issuelinks[] |
  select(.type.name == "Blocks") |
  if .outwardIssue then .outwardIssue.key else .inwardIssue.key end
'

# Check if blocked by other issues
jira issue view CHR-123 --json | jq -r '
  .fields.issuelinks[] |
  select(.type.inward == "is blocked by") |
  .inwardIssue.key
'
```

### Status Category Check
```bash
# Check if issue is done
jira issue view CHR-123 --json | jq -r '.fields.status.statusCategory.key'
# Returns: "done", "new", or "indeterminate"
```

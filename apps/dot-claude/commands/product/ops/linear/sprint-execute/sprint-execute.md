---
allowed-tools: Bash(date:*), Bash(git status:*), Bash(git commit:*), Bash(mkdir:*), Bash(rg:*), Bash(linctl:*), Todo, Task, Write, Glob, Grep, MultiEdit
argument-hint: <project-name> [epic-id]
description: (*Run from PLAN mode*) Review Linear project/epic, select sprint work, and execute with subagents maximizing concurrency
---

# Linear Sprint Execution Command
Query Linear for the specified sprint project, analyze the issues in the sprint, then plan and execute a sprint using a structured workflow and subagents.

The command will intelligently parallelize implementation where safe and appropriate, carefully identifying independent work streams while rigorously validating for file conflicts and dependencies.

## Variables
- `$1` (project-name): (Required) Linear project name to query for issues
- `$2` (epic-id): (Optional) Specific epic ID to build sprint from. If not provided, analyzes project backlog


## Workflow

### Step 1: Setup
1. Parse command arguments: `$1` contains the project name, `$2` contains optional epic ID

### Step 2: Issue Analysis
1. Use the Task tool to execute the `project_context_subagent_prompt` below, replacing `$IDENTIFIER` with the project identifier
   <project_context_subagent_prompt>
      Execute the following steps:
      1. Use `linctl team list --json` to get team context
      2. Use `linctl project list --json` to find the project with the identifier $IDENTIFIER
      3. Extract project ID from the matching sprint project
      4. Use `linctl issue list --project <project-id> --json` to fetch details about all issues in the sprint project, including:
         - Description and acceptance criteria
         - Labels (especially phase:* and area:* labels)
         - Priority level
         - Dependencies (blocks/blocked by relationships)
         - Parent/child relationships (use `linctl issue list --parent <issue-id> --json` to fetch child issues)
         - Any existing comments for context (use `linctl comment list --issue <issue-id> --json`)
      5. Return a report of the sprint's issues to main agent in the following format:
         ```markdown
         # Sprint [SprintProjectIdentifier] Issue Details

         ## Summary
         ### Goals
         [summarize the overall goals of the sprint]

         ### Metrics
         [list the issue count by priority and status]

         ## Issue Details
         <foreach issue>
         ### [Issue-identifier]-[Issue Title]
         **Summary:**
         [summary of the issue from its description]
         **Acceptance Criteria:**
         [bulleted list of acceptance criteria]
         **Metadata:**
         [include metadata like priority, labels]
         **Dependencies:**
         [OPTIONAL - list any dependency relationships]
         **Implementation Details:**
         [OPTIONAL - include a summary of implementation details if provided]
         **Notes/Comments:**
         [OPTIONAL - include a summary of comments if available]
         </foreach>
         ```
   </project_context_subagent_prompt>

### Step 3: Code Analysis
1. Based on the report from the Step 2 agent, use the Task tool to launch a subagent for each feature using the `code_analysis_subagent_prompt` prompt below. Launch the agents **concurrently**, making multiple Task tool calls in a single request.
   <code_analysis_subagent_prompt>
      # ROLE
      You are an s-tier research engineer specializing in identifying relevant code for a given feature.

      # CONTEXT
      Linear Issue: $ISSUE_IDENTIFIER - $ISSUE_TITLE
      Issue Summary:
      $ISSUE_SUMMARY

      Acceptance Criteria:
      $ACCEPTANCE_CRITERA

      [Dependencies: $DEPENDENCIES]
      [Notes: $NOTES]

      # TASK
      Think hard about the above issue and how it would be implemented in this codebase. Thoroughly analyze the codebase to find all relevant code (including tests) that would be modified during implementation. Additionally, identify new files that would be created during implementation. Identify any dependency relationships in the implementation. Report your findings to the main agent in the provided format.

      # OUTPUT
      Format your report like this:
      ```markdown

      # [ISSUE_IDENTIFIER] Implementation Analysis

      ## Summary
      [In up to 3 bullet points, summarize the high-level changes to the code]

      ## File Analysis
      ### New Files
      [List every file that will be created in the implementation by relative path, and briefly explain its purpose]

      ### File Changes
      [List every file that will be changed in the implementation by relative file, the type of change (Modified, Deleted, Moved), and briefly explain the change. IF the file will be modified, provide psuedocode or shortened real-code details of the changes as well, with line numbers if possible.]

      ## Dependency Analysis
      [List file and code dependencies for the implementation]
      ```
   </code_analysis_subagent_prompt>

2. Using those analyses, generate a file confict analysis report that: 
   - Maps out potential file i/o overlaps between different issues
   - Maps file dependencies between issues

### Step 4: Plan the Sprint Execution

Based on the Linear issues analysis from Step 2 and the code analyses from Step 3, create a safe execution plan that balances parallelization with strict avoidance of file i/o and dependency conflicts.

1. **Distribute each issues into one of three execution phases:**
   Categorize the sprint issues into execution phases based on their phase labels or dependency chain
   
   - **Foundation Phase**: (Optional) Issues that must be completed first (e.g. database migrations, core infrastructure changes, blockers to other issues, etc.)
   - **Features Phase**: Issues that represent the main functional changes for the sprint
   - **Integration Phase**: Issues that require most other work to be complete (E2E tests, documentation, deployment configs)
   
   VALIDATE that the distribution follows these guidelines:
   - Foundation phase should contain less than 10% of total work (ideally 0-5%)
   - Features phase should contain at least 70% of total work (ideally 75-85%)
   - Integration phase should contain the remaining work (ideally 10-20%)
   
   If the distribution is heavily weighted toward foundation or integration phases, consider re-evaluating whether some issues could actually run in parallel.

2. **Plan Sub-Agent Assignments**
   Group and assign issues to individual subagents, by:
   - Stack area (frontend, backend, api, database, etc.) boundaries 
   - Area of the codebase (especially touching the same files)
   - Tight-coupling, if the issues do not cross stack or phase boundaries
   
   **Agent Distribution Guidelines**:
   - Assign complete feature areas or functional domains to each agent
   - Each agent should receive a coherent set of related issues that form a logical unit of work
   - Balance the complexity and estimated effort across agents, but prioritize keeping related work together
   - Limit parallel execution to a maximum of 4 agents to avoid resource contention and merge conflicts
   - If there are more than 4 logical groupings, combine the smallest related groups

3. **Plan Sub-Agent Identity:**
   - Assign each agent a number
   - Think about the features assigned to each subagent and either:
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

5. **Generate Validated Execution Plan**:
   Create a comprehensive execution plan that prioritizes safety and correctness:
   
   - The number of issues in each phase with their percentage of total work
   - The number of agents that will run in each phase
   - **File Conflict Report**: List any files that multiple agents will touch and how conflicts are resolved
   - **Validation Results**: Confirmation that all file conflicts have been eliminated
   - **Dependency Map**: Visual or textual representation of issue dependencies
   - Any identified risks or constraints that affect execution
   
   Example format:
   "Foundation Phase: X issues (Y%) - Z agent(s) running sequentially
   [Agent and issue assignment details]
   Features Phase: X issues (Y%) - Z agents (parallel execution validated - NO file conflicts)
   [Agent and issue assignment details]
   Integration Phase: X issues (Y%) - Z agents
   [Agent and issue assignment details]
   
   File Conflict Analysis: [PASS/FAIL with details]
   Dependency Validation: [PASS/FAIL with details]"

### Step 5: Execute the Sprint

<subagent_prompt_template>
```markdown
# Role
You are Agent-[ASSIGNED NUMBER], a principal software engineering agent specializing in [SPECIALIZATIONS BASED ON ASSIGNED ISSUES]

# Assigned Issues
## Sprint Goals: 
[OVERALL SPRINT OBJECTIVES]

## Linear Issues: 
[LIST ASSIGNED LINEAR ISSUES AND SUB-ISSUES WITH IDENTIFIERS, TITLE, DESCRIPTIONS, ACCEPTANCE CRITERIA, AND TECHNICAL REQUIREMENTS]

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
2. As you implement the feature, use linctl to track your progress:
   - Comment "🤖 Agent-$agentnumber starting work" when beginning to work on an issue
   - Comment progress updates as you complete major milestones
   - Update status of sub-issues to "Done" as you complete subtasks
   - Comment final summary with files modified when complete

## Step 3: Test, Test, Test
1. Run the tests from Step 1, and confirm all of the tests pass
2. IF the tests pass, proceed to Step 4, 
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
      - Make commits based on subagent work logs in Linear comments
      - Update issues to "In Review" state

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
   - Wait for ALL agents to complete

4. **Update Linear on Completion**:
   - Make commits based on subagent work logs in Linear comments
   - Move completed issues and sub-issues to "Done" state
   - Add summary comments with implementation details
   - Note any issues that couldn't be completed

#### Phase 3: Integration (Final Validation)
1. **Launch integration agents** (if any):
   - Similar parallel launch as features phase
   - Focus on testing and documentation tasks

2. **Final validation**:
   - Review all changes from all execution phases for consistency
   - Ensure all acceptance criteria met
   - Lint code if applicable, and run new tests if applicable
   - Update final Linear issues

### Step 6: Finalize and Report

1. **Linear Updates**:
   ```python
   For each completed issue:
   - Update status to "Done"
   - Add completion comment with:
     - Agent number that completed it
     - Files modified
     - Tests added/passed
     - Any notes or warnings
   - For each child issue (subtask):
      - Ensure status is updated to "Done"
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
   - Features: [X]/[Y] issues (4 agents max, parallel)
   - Integration: [X]/[Y] issues (2 agents, parallel)
   
   ### Parallelization Metrics
   - Max concurrent agents: [NUMBER]
   - Parallel execution percentage: [PERCENTAGE]%
   - Total execution phases: 3
   
   ### Completed Issues
   - [ISSUE-KEY]: [Title] ✅
   - [ISSUE-KEY]: [Title] ✅
   - [Continue for all completed...]
   
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
    - Check Linear for any partial progress
    - Relaunch agent with same assignment
    - Note retry in Linear comments
  else:
    - Mark issues as "Blocked"
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

### Safe and Intelligent Parallelization
- Validate file conflicts before any parallel execution
- Balance parallelization with code safety and quality
- Default to sequential if validation reveals any conflicts
- Target 70-80% parallel work only when fully validated

### Agent Efficiency
- Group related issues by technical area
- Minimize context switching per agent
- Balance workload across agents
- Provide clear, complete context upfront

### Linear Integration
- Use comments for all progress tracking
- Update statuses in real-time
- Link commits to issues
- Ensure sub-issues are updated
- Maintain audit trail in Linear

## Example Execution Flow

```
$ /sprint-execute "Sprint 2024-12-001: Authentication"

🔍 Fetching sprint from Linear...
📋 Found 20 issues in sprint project

🔍 Validation Analysis:
  File Conflicts: NONE DETECTED ✅
  Dependencies: VALIDATED ✅
  Foundation: 1 issue (5%) - 1 agent required
  Features: 15 issues (75%) - 4 agents (parallel execution validated)
  Integration: 4 issues (20%) - 2 agents

🚀 Phase 1: Foundation
  ✅ Agent-1 completed database migrations (ISSUE-101)

🚀 Phase 2: Features (Validated Parallel Execution)
  [File conflicts validated - safe to proceed]
  ⏳ Agents 2-5 working in parallel...
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
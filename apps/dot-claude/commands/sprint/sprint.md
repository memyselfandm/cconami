---
allowed-tools: Bash(date:*), Bash(git status:*), Bash(git commit:*), Bash(mkdir:*), Task, Write, MultiEdit
argument-hint: [backlog-file]
description: (*Run from PLAN mode*) Review a backlog file, select the next sprint, and execute it with subagents
---

# Sprint Execution Command
Read the backlog file $ARGUMENTS, and pay attention to current roadmap progress, as well as dependencies and parallelization opportunities.
You will plan the next sprint and execute it using subagents.

**Agent Assignment Protocol:**
Each sub-agent receives:
1. **Sprint Context**: Summary of the overall goals of the sprint
2. **Feature Context**: Assigned Feature and Feature Tasks from the backlog
3. **Specialization Directive**: Explicit role keywords specific to the assigned feature (e.g. backend, database, python development, etc.)
4. **Quality Standards**: Detailed requirements from the specification


**Sub-Agent Prompt Template:**
Use this prompt template for each sub-agent
```
VARIABLES:
$agentnumber: [ASSIGNED NUMBER]
$worklog: `tmp/worklog/sprintagent-$agentnumber.log`

ROLE: Act as a principal software engineer specializing in [SPECIALIZATIONS]

CONTEXT:
<optional PRD reference, if provided in backlog>
- PRD: @ai_docs/prds/00_pacc_mvp_prd.md
</optional PRD reference>
- Helpful documentation: @ai_docs/knowledge/*

FEATURE:
[Assigned FEATURE, TASKS, and ACCEPTANCE CRITERIA from backlog file]

INSTRUCTIONS:
1. Implement this feature using test-driven-development. Write meaningful, honest tests that will validate complete implementation of the feature.
2. Do not commit your work.
3. Log your progress in $worklog using markdown.
4. When you've completed your work, summarize your changes along with a list of files you touched in $worklog
5. Report to the main agent with a summary of your work.
```

## Instructions
### Step 1: Setup
1. Create a `tmp/worklog` folder if it does not exist, and add it to .gitignore. Remove any existing agent worklogs with `rm -rf tmp/worklog/sprintagent-*.log`.

### Step 2: Plan the Sprint
1. Read the backlog file: identify the next phase/sprint of work, and the features and tasks in the sprint.
2. Plan the team: based on the features, tasks, and parallelization guidance, plan the sub-agents who will execute the sprint. 
    - Assign specializations, features, and tasks, acceptance criteria, and instruction to each subagent using the prompt template.
    - Assign each subagent an incremental number (used for their worklog file)
3. Plan the execution: based on dependencies, assign the agents to an execution phase. You do not need to assign agents to every phase.
    1. foundation: dependencies, scaffolding, and shared components that must be built first.
    2. features: the main execution phase. most subagents should be in this phase, and all agents in this phase MUST be executed **simultaneously**.
    3. integration: code review, integration testing, documentation, and final polish after the main execution phase is complete.

### Step 3: Execute the Sprint
#### Phase 1: Foundation (Dependencies & Scaffolding)
1. Launch the agent(s) in the foundation phase and wait for the phase to complete successfully.
2. If the phase does not complete successfully, you may re-launch the agent(s) up to 2 times. If the phase fails more than 2 times, STOP and inform the user of the issue.
3. When the phase completes successfully, read the agents' worklogs in `tmp/worklog`, then:
    - make commits for the changes made in this phase
    - summarize the changes and add the summary to `tmp/worklog/sprint-<sprint-number>.log`
    - check off any completed features and tasks in the backlog file
    - continue to the next phase

#### Phase 2: Features (Main Execution)
1. Launch **all** agents assigned to the features phase using a SINGLE message with MULTIPLE Task tool invocations.
   **CRITICAL:** Do NOT create separate todo items for each agent. Use ONE todo item like "Launch all Feature Phase agents simultaneously" and invoke the Task tool multiple times in a single response. Do NOT wait for one agent to complete before launching the next.
   **IMPORTANT:** These subagents should be running at the same time, not one after the other.
2. If any agent(s) in this phase does not complete successfully, you may re-launch the agent(s) up to 2 times. If any agent fails more than 2 times, STOP and inform the user of the issue.
3. When all agents in this phase completes successfully, read the agents' worklogs in `tmp/worklog`, then:
    - make commits for the changes made in this phase
    - summarize the changes and add the summary to `tmp/worklog/sprint-<sprint-number>.log`
    - check off any completed features and tasks in the backlog file
    - continue to the next phase

#### Phase 3: Integration (Review, Testing, & Polish)
1. Launch all the agents assigned to the integration phase **simultaneously**, and wait for all agents to complete.
2. If any agent(s) in this phase does not complete successfully, you may re-launch the agent(s) up to 2 times. If any agent fails more than 2 times, STOP and inform the user of the issue.
3. When all agents in this phase completes successfully, read the agents' worklogs in `tmp/worklog`, then:
    - review all the changes comprehensively for consistency, and fix any issues you find.
    - make commits for the changes made in this phase
    - summarize the changes and add the summary to `tmp/worklog/sprint-<sprint-number>.log`
    - check off any completed features and tasks in the backlog file
    - continue to the final phase

### Step 4: Finalize and Report
1. Clean up: scan the project and clear any temp files or throwaway code left by the subagents
2. Make any final backlog updates: ensure the progress made in the sprint is reflected in the backlog file
3. Update memory: Ensure the changes made in the sprint are reflected in CLAUDE.md
4. Final commits: make any final commits.
5. Present a summary and report of the sprint to the user.
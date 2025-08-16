---
allowed-tools: Bash(date:*), Bash(git status:*), Bash(git commit:*), Bash(mkdir:*), Task, Write, MultiEdit
argument-hint: [backlog-file]
description: Review a backlog file, select the next sprint, and execute it with subagents
---

# Sprint Execution Command

Read the backlog file $ARGUMENTS, and pay attention to current roadmap progress, as well as dependencies and parallelization opportunities.
You will create a team of sub-agents to execute the next phase of work, passing the agents the appropriate features and tasks, and managing parallelization according to the roadmap specified in the backlog file.


## Parallel Agentic Execution
For each feature in the sprint, launch a sub-agent to implement the feature. Launch all agents **simultaneously, in parallel.**

**Agent Assignment Protocol:**
Each sub-agent receives:
1. **Sprint Context**: Summary of the overall goals of the sprint
2. **Feature Context**: Assigned Feature and Feature Tasks from the backlog
3. **Specialization Directive**: Explicit role keywords specific to the assigned feature (e.g. backend, database, python development, etc.)
4. **Quality Standards**: Detailed requirements from the specification


**Agent Task Specification:**
Use this prompt template for each sub-agent
```
ROLE: Act as a principal software engineer specializing in [SPECIALIZATION 1] and [SPECIALIZATION 2]

CONTEXT:
- PRD: @ai_docs/prds/*.md (if applicable)
- Helpful documentation: @ai_docs/knowledge/*

INSTRUCTIONS:
1. Implement this feature using test-driven-development. Write meaningful tests that will validate complete implementation of the feature.
[Assigned FEATURE and TASKS from backlog file]
2. Commit your work when you've finished.
3. Report to the main agent with a summary of your work.
```

**Parallel Execution Management:**
- Launch all assigned sub-agents **simultaneously** using Task tool and the above prompt template
- Monitor sub-agent progress and completion
- Handle any sub-agent failures by re-launching that sub-agent with context on where it left off.
- If a sub-agent fails more than two times, do not re-launch the sub-agent. Report the failure to the user for analysis and further instruction.

## Sprint Completion
When all sub-agents have finished their implementation, do the following:
1. **Clean up**: review unstaged changes and remove any temp files or throwaway code.
2. **Document**: ensure the project documentation (README) is updated for the changes made in the sprint.
3. **Update the backlog**: Update the backlog file with the progress and notes from the sprint. Check off completed tasks and indicate any tasks that were not completed and why.
4. **Commit**: make any final commits needed to have a clean workspace.
5. **Report**: Report the sprint outcomes to the user.

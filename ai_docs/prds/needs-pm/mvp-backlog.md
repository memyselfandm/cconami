## Slash Commands
### Project Meta-initialization
1. Context Priming:
- Read project documentation and codebase
- Build deep context about the project: goals, architecture, technical preferences 
2. Create Agents:
- Launch the `chief-of-staff` agent, passing detailed analysis of the codebase. 
- The sub-agent will review the existing agents in .claude/agents and recommend any additional agents for the project. It will provide a list of agent job titles and brief job descriptions. 
- For each suggested agent, Launch the `agent-architect` meta-agent, passing the job title and description. The agent architect will create the claude code sub-agent files using the latest documentation and best practice.

### Backlog and Sprint Planning
For each provided PRD file, run subagents **in parrallel** to write out the backlog for each PRD.
Each subagent should follow this process:
1. thoroughly read the prd and think hard about the breakdown of features and tasks.
2. create a file alongside the prd following the convention <PRD-filename-without-extension>.backlog.md
3. in the backlog file, write a list of features. each feature should have a concise, information-dense description, and a checklist of up to 5 descriptive tasks.
4. when the list of features is complete, add a sprint plan that groups the features to maximize parallelization and eliminate dependency clashes.
5. DO NOT put timelines in the backlog
6. report back to the main agent when done.Remember, the backlog writing agent should operate **simultaneously, in parralell**     

### Plan to Backlog 
#### Use case:
when the user has developed a plan with claude code (e.g. in plan mode) or has a PRD/spec/plan file.
#### Inputs:
- a single filename: the command will assume the current context is the plan and write the backlog to input filename
- two filenames: the first filename is the source plan, the second filename is the destination backlog

#### Prompt:
write the plan out as a feature backlog to $file the backlog should contain:
1. overview: summarize the goal(s) of this epic\
2. a list of features: each feature should have a description, acceptance criteria, and up to 5 tasks to implement the feature in checklist format
3. a sprint plan: group the features into sprints, prioritizing parrallelization and avoiding dependency clashes. DO NOT write timelines in the sprint plan. just use incremental numbers for the sprints.

### Agent Knoweldge Priming
(WIP)
1. look at the codebase and identify the core architecture components (tech stack, libraries, etc)
2. look at existing documentation in the codebase for the identified architecture components

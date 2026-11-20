---
name: linear-workflow
description: Linear project management workflow using linctl CLI - structure, issue types, sprint planning, and execution patterns
user-invocable: false
---

# Linear Project Management Workflow

## linctl CLI Usage
Use `linctl` CLI tool to interact with Linear. Always use `--json` flag on read operations (get, list, search).

**Important Rules:**
- Ticket format: `ABC-<number>` — always reference by number
- If creating a ticket and project is unclear, prompt the user
- Subtasks inherit parent ticket's project by default
- When task status changes in description (task to done), update the description
- Progress reports beyond checkbox changes go as ticket comments
- If `linctl` is not working, inform the user immediately

## Linear Structure
```
Linear Teams (Product/Big Project) -> Linear Projects (Initiative/Release/Workstream/Sprint) -> Linear Issues (Epic/Feature/Task)
```

### Teams = Products/Big Projects
- Most products = separate Linear teams
- Side projects = grouped under "MemyselfandM" team

### Projects (Two Types)
1. **Initiatives/Releases/Workstreams** - contain related epics
2. **Sprints** - execution plan for one epic's features
   - Named: `[EPIC-ID].S01`, `[EPIC-ID].S02`, etc.

### Issues (Four Types)
- **Epic** (label: `epic`) - major feature area, spans multiple sprints
- **Feature** (label: `feature`) - discrete capability within epic
  - **Feature's Subtasks** (label: `task` or unlabeled) - child issues to complete a feature
- **Task** (label: `task`, `bug`, or unlabeled) - implementation work

## Structure Example
```
Team: Chronicle
+-- Project: Q4 Auth System (Release)
|   +-- Epic: IDF-24 (User Authentication)
|   +-- Epic: IDF-25 (Session Management)
+-- Project: IDF-24.S01 (Sprint)
|   +-- Feature: JWT Implementation
|   |   +-- Sub-task: Generate and store token
|   |   +-- Sub-task: Integrate JWT into auth
|   +-- Feature: Login UI
|       +-- Sub-task: Login form
|       +-- Sub-task: Social sign-in
+-- Project: IDF-24.S02 (Sprint)
    +-- Feature: OAuth Integration
    +-- Feature: Password Reset
```

## Key Rules
- Link all issues with parent-child relationships
- No Linear cycles (use sprint projects instead)
- All development by AI agents via Claude Code
- Maximize parallel work within sprints
- Completion tracking: Tasks done -> Features done -> Epic done -> Release done

## Workstreams vs Releases

| Aspect | Workstreams | Releases |
|--------|-------------|----------|
| **Examples** | cconami, homelab, internal tools | Chronicle, Pacc, SaaS products |
| **Deployment** | Continuous, feature-by-feature | Bundled, versioned releases |
| **Planning** | Group by domain/area | Group by user-facing milestones |
| **Execution** | Parallel workstreams | Sequential releases |
| **Dependencies** | Within workstream only | Across entire release |

For the full 6-stage workflow, slash command reference, and detailed examples, see [workflow-reference.md](./workflow-reference.md).

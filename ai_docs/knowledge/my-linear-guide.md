# Linear Structure and Workflow Guide

## Hierarchy
```
Linear Team (Product/Big Project) → Linear Project (Initiative/Release/Workstream/Sprint) → Linear Issue (Epic/Feature/Task)
```

### Linear Teams = Products/Big Projects
- Most products = separate Linear teams
- Side projects = grouped under "MeMyselfAndM" team

**Team Categories in My Workspace:**
- **Products**: Chronicle, pacc CLI, MAIA suite, HumanDocs
- **Consulting**: FW Consulting, ITFS Consulting, Consulting
- **Personal/Experimental**: MeMyselfAndM, Homelab, LangGang, CConami - CC Cheats

### Linear Projects (Two Types)
1. **Initiatives/Releases/Workstreams** - contain related epics
2. **Sprints** - execution plan for one epic's features
   - Named: `[EPIC-ID].S01`, `[EPIC-ID].S02`, etc.
   - Example: `IDF-24.S01`, `IDF-24.S02`

### Issues (Four Types)
- **Epic** (label: `epic`) - major feature area, spans multiple sprints
- **Feature** (label: `feature`) - discrete capability within epic
    - **Feature's Subtasks** (label: `task` or unlabeled) - tasks to complete a feature (child issues )
- **Task** (label: `task`, `bug`, or unlabeled) - implementation work

## Structure Example
```
Team: Chronicle
├── Project: Q4 Auth System (Release)
│   ├── Epic: IDF-24 (User Authentication)
│   └── Epic: IDF-25 (Session Management)
├── Project: IDF-24.S01 (Sprint)
│   ├── Feature: JWT Implementation
│   │   ├── Sub-task: Generate and store token
│   │   └── Sub-task: Integrate JWT into auth
│   └── Feature: Login UI
│   │   ├── Sub-task: Login form
│   │   └── Sub-task: Social sign-in
└── Project: IDF-24.S02 (Sprint)
    ├── Feature: OAuth Integration
    └── Feature: Password Reset
```

## Complete Command Workflow: Idea → Execution

### 📝 Stage 1: Ideation → Backlog
**Getting raw ideas into Linear as actionable items**

```bash
# Capture quick ideas as issues
/refine-issue --team "Chronicle" --type task
# → Interactive creation of tasks, bugs, or chores

# Create comprehensive epics from concepts
/refine-epic --team "Chronicle" 
# → Full epic with problem statement, user stories, acceptance criteria

# Quick epic creation for simpler initiatives
/refine-epic-lite --team "Chronicle"
# → Streamlined epic creation with minimal overhead

# Define features within epics
/refine-feature --epic EPIC-123
# → Right-sized features optimized for AI execution
```

### 🎯 Stage 2: Epic Preparation
**Creating and preparing epics for planning**

```bash
# Validate and prepare epic structure
/epic-prep --team "Chronicle" --epic EPIC-123
# → Checks readiness, identifies gaps, matches orphan features

# Apply fixes to epic structure
/epic-prep --team "Chronicle" --epic EPIC-123 --execute
# → Creates missing features, fixes metadata, ensures completeness

# Break down epic into features and tasks
/epic-breakdown --team "Chronicle" --epic EPIC-123
# → AI-powered analysis creates complete hierarchy
# → Optimizes for parallel execution
```

### 📋 Stage 3: Planning → Workstreams OR Releases
**Organizing epics based on your project type**

#### Option A: Workstreams (Parallel Execution)
**For continuous improvement projects (CConami - CC Cheats, Homelab, MeMyselfAndM, etc)**

```bash
# NOTE: /workstream-plan command (PLANNED - not yet implemented)
# Would organize epics into parallel workstreams by:
# - Technical area (frontend, backend, infra)
# - Feature domain (auth, payments, analytics) 
# - Team ownership
# → Multiple workstreams can execute simultaneously
# → No versioned releases, deploy when ready
```

#### Option B: Releases (Serial Execution)
**For products with versioned deployments (Chronicle, pacc CLI, MAIA suite, HumanDocs)**

```bash
# Plan multi-release roadmap (6-month horizon)
/release-plan --team "Chronicle" --horizon 6
# → Creates release projects (v1.0, v1.1, v2.0)
# → Assigns epics to version milestones
# → Ensures dependency ordering

# Analyze dependencies across releases/epics (PLANNED)
# /dependency-map --release v1.0
# → Would visualize blocking relationships and critical paths

# Reorganize work between releases (PLANNED)
# /project-shuffle --from "v1.0 Release" --to "v1.1 Release"
# → Would move issues between releases while maintaining relationships

# Execute entire release (PLANNED)
# /release-execute --version v1.0
# → Would orchestrate all sprints in a release
```

### 🔍 Choosing Between Workstreams and Releases

| Project Type | Use Workstreams | Use Releases |
|--------------|-----------------|--------------|
| **Examples** | CConami - CC Cheats, Homelab, MeMyselfAndM | Chronicle, pacc CLI, MAIA suite, HumanDocs |
| **Deployment** | Continuous, feature-by-feature | Bundled, versioned releases |
| **Planning** | Group by domain/area | Group by user-facing milestones |
| **Execution** | Parallel workstreams | Sequential releases |
| **Dependencies** | Within workstream only | Across entire release |
| **Timeline** | Ongoing, no end date | Fixed release dates |

### 🏃 Stage 4: Sprint Planning
**Creating focused sprint projects from epics**

```bash
# Plan multiple sprints from single epic
/sprint-plan --team "Chronicle" --epic EPIC-123
# → Creates sprint projects: CHR-123.S01, CHR-123.S02, etc.
# → Groups related features to avoid dependency clashes

# Preview sprint breakdown without creating
/sprint-plan --team "Chronicle" --epic EPIC-123 --dry-run
# → Shows how work would be distributed across sprints

# Limit number of sprints created
/sprint-plan --team "Chronicle" --epic EPIC-123 --max-sprints 3
# → Controls sprint project creation
```

### 🚀 Stage 5: Execution
**Launching AI agents to implement the work**

```bash
# Execute individual sprint with parallel agents
/sprint-execute --project "CHR-123.S01"
# → Launches multiple AI agents working in parallel
# → Agents post progress to Linear comments
# → Automatic status updates

# Execute specific issues ad-hoc (hot fixes, individual features)
/issue-execute --issue BUG-456
# → Direct execution without sprint context
# → Automatic dependency resolution
# → Perfect for urgent fixes

# Execute multiple related issues
/issue-execute --issues CHR-100,CHR-101,CHR-102
# → Analyzes dependencies between issues
# → Maximizes parallel execution
# → Updates Linear in real-time

# Execute entire release (PLANNED)
# /release-execute --version v1.0
# → Would orchestrate execution of all sprints in release
# → Would manage dependencies between sprints
```

### 📊 Stage 6: Monitoring & Status
**Tracking progress and agent activity**

```bash
# Check specific sprint progress
/sprint-status --project "CHR-123.S01" --detailed
# → Shows completion %, active agents, blocked issues

# Monitor all team sprints
/sprint-status --team "Chronicle"
# → Overview of all sprint projects

# View only active executions
/sprint-status --active
# → Focus on currently running sprints
```

## Detailed Workflow Examples

### Example 1: Product Release Workflow (Chronicle/pacc CLI)
**For products with versioned releases**

```bash
# 1. Capture initial idea
/refine-epic --team "Chronicle"
# → Create epic: "CHR-100: AI-Powered Search"

# 2. Prepare epic for planning
/epic-prep --team "Chronicle" --epic CHR-100 --execute
/epic-breakdown --team "Chronicle" --epic CHR-100
# → Creates 8 features, 32 tasks

# 3. Plan release timeline (AFTER epics exist)
/release-plan --team "Chronicle" --horizon 3
# → Assigns CHR-100 to v2.0 release (Q2)
# → Groups with related epics for coordinated release

# 4. Create sprint projects
/sprint-plan --team "Chronicle" --epic CHR-100
# → Creates: CHR-100.S01, CHR-100.S02, CHR-100.S03

# 5. Execute release sprints (when command available)
# /release-execute --version v2.0
# → Would orchestrate all v2.0 sprints in sequence
# For now, execute sprints individually:
/sprint-execute --project "CHR-100.S01"

# 6. Monitor progress
/sprint-status --project "CHR-100.S01"
```

### Example 2: Continuous Improvement Workflow (CConami/Homelab)
**For projects with parallel workstreams**

```bash
# 1. Create multiple improvement epics
/refine-epic --team "MeMyselfAndM"
# → Create: "MMT-50: Enhance Linear Commands"
/refine-epic --team "MeMyselfAndM"
# → Create: "MMT-51: Improve Hook System"

# 2. Prepare epics
/epic-breakdown --team "MeMyselfAndM" --epic MMT-50
/epic-breakdown --team "MeMyselfAndM" --epic MMT-51
# → Both can be worked on simultaneously

# 3. Plan workstreams (when command available)
# /workstream-plan --team "MeMyselfAndM" (PLANNED)
# → Would create: "Linear Tools Workstream", "Hooks Workstream"
# → No dependencies between workstreams

# 4. Create sprint projects for each workstream
/sprint-plan --team "MeMyselfAndM" --epic MMT-50
# → Creates: MMT-50.S01
/sprint-plan --team "MeMyselfAndM" --epic MMT-51
# → Creates: MMT-51.S01

# 5. Execute in parallel (no blocking)
/sprint-execute --project "MMT-50.S01" &
/sprint-execute --project "MMT-51.S01" &
# → Multiple workstreams running simultaneously

# 6. Deploy as completed (no release bundling)
# Each feature deploys when ready
```

### Example 3: Bug Fix Sprint
```bash
# 1. Collect bug reports
/refine-issue BUG-201 BUG-202 BUG-203
# → Enhances existing bug reports

# 2. Create hotfix sprint
/sprint-plan --team "Chronicle" --issues BUG-201,BUG-202,BUG-203
# → Creates: CHR-HOTFIX.S01

# 3. Execute fixes
/sprint-execute --project "CHR-HOTFIX.S01"
```

### Example 4: Ad-hoc Issue Execution
```bash
# 1. Single urgent bug fix
/issue-execute --issue BUG-456
# → Direct execution without sprint setup
# → Updates Linear with progress

# 2. Multiple feature implementation
/issue-execute --issues FEAT-101,FEAT-102,FEAT-103 --dry-run
# → Preview execution plan first
/issue-execute --issues FEAT-101,FEAT-102,FEAT-103
# → Execute with parallel agents

# 3. Force execution despite blockers
/issue-execute --issue BLOCKED-789 --force
# → Proceeds even with unresolved dependencies
# → Use with caution
```

## Command Integration Patterns

### Sequential Flow
```bash
/refine-epic → /epic-prep → /epic-breakdown → /sprint-plan → /sprint-execute
```

### Parallel Planning
```bash
# Run simultaneously for different epics
/epic-breakdown --epic EPIC-101 &
/epic-breakdown --epic EPIC-102 &
/epic-breakdown --epic EPIC-103 &
```

### Dependency-Driven Execution
```bash
# /dependency-map --epic EPIC-101 (PLANNED)
# → Would identify EPIC-99 must complete first

/sprint-execute --project "CHR-99.S03"
# → Wait for completion

/sprint-execute --project "CHR-101.S01"
# → Now safe to execute
```

## Completion Tracking
Tasks done → Features done → Epic done → Release done

## Key Rules
- Link all issues with parent-child relationships
- No Linear cycles (use sprint projects instead)
- All development by AI agents via Claude Code
- Maximize parallel work within sprints
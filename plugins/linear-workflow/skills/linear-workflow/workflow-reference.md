# Linear Workflow Reference

## Complete Command Workflow: Idea to Execution

### Stage 1: Ideation to Backlog
Getting raw ideas into Linear as actionable items.

```markdown
# Capture quick ideas as issues
/refine-issue --team "Chronicle" --type task

# Create comprehensive epics from concepts
/refine-epic --team "Chronicle"

# Quick epic creation for simpler initiatives
/refine-epic-lite --team "Chronicle"

# Define features within epics
/refine-feature --epic EPIC-123
```

### Stage 2: Epic Preparation
Creating and preparing epics for planning.

```markdown
# Break down epic into features and tasks (includes all epic-prep functionality)
/epic-breakdown Chronicle EPIC-123
# Includes structure preparation, validation, and feature creation
# Optimizes for parallel execution
```

### Stage 3: Planning - Workstreams OR Releases

#### Option A: Workstreams (Parallel Execution)
For continuous improvement projects (cconami, homelab, internal tools, etc).

```markdown
# NOTE: /workstream-plan command needed (not yet implemented)
# Would organize epics into parallel workstreams by:
# - Technical area (frontend, backend, infra)
# - Feature domain (auth, payments, analytics)
# - Team ownership
```

#### Option B: Releases (Serial Execution)
For products with versioned deployments (Chronicle, pacc cli, customer-facing products).

```markdown
# Plan multi-release roadmap (6-month horizon)
/release-plan Chronicle 6

# Analyze dependencies across releases/epics
/dependency-map --release v1.0

# Reorganize work between releases
/project-shuffle --from "v1.0 Release" --to "v1.1 Release"

# Execute entire release
/release-execute --version v1.0
```

### Stage 4: Sprint Planning
Creating focused sprint projects from epics.

```markdown
# Plan multiple sprints from single epic
/sprint-plan --team "Chronicle" --epic EPIC-123

# Preview sprint breakdown without creating
/sprint-plan --team "Chronicle" --epic EPIC-123 --dry-run

# Limit number of sprints created
/sprint-plan --team "Chronicle" --epic EPIC-123 --max-sprints 3
```

### Stage 5: Execution
Launching AI agents to implement the work.

```markdown
# Execute individual sprint with parallel agents
/sprint-execute --project "CHR-123.S01"

# Execute entire release (multiple sprints)
/release-execute --version v1.0
```

### Stage 6: Monitoring & Status
Tracking progress and agent activity.

```markdown
# Check specific sprint progress
/sprint-status --project "CHR-123.S01" --detailed

# Monitor all team sprints
/sprint-status --team "Chronicle"

# View only active executions
/sprint-status --active
```

## Detailed Workflow Examples

### Example 1: Product Release Workflow (Chronicle/Pacc)

```markdown
# 1. Capture initial idea
/refine-epic --team "Chronicle"
# Create epic: "CHR-100: AI-Powered Search"

# 2. Prepare epic for planning
/epic-prep --team "Chronicle" --epic CHR-100 --execute
/epic-breakdown --team "Chronicle" --epic CHR-100

# 3. Plan release timeline (AFTER epics exist)
/release-plan --team "Chronicle" --horizon 3

# 4. Create sprint projects
/sprint-plan --team "Chronicle" --epic CHR-100

# 5. Execute release sprints
/release-execute --version v2.0

# 6. Monitor progress
/sprint-status --project "CHR-100.S01"
```

### Example 2: Continuous Improvement Workflow (cconami/homelab)

```markdown
# 1. Create multiple improvement epics
/refine-epic --team "MemyselfandM"

# 2. Prepare epics
/epic-breakdown --team "MemyselfandM" --epic MMT-50
/epic-breakdown --team "MemyselfandM" --epic MMT-51

# 3. Create sprint projects for each workstream
/sprint-plan --team "MemyselfandM" --epic MMT-50
/sprint-plan --team "MemyselfandM" --epic MMT-51

# 4. Execute in parallel (no blocking)
/sprint-execute --project "MMT-50.S01" &
/sprint-execute --project "MMT-51.S01" &
```

### Example 3: Bug Fix Sprint

```markdown
# 1. Collect bug reports
/refine-issue BUG-201 BUG-202 BUG-203

# 2. Create hotfix sprint
/sprint-plan --team "Chronicle" --issues BUG-201,BUG-202,BUG-203

# 3. Execute fixes
/sprint-execute --project "CHR-HOTFIX.S01"
```

## Command Integration Patterns

### Sequential Flow
```
/refine-epic -> /epic-prep -> /epic-breakdown -> /sprint-plan -> /sprint-execute
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
/dependency-map --epic EPIC-101
# Identifies EPIC-99 must complete first

/sprint-execute --project "CHR-99.S03"
# Wait for completion

/sprint-execute --project "CHR-101.S01"
# Now safe to execute
```

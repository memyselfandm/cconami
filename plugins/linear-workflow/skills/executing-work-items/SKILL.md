---
name: executing-work-items
description: Executes specific work items ad-hoc using AI agents with intelligent dependency analysis and parallelization. Use when you need to implement one or more specific items outside of a formal sprint, or when testing implementation of individual features.
disable-model-invocation: true
---

# Executing Work Items

Execute specific work items using AI agents with dependency resolution and parallel execution.

## Usage

```
/executing-work-items <item-ids...> [options]
```

## Arguments

**Item IDs** (required):
- One or more work item IDs (e.g., `CCC-123 CCC-124 CCC-125`)
- Or comma-separated: `CCC-123,CCC-124,CCC-125`

**Options:**
- `--dry-run`: Preview execution plan without running
- `--force`: Execute despite blockers or incomplete dependencies
- `--skip-prep`: Skip readiness validation

## Examples

```bash
# Execute single item
/executing-work-items CCC-123

# Execute multiple items
/executing-work-items CCC-123 CCC-124 CCC-125

# Preview plan only
/executing-work-items CCC-123 CCC-124 --dry-run

# Force execution (use with caution)
/executing-work-items CCC-123 --force
```

## Workflow

### Step 1: Gather Item Context

For each item:
```python
item = pm_context.get_item(item_id)
item.children = pm_context.get_children(item_id)
item.parent = pm_context.get_item(item.parent_id) if item.parent_id else None
```

### Step 2: Readiness Validation

Unless `--skip-prep`:
- Check all items have acceptance criteria
- Check for blocking dependencies
- Verify parent items exist (if specified)

### Step 3: Dependency Analysis

```python
# Check dependencies between items
for item in items:
    if item.blocked_by:
        blocker = pm_context.get_item(item.blocked_by)
        if blocker.status_type != "done":
            if blocker.id in item_ids:
                # Will execute in this batch - OK
                dependencies.append((blocker.id, item.id))
            else:
                # External dependency - warn
                warnings.append(f"{item.key} blocked by {blocker.key}")
```

### Step 4: Code Analysis

Launch parallel analysis for each item:
- Identify files to modify
- Check for conflicts between items
- Plan implementation approach

### Step 5: Plan Execution

Group items by:
- File overlap (same files → same agent)
- Dependencies (blocker runs first)
- Stack area (frontend, backend)

Assign to agents (max 4 parallel).

### Step 6: Execute

**Phase 1: Dependencies**
Execute blocking items first.

**Phase 2: Parallel**
Run independent items in parallel.

### Step 7: Report

```markdown
## Execution Complete

### Items Executed: {count}/{total}

| Item | Status | Agent | Duration |
|------|--------|-------|----------|
{for item in items:}
| {item.key} | {status} | Agent-{n} | {duration} |

### Files Modified
{list of files}

### Next Steps
{any follow-up recommendations}
```

## Use Cases

### Ad-hoc Bug Fix
```bash
/executing-work-items BUG-456
```

### Feature Testing
```bash
/executing-work-items FEAT-123 --dry-run
# Review plan, then:
/executing-work-items FEAT-123
```

### Batch Task Execution
```bash
/executing-work-items TASK-1 TASK-2 TASK-3 TASK-4
```

## Invocation Control

This skill has `disable-model-invocation: true` because:
- Launches agents with side effects
- Modifies code and PM tool status
- User should explicitly control execution

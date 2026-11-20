---
name: shuffling-projects
description: Reorganizes work items when priorities change - move items between sprints or projects, rebalance workload, and update dependencies. Use when sprint scope changes, priorities shift, or work needs redistribution.
---

# Shuffling Projects

Reorganize work items between projects, sprints, or releases while maintaining relationships.

## Usage

```
/shuffling-projects [options]
```

## Options

**Movement:**
- `--from PROJECT`: Source project/sprint
- `--to PROJECT`: Destination project/sprint
- `--items IDs`: Specific items to move (comma-separated)

**Filters:**
- `--status STATUS`: Only move items with status
- `--priority PRIORITY`: Only move items with priority
- `--unassigned`: Only move unassigned items

**Actions:**
- `--dry-run`: Preview changes without applying
- `--update-deps`: Also move blocking items if needed

## Examples

```bash
# Move items between sprints
/shuffling-projects --from CCC-123.S01 --to CCC-123.S02 --items CCC-456,CCC-457

# Move all todo items from sprint
/shuffling-projects --from CCC-123.S01 --to CCC-123.S02 --status todo

# Preview rebalancing
/shuffling-projects --from "Sprint 1" --to "Sprint 2" --dry-run

# Move with dependencies
/shuffling-projects --items CCC-456 --to CCC-123.S02 --update-deps
```

## Workflow

### Step 1: Gather Context

```python
source = pm_context.get_project(from_project) if from_project else None
destination = pm_context.get_project(to_project)

if items_specified:
    items_to_move = [pm_context.get_item(id) for id in item_ids]
else:
    items_to_move = pm_context.list_items({
        project: source.id,
        status: status_filter,
        priority: priority_filter
    })
```

### Step 2: Validate Moves

```python
issues = []

for item in items_to_move:
    # Check dependencies
    if item.blocked_by:
        for blocker_id in item.blocked_by:
            blocker = pm_context.get_item(blocker_id)
            if blocker.project != destination.id:
                if update_deps:
                    items_to_move.append(blocker)
                else:
                    issues.append({
                        "item": item,
                        "issue": f"Blocked by {blocker.key} in different project",
                        "resolution": "Use --update-deps to move blocker too"
                    })

    # Check if item blocks others staying behind
    if item.blocks:
        for blocked_id in item.blocks:
            blocked = pm_context.get_item(blocked_id)
            if blocked not in items_to_move:
                issues.append({
                    "item": item,
                    "issue": f"Blocks {blocked.key} which is staying in source",
                    "resolution": "Move blocked item too or remove dependency"
                })
```

### Step 3: Preview Changes

```markdown
## Shuffle Preview

### Moving {count} items
From: {source.name}
To: {destination.name}

### Items to Move
{for item in items_to_move:}
- [{item.key}] {item.title}
  - Status: {item.status}
  - Dependencies: {item.blocked_by}

### Validation Issues
{for issue in issues:}
⚠️ [{issue.item.key}]: {issue.issue}
   Resolution: {issue.resolution}

### Impact
- Source will have: {source_remaining} items
- Destination will have: {dest_total} items
```

### Step 4: Execute Moves

```python
if not dry_run and not issues:
    for item in items_to_move:
        pm_context.assign_to_project(item.id, destination.id)

        # Also move children
        children = pm_context.get_children(item.id)
        for child in children:
            pm_context.assign_to_project(child.id, destination.id)

        # Add comment
        pm_context.add_comment(
            item.id,
            f"Moved from {source.name} to {destination.name}"
        )
```

### Step 5: Report

```markdown
## Shuffle Complete

### Moved {count} items
From: {source.name} → To: {destination.name}

### Items Moved
{for item in moved:}
✅ [{item.key}] {item.title}

### Updated Dependencies
{for dep in updated_deps:}
🔗 {dep.from_item} → {dep.to_item}

### Project Balances

| Project | Before | After |
|---------|--------|-------|
| {source.name} | {before} | {after} |
| {destination.name} | {before} | {after} |
```

## Common Use Cases

### Sprint Scope Reduction
```bash
# Move uncompleted items to next sprint
/shuffling-projects --from "Sprint 1" --to "Sprint 2" --status todo
```

### Priority Escalation
```bash
# Move urgent items to current sprint
/shuffling-projects --items CCC-456 --to "Current Sprint" --update-deps
```

### Workload Rebalancing
```bash
# Move items from overloaded sprint
/shuffling-projects --from "Sprint 1" --to "Sprint 2" --unassigned
```

### Release Rescheduling
```bash
# Move features to next release
/shuffling-projects --from "v1.0" --to "v1.1" --items FEAT-1,FEAT-2,FEAT-3
```

## Error Handling

| Issue | Resolution |
|-------|------------|
| Dependency in different project | Use --update-deps or resolve manually |
| Item blocks work in source | Move blocked item or remove dependency |
| Circular dependency | Report and require manual resolution |
| Project not found | Verify project name/ID |

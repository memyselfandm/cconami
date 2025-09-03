---
allowed-tools: Task, mcp__linear__*, TodoWrite
argument-hint: --team <team-name> --action <rebalance|reschedule|reorganize|escalate> [options]
description: Reorganize Linear issues when priorities change - move between releases, rebalance workload, update dependencies
---

# Linear Project Shuffle Command

Comprehensive project reorganization tool that handles priority changes, scope adjustments, and timeline shifts while maintaining project integrity and dependency relationships.

## Usage
- `--team <name>`: (Required) Linear team name
- `--action <type>`: (Required) Action type: rebalance, reschedule, reorganize, escalate
- `--source <id>`: Source release/epic/sprint to move from
- `--target <id>`: Target release/epic/sprint to move to
- `--issues <ids>`: Specific issue IDs to move (comma-separated)
- `--criteria <filter>`: Filter criteria for automatic selection
- `--dry-run`: Preview changes without applying
- `--preserve-deps`: Maintain dependency relationships (default: true)

## Action Types

### Rebalance
Redistribute work across releases/sprints to even out workload:
- Moves issues between containers
- Maintains capacity constraints
- Preserves dependencies
- Optimizes team utilization

### Reschedule
Shift timeline for releases/epics when delays occur:
- Updates target dates
- Cascades timeline changes
- Adjusts dependent work
- Notifies stakeholders

### Reorganize
Restructure issue hierarchy and relationships:
- Changes parent-child relationships
- Updates issue types (epic→feature)
- Merges or splits issues
- Regroups related work

### Escalate
Fast-track critical issues through priority lanes:
- Moves to current sprint
- Updates priority levels
- Clears blockers
- Assigns to available resources

## Instructions

### Step 1: Analyze Current State
1. **Launch Program Manager Agent**:
   ```
   Use the program-manager subagent for shuffle analysis
   
   Prompt: "Analyze current state for team $TEAM and prepare 
   for $ACTION operation. Identify affected issues, dependencies, 
   and capacity constraints. Validate shuffle feasibility."
   ```

2. **Gather Context**:
   - Current issue distribution
   - Dependency relationships
   - Team capacity and velocity
   - Active blockers

### Step 2: Execute Action

#### Rebalance Action
```python
def rebalance_releases(source_release, target_release):
  # Calculate current load
  source_issues = get_release_issues(source_release)
  target_issues = get_release_issues(target_release)
  
  source_effort = calculate_effort(source_issues)
  target_effort = calculate_effort(target_issues)
  
  # Find imbalance
  total_effort = source_effort + target_effort
  target_effort_goal = total_effort / 2
  
  # Select issues to move
  issues_to_move = []
  moved_effort = 0
  
  for issue in sort_by_priority(source_issues):
    if not has_dependencies_in(issue, source_issues):
      issues_to_move.append(issue)
      moved_effort += issue.effort
      if moved_effort >= (source_effort - target_effort_goal):
        break
  
  # Execute moves
  for issue in issues_to_move:
    mcp__linear__update_issue(
      id: issue.id,
      labels: replace(f"release:{target_release}"),
      projectId: target_release.projectId
    )
```

#### Reschedule Action
```python
def reschedule_release(release_id, new_date, cascade=True):
  release = mcp__linear__get_issue(release_id)
  old_date = release.targetDate
  delay_days = (new_date - old_date).days
  
  # Update release date
  mcp__linear__update_issue(
    id: release_id,
    targetDate: new_date,
    description: append(f"\n⏰ Rescheduled: {delay_days} days")
  )
  
  # Cascade to dependent releases
  if cascade:
    dependent_releases = get_dependent_releases(release_id)
    for dep_release in dependent_releases:
      new_dep_date = dep_release.targetDate + timedelta(days=delay_days)
      reschedule_release(dep_release.id, new_dep_date, cascade=False)
  
  # Update all child issues
  for issue in get_release_issues(release_id):
    if issue.dueDate:
      mcp__linear__update_issue(
        id: issue.id,
        dueDate: issue.dueDate + timedelta(days=delay_days)
      )
```

#### Reorganize Action
```python
def reorganize_hierarchy(issues, new_structure):
  # Validate new structure
  for change in new_structure:
    if change.type == "reparent":
      mcp__linear__update_issue(
        id: change.issue_id,
        parentId: change.new_parent_id
      )
    elif change.type == "merge":
      merge_issues(change.source_ids, change.target_id)
    elif change.type == "split":
      split_issue(change.issue_id, change.new_issues)
    elif change.type == "convert":
      mcp__linear__update_issue(
        id: change.issue_id,
        labels: replace(f"type:{change.new_type}")
      )
```

#### Escalate Action
```python
def escalate_issues(issue_ids, reason):
  current_sprint = get_current_sprint(team)
  
  for issue_id in issue_ids:
    issue = mcp__linear__get_issue(issue_id)
    
    # Update priority
    mcp__linear__update_issue(
      id: issue_id,
      priority: 1,  # Urgent
      projectId: current_sprint.id,
      labels: add("escalated", "fast-track")
    )
    
    # Clear blockers if possible
    for blocker_id in issue.blockedBy:
      blocker = mcp__linear__get_issue(blocker_id)
      if can_accelerate(blocker):
        escalate_issues([blocker_id], "dependency")
    
    # Add escalation comment
    mcp__linear__create_comment(
      issueId: issue_id,
      body: f"🚨 Escalated: {reason}\nMoved to current sprint for immediate action."
    )
```

### Step 3: Validate Changes

1. **Dependency Validation**:
   ```python
   def validate_dependencies(moved_issues):
     violations = []
     
     for issue in moved_issues:
       # Check if dependencies are satisfied
       for dep_id in issue.blockedBy:
         dep = mcp__linear__get_issue(dep_id)
         if dep.targetDate > issue.targetDate:
           violations.append({
             "issue": issue.id,
             "blocked_by": dep_id,
             "conflict": "dependency_after_dependent"
           })
     
     return violations
   ```

2. **Capacity Validation**:
   ```python
   def validate_capacity(target_container):
     issues = get_container_issues(target_container)
     total_effort = sum(issue.estimate for issue in issues)
     capacity = get_team_capacity(target_container)
     
     if total_effort > capacity * 1.1:  # 10% buffer
       return {
         "status": "overloaded",
         "effort": total_effort,
         "capacity": capacity,
         "overflow": total_effort - capacity
       }
     
     return {"status": "ok"}
   ```

3. **Impact Analysis**:
   ```python
   def analyze_impact(changes):
     return {
       "issues_moved": len(changes.moved),
       "dependencies_affected": count_affected_deps(changes),
       "releases_impacted": get_impacted_releases(changes),
       "team_members_affected": get_affected_assignees(changes),
       "timeline_change": calculate_timeline_impact(changes)
     }
   ```

### Step 4: Apply Changes

1. **Execute Shuffle**:
   ```python
   # Begin transaction
   changes_log = []
   
   try:
     for change in shuffle_plan:
       result = apply_change(change)
       changes_log.append(result)
       
     # Verify integrity
     if not verify_project_integrity():
       raise Exception("Integrity check failed")
       
     commit_changes(changes_log)
     
   except Exception as e:
     rollback_changes(changes_log)
     raise e
   ```

2. **Update Metadata**:
   - Fix broken label references
   - Update issue counts
   - Recalculate timelines
   - Refresh dependencies

3. **Notify Stakeholders**:
   ```python
   for issue in affected_issues:
     mcp__linear__create_comment(
       issueId: issue.id,
       body: f"📦 Shuffled: {change_description}"
     )
   ```

## Output Examples

### Rebalance Success
```
✅ Rebalance Complete

📊 Before:
  Release v1.0: 45 days (150% capacity)
  Release v1.1: 15 days (50% capacity)

📊 After:
  Release v1.0: 30 days (100% capacity)
  Release v1.1: 30 days (100% capacity)

📦 Moved 5 issues:
  • FEAT-123: User Profile → v1.1
  • TASK-456: API Endpoints → v1.1
  • TASK-789: Documentation → v1.1
  • FEAT-012: Settings Page → v1.1
  • TASK-345: Integration Tests → v1.1

✅ All dependencies preserved
✅ Capacity balanced
```

### Reschedule Report
```
⏰ Reschedule Complete

📅 Timeline Changes:
  Release v1.0: Mar 31 → Apr 15 (+15 days)
  Release v1.1: May 15 → May 30 (+15 days)
  Release v2.0: Aug 1 → Aug 16 (+15 days)

📊 Cascading Updates:
  • 23 issues rescheduled
  • 3 sprints adjusted
  • 2 milestones moved

⚠️ Warnings:
  • Q2 deadline at risk
  • Consider scope reduction for v1.0
```

### Escalation Report
```
🚨 Escalation Complete

🔥 Escalated Issues (3):
  • BUG-123: Critical auth failure
    → Moved to current sprint
    → Priority: P0 (was P2)
    
  • TASK-456: Security patch
    → Fast-tracked
    → Blocker cleared
    
  • FEAT-789: Compliance requirement
    → Accelerated by 2 sprints
    → Added to hotfix release

📊 Impact:
  • Current sprint: +3 issues (at capacity)
  • Next sprint: -2 issues
  • 1 blocker auto-resolved
```

## Error Handling

```
❌ "Circular dependency created"
   → Moving issue would create cycle
   → Choose different target or break dependency

❌ "Capacity exceeded"
   → Target container over capacity
   → Rebalance or extend timeline

❌ "Missing dependencies"
   → Required dependencies not in target
   → Move dependencies together

❌ "Cannot escalate blocked issue"
   → Issue blocked by external dependency
   → Resolve blocker first
```

## Shuffle Strategies

### Smart Rebalancing
1. Preserve feature groups
2. Move lowest-dependency items first
3. Balance complexity, not just count
4. Consider team expertise
5. Maintain sprint themes

### Safe Rescheduling
1. Cascade delays downstream
2. Protect critical milestones
3. Buffer for unknown risks
4. Communicate timeline changes
5. Update stakeholder expectations

### Effective Reorganization
1. Group related work
2. Minimize cross-team dependencies
3. Align with architecture
4. Preserve context
5. Document structural changes

## Best Practices

1. **Preview First**: Always use --dry-run initially
2. **Preserve Dependencies**: Keep preserve-deps=true
3. **Communicate Changes**: Add comments to moved issues
4. **Validate After**: Run dependency-map post-shuffle
5. **Incremental Moves**: Small batches over big bang
6. **Track History**: Document shuffle rationale
7. **Update Docs**: Reflect new structure in documentation
8. **Review Impact**: Analyze affected stakeholders

## Integration with Other Commands

```bash
# Complete shuffle workflow
/dependency-map --team Chronicle                     # Understand current state
/project-shuffle --action rebalance --dry-run        # Preview changes
/project-shuffle --action rebalance                  # Execute shuffle
/dependency-map --team Chronicle                     # Verify new state
/sprint-plan --team Chronicle --respect-shuffle      # Replan sprints
```

---

*Part of the Linear program management suite for comprehensive project orchestration*
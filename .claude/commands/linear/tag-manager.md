---
allowed-tools: mcp__linear__*, Task, TodoWrite, Read, Write
argument-hint: --action <apply|cleanup|audit> --target <issue-id|epic-id|project-id> [--checkpoint <phase>]
description: Automated tag lifecycle management for product flow checkpoints - applies checkpoint tags, removes obsolete tags, and maintains tag audit trails
---

# Linear Tag Management System

Intelligent tag lifecycle management for autonomous product workflows, handling checkpoint transitions, obsolete tag cleanup, and conflict resolution while maintaining comprehensive audit trails.

## Usage
- `--action <type>`: (Required) Management action to perform
  - `apply`: Apply checkpoint tags based on issue state
  - `cleanup`: Remove obsolete tags that have been superseded
  - `audit`: Generate tag history and state report
- `--target <id>`: (Required) Linear issue, epic, or project ID
- `--checkpoint <phase>`: (Optional) Specific checkpoint to apply
  - `discovery`, `refined`, `breakdown-complete`, `sprint-ready`, `in-progress`, `review`, `done`
- `--recursive`: (Optional) Apply to all child issues
- `--dry-run`: (Optional) Preview changes without applying

## Tag Lifecycle States

### Checkpoint Tags (Progressive)
```
🔍 needs-discovery → 📝 needs-refinement → 🔨 needs-breakdown →
📋 sprint-ready → 🚀 in-progress → 👀 in-review → ✅ done
```

### Process Tags (Automated)
- **AI Process Tags**: `ai:refined`, `ai:breakdown-complete`, `ai:validated`
- **Quality Tags**: `ready`, `blocked`, `at-risk`
- **Workflow Tags**: `needs-grooming`, `needs-estimation`, `needs-review`

### Conflict Resolution Rules
1. **Mutual Exclusion**: Only one checkpoint tag active at a time
2. **Precedence**: Later checkpoints supersede earlier ones
3. **Cleanup**: Obsolete tags removed when checkpoint advances
4. **Audit Trail**: All transitions logged in Linear comments

## Instructions

### Step 1: Initialize Tag Manager

1. **Parse Arguments**:
   ```python
   action = parse_argument('--action')
   target_id = parse_argument('--target')
   checkpoint = parse_argument('--checkpoint', default='auto')
   recursive = parse_argument('--recursive', default=False)
   dry_run = parse_argument('--dry-run', default=False)
   ```

2. **Fetch Target Context**:
   ```python
   # Determine target type and fetch
   if 'EPIC' in target_id:
       target = mcp__linear__get_issue(target_id)
       issues = get_epic_children(target) if recursive else [target]
   elif 'PROJ' in target_id or '.S' in target_id:
       issues = mcp__linear__list_issues(project=target_id)
   else:
       issues = [mcp__linear__get_issue(target_id)]
   ```

### Step 2: Tag State Machine

Define the tag transition state machine:

```python
class TagStateMachine:
    CHECKPOINT_STATES = {
        'discovery': {
            'tags': ['needs-discovery'],
            'remove': [],
            'next': 'refinement'
        },
        'refinement': {
            'tags': ['needs-refinement'],
            'remove': ['needs-discovery'],
            'next': 'breakdown'
        },
        'breakdown': {
            'tags': ['needs-breakdown'],
            'remove': ['needs-refinement', 'needs-discovery'],
            'next': 'sprint-ready'
        },
        'sprint-ready': {
            'tags': ['sprint-ready', 'ai:breakdown-complete'],
            'remove': ['needs-breakdown', 'needs-grooming'],
            'next': 'in-progress'
        },
        'in-progress': {
            'tags': ['in-progress'],
            'remove': ['sprint-ready', 'blocked'],
            'next': 'review'
        },
        'review': {
            'tags': ['in-review', 'ai:validated'],
            'remove': ['in-progress'],
            'next': 'done'
        },
        'done': {
            'tags': ['done'],
            'remove': ['in-review', 'in-progress', 'blocked'],
            'next': None
        }
    }
    
    def detect_current_state(self, issue):
        """Analyze issue to determine current checkpoint"""
        labels = issue.labels
        
        # Check for explicit checkpoint tags
        for state, config in self.CHECKPOINT_STATES.items():
            if any(tag in labels for tag in config['tags']):
                return state
        
        # Infer from issue state and content
        if issue.state == 'Done':
            return 'done'
        elif issue.state == 'In Review':
            return 'review'
        elif issue.state == 'In Progress':
            return 'in-progress'
        elif has_subtasks(issue) and all_subtasks_defined(issue):
            return 'sprint-ready'
        elif has_acceptance_criteria(issue):
            return 'breakdown'
        elif has_description(issue):
            return 'refinement'
        else:
            return 'discovery'
    
    def get_transition(self, current_state, target_state=None):
        """Get tags to add/remove for transition"""
        if not target_state:
            target_state = self.CHECKPOINT_STATES[current_state]['next']
        
        if not target_state:
            return {'add': [], 'remove': []}
        
        target_config = self.CHECKPOINT_STATES[target_state]
        return {
            'add': target_config['tags'],
            'remove': target_config['remove']
        }
```

### Step 3: Apply Checkpoint Tags

```python
def apply_checkpoint_tags(issues, checkpoint='auto', dry_run=False):
    state_machine = TagStateMachine()
    changes = []
    
    for issue in issues:
        current_state = state_machine.detect_current_state(issue)
        
        if checkpoint == 'auto':
            # Advance to next appropriate checkpoint
            target_state = analyze_issue_for_next_checkpoint(issue)
        else:
            target_state = checkpoint
        
        transition = state_machine.get_transition(current_state, target_state)
        
        if transition['add'] or transition['remove']:
            changes.append({
                'issue': issue,
                'current_state': current_state,
                'target_state': target_state,
                'add_tags': transition['add'],
                'remove_tags': transition['remove']
            })
    
    if dry_run:
        display_preview(changes)
        return
    
    # Apply changes
    for change in changes:
        issue = change['issue']
        new_labels = issue.labels.copy()
        
        # Remove obsolete tags
        for tag in change['remove_tags']:
            if tag in new_labels:
                new_labels.remove(tag)
        
        # Add new checkpoint tags
        for tag in change['add_tags']:
            if tag not in new_labels:
                new_labels.append(tag)
        
        # Update Linear issue
        mcp__linear__update_issue(
            id=issue.id,
            labels=new_labels
        )
        
        # Add audit comment
        audit_message = f"""
        🏷️ Tag Checkpoint Transition
        Previous: {change['current_state']}
        Current: {change['target_state']}
        Added: {', '.join(change['add_tags'])}
        Removed: {', '.join(change['remove_tags'])}
        """
        
        mcp__linear__create_comment(
            issueId=issue.id,
            body=audit_message
        )
    
    return changes
```

### Step 4: Cleanup Obsolete Tags

```python
def cleanup_obsolete_tags(issues, dry_run=False):
    OBSOLETE_PATTERNS = {
        'replaced': {
            'needs-breakdown': ['ai:breakdown-complete'],
            'needs-refinement': ['ai:refined'],
            'unclear': ['ai:refined'],
            'needs-grooming': ['sprint-ready']
        },
        'conflicting': {
            'blocked': ['in-progress', 'done'],
            'at-risk': ['done'],
            'needs-estimation': ['sprint-ready', 'in-progress']
        },
        'deprecated': [
            'old-workflow',
            'legacy-process',
            'manual-review'
        ]
    }
    
    changes = []
    
    for issue in issues:
        labels = issue.labels
        tags_to_remove = []
        
        # Check for replaced tags
        for old_tag, new_tags in OBSOLETE_PATTERNS['replaced'].items():
            if old_tag in labels and any(new in labels for new in new_tags):
                tags_to_remove.append(old_tag)
        
        # Check for conflicting tags
        for conflict_tag, exclusive_tags in OBSOLETE_PATTERNS['conflicting'].items():
            if conflict_tag in labels and any(ex in labels for ex in exclusive_tags):
                tags_to_remove.append(conflict_tag)
        
        # Remove deprecated tags
        for deprecated in OBSOLETE_PATTERNS['deprecated']:
            if deprecated in labels:
                tags_to_remove.append(deprecated)
        
        if tags_to_remove:
            changes.append({
                'issue': issue,
                'remove_tags': tags_to_remove,
                'reason': 'Obsolete/conflicting tags'
            })
    
    if dry_run:
        display_cleanup_preview(changes)
        return
    
    # Apply cleanup
    for change in changes:
        issue = change['issue']
        new_labels = [l for l in issue.labels if l not in change['remove_tags']]
        
        mcp__linear__update_issue(
            id=issue.id,
            labels=new_labels
        )
        
        # Audit trail
        mcp__linear__create_comment(
            issueId=issue.id,
            body=f"🧹 Cleaned up obsolete tags: {', '.join(change['remove_tags'])}"
        )
    
    return changes
```

### Step 5: Generate Audit Report

```python
def generate_audit_report(issues):
    report = {
        'summary': {
            'total_issues': len(issues),
            'checkpoint_distribution': {},
            'obsolete_tags_found': [],
            'missing_checkpoints': [],
            'tag_conflicts': []
        },
        'details': []
    }
    
    state_machine = TagStateMachine()
    
    for issue in issues:
        current_state = state_machine.detect_current_state(issue)
        labels = issue.labels
        
        # Track checkpoint distribution
        report['summary']['checkpoint_distribution'][current_state] = \
            report['summary']['checkpoint_distribution'].get(current_state, 0) + 1
        
        # Check for obsolete tags
        obsolete = detect_obsolete_tags(labels)
        if obsolete:
            report['summary']['obsolete_tags_found'].extend(obsolete)
        
        # Check for missing checkpoints
        if not has_checkpoint_tag(labels):
            report['summary']['missing_checkpoints'].append(issue.id)
        
        # Check for conflicts
        conflicts = detect_tag_conflicts(labels)
        if conflicts:
            report['summary']['tag_conflicts'].append({
                'issue': issue.id,
                'conflicts': conflicts
            })
        
        # Detailed issue report
        report['details'].append({
            'id': issue.id,
            'title': issue.title,
            'current_checkpoint': current_state,
            'all_tags': labels,
            'obsolete': obsolete,
            'conflicts': conflicts,
            'recommendation': recommend_tag_action(issue)
        })
    
    return format_audit_report(report)
```

### Step 6: Integration with Product Ops Commands

```python
def integrate_with_commands():
    """
    Hook into existing product ops commands to automatically manage tags
    """
    
    COMMAND_HOOKS = {
        '/refine-epic': {
            'on_complete': lambda issue_id: apply_checkpoint_tags(
                [get_issue(issue_id)], 
                checkpoint='refinement'
            )
        },
        '/epic-breakdown': {
            'on_complete': lambda issue_id: apply_checkpoint_tags(
                get_epic_children(issue_id),
                checkpoint='breakdown'
            )
        },
        '/sprint-execute': {
            'on_start': lambda project_id: apply_checkpoint_tags(
                get_project_issues(project_id),
                checkpoint='in-progress'
            ),
            'on_complete': lambda project_id: apply_checkpoint_tags(
                get_project_issues(project_id),
                checkpoint='review'
            )
        }
    }
    
    return COMMAND_HOOKS
```

## Output Examples

### Apply Checkpoint
```bash
/tag-manager --action apply --target EPIC-123 --recursive

🏷️ Tag Checkpoint Application

Analyzing 12 issues in EPIC-123...

Checkpoint Transitions:
  FEAT-124: discovery → refinement (+ needs-refinement, - needs-discovery)
  FEAT-125: refinement → breakdown (+ needs-breakdown, - needs-refinement)
  TASK-126: breakdown → sprint-ready (+ sprint-ready, ai:breakdown-complete)
  TASK-127: sprint-ready → in-progress (+ in-progress, - sprint-ready)

✅ Applied 4 checkpoint transitions
📝 Audit trail added to Linear comments
```

### Cleanup Obsolete Tags
```bash
/tag-manager --action cleanup --target CHR-100.S01 --dry-run

🧹 Tag Cleanup Preview (DRY RUN)

Found 8 obsolete tags across 5 issues:

TASK-201:
  - Remove: needs-breakdown (superseded by ai:breakdown-complete)
  - Remove: blocked (conflicts with in-progress)

TASK-202:
  - Remove: needs-grooming (superseded by sprint-ready)
  - Remove: legacy-process (deprecated)

Would remove 8 tags from 5 issues
Use without --dry-run to apply changes
```

### Audit Report
```bash
/tag-manager --action audit --target CHR-100.S01

📊 Tag Audit Report - Sprint CHR-100.S01

Summary:
  Total Issues: 20
  
  Checkpoint Distribution:
    discovery: 2 (10%)
    refinement: 3 (15%)
    breakdown: 5 (25%)
    sprint-ready: 6 (30%)
    in-progress: 3 (15%)
    done: 1 (5%)
  
  Issues:
    ⚠️ 3 issues missing checkpoint tags
    🔄 5 issues have obsolete tags
    ❌ 2 issues have conflicting tags

Recommendations:
  1. Apply checkpoints to untagged issues
  2. Run cleanup to remove 12 obsolete tags
  3. Resolve conflicts in TASK-301, TASK-302

Full report: ./tag-audit-CHR-100-S01.md
```

## Error Handling

```
❌ "Issue not found: INVALID-123"
   → Verify issue ID is correct
   → Check Linear access permissions

❌ "Cannot apply checkpoint: issue blocked"
   → Resolve blocking dependencies first
   → Use dependency-map to identify blockers

❌ "Tag conflict detected"
   → Run cleanup action first
   → Manually resolve if automated cleanup fails

❌ "Recursive operation too large (>100 issues)"
   → Process in smaller batches
   → Use project-level operations instead
```

## Best Practices

1. **Regular Cleanup**: Run cleanup weekly to maintain tag hygiene
2. **Audit Before Major Changes**: Always audit before releases
3. **Use Dry Run**: Preview changes on large operations
4. **Integrate with CI/CD**: Hook into deployment pipelines
5. **Monitor Conflicts**: Address tag conflicts immediately
6. **Maintain History**: Keep audit trail in Linear comments
7. **Automate Transitions**: Integrate with product ops commands

---

*Part of the Linear autonomous product ops suite for intelligent workflow management*
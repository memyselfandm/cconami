# Structure Preparation Phase

Detailed instructions for Phase 0 of epic breakdown - preparing the epic structure before analysis.

## Overview

Structure preparation ensures the epic has a clean, complete hierarchy before breakdown begins. This phase:
- Validates epic completeness
- Creates missing features for coverage gaps
- Matches orphan items to the epic
- Fixes metadata inconsistencies

## Step 1: Gather Epic Context

```python
# Fetch epic details via pm-context
epic = pm_context.get_item(epic_id)

# Get team/project context
team_context = pm_context.list_statuses()
available_labels = pm_context.list_labels()

# Analyze current epic structure
child_items = pm_context.get_children(epic_id)

# Categorize children
features = [item for item in child_items if item.type == "feature"]
orphan_tasks = [item for item in child_items if item.type == "task" and not item.children]
```

## Step 2: Epic Completeness Analysis

### Parse Epic Objectives

Extract from epic description:
- Explicit objectives (numbered lists, bullet points)
- Implied objectives (from user stories)
- Technical components mentioned
- Success criteria

### Map Existing Coverage

```python
coverage_gaps = []
for objective in objectives:
    matching_feature = find_matching_feature(objective, features)
    if not matching_feature:
        coverage_gaps.append(objective)

# Identify what features are missing
missing_features = identify_missing_features(coverage_gaps)
```

## Step 3: Orphan Discovery

Find items that should belong to this epic but aren't linked:

```python
# Query for potential orphans
# Items in same project, no parent, possibly related
orphan_candidates = pm_context.list_items({
    project: epic.project,
    parent: None,
    status_type: "backlog"
})

# Conservative alignment analysis
orphan_matches = []
for orphan in orphan_candidates:
    score = calculate_alignment_score(orphan, epic)
    if score >= 70:  # High confidence threshold only
        orphan_matches.append((orphan, score))
```

### Alignment Scoring

Score based on:
- Title keyword overlap (40%)
- Description similarity (30%)
- Label overlap (20%)
- Project/team match (10%)

**Only match if score >= 70%** to avoid false positives.

## Step 4: Generate Fixes

```python
prep_actions = []

# Missing features
for gap in coverage_gaps:
    prep_actions.append({
        "type": "create_feature",
        "title": generate_feature_title(gap),
        "description": f"Feature to address: {gap.description}",
        "reason": f"Missing coverage for: {gap.objective}"
    })

# Orphan matches
for orphan, score in orphan_matches:
    prep_actions.append({
        "type": "match_orphan",
        "item": orphan,
        "confidence": score,
        "reason": f"High alignment score: {score}%"
    })

# Metadata fixes
for item in child_items:
    if item.priority != epic.priority:
        prep_actions.append({
            "type": "fix_metadata",
            "item": item,
            "field": "priority",
            "from": item.priority,
            "to": epic.priority
        })
```

## Step 5: Apply Fixes

```python
for action in prep_actions:
    if action["type"] == "create_feature":
        new_feature = pm_context.create_item({
            type: "feature",
            title: action["title"],
            description: action["description"],
            parent: epic_id,
            priority: epic.priority
        })
        print(f"✅ Created feature: {new_feature.key}")

    elif action["type"] == "match_orphan":
        pm_context.set_parent(action["item"].id, epic_id)
        pm_context.add_comment(
            action["item"].id,
            f"Matched to epic {epic.key} with {action['confidence']}% confidence"
        )
        print(f"✅ Matched orphan: {action['item'].key}")

    elif action["type"] == "fix_metadata":
        pm_context.update_item(action["item"].id, {
            action["field"]: action["to"]
        })
        print(f"✅ Fixed metadata: {action['item'].key}")
```

## Step 6: Report

```markdown
## Preparation Summary

### Structure Fixes Applied: {len(prep_actions)}

**Features Created**: {created_count}
{for feature in created_features:}
- {feature.key}: {feature.title}

**Orphans Matched**: {matched_count}
{for orphan in matched_orphans:}
- {orphan.key}: {orphan.title} ({orphan.confidence}% match)

**Metadata Corrections**: {metadata_count}
{for fix in metadata_fixes:}
- {fix.item.key}: {fix.field} {fix.from} → {fix.to}

### Ready for Breakdown
Epic now has {total_features} features covering all objectives.
```

## Error Handling

### No Objectives Found
If epic description lacks clear objectives:
- Flag as not ready for breakdown
- Suggest running `/refining-work-items` first
- Exit gracefully

### Conflicting Orphans
If multiple epics could claim an orphan:
- Skip the orphan (too ambiguous)
- Log for manual review
- Continue with other fixes

### PM Tool Errors
If item creation fails:
- Log the error
- Continue with other fixes
- Report failures at end

# Sprint Planning

Create sprint project(s) from an epic, grouping features optimally for parallel execution.

## Usage

```
/managing-sprints plan <epic-id> [--max-sprints N] [--dry-run]
```

## Workflow

### Step 1: Gather Epic Context

```python
# Fetch epic and children via pm-context
epic = pm_context.get_item(epic_id)
features = pm_context.get_children(epic_id)

# Get full details for each feature
for feature in features:
    feature.tasks = pm_context.get_children(feature.id)
    feature.phase = extract_phase(feature)  # Foundation/Features/Integration
    feature.complexity = estimate_complexity(feature)
```

### Step 2: Analyze Dependencies

```python
# Build dependency graph
dependencies = []
for feature in features:
    # Check explicit blockers
    if feature.blocked_by:
        dependencies.append((feature.blocked_by, feature.id))

    # Foundation blocks Features
    if feature.phase == "foundation":
        for other in features:
            if other.phase == "features":
                dependencies.append((feature.id, other.id))

    # Features block Integration
    if feature.phase == "integration":
        for other in features:
            if other.phase == "features":
                dependencies.append((other.id, feature.id))

# Validate no cycles
if has_cycles(dependencies):
    report_error("Circular dependencies detected")
```

### Step 3: Group into Sprints

**Sprint sizing guidelines:**
- Sprint should be completable in 1-2 weeks
- 4-8 features per sprint ideal
- Balance complexity across sprints
- Keep related features together when possible

```python
sprints = []
remaining = list(features)

while remaining:
    sprint = Sprint(
        name=f"{epic.key}.S{len(sprints) + 1:02d}",
        features=[]
    )

    # First, add any foundation work
    foundation = [f for f in remaining if f.phase == "foundation"]
    sprint.features.extend(foundation)
    remaining = [f for f in remaining if f not in foundation]

    # Then add features up to capacity
    parallelizable = [f for f in remaining if f.phase == "features"]
    while len(sprint.features) < 8 and parallelizable:
        feature = parallelizable.pop(0)
        # Check if dependencies are in this or previous sprints
        if dependencies_satisfied(feature, sprints + [sprint]):
            sprint.features.append(feature)
            remaining.remove(feature)

    # Finally add integration if room and features done
    if all_features_done(sprint):
        integration = [f for f in remaining if f.phase == "integration"]
        sprint.features.extend(integration[:2])  # Max 2 integration per sprint
        remaining = [f for f in remaining if f not in sprint.features]

    sprints.append(sprint)

    if max_sprints and len(sprints) >= max_sprints:
        break
```

### Step 4: Create Sprint Projects

```python
for sprint in sprints:
    # Create project/sprint via pm-context
    project = pm_context.create_project({
        name: sprint.name,
        description: f"Sprint for {epic.title}"
    })

    # Assign features to sprint
    for feature in sprint.features:
        pm_context.assign_to_project(feature.id, project.id)

        # Also assign child tasks
        for task in feature.tasks:
            pm_context.assign_to_project(task.id, project.id)

    print(f"✅ Created sprint: {sprint.name}")
```

### Step 5: Generate Report

```markdown
## Sprint Planning Complete

### Epic: {epic.key} - {epic.title}

### Sprint Distribution

**{sprint.name}**
- Phase Distribution: {foundation_count} foundation, {features_count} features, {integration_count} integration
- Features: {feature_count}
- Tasks: {task_count}
- Parallelization: {parallel_percent}%

**Features:**
{for feature in sprint.features:}
- [{feature.key}] {feature.title} ({feature.complexity})
  - Phase: {feature.phase}
  - Tasks: {len(feature.tasks)}

### Dependency Chain
{visual_dependency_graph}

### Execution Recommendations
- Sprint 1: Start with foundation, then parallelize features
- Sprint 2: Can start once Sprint 1 features complete
- Sprint 3: Integration after all features

### Next Steps
Run: `/managing-sprints execute {first_sprint.name}`
```

## Dry Run Mode

When `--dry-run` specified:
- Perform all analysis
- Show what would be created
- Don't actually create projects

## Sprint Naming Convention

Format: `{EPIC_KEY}.S{NN}`

Examples:
- `CCC-123.S01` - First sprint
- `CCC-123.S02` - Second sprint
- `CCC-123.S03` - Third sprint

## Validation Checks

Before creating sprints:
- [ ] All features have assigned phase
- [ ] Dependencies form valid DAG
- [ ] No sprint exceeds 8 features
- [ ] Foundation < 10% of total work
- [ ] Features > 70% of total work

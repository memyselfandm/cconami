---
name: breaking-down-work
description: Breaks down epics into features and tasks optimized for AI agent execution. Includes structure preparation, parallel codebase analysis, feature sizing, task generation, and dependency mapping. Use when an epic is ready for sprint planning or when a large work item needs decomposition into actionable pieces.
---

# Breaking Down Work

Transform epics into complete feature/task hierarchies ready for sprint execution.

## Usage

```
/breaking-down-work <item-id> [options]
```

## Arguments

**Item ID** (required):
- Epic or large work item to break down (e.g., `CCC-123`, `PROJ-100`)

**Options:**
- `--skip-prep`: Skip structure preparation phase
- `--dry-run`: Preview breakdown without creating items
- `--max-features N`: Limit features created (default: no limit)
- `--analyze-codebase`: Enable parallel codebase analysis (default: on)
- `--no-analysis`: Skip codebase analysis for faster execution

## Examples

```bash
# Full breakdown with preparation
/breaking-down-work CCC-123

# Skip preparation (epic already structured)
/breaking-down-work CCC-123 --skip-prep

# Preview without creating items
/breaking-down-work CCC-123 --dry-run

# Quick breakdown without codebase analysis
/breaking-down-work CCC-123 --no-analysis
```

## Workflow

### Phase 0: Structure Preparation

**Skip if `--skip-prep` specified**

1. **Gather Context**
   - Fetch epic via pm-context `get_item(id)`
   - Get team/project context
   - Analyze current epic structure
   - Find existing child items

2. **Completeness Analysis**
   - Parse epic objectives from description
   - Identify technical components mentioned
   - Extract success criteria
   - Map existing feature coverage

3. **Gap Identification**
   - Find objectives without matching features
   - Identify orphan items that belong to this epic
   - Check for metadata inconsistencies

4. **Apply Fixes**
   - Create missing features for coverage gaps
   - Link high-confidence orphans to epic
   - Fix metadata inconsistencies (priority, labels)

### Phase 1: Readiness Assessment

Validate epic is ready for breakdown:

**Readiness Checklist:**
- [ ] Has problem statement
- [ ] Has user stories or requirements
- [ ] Has acceptance criteria
- [ ] Has success metrics
- [ ] Has technical requirements
- [ ] Priority is set
- [ ] Scope is clear (no vague terms)

**If Not Ready:**
Report missing elements with specific guidance and exit.

### Phase 2: Feature Pre-Planning

1. **Identify Work Areas**
   - Extract from epic description
   - Derive from user stories
   - Identify technical components

2. **Launch Parallel Analysis** (unless `--no-analysis`)

   For each work area, launch analysis agent:
   ```
   Read prompts/code-analysis.md for agent prompt template
   ```

   **CRITICAL: Launch ALL agents in a single response for parallelization**

3. **Collect Results**
   - Technical context per area
   - Implementation requirements
   - Suggested features
   - Complexity estimates
   - Identified risks

### Phase 3: Feature Planning

1. **Apply Sizing Guidelines**

   | Size | Duration | Criteria | Tasks |
   |------|----------|----------|-------|
   | Small | 1-2 days | 3-5 AC, single component | 1-3 |
   | Medium | 2-3 days | 5-8 AC, some integration | 3-5 |
   | Large | 3-5 days | 8-12 AC, subsystem | 5-8 |

   **If larger than Large → split into multiple features**

2. **Generate Feature List**
   - Right-size each suggested feature
   - Assign to phase (Foundation/Features/Integration)
   - Identify parallelization opportunities
   - Create feature specifications using [templates/feature.md](templates/feature.md)

3. **Generate Tasks per Feature**
   - Max 5 tasks per feature
   - Each task < 1 day
   - Include testing task
   - Use [templates/task.md](templates/task.md)

### Phase 4: Create Items

1. **Create Features**
   ```
   For each feature:
     pm-context.create_item({
       type: "feature",
       title: feature.title,
       description: formatted_feature,
       parent: epic_id
     })
   ```

2. **Create Tasks**
   ```
   For each task:
     pm-context.create_item({
       type: "task",
       title: task.title,
       description: formatted_task,
       parent: feature_id
     })
   ```

### Phase 5: Dependency Analysis

1. **Identify Dependencies**
   - Foundation phase blocks Features phase
   - Integration phase depends on Features
   - Technical dependencies between features

2. **Set Blocking Relationships**
   - Update items with blockers (where PM tool supports)
   - Add dependency notes to descriptions

3. **Validate No Cycles**
   - Check for circular dependencies
   - Report and fix if found

### Phase 6: Generate Report

Output comprehensive breakdown summary:

```markdown
## Epic Breakdown Complete: {title}

### Preparation Summary
- Structure Fixes: {count}
- Features Created: {count}
- Orphans Matched: {count}

### Breakdown Summary
- Total Features: {count}
- Total Tasks: {count}
- Total Items: {count}

### Distribution by Phase
- Foundation: {count} ({percent}%)
- Features: {count} ({percent}%)
- Integration: {count} ({percent}%)

### Parallelization Analysis
- Max Parallel: {count} features
- Independent Streams: {count}
- Critical Path: {count} features

### Sprint Recommendations
Based on breakdown, suggest sprint allocation.

### Next Steps
1. Review created features
2. Adjust dependencies if needed
3. Run /managing-sprints plan <epic-id>
```

## Validation Checks

Before completing:
- [ ] No feature larger than 8 tasks
- [ ] No task without parent feature
- [ ] All features have acceptance criteria
- [ ] Dependencies form valid DAG (no cycles)
- [ ] Features phase > 60% parallelizable

## Error Handling

| Error | Recovery |
|-------|----------|
| Epic not ready | Report missing elements, exit |
| Analysis agent fails | Retry up to 2 times |
| Feature too large | Auto-split |
| Circular dependency | Detect and report |
| PM tool rate limit | Batch with delays |

## Output Example

```
🔧 Starting structure preparation...
📊 Found 4 existing features, 2 orphan tasks

✅ Preparation Complete
- Created 1 feature for missing coverage
- Matched 1 orphan to epic

🔍 Analyzing Epic: User Authentication System
✅ Epic ready for breakdown

📊 Launching 5 Parallel Analysis Agents
- Agent-1: Database schema
- Agent-2: JWT implementation
- Agent-3: OAuth providers
- Agent-4: Frontend components
- Agent-5: API endpoints

⏳ Collecting results...
✅ All analyses complete

📝 Planning Features and Tasks
- 12 features across 3 phases
- 43 tasks total
- Max parallelization: 8 features

🔨 Creating Items
- Creating 12 features... ✅
- Creating 43 tasks... ✅
- Setting dependencies... ✅

📊 Epic Breakdown Complete!
- 75% can run in parallel
- 3 suggested sprints

Ready for sprint planning!
```

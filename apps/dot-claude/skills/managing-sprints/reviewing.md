# Sprint Review

Validate completed sprint work against acceptance criteria.

## Usage

```
/managing-sprints review <sprint-id>
```

## Purpose

After a sprint completes, this review:
1. Validates agent claims against actual implementation
2. Checks all acceptance criteria are met
3. Verifies tests exist and pass
4. Identifies any gaps or regressions
5. Generates comprehensive validation report

## Workflow

### Step 1: Gather Sprint Data

```python
sprint = pm_context.get_project(sprint_id)
items = pm_context.list_items({project: sprint.id})

# Only review "done" items
completed_items = [i for i in items if i.status_type == "done"]
```

### Step 2: For Each Completed Item

Launch validation agent per item (can parallelize):

```
ROLE: QA Engineer validating implementation

CONTEXT:
Item: {item.key} - {item.title}
Description: {item.description}
Acceptance Criteria: {item.acceptance_criteria}

TASK:
1. Find the implementation in the codebase
2. Verify each acceptance criterion is met
3. Check tests exist and pass
4. Look for obvious bugs or issues

REPORT:
For each criterion:
- Status: ✅ Met | ⚠️ Partial | ❌ Not Met
- Evidence: {where in code/tests this is verified}
- Notes: {any concerns}
```

### Step 3: Run Test Suite

```bash
# Run relevant tests
npm test -- --coverage
# or
pytest --cov

# Capture results
test_results = parse_test_output()
coverage = parse_coverage_report()
```

### Step 4: Check for Regressions

```python
# Compare to baseline
baseline_tests = load_baseline()
current_tests = test_results

new_failures = [t for t in current_tests if t.failed and t not in baseline_tests.failed]
fixed_tests = [t for t in baseline_tests.failed if t not in current_tests.failed]
```

### Step 5: Generate Report

```markdown
## Sprint Review: {sprint.name}

### Summary
- Items Reviewed: {len(completed_items)}
- All Criteria Met: {fully_complete}/{len(completed_items)}
- Partial: {partial_count}
- Issues Found: {issues_count}

### Test Results
- Tests Run: {test_count}
- Passed: {passed}
- Failed: {failed}
- Coverage: {coverage}%

### Item-by-Item Validation

#### [{item.key}] {item.title}
**Status**: {overall_status}

| Criterion | Status | Evidence |
|-----------|--------|----------|
{for criterion in item.acceptance_criteria:}
| {criterion} | {status} | {evidence} |

**Tests**: {test_count} tests, {coverage}% coverage
**Notes**: {validation_notes}

---

{repeat for each item}

### Issues Requiring Attention

{for issue in found_issues:}
⚠️ **[{issue.item}] {issue.title}**
   - Type: {issue.type}
   - Severity: {issue.severity}
   - Details: {issue.details}
   - Suggested Fix: {issue.fix}

### Regressions

{if new_failures:}
🔴 **New Test Failures**
{for test in new_failures:}
- {test.name}: {test.error}

{if fixed_tests:}
✅ **Previously Failing Tests Now Passing**
{for test in fixed_tests:}
- {test.name}

### Coverage Analysis

| Area | Current | Previous | Change |
|------|---------|----------|--------|
{for area in coverage_areas:}
| {area.name} | {area.current}% | {area.previous}% | {area.change} |

### Recommendations

{based on findings:}
1. {recommendation 1}
2. {recommendation 2}
3. {recommendation 3}

### Sign-off

{if all_criteria_met and no_issues:}
✅ **Sprint Ready for Merge**
All acceptance criteria verified. Recommend merging to main.

{else:}
⚠️ **Sprint Needs Attention**
{summary of what needs to be addressed before merge}
```

## Validation Checklist

For each item:
- [ ] All acceptance criteria have evidence
- [ ] Tests exist for the functionality
- [ ] Tests pass
- [ ] No obvious bugs in implementation
- [ ] Code follows project patterns
- [ ] No regressions introduced

## Issue Severity Levels

| Severity | Description | Action |
|----------|-------------|--------|
| Critical | Blocks merge, core functionality broken | Must fix |
| Major | Significant gap, but workaround exists | Should fix |
| Minor | Small issue, polish needed | Nice to fix |
| Info | Observation, no action needed | Note only |

## Output Actions

Based on review findings:

1. **All Pass**: Update items, recommend merge
2. **Minor Issues**: Create follow-up tasks, can merge
3. **Major Issues**: Block merge, create tasks, assign

```python
if all_pass:
    for item in completed_items:
        pm_context.add_comment(item.id, "✅ Validated in sprint review")
    print("Ready for merge!")

elif minor_issues_only:
    for issue in issues:
        pm_context.create_item({
            type: "task",
            title: f"Follow-up: {issue.title}",
            parent: issue.item_id,
            priority: "low"
        })
    print("Can merge with follow-up tasks created")

else:
    for issue in major_issues:
        pm_context.transition_item(issue.item_id, "In Review")
        pm_context.add_comment(issue.item_id, f"⚠️ Review found issue: {issue.details}")
    print("Blocked - major issues need resolution")
```

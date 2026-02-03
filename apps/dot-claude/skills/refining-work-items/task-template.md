# Task / Bug / Chore Template

Template for refining atomic work items: tasks, bugs, and chores.

## Task Template

```markdown
# Task: {title}

**Parent**: {parent_id} - {parent_title}
**Priority**: {P0|P1|P2|P3|P4}
**Complexity**: {Small|Medium}

---

## Description

{Clear description of what needs to be done}

---

## Context

{Why this task exists - background information}

---

## Implementation Notes

- {Hint 1}
- {Hint 2}
- {Hint 3}

---

## Files to Touch

- `{path/to/file1}`: {what to change}
- `{path/to/file2}`: {what to change}

---

## Definition of Done

- [ ] {DoD criterion 1}
- [ ] {DoD criterion 2}
- [ ] {DoD criterion 3}
- [ ] Tests pass
- [ ] No regressions

---

*Refined with /refining-work-items --type task*
```

## Bug Template

```markdown
# Bug: {title}

**Priority**: {P0|P1|P2|P3|P4}
**Severity**: {Critical|Major|Minor|Trivial}

---

## Bug Summary

{One sentence summary of the bug}

---

## Steps to Reproduce

1. {Step 1}
2. {Step 2}
3. {Step 3}

---

## Expected Behavior

{What should happen}

---

## Actual Behavior

{What actually happens}

---

## Environment

- **OS**: {operating system}
- **Browser**: {browser and version}
- **Version**: {app version}
- **User Role**: {role/permissions}

---

## Investigation Notes

{Any preliminary investigation findings}

### Possible Causes
- {Possible cause 1}
- {Possible cause 2}

### Affected Areas
- `{path/to/file1}`
- `{path/to/file2}`

---

## Definition of Done

- [ ] Bug is fixed
- [ ] Root cause documented
- [ ] Regression test added
- [ ] No new issues introduced
- [ ] Verified in staging

---

*Refined with /refining-work-items --type bug*
```

## Chore Template

```markdown
# Chore: {title}

**Priority**: {P0|P1|P2|P3|P4}
**Category**: {Maintenance|Refactoring|DevOps|Documentation|Tooling}

---

## Description

{What needs to be done and why}

---

## Scope

- {Item 1 to address}
- {Item 2 to address}
- {Item 3 to address}

---

## Approach

{How to tackle this chore}

---

## Definition of Done

- [ ] {DoD criterion 1}
- [ ] {DoD criterion 2}
- [ ] {DoD criterion 3}

---

*Refined with /refining-work-items --type chore*
```

## Type Detection

If type not specified, detect from:

### Keywords suggesting Bug:
- "error", "crash", "broken", "fails", "doesn't work"
- "regression", "issue", "problem", "incorrect"
- "fix", "broken", "bug"

### Keywords suggesting Chore:
- "refactor", "cleanup", "update", "upgrade"
- "maintenance", "tech debt", "optimize"
- "migrate", "deprecate", "remove"

### Keywords suggesting Task:
- "add", "create", "implement", "build"
- "configure", "setup", "integrate"
- Default if no other signals

## Validation Checklist

### Task
- [ ] Clear, actionable title
- [ ] Description explains what to do
- [ ] Definition of done is specific
- [ ] Complexity is Small or Medium
- [ ] Parent linked (if applicable)

### Bug
- [ ] Steps to reproduce are clear
- [ ] Expected vs actual documented
- [ ] Environment specified
- [ ] Severity assessed
- [ ] Priority set based on impact

### Chore
- [ ] Scope is well-defined
- [ ] Approach is clear
- [ ] Definition of done is measurable
- [ ] Not too large (< 1 day ideally)

## Quick Prompts (Create Mode)

### Task Creation
```
1️⃣ What needs to be done?
>

2️⃣ Why? (context)
>

3️⃣ How will you know it's done? (2-3 criteria)
>
```

### Bug Report
```
1️⃣ What's broken?
>

2️⃣ Steps to reproduce?
>

3️⃣ What should happen vs what happens?
>

4️⃣ Environment? (optional)
>
```

### Chore Creation
```
1️⃣ What maintenance is needed?
>

2️⃣ What's the scope?
>

3️⃣ When is it done?
>
```

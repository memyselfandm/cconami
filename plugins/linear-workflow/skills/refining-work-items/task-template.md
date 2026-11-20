# Small ticket / bug / chore template

For tickets small enough to need no design: a small change, a bug, a chore. Anything
bigger uses [ticket-template.md](ticket-template.md). Every variant ends in a "Done
when" section that names its evidence, because that is what a reconciliation checks.

## Small ticket template

```markdown
# {title}

**Project**: {project} | **Parent**: {parent key, if a sub-issue}
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

## Done when

- [ ] {DoD criterion 1}
- [ ] {DoD criterion 2}
- [ ] {DoD criterion 3}
- [ ] Tests pass
- [ ] No regressions

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

## Done when

- [ ] Bug is fixed
- [ ] Root cause documented
- [ ] Regression test added
- [ ] No new issues introduced
- [ ] The fix is live where the bug was seen, and the reproduction steps no longer reproduce it

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

## Done when

- [ ] {DoD criterion 1}
- [ ] {DoD criterion 2}
- [ ] {DoD criterion 3}

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

### Keywords suggesting a small ticket:
- "add", "create", "implement", "build"
- "configure", "setup", "integrate"
- Default if no other signals

## Validation Checklist

### Small ticket
- [ ] Clear, actionable title
- [ ] Description explains what to do
- [ ] Definition of done is specific
- [ ] Fits in one pull request
- [ ] In a project; parent linked if it is a sub-issue

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
- [ ] Small enough for one pull request

## Quick Prompts (Create Mode)

### Small ticket creation
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

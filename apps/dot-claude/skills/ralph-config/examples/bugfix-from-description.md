# Example: Bug Fix from Description

**Invocation:**
```bash
/ralph-config --from "Login fails when email contains a + character" --preset bugfix
```

## Generated PROMPT.md

```markdown
# Fix login failure for emails containing + character

## Context
Users with email addresses containing '+' (e.g., user+tag@example.com)
cannot log in. The + character is likely being URL-encoded or stripped
during the authentication flow.

## Requirements
- Identify where the + character is being lost or mangled
- Fix the encoding/handling to preserve + in email addresses
- Verify fix works for various special characters in emails

### Acceptance Criteria
- [ ] Login succeeds with email user+tag@example.com
- [ ] Login still works with standard emails (no regression)
- [ ] Email is correctly stored and displayed after login
- [ ] Password reset flow also handles + correctly

## Out of Scope
- Other special characters beyond + (unless trivially fixable)
- Email validation rule changes
```

## Generated ralph.yml

```yaml
event_loop:
  prompt_file: "PROMPT.md"
  completion_promise: "LOOP_COMPLETE"
  starting_event: "bug.start"
  max_iterations: 50
  max_runtime_seconds: 7200
  checkpoint_interval: 3

cli:
  backend: "claude"

core:
  guardrails:
    - "Reproduce the bug FIRST before attempting any fix"
    - "Minimal fix - don't refactor surrounding code"
    - "Regression test is mandatory"

hats:
  reproducer:
    name: "Reproducer"
    description: "Reproduces the bug with a failing test."
    triggers: ["bug.start"]
    publishes: ["bug.reproduced", "bug.not_reproducible"]
    default_publishes: "bug.reproduced"
    instructions: |
      ## REPRODUCER MODE
      1. Understand the bug report from PROMPT.md
      2. Write a failing test that demonstrates the bug
      3. Verify the test fails for the right reason
      4. Publish bug.reproduced with test location

  fixer:
    name: "Fixer"
    description: "Applies minimal fix to make the failing test pass."
    triggers: ["bug.reproduced"]
    publishes: ["fix.ready"]
    default_publishes: "fix.ready"
    instructions: |
      ## FIXER MODE
      1. Read the failing test from the Reproducer
      2. Find the root cause in production code
      3. Apply the MINIMAL fix
      4. Run all tests - new test passes, no regressions

  verifier:
    name: "Verifier"
    description: "Verifies fix and checks for regressions."
    triggers: ["fix.ready"]
    publishes: ["fix.verified", "fix.rejected"]
    default_publishes: "fix.verified"
    instructions: |
      ## VERIFIER MODE
      1. Run full test suite
      2. Verify the specific bug is fixed
      3. Check for regressions
      4. If all good, output LOOP_COMPLETE
```

**Event flow:** `bug.start → Reproducer → bug.reproduced → Fixer → fix.ready → Verifier → fix.verified → LOOP_COMPLETE`

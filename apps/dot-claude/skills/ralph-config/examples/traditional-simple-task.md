# Example: Traditional Mode (Simple Task)

**Invocation:**
```bash
/ralph-config --traditional --from "Add input validation to the /users POST endpoint"
```

## Generated PROMPT.md

```markdown
# Add input validation to POST /users endpoint

## Requirements
- Validate all required fields are present (name, email, password)
- Validate email format
- Validate password meets minimum requirements (8+ chars, 1 number, 1 special)
- Return 400 with specific error messages for validation failures

### Acceptance Criteria
- [ ] Missing required fields return 400 with field-specific errors
- [ ] Invalid email format returns descriptive error
- [ ] Weak passwords are rejected with requirements explanation
- [ ] Valid requests continue to work unchanged
- [ ] Validation errors include the field name and reason
```

## Generated ralph.yml

No hats - just a simple loop with guardrails:

```yaml
event_loop:
  prompt_file: "PROMPT.md"
  completion_promise: "LOOP_COMPLETE"
  max_iterations: 30
  max_runtime_seconds: 3600

cli:
  backend: "claude"

core:
  guardrails:
    - "Run tests after every change"
    - "Follow existing validation patterns in the codebase"
```

**Flow:** Agent reads PROMPT.md → implements → outputs LOOP_COMPLETE when done.

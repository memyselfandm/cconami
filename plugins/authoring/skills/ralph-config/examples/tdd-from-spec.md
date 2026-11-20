# Example: TDD from Spec File

**Invocation:**
```bash
/ralph-config --from ./docs/rate-limiter-design.md --preset code-assist
```

## Generated PROMPT.md

```markdown
# Implement rate limiter for API endpoints

## Context
Design document specifies a token bucket rate limiter to protect
public API endpoints from abuse. Must integrate with the existing
Express middleware stack.

Ref: ./docs/rate-limiter-design.md

## Requirements
- Token bucket algorithm with configurable rate and burst size
- Per-client limiting based on API key (authenticated) or IP (anonymous)
- Return 429 with Retry-After header when limit exceeded
- Store counters in Redis for distributed deployment

### Acceptance Criteria
- [ ] Rate limiter middleware applies to all /api/v1/* routes
- [ ] Authenticated clients get 1000 req/min, anonymous get 100 req/min
- [ ] 429 response includes Retry-After header with seconds until reset
- [ ] Rate limits are shared across server instances via Redis
- [ ] Existing tests continue to pass

## Technical Context
- Express middleware chain in src/middleware/index.ts
- Redis client at src/services/redis.ts
- API key auth in src/middleware/auth.ts
- Existing rate limiter stub at src/middleware/rate-limit.ts (placeholder)

## Out of Scope
- Rate limit dashboard/monitoring UI
- Dynamic rate limit adjustment via admin API
- Rate limiting WebSocket connections
```

## Generated ralph.yml

Uses the `code-assist` preset (Planner → Builder → Validator → Committer):

```yaml
event_loop:
  prompt_file: "PROMPT.md"
  completion_promise: "LOOP_COMPLETE"
  starting_event: "build.start"
  max_iterations: 100
  max_runtime_seconds: 14400
  checkpoint_interval: 5

cli:
  backend: "claude"

core:
  specs_dir: "./specs/"
  guardrails:
    - "Fresh context each iteration - save learnings to memories"
    - "Verification is mandatory - tests/typecheck/lint must pass"
    - "YAGNI ruthlessly - no speculative features"
    - "KISS always - simplest solution that works"

hats:
  planner:
    name: "Planner"
    description: "Detects input type and bootstraps implementation context."
    triggers: ["build.start"]
    publishes: ["tasks.ready"]
    default_publishes: "tasks.ready"
    instructions: |
      ## PLANNER MODE
      Analyze the prompt to determine input type (spec file, task, description).
      Set up implementation context. Do NOT start implementing.

  builder:
    name: "Builder"
    description: "TDD implementer: RED -> GREEN -> REFACTOR, one task at a time."
    triggers: ["tasks.ready", "validation.failed", "task.complete"]
    publishes: ["implementation.ready", "build.blocked", "task.complete"]
    default_publishes: "task.complete"
    instructions: |
      ## BUILDER MODE - TDD Cycle
      1. EXPLORE - understand task and codebase context
      2. RED - write failing tests
      3. GREEN - minimal code to make tests pass
      4. REFACTOR - clean up while keeping tests green
      One task at a time. Do NOT batch.

  validator:
    name: "Validator"
    description: "Exhaustive quality gate: tests, build, lint, YAGNI/KISS checks."
    triggers: ["implementation.ready"]
    publishes: ["validation.passed", "validation.failed"]
    default_publishes: "validation.passed"
    instructions: |
      ## VALIDATOR MODE
      Run ALL checks yourself. Do not trust claims.
      1. All tests pass
      2. Build succeeds
      3. Lint/typecheck pass
      4. YAGNI check - no speculative code
      5. KISS check - simplest solution
      FAIL if ANY check fails.

  committer:
    name: "Committer"
    description: "Creates conventional commits after validation passes."
    triggers: ["validation.passed"]
    publishes: ["commit.complete"]
    default_publishes: "commit.complete"
    instructions: |
      ## COMMITTER MODE
      1. git status to review changes
      2. git diff to confirm
      3. Stage relevant files
      4. Conventional commit: type(scope): description
      Do NOT push to remote.
```

**Event flow:** `build.start → Planner → tasks.ready → Builder → implementation.ready → Validator → validation.passed → Committer → commit.complete → LOOP_COMPLETE`

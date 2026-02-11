# Example: Adversarial Review for Auth System

**Invocation:**
```bash
/ralph-config --pattern adversarial --from "Implement JWT authentication with refresh tokens"
```

## Generated PROMPT.md

```markdown
# Implement JWT authentication with refresh tokens

## Context
Replace session-based auth with JWT + refresh token flow.
Access tokens expire in 15 minutes, refresh tokens in 7 days.
Must handle token rotation and revocation.

## Requirements
- Issue JWT access tokens on login (15min expiry)
- Issue refresh tokens stored in httpOnly cookies (7day expiry)
- Refresh endpoint rotates both tokens atomically
- Revocation via token blacklist in Redis
- Middleware validates access token on protected routes

### Acceptance Criteria
- [ ] Login returns JWT access token + sets refresh cookie
- [ ] Protected routes reject expired/invalid tokens with 401
- [ ] Refresh endpoint issues new token pair and invalidates old refresh token
- [ ] Logout revokes refresh token
- [ ] Concurrent refresh requests don't cause token theft
- [ ] Refresh token rotation detects reuse (compromised token)

## Technical Context
- Auth routes at src/routes/auth.ts
- Middleware at src/middleware/auth.ts
- Redis client at src/services/redis.ts
- User model at src/models/user.ts

## Out of Scope
- OAuth/social login
- Multi-device session management UI
- Token encryption at rest
```

## Generated ralph.yml

Adversarial pattern: Builder implements, Red Team attacks, cycle until secure.

```yaml
event_loop:
  prompt_file: "PROMPT.md"
  completion_promise: "LOOP_COMPLETE"
  starting_event: "build.start"
  max_iterations: 80
  max_runtime_seconds: 14400
  checkpoint_interval: 3

cli:
  backend: "claude"

core:
  guardrails:
    - "Security is non-negotiable - no shortcuts on auth"
    - "All findings must include proof-of-concept or test"
    - "KISS in implementation, thorough in testing"

hats:
  builder:
    name: "Builder"
    description: "Implements auth features using TDD approach."
    triggers: ["build.start", "attack.findings"]
    publishes: ["build.done", "build.blocked"]
    default_publishes: "build.done"
    instructions: |
      ## BUILDER MODE
      Implement auth features with TDD.
      If triggered by attack.findings: fix the vulnerabilities found.
      Write security-focused tests for each fix.
      Follow OWASP authentication best practices.

  red_team:
    name: "Red Team"
    description: "Attacks the implementation to find security vulnerabilities."
    triggers: ["build.done"]
    publishes: ["attack.findings", "security.approved"]
    default_publishes: "security.approved"
    instructions: |
      ## RED TEAM MODE
      Attack the auth implementation. Try to break it.
      Check for:
      - Token forgery/tampering
      - Refresh token reuse attacks
      - Timing attacks on token validation
      - Missing revocation checks
      - Race conditions in token rotation
      - Information leakage in error responses
      If vulnerabilities found: publish attack.findings with details.
      If implementation is secure: publish security.approved.

  verifier:
    name: "Verifier"
    description: "Final verification after security approval."
    triggers: ["security.approved"]
    publishes: ["verified"]
    default_publishes: "verified"
    instructions: |
      ## VERIFIER MODE
      Final gate after Red Team approves.
      1. Run full test suite
      2. Run security-focused tests
      3. Verify all acceptance criteria met
      4. Output LOOP_COMPLETE if everything passes
```

**Event flow:** `build.start → Builder → build.done → Red Team → [attack.findings → Builder → build.done → Red Team]* → security.approved → Verifier → LOOP_COMPLETE`

# EPIC-ID: Epic Title — Brief Description

## Epic Overview

**Tracker**: [URL to Linear/Jira/GitHub issue]
**Design Doc**: `docs/design/feature-architecture.md` (if applicable)
**Branch**: `epic-id-feature-name`

[1-2 paragraph description of what this epic accomplishes. Extract from tracker.]

---

## Success Criteria (Testable)

### Epic-Level Gates

| Criterion | Test | Target |
|-----------|------|--------|
| [Criterion 1] | [How to test it] | [Target metric] |
| [Criterion 2] | [How to test it] | [Target metric] |
| Quality gates pass | All unit, integration, e2e tests green | 100% pass |

### Phase Gate Summary

| Phase | Gate Command | Criteria |
|-------|--------------|----------|
| 1 | `make test-this <path>` | [Phase 1 success criteria] |
| 2 | `make test-this <path>` | [Phase 2 success criteria] |
| N | `make test-e2e` | Full E2E passes |

---

## Architecture Reference

See `docs/design/feature-architecture.md` for:
- Pipeline/flow diagrams
- Component responsibilities
- Data model schemas
- API/event definitions

### Key Data Models

```
[Data flow or model relationships]
Example: Input → Processor → Output
```

### File Structure

```
app/
├── [module]/
│   ├── component_1.py
│   ├── component_2.py
│   └── ...
```

---

## Technical Requirements

### Code Patterns
- [Pattern 1 to follow, e.g., "Follow existing agent patterns in app/agents/"]
- [Pattern 2, e.g., "Use app/langfuse for LLM observation context"]
- [Pattern 3, e.g., "Pydantic v2 models with proper validation"]

### Quality Gates
- `make test-unit` — Unit tests
- `make test-integration` — Integration tests
- `make format` — Linting/formatting
- `make type-check` — Type checking

### Observability
- [Observability requirements, e.g., "All LLM calls wrapped with observation context"]
- [Tracing requirements]
- [Event requirements]

---

## Documentation Requirements

On epic completion, update:

1. **`docs/[feature].md`** — Feature overview
2. **`CLAUDE.md`** — Add relevant patterns section
3. **[Other docs]** — [What to update]

---

## Constraints

- [Constraint 1, e.g., "Feature flag controls routing (default: false)"]
- [Constraint 2, e.g., "No breaking changes to existing API"]
- [Constraint 3, e.g., "Backward compatibility with V1 required"]

# EPIC-ID Backlog: Phase Structure and Story Ordering

## Epic Key
EPIC-ID

## Phase Overview

| Phase | Name | Stories | Gate Criteria |
|-------|------|---------|---------------|
| 1 | Infrastructure & Scaffolding | N | Foundation ready |
| 2 | Core Feature | N | Feature works in isolation |
| 3 | Integration | N | Feature integrated with system |
| 4 | Polish & Rollout | N | Ready for production |

---

## Phase 1: Infrastructure & Scaffolding

**Objective**: Set up the foundation for the feature.

### Stories (in execution order)

1. **STORY-101**: [Title]
   - Dependencies: None (foundation)
   - Deliverables: [What's produced]

2. **STORY-102**: [Title]
   - Dependencies: STORY-101
   - Deliverables: [What's produced]

3. **STORY-103**: [Title]
   - Dependencies: STORY-101 (can parallel with 102)
   - Deliverables: [What's produced]

### Phase 1 Gate Criteria
```bash
# [Commands that must succeed to pass the phase gate]
python -c "from app.module import *"
make test-this app/tests/unit/module/
```

---

## Phase 2: Core Feature

**Objective**: Implement the core functionality.

### Stories (in execution order)

1. **STORY-201**: [Title]
   - Dependencies: Phase 1 complete
   - Deliverables: [What's produced]

2. **STORY-202**: [Title]
   - Dependencies: STORY-201
   - Deliverables: [What's produced]

### Phase 2 Gate Criteria
```bash
# [Integration test that proves core feature works]
make test-this app/tests/integration/module/test_feature.py
```

---

## Phase 3: Integration

**Objective**: Integrate with the rest of the system.

### Stories (in execution order)

1. **STORY-301**: [Title]
   - Dependencies: Phase 2 complete
   - Deliverables: [What's produced]

### Phase 3 Gate Criteria
```bash
# [Integration tests proving system integration]
make test-this app/tests/integration/module/
```

---

## Phase 4: Polish & Rollout

**Objective**: Final testing, documentation, and release preparation.

### Stories (in execution order)

1. **STORY-401**: End-to-end testing
   - Dependencies: Phase 3 complete
   - Deliverables: Comprehensive E2E test suite

2. **STORY-402**: Documentation
   - Dependencies: STORY-401
   - Deliverables: Updated docs per PROMPT.md requirements

3. **STORY-403**: Rollout preparation
   - Dependencies: STORY-402
   - Deliverables: Feature flags, config, deprecation warnings

### Phase 4 Gate Criteria (EPIC GATE)
```bash
# Full E2E
make test-e2e

# All tests pass
make test-unit
make test-integration

# Code quality
make format
make type-check

# Documentation complete (manual verification)
```

---

## Story Dependencies Graph

```
Phase 1:
  STORY-101 (foundation) ─┬─→ STORY-102 ─→ ...
                          └─→ STORY-103 ─→ ...

Phase 2:
  STORY-201 → STORY-202 → ...

Phase 3:
  STORY-301 → ...

Phase 4:
  STORY-401 (E2E) → STORY-402 (docs) → STORY-403 (rollout)
```

---

## Notes

- Stories within a phase can often be parallelized if dependencies allow
- Each phase must pass its gate criteria before the next phase starts
- Failed phases create fix tasks that must complete before re-testing

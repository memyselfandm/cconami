# Feature Description Template

Template for creating feature items during breakdown.

## Format

```markdown
## Feature: {title}

**Epic**: {epic_id} - {epic_title}
**User Story**: {As a [user], I want [capability], so that [benefit]}
**Business Value**: {Why this feature matters}
**Complexity**: {Small|Medium|Large}

---

### Functional Requirements

{Description of what this feature does}

---

### Technical Requirements

**Core Implementation**:
- {Technical requirement 1}
- {Technical requirement 2}
- {Technical requirement 3}

**Technical Area**: {Frontend|Backend|Database|Infrastructure|etc.}

---

### Acceptance Criteria

- [ ] {Criterion 1 - specific and testable}
- [ ] {Criterion 2 - specific and testable}
- [ ] {Criterion 3 - specific and testable}
- [ ] {Criterion 4 - specific and testable}
- [ ] {Criterion 5 - specific and testable}

---

### Execution Context

**Phase**: {Foundation|Features|Integration}
**Parallelizable With**: {list of feature IDs that can run in parallel}
**Blocked By**: {list of feature IDs that must complete first}
**Agent Specialization**: {Suggested agent type for execution}

---

### Definition of Done

- [ ] All acceptance criteria met
- [ ] Tests written and passing
- [ ] No regressions introduced
- [ ] Status updated to Done
```

## Acceptance Criteria Guidelines

Good acceptance criteria are:
- **Specific**: Clear, unambiguous
- **Measurable**: Can objectively verify
- **Testable**: Can write a test for it
- **Independent**: Don't overlap with other criteria

**Examples:**

✅ Good:
- "User can log in with email and password"
- "API returns 401 for invalid credentials"
- "Page loads in under 2 seconds"

❌ Bad:
- "Works correctly"
- "Users are happy"
- "Secure implementation"

## Phase Assignment

### Foundation Phase
Features that MUST complete before others:
- Database schema changes
- Core infrastructure setup
- Shared utilities/libraries
- Authentication/authorization base

**Minimize this phase** - only true blockers.

### Features Phase
Main capabilities - maximize parallelization:
- Independent feature implementations
- UI components
- API endpoints
- Business logic

**Target 70-90% of work here.**

### Integration Phase
Finalization work:
- Cross-feature integration testing
- Documentation
- Performance optimization
- Polish and refinements

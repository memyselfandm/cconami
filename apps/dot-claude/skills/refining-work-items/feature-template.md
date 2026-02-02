# Feature Template

Template for refining features - discrete capabilities within an epic.

## Template

```markdown
# Feature: {title}

**Parent Epic**: {epic_id} - {epic_title}
**Complexity**: {Small|Medium|Large}
**Priority**: {P0|P1|P2|P3|P4}
**Phase**: {Foundation|Features|Integration}

---

## User Story

As a {user type},
I want {capability},
So that {benefit}.

---

## Description

{2-3 paragraphs describing the feature functionality}

---

## Acceptance Criteria

- [ ] {Criterion 1 - specific and testable}
- [ ] {Criterion 2 - specific and testable}
- [ ] {Criterion 3 - specific and testable}
- [ ] {Criterion 4 - specific and testable}
- [ ] {Criterion 5 - specific and testable}

---

## Technical Approach

### Implementation
{How this feature should be implemented}

### Files to Modify
- `{path/to/file1}`: {what to change}
- `{path/to/file2}`: {what to change}

### Technical Notes
- {Note 1}
- {Note 2}

---

## Tasks

| Task | Description | Complexity |
|------|-------------|------------|
| {Task 1} | {brief description} | S |
| {Task 2} | {brief description} | S |
| {Task 3} | {brief description} | M |

---

## Testing

- [ ] Unit tests for {component}
- [ ] Integration test for {flow}
- [ ] Manual verification of {scenario}

---

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Tests written and passing
- [ ] Code reviewed and approved
- [ ] No regressions introduced
- [ ] Documentation updated (if applicable)

---

*Refined with /refining-work-items --type feature*
```

## Sizing Guidelines

Features should be right-sized for AI agent execution:

### Small Feature (1-2 days)
- Single component or endpoint
- 3-5 acceptance criteria
- No external dependencies
- 1-3 tasks

**Examples:**
- Add a button to the UI
- Create a simple API endpoint
- Add form validation

### Medium Feature (2-3 days)
- Multiple related components
- 5-8 acceptance criteria
- Some integration required
- 3-5 tasks

**Examples:**
- Complete CRUD for a resource
- Multi-step form with validation
- API endpoint with auth and validation

### Large Feature (3-5 days)
- Complete subsystem or workflow
- 8-12 acceptance criteria
- Multiple integrations
- 5-8 tasks

**Examples:**
- Full authentication flow
- Complex data visualization
- Multi-service integration

### Too Large (Split Required)
If a feature exceeds Large sizing:
- Break into multiple features
- Identify natural boundaries
- Ensure each sub-feature delivers value

## Subtask Generation

When `--create-subtasks` is specified, generate tasks following this pattern:

```
Feature: User Login Form

Tasks:
1. Create login form component
2. Add form validation
3. Implement authentication API call
4. Handle success/error states
5. Add loading indicators
6. Write unit tests
```

Each task should be:
- Completable in < 1 day
- Independently testable
- Clearly scoped

## Validation Checklist

- [ ] User story follows format (As a... I want... So that...)
- [ ] 3-5 acceptance criteria minimum
- [ ] Complexity is realistic (not XL)
- [ ] Technical approach is clear
- [ ] Tasks identified (if applicable)
- [ ] Parent epic linked (if part of epic)

# Task Description Template

Template for creating task items during breakdown.

## Format

```markdown
## Task: {title}

**Feature**: {feature_id} - {feature_title}
**Complexity**: {Small|Medium}

---

### Description

{What needs to be done - clear and actionable}

---

### Technical Scope

**Files to Modify**:
- `{path/to/file1}`: {what to change}
- `{path/to/file2}`: {what to create}

**Implementation Notes**:
- {Hint 1}
- {Hint 2}

---

### Testing Approach

{How to verify this task is complete}

---

### Acceptance Criteria

- [ ] {Criterion 1}
- [ ] {Criterion 2}
- [ ] {Criterion 3}
```

## Task Generation Guidelines

### Max Tasks per Feature
- Small feature: 1-3 tasks
- Medium feature: 3-5 tasks
- Large feature: 5-8 tasks

If more than 8 tasks, the feature should be split.

### Task Duration
Each task should be completable in < 1 day by an AI agent.

### Required Testing Task
Every feature should have at least one testing task:
- Unit tests for components
- Integration tests for APIs
- E2E tests for user flows

### Task Naming Patterns

**Creation tasks:**
- "Create {component} component"
- "Implement {function} utility"
- "Add {endpoint} API endpoint"

**Modification tasks:**
- "Update {component} to support {feature}"
- "Extend {service} with {capability}"
- "Refactor {module} for {purpose}"

**Testing tasks:**
- "Write unit tests for {component}"
- "Add integration tests for {flow}"
- "Create E2E test for {scenario}"

**Configuration tasks:**
- "Configure {tool} for {purpose}"
- "Set up {service} integration"
- "Add {config} environment variables"

## Example Task Breakdown

Feature: User Login Form

```
Tasks:
1. Create LoginForm component
   - Complexity: Small
   - Files: src/components/LoginForm.tsx

2. Add form validation with Zod
   - Complexity: Small
   - Files: src/components/LoginForm.tsx, src/lib/schemas.ts

3. Implement login API call
   - Complexity: Small
   - Files: src/lib/api/auth.ts

4. Handle success/error states
   - Complexity: Small
   - Files: src/components/LoginForm.tsx

5. Write unit tests for LoginForm
   - Complexity: Small
   - Files: src/components/__tests__/LoginForm.test.tsx
```

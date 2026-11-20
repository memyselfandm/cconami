# Project brief, full

A full brief for a new project (a workstream) or an initiative. It goes in the project
or initiative description. For a one-pager, use [project-brief-lite.md](project-brief-lite.md).

## Template Sections

### 1. Executive Summary

```markdown
# Project: {title}

**Initiative**: {initiative, if any}
**Priority**: {urgent|high|normal|low|none}
**Status**: {Planned|In Progress|Completed}
**Lead**: {person or lead session}

## Overview
{2-3 sentence summary of what this workstream delivers and why it matters}
```

### 2. Problem Space

```markdown
## Problem Statement

### Current Reality
{What users/systems face today - pain points and limitations}

### Desired Reality
{The ideal end state when this workstream closes}

### Business Value
{Why this matters - revenue, user satisfaction, efficiency, etc.}

### Success Metrics
- {Metric 1}: {current} → {target}
- {Metric 2}: {current} → {target}

## Finished when
{3-6 checkable lines that close the workstream. Each names its evidence, the same way a
ticket's "Done when" does; a reconciliation checks them before the project closes.}

- [ ] {Outcome, and the evidence that shows it}
- [ ] {Outcome that needs a running system: "live, and <check> shows it"}
- [ ] Every leftover sits on a named open ticket in another project
```

**Prompts:**
- "What problem does this solve?"
- "What's painful about the current state?"
- "How will you measure success?"

### 3. User Stories

```markdown
## User Stories

### Primary User Story
As a {user type}, I want {capability} so that {benefit}.

### Supporting Stories
1. As a {user}, I want {feature} so that {outcome}.
2. As a {user}, I want {feature} so that {outcome}.
3. As a {user}, I want {feature} so that {outcome}.
```

**Prompts:**
- "Who is the primary user?"
- "What do they want to accomplish?"
- "What benefit do they get?"

### 4. User Journeys

```markdown
## User Journeys

### Happy Path
1. User {action}
2. System {response}
3. User {action}
4. System {response}
5. Result: {outcome}

### Error Scenarios
- If {condition}, then {handling}
- If {condition}, then {handling}

### Edge Cases
- {Edge case 1}: {handling}
- {Edge case 2}: {handling}
```

### 5. Acceptance Criteria

```markdown
## Acceptance Criteria

### Functional Requirements
- [ ] {Criterion 1 - specific and testable}
- [ ] {Criterion 2 - specific and testable}
- [ ] {Criterion 3 - specific and testable}

### Non-Functional Requirements
- [ ] Performance: {requirement}
- [ ] Security: {requirement}
- [ ] Accessibility: {requirement}
- [ ] Scalability: {requirement}

### Quality Gates
- [ ] Unit test coverage > {X}%
- [ ] E2E tests pass
- [ ] Security review complete
- [ ] Documentation updated
```

### 6. Technical Requirements

```markdown
## Technical Context

### Architecture
{High-level architectural approach}

### System Components
- **Frontend**: {technologies, patterns}
- **Backend**: {technologies, patterns}
- **Database**: {schema changes, migrations}
- **Infrastructure**: {deployment, scaling}

### Technical Constraints
- {Constraint 1}
- {Constraint 2}

### Integration Points
- {System 1}: {integration type}
- {System 2}: {integration type}
```

### 7. Data & State Management

```markdown
## Data Requirements

### Data Models
{New or modified data models}

### State Management
{Client and server state handling}

### Data Migration
{Any data migration requirements}

### Privacy & Compliance
{GDPR, security considerations}
```

### 8. Tickets

```markdown
## First tickets

Each ticket is one to three units of value with its own "Done when". Order comes from
blocking links; keep the tickets that block others few, so most can run in parallel.

| Ticket | Blocked by | Notes |
|--------|------------|-------|
| {title} | - | {foundation: others wait on it} |
| {title} | {ticket} | |
| {title} | - | |
```

`breaking-down-work` turns this table into tickets.

### 9. Testing Strategy

```markdown
## Testing Strategy

### Unit Testing
{Approach and coverage targets}

### Integration Testing
{API and component integration}

### E2E Testing
{Critical user flows to test}

### Performance Testing
{Load and performance requirements}
```

### 10. Documentation & Knowledge

```markdown
## Documentation Requirements

- [ ] API documentation
- [ ] User guide / help content
- [ ] Architecture decision records
- [ ] Deployment runbook
- [ ] Knowledge transfer sessions
```

### 11. Rollout & Monitoring

```markdown
## Rollout Plan

### Feature Flags
{Flags for gradual rollout}

### Rollout Phases
1. {Phase 1}: {scope and criteria}
2. {Phase 2}: {scope and criteria}
3. {Phase 3}: full rollout

### Rollback Plan
{How to rollback if issues arise}

### Monitoring
- {Metric 1}: {alert threshold}
- {Metric 2}: {alert threshold}
```

### 12. Risks & Dependencies

```markdown
## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| {risk} | {H/M/L} | {H/M/L} | {action} |

## Dependencies

### Blocking Dependencies
- {Dependency 1}: {status}

### External Dependencies
- {External system}: {requirement}

### Team Dependencies
- {Team}: {what's needed}
```

### 13. AI Agent Guidance

```markdown
## AI Execution Context

### Parallelization Strategy
- **Blocking tickets**: {which tickets others wait on - keep these few}
- **Parallel tickets**: {X}% have no unmet blocker
- **Final tickets**: {integration, docs, live checks that wait on the rest}

### Implementation Hints
- Follow existing patterns in {directory}
- Use {library/framework} for {purpose}
- Avoid {anti-pattern}

### File Areas to Focus
- {path/to/area1}: {what to modify}
- {path/to/area2}: {what to create}

### Special Considerations
{Any unique aspects, gotchas, or preferences}
```

---

## Validation Checklist

Before starting work on the project:

- [ ] Problem statement is clear and compelling
- [ ] Success metrics are measurable
- [ ] "Finished when" has checkable lines with their evidence
- [ ] User stories cover primary use cases
- [ ] Acceptance criteria are testable
- [ ] Technical approach is feasible
- [ ] Tickets are one to three units of value each
- [ ] Parallelization opportunities identified
- [ ] Risks and dependencies documented
- [ ] AI guidance section complete

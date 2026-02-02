---
name: managing-sprints
description: Manages sprint lifecycle including planning, execution, monitoring, and review. Use for creating sprints from epics (/managing-sprints plan), executing sprints with parallel AI agents (/managing-sprints execute), checking progress (/managing-sprints status), or reviewing completed work (/managing-sprints review). Optimizes for maximum parallelization while avoiding file conflicts.
disable-model-invocation: true
---

# Managing Sprints

Complete sprint lifecycle management for AI-agent-driven development.

## Usage

```
/managing-sprints <subcommand> [arguments] [options]
```

## Subcommands

| Subcommand | Description |
|------------|-------------|
| `plan` | Create sprint(s) from epic |
| `execute` | Run sprint with parallel agents |
| `status` | Check progress and blockers |
| `review` | Validate completed work |

## Subcommand Details

### plan

Create sprint project(s) from an epic, grouping features by phase.

```
/managing-sprints plan <epic-id> [options]
```

**Options:**
- `--max-sprints N`: Limit sprints created (default: no limit)
- `--dry-run`: Preview without creating

**Details:** [planning.md](planning.md)

### execute

Launch parallel AI agents to implement sprint work.

```
/managing-sprints execute <sprint-id> [options]
```

**Options:**
- `--dry-run`: Preview execution plan only
- `--max-agents N`: Limit parallel agents (default: 4)
- `--phase`: Execute specific phase only (foundation|features|integration)

**Details:** [executing.md](executing.md)

### status

Check sprint progress, active agents, and blockers.

```
/managing-sprints status [sprint-id] [options]
```

**Options:**
- `--active`: Show only active sprints
- `--detailed`: Include agent activity
- `--team`: Filter by team

**Details:** [monitoring.md](monitoring.md)

### review

Validate completed work against acceptance criteria.

```
/managing-sprints review <sprint-id>
```

**Details:** [reviewing.md](reviewing.md)

## Execution Philosophy

### Three-Phase Model

1. **Foundation Phase** (0-10% of work)
   - Database migrations
   - Core infrastructure
   - Shared utilities
   - **Sequential execution** - must complete before Features

2. **Features Phase** (70-85% of work)
   - Main functional implementation
   - UI components
   - API endpoints
   - **Maximum parallelization** - run as many agents as safe

3. **Integration Phase** (10-20% of work)
   - E2E testing
   - Documentation
   - Performance tuning
   - **After Features complete**

### Parallelization Strategy

**Safe to parallelize:**
- Different file areas (frontend vs backend)
- Independent features
- Non-overlapping components

**Must serialize:**
- Same file modifications
- Dependent features
- Shared state changes

### Agent Assignment

Each agent receives:
- Coherent set of related issues
- Complete functional domain
- Balanced complexity

**Guidelines:**
- Max 4 parallel agents (avoid resource contention)
- Group by stack area (frontend, backend, etc.)
- Group by codebase area (same files → same agent)
- Keep tightly-coupled issues together

## PM Tool Integration

Uses [pm-context](../pm-context/SKILL.md) for all operations:
- Fetch sprint/project details
- Query work items
- Update status
- Add progress comments

## Example Workflow

```bash
# 1. Plan sprints from epic
/managing-sprints plan CCC-123 --max-sprints 3

# 2. Execute first sprint
/managing-sprints execute CCC-123.S01

# 3. Monitor progress
/managing-sprints status CCC-123.S01 --detailed

# 4. Review when complete
/managing-sprints review CCC-123.S01

# 5. Execute next sprint
/managing-sprints execute CCC-123.S02
```

## Output Examples

### Plan Output
```
📋 Sprint Planning: User Authentication Epic

🔍 Analyzing 12 features, 43 tasks...

📊 Sprint Distribution:
Sprint 1 (CCC-123.S01):
  - Foundation: JWT infrastructure, user schema
  - Features: Login, signup (parallel)
  - 8 features, 24 tasks

Sprint 2 (CCC-123.S02):
  - Features: OAuth, password reset (parallel)
  - 3 features, 12 tasks

Sprint 3 (CCC-123.S03):
  - Integration: E2E tests, documentation
  - 1 feature, 7 tasks

✅ Created 3 sprint projects
```

### Execute Output
```
🚀 Sprint Execution: CCC-123.S01

Phase 1: Foundation
⏳ Agent-1: Database schema migration
✅ Complete (15 min)

Phase 2: Features (4 parallel agents)
⏳ Agent-1: Login form & API
⏳ Agent-2: Signup flow
⏳ Agent-3: Session management
⏳ Agent-4: Email verification

[Progress updates as agents work...]

Phase 3: Integration
⏳ Agent-1: E2E auth tests
✅ Complete

📊 Sprint Complete!
- 8 features implemented
- 24 tasks completed
- 0 blockers
```

## Error Handling

| Error | Recovery |
|-------|----------|
| File conflict detected | Reassign to same agent |
| Agent failure | Retry up to 2 times |
| Dependency not met | Block and notify |
| PM tool error | Retry with backoff |

## Invocation Control

This skill has `disable-model-invocation: true` because:
- Execution launches multiple agents with side effects
- User should explicitly control when sprints run
- Prevents accidental execution from context

User must explicitly invoke: `/managing-sprints execute ...`

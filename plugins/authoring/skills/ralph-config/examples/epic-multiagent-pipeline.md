# Example: Epic/Initiative-Level Execution

Multi-phase epic execution with PM orchestration, spec-driven development, and phase gates. Works with any project management system (Jira, Linear, GitHub Issues, or plain markdown).

**Invocation:**
```bash
/ralph-config --from KENOBI-1550 --pattern coordinator-specialist
# OR with Linear:
/ralph-config --from CHR-42 --pattern coordinator-specialist
# OR from markdown:
/ralph-config --from ./epics/auth-system-v2.md --pattern coordinator-specialist
```

## Directory Structure for Epic Execution

```
project/
├── epic.ralph.yml                    # Ralph config
└── specs/epic-id/
    ├── epic.PROMPT.md               # Epic overview, success criteria
    ├── backlog.md                   # Phase structure, story ordering
    ├── env.md                       # Environment setup, test commands
    ├── phase-1/                     # Phase-specific specs (generated)
    ├── phase-2/
    └── stories/                     # Story-level specs (generated)
```

## Generated specs/epic-id/epic.PROMPT.md

```markdown
# EPIC-123: Document Generation V2 — Multi-Agent Pipeline

## Epic Overview

**Tracker**: https://linear.app/team/issue/EPIC-123 (or Jira, GitHub, etc.)
**Design Doc**: `docs/design/feature-architecture.md`
**Branch**: `epic-123-feature-name`

[Brief description of what this epic accomplishes - extracted from tracker]

---

## Success Criteria (Testable)

### Epic-Level Gates

| Criterion | Test | Target |
|-----------|------|--------|
| [Criterion 1] | [How to test] | [Target metric] |
| [Criterion 2] | [How to test] | [Target metric] |
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
- [Relevant design docs and diagrams]

### Key Data Models

```
[Data flow through the system]
```

### File Structure

```
app/
├── [module structure for this epic]
```

---

## Technical Requirements

### Code Patterns
- [Existing patterns to follow]
- [Integration requirements]

### Quality Gates
- `make test-unit` — Unit tests
- `make format` — Linting/formatting
- `make type-check` — Type checking

---

## Documentation Requirements

On epic completion, update:
1. [Doc 1]
2. [Doc 2]

---

## Constraints

- [Constraint 1]
- [Constraint 2]
```

## Generated specs/epic-id/backlog.md

```markdown
# EPIC-123 Backlog: Phase Structure and Story Ordering

## Epic Key
EPIC-123

## Phase Overview

| Phase | Name | Stories | Gate Criteria |
|-------|------|---------|---------------|
| 1 | Infrastructure & Scaffolding | 4 | Foundation ready |
| 2 | Core Feature | 3 | Feature works in isolation |
| 3 | Integration | 2 | Feature integrated |
| 4 | Polish & Rollout | 3 | Ready for production |

---

## Phase 1: Infrastructure & Scaffolding

**Objective**: Set up the foundation.

### Stories (in execution order)

1. **STORY-101**: [Title]
   - Dependencies: None (foundation)
   - Deliverables: [What's produced]

2. **STORY-102**: [Title]
   - Dependencies: STORY-101
   - Deliverables: [What's produced]

### Phase 1 Gate Criteria
```bash
# [Test commands that must pass]
make test-this path/to/tests/
```

---

## Phase 2: Core Feature

[Continue pattern for each phase...]

---

## Story Dependencies Graph

```
Phase 1:
  STORY-101 (foundation) → STORY-102 → STORY-103

Phase 2:
  STORY-201 → STORY-202 → STORY-203
                    ↓
              STORY-204

[Visual dependency graph]
```
```

## Generated epic.ralph.yml

```yaml
# EPIC-123: Feature Name - Multi-Agent Pipeline
# Tracker-Driven Epic Execution Workflow
#
# Flow: PM → Spec Writer → Spec Reviewer → Engineer → Verifier → Phase Tester
#
# Usage:
#   ralph run --config epic.ralph.yml

cli:
  backend: "claude"

memories:
  enabled: true
  path: .ralph/memories.md
  budget: 3000
  inject: "auto"
  filter:
    types: [pattern, decision, fix, context]

tasks:
  enabled: true

core:
  specs_dir: "./specs/epic-id/"
  guardrails:
    - "Tracker is source of truth: All AC comes from tickets"
    - "Spec-driven: NO implementation without an approved spec"
    - "TDD mandatory: Tests written BEFORE implementation"
    - "Evidence required: Provide concrete proof, not claims"
    - "ALL hats MUST comment on tickets when starting/completing work"
    - "Quality is non-negotiable: 1 failure = FAILED, no exceptions"

event_loop:
  starting_event: "project.start"
  completion_promise: "LOOP_COMPLETE"
  max_iterations: 500
  max_runtime_seconds: 86400  # 24 hours
  prompt_file: "specs/epic-id/epic.PROMPT.md"

# =============================================================================
# WORKFLOW
#
# project.start → PM creates tasks for phase → task.ready
#                                                  ↓
#                              ┌─── spec.rejected ←┤
#                              ↓                   │
# task.ready → Spec Writer → spec.written → Spec Reviewer → spec.approved
#                                                               ↓
#                              ┌─── eng.failed ←───────────────┤
#                              ↓                               │
#              spec.approved → Engineer → eng.done → Verifier → task.complete → PM
#                                                                               ↓
#                    ┌─── phase.failed ←───────────────────────────────────────┤
#                    ↓                                                         │
# phase.validate → Phase Tester → phase.validated ─────────────────────────────┤
#                                                                               ↓
#                    ┌─── backlog.failed ←─────────────────────────────────────┤
#                    ↓                                                         │
# backlog.validate → Completion Tester → backlog.validated → PM → LOOP_COMPLETE
#
# =============================================================================

hats:
  project-manager:
    name: "📋 Project Manager"
    description: "Orchestrates workflow, manages tasks, handles phase transitions"
    triggers:
      - "project.start"
      - "task.complete"
      - "phase.validated"
      - "phase.failed"
      - "backlog.validated"
      - "backlog.failed"
    publishes:
      - "task.ready"
      - "phase.validate"
      - "backlog.validate"
      - "LOOP_COMPLETE"
    instructions: |
      You are the Project Manager orchestrating epic execution.

      ## Resources
      - Epic overview: `specs/epic-id/epic.PROMPT.md`
      - Phase structure: `specs/epic-id/backlog.md`
      - Environment: `specs/epic-id/env.md`

      ## On project.start

      1. Read PROMPT.md for epic context
      2. Read backlog.md for phase/story structure
      3. Fetch epic from tracker (adapt command to your PM tool):
         - Linear: `linctl issue get EPIC-123 --json`
         - Jira: `jira issue view EPIC-123 --plain`
         - GitHub: `gh issue view 123`
      4. Comment on epic: "🚀 Starting automated execution via Ralph"
      5. Determine current phase (start with Phase 1)
      6. For each story in the phase:
         - Fetch from tracker
         - Create task: `ralph tools task add "<title>" --meta tracker=<KEY>`
         - Set dependencies if needed
      7. Emit `task.ready` for first unblocked task

      ## On task.complete

      1. Close the task: `ralph tools task close <id>`
      2. Comment on tracker: "✅ Task complete"
      3. Check for more tasks: `ralph tools task ready`
         - If tasks ready: emit `task.ready` for next unblocked task
         - If phase complete: emit `phase.validate`

      ## On phase.validated

      1. Comment on epic: "✅ Phase N validated"
      2. Check if more phases in backlog.md:
         - If yes: Create tasks for next phase, emit `task.ready`
         - If no: emit `backlog.validate`

      ## On phase.failed

      1. Parse feedback from `.ralph/integration/phase-N.feedback.md`
      2. Create fix tasks with high priority
      3. Comment on epic: "❌ Phase N failed, creating fix tasks"
      4. Emit `task.ready` for fix tasks

      ## On backlog.validated

      1. Comment on epic with final report
      2. Emit `LOOP_COMPLETE`
      3. This is the ONLY condition for LOOP_COMPLETE

      ## On backlog.failed

      1. Parse feedback, create fix tasks
      2. Emit `task.ready`

  spec-writer:
    name: "📝 Spec Writer"
    description: "Creates detailed specifications from tracker stories"
    triggers: ["task.ready", "spec.rejected"]
    publishes: ["spec.written"]
    instructions: |
      You are the Specification Writer. Create precise, complete specs.

      ## On task.ready

      1. Get ready tasks: `ralph tools task ready`
      2. For the task, read the tracker story (from task meta)
      3. Research:
         - Read PROMPT.md for architecture
         - Explore codebase for existing patterns
      4. Write spec to `.ralph/specs/<task-id>.md`

      ## On spec.rejected

      1. Read feedback from `.ralph/specs/<task-id>.feedback.md`
      2. Address ALL feedback items
      3. Update spec with revision note

      ## Spec Format

      ```markdown
      # Specification: <Story Title>

      ## Task ID
      <ralph task id>

      ## Tracker
      <KEY> - <link>

      ## Objective
      <Clear statement from tracker AC>

      ## Files to Modify
      - `path/to/file` - <what changes>

      ## Implementation Steps
      1. <Specific step>

      ## Test Requirements (TDD)
      - [ ] Test: <description> → `path/to/test`

      ## Acceptance Criteria (from tracker)
      - [ ] <AC 1>

      ## Verification Commands
      ```bash
      make test-this <path>
      make format
      make type-check
      ```
      ```

      ## After Writing

      Comment on tracker: "📝 Spec written, awaiting review"
      Emit: `ralph emit "spec.written" '{"task_id": "<id>", "spec_path": "..."}'`

  spec-reviewer:
    name: "🔍 Spec Reviewer"
    description: "Reviews specs for completeness before implementation"
    triggers: ["spec.written"]
    publishes: ["spec.approved", "spec.rejected"]
    instructions: |
      You are the Specification Reviewer. Be rigorous.

      ## On spec.written

      1. Read the spec from event payload path
      2. Review against checklist:

      ### Completeness
      - [ ] Objective matches tracker AC
      - [ ] All files to modify identified
      - [ ] Implementation steps are specific (not vague)
      - [ ] Test requirements cover ALL AC
      - [ ] Verification commands provided

      ### TDD Ready
      - [ ] Tests can be written BEFORE implementation
      - [ ] Test paths are specific

      ## Decision

      **If ALL checks pass:**
      `ralph emit "spec.approved" '{"task_id": "<id>", "spec_path": "..."}'`

      **If ANY check fails:**
      Write feedback to `.ralph/specs/<task-id>.feedback.md`
      `ralph emit "spec.rejected" '{"task_id": "<id>", "feedback_path": "..."}'`

  engineer:
    name: "⚙️ Engineer"
    description: "Implements approved specs using TDD"
    triggers: ["spec.approved", "eng.failed"]
    publishes: ["eng.done"]
    instructions: |
      You are the Engineer. Implement specs EXACTLY as written using TDD.

      ## On spec.approved

      1. Read the spec from approved path
      2. Comment on tracker: "⚙️ Starting implementation"
      3. Follow TDD cycle for EACH test requirement:
         a. **RED**: Write the test, run it, confirm it FAILS
         b. **GREEN**: Write minimal code to pass
         c. **REFACTOR**: Clean up, ensure tests still pass
      4. Run verification commands from spec
      5. Document work in `.ralph/eng/<task-id>.md`
      6. Emit: `ralph emit "eng.done" '{"task_id": "<id>", "report": "..."}'`

      ## On eng.failed

      1. Read feedback from `.ralph/verifications/<task-id>.feedback.md`
      2. Fix ONLY what was identified
      3. Re-run verification
      4. Emit `eng.done` again

  verifier:
    name: "✅ Verifier"
    description: "Validates implementations with ruthless quality standards"
    triggers: ["eng.done"]
    publishes: ["task.complete", "eng.failed"]
    instructions: |
      You are the Verifier. RUTHLESS about quality. Nothing passes unless PRISTINE.

      ## On eng.done

      1. Read the spec and engineering report
      2. INDEPENDENTLY verify (don't trust claims):

      ### Run All Checks
      ```bash
      make test-this <test-paths-from-spec>
      make format
      make type-check
      ```

      ### Verify Each AC
      For EACH acceptance criterion:
      - [ ] Is it implemented?
      - [ ] Is it tested?
      - [ ] Does the test pass?

      ### Quality Gates
      - [ ] All tests pass (0 failures)
      - [ ] Lint passes (0 errors)
      - [ ] Type check passes (0 errors)

      ## Decision

      **If ALL pass (PRISTINE):**
      1. Comment on tracker: "✅ Verified and complete"
      2. Commit changes with conventional message including story key
      3. Emit: `ralph emit "task.complete" '{"task_id": "<id>"}'`

      **If ANY fail:**
      Write to `.ralph/verifications/<task-id>.feedback.md`
      `ralph emit "eng.failed" '{"task_id": "<id>", "feedback_path": "..."}'`

      ## Standards (NO EXCEPTIONS)
      - 1 test failure = FAILED
      - 1 lint error = FAILED
      - 1 type error = FAILED
      - 1 missing AC = FAILED

  phase-tester:
    name: "🧪 Phase Tester"
    description: "Validates entire phase with integration tests"
    triggers: ["phase.validate"]
    publishes: ["phase.validated", "phase.failed"]
    instructions: |
      You are the Phase Tester. Validate that all phase stories work together.

      ## On phase.validate

      1. Read phase gate criteria from `specs/epic-id/backlog.md`
      2. Read test commands from `specs/epic-id/env.md`
      3. Create validation plan in `.ralph/integration/phase-N-validation.md`
      4. Run ALL phase gate criteria
      5. Update validation plan with results

      ## Decision

      **If ALL pass:**
      1. Comment on epic: "🧪 Phase N integration tests PASSED"
      2. Emit: `ralph emit "phase.validated" '{"phase": N, "report": "..."}'`

      **If ANY fail:**
      Write to `.ralph/integration/phase-N.feedback.md`
      `ralph emit "phase.failed" '{"phase": N, "feedback_path": "..."}'`

  completion-tester:
    name: "🏁 Completion Tester"
    description: "Final validation of entire epic before completion"
    triggers: ["backlog.validate"]
    publishes: ["backlog.validated", "backlog.failed"]
    instructions: |
      You are the Completion Tester. Final validation before LOOP_COMPLETE.

      ## On backlog.validate

      1. Read ALL phase gate criteria from backlog.md
      2. Run FULL test suite:
         ```bash
         make test-unit
         make test-integration
         make test-e2e
         make format
         make type-check
         ```
      3. Verify ALL tracker stories have completion comments
      4. Verify documentation updated per PROMPT.md

      ## Decision

      **If ALL pass:**
      Emit: `ralph emit "backlog.validated" '{"report": "..."}'`

      **If ANY fail:**
      Write to `.ralph/integration/final.feedback.md`
      `ralph emit "backlog.failed" '{"feedback_path": "..."}'`

      ## Standards (RUTHLESS)
      - 1 test failure = FAILED
      - 1 missing tracker comment = FAILED
      - 1 missing doc = FAILED
```

## Key Design Patterns

### 1. PM as Central Orchestrator
The PM hat handles all phase transitions and task creation. It's the only hat that can emit `LOOP_COMPLETE`.

### 2. Spec-Driven Development
Nothing gets implemented without an approved spec. The spec contains everything needed: file paths, test requirements, verification commands.

### 3. Phase Gates
Each phase has explicit gate criteria that must pass before moving to the next phase. Failed phases create fix tasks.

### 4. Tracker Integration
All hats comment on tracker tickets to maintain audit trail. Commands adapt to your PM tool:
- **Linear**: `linctl issue get/update`
- **Jira**: `jira issue view/comment`
- **GitHub**: `gh issue view/comment`

### 5. Task System
Uses Ralph's built-in task system for dependency management:
```bash
ralph tools task add "title" --meta tracker=KEY
ralph tools task add "blocked task" --blocks <id>
ralph tools task ready  # Get next unblocked task
ralph tools task close <id>
```

### 6. Feedback Loops
Failed verifications write feedback files that trigger rework:
- `spec.rejected` → Spec Writer revises
- `eng.failed` → Engineer fixes
- `phase.failed` → PM creates fix tasks

**Event flow:**
```
project.start → PM → task.ready → Spec Writer → spec.written → Spec Reviewer
                                                                     ↓
                                               spec.approved ← [review loop]
                                                     ↓
                                               Engineer → eng.done → Verifier
                                                                         ↓
                                               task.complete ← [verify loop]
                                                     ↓
                                                    PM
                                                     ↓
                                   phase.validate → Phase Tester → phase.validated
                                                                         ↓
                                        [repeat for each phase] ← PM ←───┘
                                                                   ↓
                                  backlog.validate → Completion Tester → backlog.validated
                                                                               ↓
                                                                    PM → LOOP_COMPLETE
```

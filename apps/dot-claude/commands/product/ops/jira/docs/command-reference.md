# Jira Commands Reference

Complete reference documentation for all Jira workflow commands. Each command is documented with syntax, arguments, examples, and expected outcomes.

## Command Overview

| Category | Commands | Purpose |
|----------|----------|---------|
| **Issue Refinement** | refine-issue, refine-feature, refine-epic | Transform rough ideas into well-defined issues |
| **Epic Management** | epic-breakdown, epic-prep, epic-execute | Decompose, prepare, and execute epics |
| **Sprint Planning** | sprint-plan, sprint-execute, sprint-status | Plan, execute, and monitor sprints |
| **Release Management** | release-plan, release-execute | Plan and execute product releases |
| **Project Organization** | dependency-map, project-shuffle | Analyze dependencies and reorganize work |

---

## Issue Refinement Commands

### /jira-refine-issue

**Purpose**: Generic issue refinement for tasks, bugs, and chores. Swiss Army knife command when specialized refinement isn't needed.

**Syntax**:
```
/jira-refine-issue [issue-key-or-url] [project key] [type task|bug|chore] [interactive]
```

**Arguments**:
- `issue-key-or-url` (optional) - Existing issue to refine (e.g., CHR-789 or full URL)
- `project key` (optional) - Target project for new issues (e.g., "project CHR")
- `type` (optional) - Issue type: task, bug, or chore
- `interactive` (optional) - Step-by-step guided refinement

**Modes**:
1. **Refine Mode** - Issue key provided, enhances existing issue
2. **Create Mode** - No issue key, creates new issue from scratch

**Examples**:
```bash
# Refine existing issue
/jira-refine-issue CHR-789

# Create new bug
/jira-refine-issue project CHR type bug

# Interactive refinement
/jira-refine-issue CHR-789 interactive

# Refine from URL
/jira-refine-issue https://your-domain.atlassian.net/browse/CHR-789
```

**Success Criteria**:
- Clear, specific title
- Description with context
- Acceptance criteria or definition of done
- Type properly identified
- Priority set appropriately

---

### /jira-refine-feature

**Purpose**: Refine stories (features) with comprehensive acceptance criteria, user perspective, and business value.

**Syntax**:
```
/jira-refine-feature [issue-key-or-url] [project key] [interactive]
```

**Arguments**:
- `issue-key-or-url` (optional) - Existing story to refine
- `project key` (optional) - Target project for new stories
- `interactive` (optional) - Guided story refinement

**Modes**:
1. **Refine Mode** - Enhance existing story
2. **Create Mode** - Create new story from idea

**Examples**:
```bash
# Refine existing story
/jira-refine-feature CHR-456

# Create new feature
/jira-refine-feature project CHR

# Interactive story creation
/jira-refine-feature project CHR interactive
```

**Success Criteria**:
- User story format (As a... I want... So that...)
- Clear business value
- Comprehensive acceptance criteria (Given/When/Then)
- Technical notes and constraints
- Estimated story points

---

### /jira-refine-epic

**Purpose**: Transform issues into comprehensive epics with goals, success criteria, and structured breakdown.

**Syntax**:
```
/jira-refine-epic [epic-key-or-url] [project key] [interactive]
```

**Arguments**:
- `epic-key-or-url` (optional) - Existing epic or issue to refine
- `project key` (optional) - Target project for new epics
- `interactive` (optional) - Guided epic creation

**Modes**:
1. **Refine Mode** - Enhance existing epic
2. **Promote Mode** - Convert regular issue to epic
3. **Create Mode** - Create new epic from scratch

**Examples**:
```bash
# Refine existing epic
/jira-refine-epic CHR-100

# Promote story to epic
/jira-refine-epic CHR-456  # Regular issue

# Create new epic
/jira-refine-epic project CHR
```

**Success Criteria**:
- Clear epic goal and vision
- Success criteria defined
- Rough story breakdown
- Timeline and milestones
- Dependencies identified

---

## Epic Management Commands

### /jira-epic-breakdown

**Purpose**: Analyze epic and create comprehensive breakdown of stories, tasks, and subtasks.

**Syntax**:
```
/jira-epic-breakdown <epic-key> [options]
```

**Arguments**:
- `epic-key` (required) - Epic to break down
- `--auto-create` (optional) - Automatically create issues in Jira
- `--dry-run` (optional) - Generate breakdown without creating issues

**Examples**:
```bash
# Analyze and propose breakdown
/jira-epic-breakdown CHR-100

# Generate and create issues
/jira-epic-breakdown CHR-100 --auto-create

# Preview breakdown only
/jira-epic-breakdown CHR-100 --dry-run
```

**Success Criteria**:
- All stories independently deliverable
- Clear parent-child relationships
- Appropriate granularity (1-5 days per story)
- Technical tasks identified
- Dependencies mapped

---

### /jira-epic-prep

**Purpose**: Prepare epic for sprint planning by validating stories, resolving blockers, and ensuring readiness.

**Syntax**:
```
/jira-epic-prep <epic-key> [options]
```

**Arguments**:
- `epic-key` (required) - Epic to prepare
- `--resolve-blockers` (optional) - Interactive blocker resolution
- `--validate-only` (optional) - Check readiness without changes

**Examples**:
```bash
# Prepare epic for sprint
/jira-epic-prep CHR-100

# Validate readiness
/jira-epic-prep CHR-100 --validate-only

# Interactive blocker resolution
/jira-epic-prep CHR-100 --resolve-blockers
```

**Success Criteria**:
- All stories have acceptance criteria
- Dependencies resolved or documented
- Stories estimated
- No critical blockers
- Epic ready for sprint planning

---

### /jira-epic-execute

**Purpose**: Execute an entire Jira epic with all its child stories using parallel AI agents. Similar to sprint-execute but scoped to an epic rather than a sprint.

**Syntax**:
```
/jira-epic-execute <epic-key> [skip-prep] [dry-run] [force]
```

**Arguments**:
- `epic-key` (required) - Epic issue key to execute (e.g., CHR-100)
- `skip-prep` (optional) - Skip epic readiness validation
- `dry-run` (optional) - Preview execution plan without running agents
- `force` (optional) - Proceed despite blockers or incomplete dependencies

**Examples**:
```bash
# Execute entire epic
/jira-epic-execute CHR-100

# Preview execution plan
/jira-epic-execute CHR-100 dry-run

# Skip readiness check
/jira-epic-execute CHR-100 skip-prep

# Force execution despite blockers
/jira-epic-execute CHR-100 force

# Combine flags
/jira-epic-execute CHR-100 skip-prep dry-run
```

**Workflow**:
1. Parse arguments and validate environment
2. Analyze epic context (fetch all child stories, subtasks, dependencies)
3. Validate epic readiness (unless skip-prep)
4. Analyze codebase for each story (parallel agents)
5. Plan execution phases (Foundation → Features → Integration)
6. Execute with phased parallel agents (max 4 concurrent)
7. Finalize and generate report

**Success Criteria**:
- All child stories executed
- Dependencies respected
- File conflicts avoided
- Progress tracked in Jira
- Comprehensive execution report generated

**Comparison with Related Commands**:
| Command | Scope | Use Case |
|---------|-------|----------|
| epic-execute | All stories under an epic | Feature/initiative completion |
| sprint-execute | Issues in a sprint | Time-boxed iteration |
| issue-execute | Specific issue keys | Ad-hoc, hot fixes |

---

## Sprint Commands

### /jira-sprint-plan

**Purpose**: Create focused sprint plan from epic or backlog issues.

**Syntax**:
```
/jira-sprint-plan <epic-key-or-sprint-id> [options]
```

**Arguments**:
- `epic-key-or-sprint-id` (required) - Source epic or target sprint
- `--capacity` (optional) - Team capacity in story points
- `--auto-assign` (optional) - Automatically assign to sprint

**Examples**:
```bash
# Plan sprint from epic
/jira-sprint-plan CHR-100

# Plan with team capacity
/jira-sprint-plan CHR-100 --capacity 40

# Plan and assign to sprint
/jira-sprint-plan CHR-100 --auto-assign
```

**Success Criteria**:
- Sprint goal defined
- Issues fit within capacity
- Balanced workload
- Dependencies accounted for
- Clear sprint scope

---

### /jira-sprint-execute

**Purpose**: Orchestrate parallel AI agent execution of sprint work.

**Syntax**:
```
/jira-sprint-execute <sprint-id> [options]
```

**Arguments**:
- `sprint-id` (required) - Sprint to execute
- `--parallel` (optional) - Maximum parallel agents (default: 3)
- `--dry-run` (optional) - Simulate execution without changes

**Examples**:
```bash
# Execute sprint with default parallelism
/jira-sprint-execute 123

# Limit to 2 parallel agents
/jira-sprint-execute 123 --parallel 2

# Simulate execution
/jira-sprint-execute 123 --dry-run
```

**Success Criteria**:
- All issues assigned to agents
- Progress tracked in Jira comments
- Parallel execution optimized
- Blockers identified and escalated
- Completion status accurate

---

### /jira-sprint-status

**Purpose**: Monitor sprint progress in real-time with metrics and insights.

**Syntax**:
```
/jira-sprint-status [sprint-id] [--detailed]
```

**Arguments**:
- `sprint-id` (optional) - Specific sprint (defaults to current)
- `--detailed` (optional) - Include per-issue breakdown

**Examples**:
```bash
# Check current sprint status
/jira-sprint-status

# Detailed sprint report
/jira-sprint-status --detailed

# Check specific sprint
/jira-sprint-status 123 --detailed
```

**Output Includes**:
- Completion percentage
- Issues by status (To Do, In Progress, Done)
- Blocked issues
- Sprint burndown
- Velocity tracking

---

## Release Management Commands

### /jira-release-plan

**Purpose**: Plan product releases from backlog with version grouping.

**Syntax**:
```
/jira-release-plan <version-name> [options]
```

**Arguments**:
- `version-name` (required) - Target version (e.g., "v1.0.0")
- `--from-epic` (optional) - Source epic for issues
- `--auto-create-version` (optional) - Create version if doesn't exist

**Examples**:
```bash
# Plan release
/jira-release-plan v1.0.0

# Plan from epic
/jira-release-plan v1.0.0 --from-epic CHR-100

# Create version and plan
/jira-release-plan v1.0.0 --auto-create-version
```

**Success Criteria**:
- Version created or exists
- Issues assigned to version
- Release scope defined
- Timeline established
- Dependencies mapped

---

### /jira-release-execute

**Purpose**: Execute release with AI agents, managing multiple epics and dependencies.

**Syntax**:
```
/jira-release-execute <version-name> [options]
```

**Arguments**:
- `version-name` (required) - Version to execute
- `--parallel` (optional) - Max parallel agents
- `--dry-run` (optional) - Simulate without execution

**Examples**:
```bash
# Execute release
/jira-release-execute v1.0.0

# Simulate release
/jira-release-execute v1.0.0 --dry-run
```

**Success Criteria**:
- All version issues executed
- Dependencies respected
- Progress tracked
- Release validated
- Version ready for deployment

---

## Project Organization Commands

### /jira-dependency-map

**Purpose**: Visualize and analyze issue dependencies across project.

**Syntax**:
```
/jira-dependency-map [scope] [options]
```

**Arguments**:
- `scope` (optional) - Epic, sprint, or version to analyze
- `--format` (optional) - Output format: text, mermaid, json
- `--critical-path` (optional) - Highlight critical path

**Examples**:
```bash
# Map all dependencies
/jira-dependency-map

# Map epic dependencies
/jira-dependency-map CHR-100

# Show critical path
/jira-dependency-map CHR-100 --critical-path
```

**Output Includes**:
- Dependency graph
- Blocked issues
- Circular dependencies
- Critical path
- Risk assessment

---

### /jira-project-shuffle

**Purpose**: Reorganize issues between sprints, epics, or versions.

**Syntax**:
```
/jira-project-shuffle <source> <target> [options]
```

**Arguments**:
- `source` - Source sprint/epic/version
- `target` - Target sprint/epic/version
- `--criteria` (optional) - Selection criteria
- `--dry-run` (optional) - Preview without changes

**Examples**:
```bash
# Move issues between sprints
/jira-project-shuffle sprint:123 sprint:124

# Preview shuffle
/jira-project-shuffle epic:CHR-100 epic:CHR-200 --dry-run

# Shuffle by criteria
/jira-project-shuffle sprint:123 sprint:124 --criteria "priority=High"
```

**Success Criteria**:
- Issues moved appropriately
- Dependencies maintained
- Team capacity respected
- Context preserved

---

## Common Patterns

### Validation Before Changes
```bash
# Most commands support --validate-only or --dry-run
/jira-refine-issue CHR-789 validate-only
/jira-epic-breakdown CHR-100 --dry-run
/jira-sprint-execute 123 --dry-run
```

### Interactive Mode
```bash
# Step-by-step guidance
/jira-refine-issue CHR-789 interactive
/jira-refine-feature project CHR interactive
```

### Auto-Creation
```bash
# Automatically create issues/versions
/jira-epic-breakdown CHR-100 --auto-create
/jira-release-plan v1.0.0 --auto-create-version
```

## Error Handling

All commands handle common errors:
- **Authentication failures** - Clear guidance to re-authenticate
- **Issue not found** - Verification and retry suggestions
- **Permission denied** - Permission requirements explained
- **Invalid arguments** - Usage examples provided
- **Network errors** - Retry logic with exponential backoff

## Next Steps

- Review [Quick Reference](./quick-reference.md) for common workflows
- Check [LLM Context Guide](./llm-context-guide.md) for AI integration
- See [Troubleshooting](./troubleshooting.md) for common issues

# LLM Context Guide: Jira Workflow Commands

Complete guide for AI/LLM integration with Jira workflow commands. Covers Claude Code usage patterns, subagent delegation, automated workflows, and best practices.

## Overview

This guide is for:
- **AI Developers** - Integrating Jira commands into AI agents
- **Claude Code Users** - Automating Jira workflows with AI
- **Engineering Managers** - Setting up team automation
- **Product Managers** - AI-assisted product management

## Claude Code Integration

### Command Discovery

Commands are auto-discovered by Claude Code from the `.claude/commands/` directory:

```
.claude/commands/product/ops/jira/
├── refine-issue/refine-issue.md
├── refine-feature/refine-feature.md
├── refine-epic/refine-epic.md
├── epic-breakdown/epic-breakdown.md
├── epic-prep/epic-prep.md
├── sprint-plan/sprint-plan.md
├── sprint-execute/sprint-execute.md
├── sprint-status/sprint-status.md
├── release-plan/release-plan.md
├── release-execute/release-execute.md
├── dependency-map/dependency-map.md
└── project-shuffle/project-shuffle.md
```

### Invoking Commands

In Claude Code conversations:

```
User: Refine issue CHR-789
Claude: I'll refine that issue for you.

[Invokes: /jira-refine-issue CHR-789]
```

Claude Code automatically:
1. Detects intent to use Jira commands
2. Selects appropriate command
3. Constructs argument string
4. Executes command via Bash tool
5. Processes results
6. Presents formatted output

### Natural Language to Commands

**User Intent** → **Command Mapping**:

| User Says | Claude Invokes |
|-----------|----------------|
| "Refine issue CHR-789" | `/jira-refine-issue CHR-789` |
| "Break down epic CHR-100" | `/jira-epic-breakdown CHR-100` |
| "Plan sprint from CHR-100" | `/jira-sprint-plan CHR-100` |
| "Check sprint status" | `/jira-sprint-status` |
| "Map dependencies for CHR-100" | `/jira-dependency-map CHR-100` |

## Subagent Delegation Patterns

### Pattern 1: Single Issue Refinement

**Use Case**: Refine one issue with AI assistance

```xml
<jira_refinement_agent>
<role>
You are refining Jira issue CHR-789 to production-ready status.
</role>

<workflow>
1. Fetch issue details:
   !jira issue view CHR-789 --json

2. Analyze current state:
   - Summary clarity
   - Description completeness
   - Acceptance criteria
   - Priority and labels

3. Refine issue:
   /jira-refine-issue CHR-789 interactive

4. Verify improvements:
   !jira issue view CHR-789 --json

5. Report completion
</workflow>
</jira_refinement_agent>
```

### Pattern 2: Epic Breakdown and Sprint Planning

**Use Case**: Complete epic decomposition and sprint planning

```xml
<epic_to_sprint_agent>
<role>
You are breaking down epic CHR-100 into a ready-to-execute sprint.
</role>

<workflow>
1. Refine epic:
   /jira-refine-epic CHR-100

2. Break down into stories:
   /jira-epic-breakdown CHR-100 --auto-create

3. Prepare epic:
   /jira-epic-prep CHR-100

4. Analyze dependencies:
   /jira-dependency-map CHR-100 --critical-path

5. Plan sprint:
   /jira-sprint-plan CHR-100 --capacity 40 --auto-assign

6. Verify sprint readiness:
   /jira-sprint-status --detailed
</workflow>

<success_criteria>
- Epic has clear goal and success criteria
- All stories have acceptance criteria
- Dependencies identified and documented
- Sprint capacity not exceeded
- No critical blockers
</success_criteria>
</epic_to_sprint_agent>
```

### Pattern 3: Parallel Sprint Execution

**Use Case**: Execute sprint with multiple AI agents working in parallel

```xml
<sprint_execution_coordinator>
<role>
You coordinate parallel AI agents executing sprint 123.
</role>

<workflow>
1. Fetch sprint issues:
   !jira issue list --sprint 123 --json

2. Analyze dependencies:
   /jira-dependency-map sprint:123

3. Group by parallelizable work:
   - Independent issue groups
   - Dependency chains

4. Delegate to subagents:
   <subagent id="1">
     Execute issues: CHR-101, CHR-102
   </subagent>
   <subagent id="2">
     Execute issues: CHR-103, CHR-104
   </subagent>
   <subagent id="3">
     Execute issues: CHR-105, CHR-106
   </subagent>

5. Monitor progress:
   /jira-sprint-status --detailed

6. Handle blockers:
   - Escalate to human
   - Adjust agent assignments
   - Update sprint scope

7. Report completion
</workflow>
</sprint_execution_coordinator>
```

### Pattern 4: Release Orchestration

**Use Case**: Coordinate release execution across multiple epics

```xml
<release_orchestration_agent>
<role>
You orchestrate release v1.0.0 execution with dependency management.
</role>

<workflow>
1. Analyze release scope:
   !jira issue list --fix-version "v1.0.0" --json

2. Map dependencies:
   /jira-dependency-map v1.0.0 --critical-path

3. Plan execution order:
   - Critical path first
   - Parallel where possible
   - Respect dependencies

4. Execute release:
   /jira-release-execute v1.0.0 --parallel 5

5. Monitor progress:
   - Track issue completion
   - Identify blockers
   - Adjust execution plan

6. Validate release:
   - All issues completed
   - Tests passing
   - Documentation updated

7. Report release status
</workflow>
</release_orchestration_agent>
```

## Automation Workflows

### Automated Daily Standup

```bash
#!/bin/bash
# Daily automated sprint status report

# Get sprint status
claude-code invoke <<EOF
Check current sprint status and create a standup report:

1. Get sprint progress: /jira-sprint-status --detailed
2. Identify blockers
3. Highlight at-risk issues
4. Suggest actions

Format as daily standup report.
EOF
```

### Automated Epic Refinement

```bash
#!/bin/bash
# Weekly epic refinement automation

claude-code invoke <<EOF
Refine all epics in "Backlog" status:

1. List epics: !jira epic list --status Backlog --json
2. For each epic:
   - Refine: /jira-refine-epic EPIC-KEY
   - Assess readiness
3. Report epics ready for breakdown
EOF
```

### Automated Dependency Audits

```bash
#!/bin/bash
# Weekly dependency audit

claude-code invoke <<EOF
Audit project dependencies:

1. Map all dependencies: /jira-dependency-map --format json
2. Identify circular dependencies
3. Find critical paths
4. Report at-risk dependencies
5. Suggest mitigation actions
EOF
```

## Progress Tracking Patterns

### Pattern: Jira Comment Updates

When executing issues, post progress to Jira:

```bash
# Agent starting work
jira issue comment add CHR-123 --message "🤖 AI Agent starting work" --json

# Progress update
jira issue comment add CHR-123 --message "Progress: Implemented authentication, starting tests" --json

# Completion
jira issue comment add CHR-123 --message "✓ Work completed. Files modified: auth.py, test_auth.py" --json
```

### Pattern: Status Transitions

Update issue status as work progresses:

```bash
# Start work
jira issue move CHR-123 --status "In Progress" --json

# Code review
jira issue move CHR-123 --status "Code Review" --json

# Complete
jira issue move CHR-123 --status "Done" --json
```

### Pattern: Sprint Metrics

Track sprint progress in real-time:

```bash
# Get sprint metrics
SPRINT_DATA=$(jira issue list --sprint 123 --json)

# Calculate completion
TOTAL=$(echo "$SPRINT_DATA" | jq '.total')
DONE=$(echo "$SPRINT_DATA" | jq '[.issues[] | select(.fields.status.statusCategory.key == "done")] | length')
PERCENT=$(echo "scale=2; $DONE / $TOTAL * 100" | bc)

# Report progress
echo "Sprint Progress: $PERCENT% ($DONE/$TOTAL issues complete)"
```

## Best Practices for AI Integration

### 1. Validate Before Acting

Always validate inputs and state:

```bash
# Verify issue exists
if ! jira issue view CHR-123 --json &>/dev/null; then
  echo "Error: Issue CHR-123 not found"
  exit 1
fi

# Check for required fields
SUMMARY=$(jira issue view CHR-123 --json | jq -r '.fields.summary')
if [ -z "$SUMMARY" ]; then
  echo "Error: Issue has no summary"
  exit 1
fi
```

### 2. Use Dry Run First

Test commands without side effects:

```bash
# Dry run epic breakdown
/jira-epic-breakdown CHR-100 --dry-run

# Review proposed changes
# If acceptable, run without --dry-run
/jira-epic-breakdown CHR-100 --auto-create
```

### 3. Handle Errors Gracefully

Implement robust error handling:

```bash
# Retry with exponential backoff
retry_command() {
  local max_attempts=3
  local attempt=1
  local delay=1

  while [ $attempt -le $max_attempts ]; do
    if "$@"; then
      return 0
    fi
    echo "Attempt $attempt failed, retrying in ${delay}s..."
    sleep $delay
    delay=$((delay * 2))
    ((attempt++))
  done

  echo "Command failed after $max_attempts attempts"
  return 1
}

# Use with jira commands
retry_command jira issue move CHR-123 --status "In Progress"
```

### 4. Log All Actions

Maintain audit trail:

```bash
# Log to file
LOG_FILE="/var/log/jira-automation.log"

log_action() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

log_action "Starting epic breakdown: CHR-100"
/jira-epic-breakdown CHR-100 --auto-create
log_action "Epic breakdown complete: 15 stories created"
```

### 5. Respect Rate Limits

Implement rate limiting:

```bash
RATE_LIMIT=10  # requests per second
LAST_REQUEST=0

rate_limit() {
  local current=$(date +%s%N | cut -b1-13)
  local elapsed=$((current - LAST_REQUEST))
  local min_interval=$((1000 / RATE_LIMIT))

  if [ $elapsed -lt $min_interval ]; then
    sleep $(echo "scale=3; ($min_interval - $elapsed) / 1000" | bc)
  fi

  LAST_REQUEST=$(date +%s%N | cut -b1-13)
}

# Use before each request
rate_limit
jira issue view CHR-123 --json
```

### 6. Provide Clear Progress Updates

Keep users informed:

```bash
echo "📋 Step 1/5: Fetching epic details..."
EPIC_DATA=$(jira issue view CHR-100 --json)

echo "🔍 Step 2/5: Analyzing epic scope..."
# Analysis logic

echo "✂️ Step 3/5: Breaking down into stories..."
/jira-epic-breakdown CHR-100 --auto-create

echo "✅ Step 4/5: Linking stories to epic..."
# Linking logic

echo "🎉 Step 5/5: Epic breakdown complete!"
```

### 7. Implement Rollback

Prepare for failures:

```bash
# Track created issues
declare -a CREATED_ISSUES=()

create_story() {
  local result=$(jira issue create --type Story --summary "$1" --json)
  local key=$(echo "$result" | jq -r '.key')
  CREATED_ISSUES+=("$key")
  echo "$key"
}

# Rollback on error
rollback() {
  echo "Rolling back created issues..."
  for issue in "${CREATED_ISSUES[@]}"; do
    jira issue delete "$issue" --force
  done
}

# Trap errors
trap rollback ERR
```

## Testing AI Integrations

### Unit Testing Agent Workflows

```bash
#!/bin/bash
# Test agent refinement workflow

export JIRA_TEST_DRY_RUN="true"
export JIRA_TEST_PROJECT="TEST"

# Test issue refinement
echo "Testing issue refinement..."
/jira-refine-issue TEST-123 interactive

# Verify no actual changes
if jira issue view TEST-123 --json | jq -e '.fields.updated' | grep -q "$(date +%Y-%m-%d)"; then
  echo "FAIL: Issue was modified in dry run mode"
  exit 1
else
  echo "PASS: Dry run successful"
fi
```

### Integration Testing

```bash
# Run full integration test suite
cd apps/dot-claude/commands/product/ops/jira/tests

# Configure test environment
export JIRA_TEST_PROJECT="TEST"
export JIRA_TEST_BOARD_ID="123"
export JIRA_TEST_CLEANUP="true"

# Run tests
./test-jira-cloud.sh all
```

## Security Considerations

### 1. Protect Credentials

```bash
# Never log tokens
# Never echo API tokens
# Use environment variables or secure vaults

# Example: Use secure credential storage
JIRA_TOKEN=$(security find-generic-password -s jira-api-token -w)
```

### 2. Validate User Input

```bash
# Sanitize issue keys
validate_issue_key() {
  if ! echo "$1" | grep -qE '^[A-Z]+-[0-9]+$'; then
    echo "Invalid issue key format"
    return 1
  fi
}

validate_issue_key "$USER_INPUT" || exit 1
```

### 3. Audit Actions

```bash
# Log all automated actions
logger -t jira-automation "Agent started sprint execution: 123"

# Record to Jira
jira issue comment add ADMIN-001 --message "Automated action: Sprint 123 execution started by AI agent"
```

## Performance Optimization

### Parallel Processing

```bash
# Process multiple issues in parallel
process_issue() {
  /jira-refine-issue "$1"
}

export -f process_issue

# Process 5 issues in parallel
echo "CHR-101 CHR-102 CHR-103 CHR-104 CHR-105" | \
  xargs -n 1 -P 5 bash -c 'process_issue "$@"' _
```

### Caching Results

```bash
# Cache epic data
CACHE_FILE="/tmp/epic_${EPIC_KEY}.json"

if [ -f "$CACHE_FILE" ] && [ $(($(date +%s) - $(stat -f %m "$CACHE_FILE"))) -lt 300 ]; then
  EPIC_DATA=$(cat "$CACHE_FILE")
else
  EPIC_DATA=$(jira issue view "$EPIC_KEY" --json)
  echo "$EPIC_DATA" > "$CACHE_FILE"
fi
```

## Next Steps

- Review [Command Reference](./command-reference.md) for all commands
- Check [Quick Reference](./quick-reference.md) for common patterns
- See [Troubleshooting](./troubleshooting.md) for error handling
- Explore test suite in `../tests/` directory

---

**AI Integration Tip**: Start with single-agent workflows before attempting parallel execution. Master error handling and progress tracking first.

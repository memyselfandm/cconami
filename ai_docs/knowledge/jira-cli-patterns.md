# Jira CLI Technical Patterns

This document provides technical implementation patterns for using `jira-cli` in Claude Code custom commands and AI agent workflows.

## Tool Information

**Tool**: `jira-cli` by ankitpokhrel
**Repository**: https://github.com/ankitpokhrel/jira-cli
**License**: MIT
**Language**: Go (single binary)

## Installation & Configuration

### Installation Methods

**macOS (Homebrew)**
```bash
brew install ankitpokhrel/jira-cli/jira-cli
```

**Linux (Install Script)**
```bash
sh -c "$(curl -fsSL https://raw.githubusercontent.com/ankitpokhrel/jira-cli/main/install.sh)"
```

**Manual Binary Download**
```bash
# Download from releases
wget https://github.com/ankitpokhrel/jira-cli/releases/latest/download/jira-cli_<version>_<os>_<arch>.tar.gz
tar -xzf jira-cli_*.tar.gz
sudo mv jira /usr/local/bin/
```

**Verify Installation**
```bash
jira version
```

### Configuration Setup

**Interactive Initialization**
```bash
jira init
```

**Configuration File Location**
```
~/.config/jira-cli/.config.yml
```

**Example Configuration**
```yaml
installation: Cloud
server: https://your-domain.atlassian.net
login: your-email@example.com
project:
  key: CHR
  type: scrum
board:
  id: 1
  name: "Chronicle Board"
epic:
  name: Epic
  link: "Epic Link"
```

**Authentication Methods**
1. **API Token** (Jira Cloud) - Create at https://id.atlassian.com/manage-profile/security/api-tokens
2. **Personal Access Token** (Jira Server/Data Center)

## JSON Output Patterns

### Always Use --json Flag

All programmatic operations should use the `--json` flag for structured, parseable output:

```bash
jira issue view CHR-123 --json
jira issue list --json
jira epic list --json
jira sprint list --current --json
```

### JSON Response Structure

**Issue View Response**
```json
{
  "key": "CHR-123",
  "fields": {
    "summary": "Implement authentication",
    "description": "Add JWT-based authentication",
    "status": {
      "name": "In Progress",
      "statusCategory": {
        "key": "indeterminate"
      }
    },
    "assignee": {
      "displayName": "John Doe",
      "emailAddress": "john@example.com"
    },
    "priority": {
      "name": "High",
      "id": "2"
    },
    "labels": ["feature", "security"],
    "issuetype": {
      "name": "Story"
    },
    "parent": {
      "key": "CHR-100",
      "fields": {
        "summary": "Auth Epic"
      }
    },
    "epic": {
      "key": "CHR-100",
      "name": "Authentication System"
    },
    "fixVersions": [
      {
        "name": "v1.0.0"
      }
    ],
    "sprint": {
      "id": 123,
      "name": "Sprint 24",
      "state": "active"
    }
  }
}
```

**Issue List Response**
```json
{
  "issues": [
    {
      "key": "CHR-123",
      "fields": { ... }
    },
    {
      "key": "CHR-124",
      "fields": { ... }
    }
  ],
  "total": 42
}
```

### Parsing with jq

**Extract Single Values**
```bash
# Get issue status
jira issue view CHR-123 --json | jq -r '.fields.status.name'

# Get assignee
jira issue view CHR-123 --json | jq -r '.fields.assignee.displayName'

# Get summary
jira issue view CHR-123 --json | jq -r '.fields.summary'

# Get labels
jira issue view CHR-123 --json | jq -r '.fields.labels[]'
```

**Extract Multiple Issues**
```bash
# Get all issue keys
jira issue list --json | jq -r '.issues[].key'

# Get key and summary pairs
jira issue list --json | jq -r '.issues[] | "\(.key): \(.fields.summary)"'

# Filter by status
jira issue list --json | jq '.issues[] | select(.fields.status.name == "In Progress")'

# Get issues with specific label
jira issue list --json | jq '.issues[] | select(.fields.labels[] == "feature")'
```

**Aggregate and Count**
```bash
# Count issues by status
jira issue list --json | jq '[.issues[] | .fields.status.name] | group_by(.) | map({status: .[0], count: length})'

# Count by assignee
jira issue list --json | jq '[.issues[] | .fields.assignee.displayName] | group_by(.) | map({assignee: .[0], count: length})'

# Calculate total story points
jira issue list --sprint=123 --json | jq '[.issues[] | .fields.storyPoints // 0] | add'
```

## Command Patterns

### Issue Operations

**Create Issues**
```bash
# Create story
jira issue create \
  --type=Story \
  --summary="User can reset password" \
  --body="Detailed description..." \
  --label=feature \
  --label=auth \
  --priority=High \
  --json

# Create task
jira issue create \
  --type=Task \
  --summary="Set up CI/CD pipeline" \
  --body="Configure GitHub Actions" \
  --assignee=john.doe \
  --json

# Create bug
jira issue create \
  --type=Bug \
  --summary="Login fails on Safari" \
  --body="Steps to reproduce..." \
  --priority=Highest \
  --label=bug \
  --json

# Create subtask
jira issue create \
  --type=Subtask \
  --parent=CHR-123 \
  --summary="Write unit tests" \
  --json
```

**Update Issues**
```bash
# Update summary
jira issue edit CHR-123 --summary="New summary" --json

# Update assignee
jira issue edit CHR-123 --assignee=john.doe --json

# Update priority
jira issue edit CHR-123 --priority=High --json

# Add labels
jira issue edit CHR-123 --label=security --json

# Set fix version
jira issue edit CHR-123 --fix-version="v1.0.0" --json

# Update description
jira issue edit CHR-123 --body="New description" --json
```

**Move Through Workflow**
```bash
# Transition to In Progress
jira issue move CHR-123 --status="In Progress" --json

# Transition to Done
jira issue move CHR-123 --status="Done" --json

# Custom transition
jira issue move CHR-123 --status="Code Review" --json
```

**Query Issues**
```bash
# List all issues
jira issue list --json

# Filter by type
jira issue list --type=Story --json
jira issue list --type=Bug --json

# Filter by status
jira issue list --status="In Progress" --json
jira issue list --status="To Do" --json

# Filter by assignee
jira issue list --assignee=@me --json
jira issue list --assignee=john.doe --json

# Filter by sprint
jira issue list --sprint=123 --json
jira issue list --current --json

# Filter by epic
jira issue list --parent=CHR-100 --json

# Filter by version
jira issue list --fix-version="v1.0.0" --json

# Advanced JQL
jira issue list --jql="project=CHR AND status='In Progress' AND assignee=currentUser()" --json
```

**Comments and Work Logs**
```bash
# Add comment
jira issue comment add CHR-123 --message="Progress update: completed authentication" --json

# Add work log
jira issue worklog add CHR-123 --time-spent=2h --comment="Implemented JWT service" --json

# View comments
jira issue view CHR-123 --comments=10 --json
```

**Issue Links**
```bash
# Link issues
jira issue link CHR-123 CHR-124 --type="blocks" --json
jira issue link CHR-123 CHR-125 --type="relates to" --json
jira issue link CHR-123 CHR-126 --type="duplicates" --json

# Common link types:
# - blocks / is blocked by
# - relates to
# - duplicates / is duplicated by
# - causes / is caused by
```

### Epic Operations

**Create and Manage Epics**
```bash
# Create epic
jira epic create \
  --name="Authentication System" \
  --summary="Implement user authentication" \
  --body="Complete auth system with OAuth and JWT" \
  --json

# List epics
jira epic list --json
jira epic list --status=Active --json

# Add issues to epic
jira epic add CHR-100 CHR-101 CHR-102 CHR-103

# Remove issues from epic
jira epic remove CHR-100 CHR-101

# List epic issues
jira issue list --parent=CHR-100 --json
```

**Create Issues Under Epic**
```bash
# Story with epic link
jira issue create \
  --type=Story \
  --summary="OAuth integration" \
  --epic=CHR-100 \
  --json
```

### Sprint Operations

**Manage Sprints**
```bash
# List sprints
jira sprint list --json
jira sprint list --board=<board-id> --json
jira sprint list --state=active --json
jira sprint list --state=future --json
jira sprint list --current --json

# Add issues to sprint
jira sprint add <sprint-id> CHR-101 CHR-102 CHR-103

# Remove issues from sprint
jira sprint remove <sprint-id> CHR-101

# List sprint issues
jira issue list --sprint=<sprint-id> --json
```

**Sprint Metrics**
```bash
# Get sprint details
jira sprint list --current --json | jq '.sprints[0]'

# Count issues by status in sprint
jira issue list --sprint=<sprint-id> --json | \
  jq '[.issues[] | .fields.status.name] | group_by(.) | map({status: .[0], count: length})'

# Calculate sprint progress
jira issue list --sprint=<sprint-id> --json | \
  jq '{total: .total, done: ([.issues[] | select(.fields.status.statusCategory.key == "done")] | length)}'
```

### Project and Board Operations

**Projects**
```bash
# List projects
jira project list --json

# View project details
jira project view CHR --json

# Get project key from name
jira project list --json | jq -r '.projects[] | select(.name == "Chronicle") | .key'
```

**Boards**
```bash
# List boards
jira board list --json
jira board list --type=scrum --json

# View board
jira board view <board-id> --json

# Get board sprints
jira sprint list --board=<board-id> --json
```

**Versions/Releases**
```bash
# List versions
jira version list --project=CHR --json

# Create version
jira version create --project=CHR --name="v1.0.0" --description="Initial release" --json

# Release version
jira version release --project=CHR --name="v1.0.0" --json
```

## Error Handling Patterns

### Common Error Scenarios

**Authentication Failure**
```bash
# Check configuration
if [ ! -f ~/.config/jira-cli/.config.yml ]; then
  echo "Error: Jira CLI not configured. Run 'jira init'"
  exit 1
fi

# Test authentication
if ! jira me &>/dev/null; then
  echo "Error: Authentication failed. Check your API token"
  exit 1
fi
```

**Issue Not Found**
```bash
# Validate issue exists
if ! jira issue view CHR-123 --json &>/dev/null; then
  echo "Error: Issue CHR-123 not found"
  exit 1
fi
```

**Invalid Status Transition**
```bash
# Get available transitions
jira issue move CHR-123 --status="Invalid" --json 2>&1 | grep -q "Invalid status"
if [ $? -eq 0 ]; then
  echo "Error: Invalid status transition"
  # Get valid transitions
  jira issue view CHR-123 --json | jq -r '.transitions[].name'
  exit 1
fi
```

**Sprint Not Found**
```bash
# Verify sprint exists
SPRINT_ID=123
if ! jira sprint list --json | jq -e ".sprints[] | select(.id == $SPRINT_ID)" &>/dev/null; then
  echo "Error: Sprint $SPRINT_ID not found"
  exit 1
fi
```

### Graceful Degradation

**Handle Missing Fields**
```bash
# Use jq's // operator for defaults
ASSIGNEE=$(jira issue view CHR-123 --json | jq -r '.fields.assignee.displayName // "Unassigned"')

# Check for null
EPIC=$(jira issue view CHR-123 --json | jq -r '.fields.epic.key // null')
if [ "$EPIC" = "null" ]; then
  echo "No epic assigned"
fi
```

**Retry Logic**
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

    echo "Attempt $attempt failed. Retrying in ${delay}s..."
    sleep $delay
    delay=$((delay * 2))
    attempt=$((attempt + 1))
  done

  echo "Command failed after $max_attempts attempts"
  return 1
}

# Usage
retry_command jira issue move CHR-123 --status="In Progress" --json
```

## Integration with Claude Code Commands

### Command Template Pattern

```markdown
---
description: Brief description of command
argument-hint: <required-arg> [optional-arg]
allowed-tools: [Bash, Read, Write]
---

# Command Instructions

You are implementing a Jira operation command.

## Step 1: Validate Inputs

- Verify jira-cli is installed: `which jira`
- Validate issue keys format (PROJECT-NUMBER)
- Check authentication: `jira me --json`

## Step 2: Execute Jira Operations

Use jira-cli with --json flag:

```bash
jira issue view $1 --json
```

Parse results with jq for validation and processing.

## Step 3: Process Results

Extract relevant information and provide structured output.

## Error Handling

- Check for authentication errors
- Validate issue existence
- Handle missing fields gracefully
- Provide clear error messages
```

### Subagent Prompt Pattern

```xml
<jira_agent_prompt>
<role>
You are a Jira automation agent using jira-cli to manage issues, epics, and sprints.
</role>

<tools>
- Bash: Execute jira commands
- Read: Read specifications
- Write: Output results
</tools>

<workflow>
1. **Validate Context**
   - Check jira-cli installation
   - Verify authentication
   - Validate input parameters

2. **Execute Operations**
   - Use jira commands with --json
   - Parse responses with jq
   - Handle errors gracefully

3. **Update Linear/Jira**
   - Add comments with progress
   - Update issue status
   - Link related issues

4. **Report Results**
   - Structured output format
   - Success/failure status
   - Detailed error messages
</workflow>

<example>
```bash
# Get issue details
ISSUE_DATA=$(jira issue view CHR-123 --json)

# Extract status
STATUS=$(echo "$ISSUE_DATA" | jq -r '.fields.status.name')

# Update issue
jira issue move CHR-123 --status="In Progress" --json

# Add comment
jira issue comment add CHR-123 --message="AI agent starting work" --json
```
</example>
</jira_agent_prompt>
```

## Performance Optimization

### Caching Results

```bash
# Cache project list
CACHE_FILE="/tmp/jira_projects_$(date +%Y%m%d).json"

if [ -f "$CACHE_FILE" ]; then
  PROJECTS=$(cat "$CACHE_FILE")
else
  PROJECTS=$(jira project list --json)
  echo "$PROJECTS" > "$CACHE_FILE"
fi
```

### Batch Operations

```bash
# Get multiple issues efficiently
ISSUE_KEYS="CHR-101 CHR-102 CHR-103"

for KEY in $ISSUE_KEYS; do
  jira issue view "$KEY" --json &
done
wait

# Or use JQL for bulk queries
jira issue list --jql="key in (CHR-101,CHR-102,CHR-103)" --json
```

### Parallel Processing

```bash
# Process issues in parallel
process_issue() {
  local issue_key=$1
  jira issue move "$issue_key" --status="In Progress" --json
}

export -f process_issue

echo "CHR-101 CHR-102 CHR-103" | \
  xargs -n 1 -P 3 bash -c 'process_issue "$@"' _
```

## Advanced Patterns

### JQL Query Building

```bash
# Build complex JQL query
build_jql() {
  local project=$1
  local sprint=$2
  local status=$3

  JQL="project=${project}"

  if [ -n "$sprint" ]; then
    JQL="${JQL} AND sprint=${sprint}"
  fi

  if [ -n "$status" ]; then
    JQL="${JQL} AND status='${status}'"
  fi

  echo "$JQL"
}

# Usage
JQL=$(build_jql "CHR" "123" "In Progress")
jira issue list --jql="$JQL" --json
```

### Issue Dependency Analysis

```bash
# Analyze issue dependencies
analyze_dependencies() {
  local issue_key=$1

  # Get issue links
  LINKS=$(jira issue view "$issue_key" --json | jq -r '.fields.issuelinks[]')

  # Extract blockers
  BLOCKERS=$(echo "$LINKS" | jq -r 'select(.type.name == "Blocks") | .outwardIssue.key')

  # Extract blocked by
  BLOCKED_BY=$(echo "$LINKS" | jq -r 'select(.type.name == "Blocks") | .inwardIssue.key')

  echo "Blockers: $BLOCKERS"
  echo "Blocked by: $BLOCKED_BY"
}
```

### Sprint Progress Calculation

```bash
# Calculate sprint progress
calculate_sprint_progress() {
  local sprint_id=$1

  ISSUES=$(jira issue list --sprint="$sprint_id" --json)

  TOTAL=$(echo "$ISSUES" | jq '.total')
  DONE=$(echo "$ISSUES" | jq '[.issues[] | select(.fields.status.statusCategory.key == "done")] | length')
  IN_PROGRESS=$(echo "$ISSUES" | jq '[.issues[] | select(.fields.status.statusCategory.key == "indeterminate")] | length')
  TODO=$(echo "$ISSUES" | jq '[.issues[] | select(.fields.status.statusCategory.key == "new")] | length')

  PERCENT=$(echo "scale=2; $DONE / $TOTAL * 100" | bc)

  cat <<EOF
{
  "total": $TOTAL,
  "done": $DONE,
  "in_progress": $IN_PROGRESS,
  "todo": $TODO,
  "percent_complete": $PERCENT
}
EOF
}
```

## Testing and Validation

### Validate jira-cli Installation

```bash
# Check installation
if ! command -v jira &> /dev/null; then
    echo "Error: jira-cli not installed"
    echo "Install with: brew install ankitpokhrel/jira-cli/jira-cli"
    exit 1
fi

# Check version
JIRA_VERSION=$(jira version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')
REQUIRED_VERSION="1.4.0"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$JIRA_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    echo "Error: jira-cli version $JIRA_VERSION is too old (require $REQUIRED_VERSION+)"
    exit 1
fi
```

### Test JSON Parsing

```bash
# Validate JSON output
validate_json() {
  local json_data=$1

  if ! echo "$json_data" | jq empty 2>/dev/null; then
    echo "Error: Invalid JSON response"
    return 1
  fi

  return 0
}

# Usage
RESPONSE=$(jira issue view CHR-123 --json)
if ! validate_json "$RESPONSE"; then
  echo "Failed to parse response"
  exit 1
fi
```

### Mock Data for Testing

```bash
# Create mock responses for testing
MOCK_ISSUE='{
  "key": "CHR-123",
  "fields": {
    "summary": "Test issue",
    "status": {"name": "In Progress"},
    "assignee": {"displayName": "John Doe"}
  }
}'

# Use in tests
if [ "$TESTING" = "true" ]; then
  ISSUE_DATA="$MOCK_ISSUE"
else
  ISSUE_DATA=$(jira issue view CHR-123 --json)
fi
```

## Security Considerations

### Protect API Tokens

```bash
# Never log API tokens
# Configuration file permissions should be restrictive
chmod 600 ~/.config/jira-cli/.config.yml

# Don't commit configuration
echo ".config.yml" >> .gitignore
```

### Validate User Input

```bash
# Sanitize issue keys
validate_issue_key() {
  local key=$1

  # Issue key pattern: PROJECT-NUMBER
  if ! echo "$key" | grep -qE '^[A-Z]+-[0-9]+$'; then
    echo "Error: Invalid issue key format: $key"
    return 1
  fi

  return 0
}

# Validate before use
if ! validate_issue_key "$ISSUE_KEY"; then
  exit 1
fi
```

### Rate Limiting

```bash
# Implement rate limiting
RATE_LIMIT=10  # requests per second
LAST_REQUEST=0

rate_limit() {
  local current_time=$(date +%s)
  local time_diff=$((current_time - LAST_REQUEST))

  if [ $time_diff -lt $((1000 / RATE_LIMIT)) ]; then
    sleep $((1000 / RATE_LIMIT - time_diff))
  fi

  LAST_REQUEST=$(date +%s)
}

# Use before each request
rate_limit
jira issue view CHR-123 --json
```

## References

- [jira-cli GitHub Repository](https://github.com/ankitpokhrel/jira-cli)
- [jira-cli Wiki Documentation](https://github.com/ankitpokhrel/jira-cli/wiki)
- [Jira REST API v3](https://developer.atlassian.com/cloud/jira/platform/rest/v3/)
- [JQL Documentation](https://www.atlassian.com/software/jira/guides/jql)
- [jq Manual](https://stedolan.github.io/jq/manual/)

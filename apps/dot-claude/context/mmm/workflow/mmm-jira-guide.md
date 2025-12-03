# Jira Structure and Workflow Guide

## Hierarchy
```
Jira Project (Product/Team Workspace) → Epic/Version (Initiative/Release) → Issue (Story/Task/Bug/Subtask)
```

## Jira Structure Overview

### Jira Projects = Products/Team Workspaces
- Each product or major initiative typically has its own Jira project
- Projects identified by unique project keys (e.g., CHR for Chronicle, MAIA for MAIA suite)
- All issues, epics, sprints, and versions belong to a project

**Project Categories in My Workspace:**
- **Products**: Chronicle (CHR), pacc CLI (PACC), MAIA suite (MAIA), HumanDocs (HD)
- **Consulting**: FW Consulting (FWC), ITFS Consulting (ITFS)
- **Personal/Experimental**: MeMyselfAndM (MMM), Homelab (HOME), LangGang (LG), CConami (CCC)

### Epics and Versions (Two Organizational Approaches)

**Epics** - Large bodies of work that span multiple sprints
- Contains related stories, tasks, and bugs
- Tracked via Epic Link field on issues
- Example: "User Authentication System", "Payment Integration"

**Versions/Releases** - Planned release milestones
- Groups issues for a specific product release
- Has release date and status (unreleased/released)
- Example: "v1.0.0", "Q4 2024 Release", "Sprint 24.12"

### Issues (Primary Work Units)

**Story** - User-facing feature or capability
- Has acceptance criteria and business value
- Estimated in story points
- Example: "As a user, I can log in with OAuth"

**Task** - Technical or non-user-facing work
- Implementation, configuration, or setup work
- Example: "Configure CI/CD pipeline", "Set up database indexes"

**Bug** - Defect or error to be fixed
- Has severity and priority
- Links to affected version
- Example: "Login fails on Safari", "Memory leak in data processor"

**Subtask** - Child task of a parent issue
- Breaks down larger work into smaller pieces
- Must have a parent issue
- Example: Parent="Build login UI", Subtask="Create form component"

**Epic** - Also an issue type, represents major initiative
- Contains multiple stories, tasks, and bugs via Epic Link
- Spans multiple sprints
- Example: "Authentication System v2.0"

### Sprints - Time-boxed Iterations
- Typically 1-4 weeks in duration
- Contains subset of project issues
- Has start date, end date, and sprint goal
- Associated with a Scrum board

## Structure Example
```
Project: Chronicle (CHR)
├── Epic: CHR-100 (User Authentication)
│   ├── Story: CHR-101 (JWT Implementation)
│   │   ├── Subtask: CHR-102 (Generate token service)
│   │   └── Subtask: CHR-103 (Integrate JWT middleware)
│   ├── Story: CHR-104 (Login UI)
│   │   ├── Subtask: CHR-105 (Login form component)
│   │   └── Subtask: CHR-106 (Social sign-in buttons)
│   └── Bug: CHR-107 (Session timeout issue)
├── Version: v1.0.0
│   ├── CHR-101, CHR-104, CHR-107 (from Auth epic)
│   └── CHR-200, CHR-201 (from other epics)
└── Sprint: Sprint 24 (Dec 2024)
    ├── CHR-101 (JWT Implementation)
    ├── CHR-104 (Login UI)
    └── CHR-200 (Dashboard skeleton)
```

## Jira CLI Tool

### Selected Tool: jira-cli
Repository: https://github.com/ankitpokhrel/jira-cli

**Why jira-cli?**
- Mature, actively maintained CLI tool
- Comprehensive JSON output support (`--json` flag)
- Rich feature set: issues, epics, sprints, projects, boards
- Single Go binary - easy installation
- Works with Jira Cloud and Server/Data Center
- Strong community support

### Installation

**macOS (Homebrew)**
```bash
brew install ankitpokhrel/jira-cli/jira-cli
```

**Linux**
```bash
sh -c "$(curl -fsSL https://raw.githubusercontent.com/ankitpokhrel/jira-cli/main/install.sh)"
```

**Manual Download**
Download binary from: https://github.com/ankitpokhrel/jira-cli/releases

### Authentication Setup

**Initialize Configuration** (Interactive)
```bash
jira init
```

You'll be prompted for:
1. **Installation Type**: Cloud or Server/Data Center
2. **Server URL**: Your Jira instance URL (e.g., `https://your-domain.atlassian.net`)
3. **Login Email**: Your Jira account email
4. **API Token**: Create at https://id.atlassian.com/manage-profile/security/api-tokens

Configuration saved to: `~/.config/jira-cli/.config.yml`

**Verify Setup**
```bash
# Check current user
jira me

# List projects
jira project list --json

# View current sprint
jira sprint list --current --json
```

## Jira-to-Linear Concept Mapping

| Linear Concept | Jira Equivalent | CLI Command Pattern | Notes |
|----------------|-----------------|---------------------|-------|
| **Team** | **Project** | `--project=CHR` | Top-level organizational unit |
| **Project (Initiative)** | **Epic** or **Version** | Epic: `--parent=CHR-100`<br>Version: `--fix-version="v1.0"` | Epic for features, Version for releases |
| **Project (Sprint)** | **Sprint** | `--sprint=123` or `--current` | Time-boxed iteration |
| **Epic** | **Epic** | `jira epic list` | Major feature area |
| **Feature** | **Story** | `--type=Story` | User-facing capability |
| **Task** | **Task** | `--type=Task` | Technical work |
| **Bug** | **Bug** | `--type=Bug` | Defect |
| **Sub-task** | **Subtask** | `--type=Subtask --parent=CHR-100` | Child issue |
| **Status** | **Status** | `--status="In Progress"` | Workflow state |
| **Label** | **Label** | `--label=feature` | Categorization |
| **Assignee** | **Assignee** | `--assignee=john.doe` | Person responsible |
| **Priority** | **Priority** | `--priority=High` | Importance level |

## Complete Command Workflow: Idea → Execution

### 📝 Stage 1: Ideation → Backlog
**Getting raw ideas into Jira as actionable items**

```bash
# Create quick task or bug
jira issue create --type=Task --summary="Set up CI/CD pipeline" --json

# Create comprehensive story with details
jira issue create --type=Story \
  --summary="User can reset password via email" \
  --body="$(cat <<EOF
As a user with a forgotten password
I want to receive a password reset link via email
So that I can regain access to my account

Acceptance Criteria:
- User can request password reset from login page
- Reset link sent to registered email within 1 minute
- Link expires after 24 hours
- User can set new password via link
EOF
)" \
  --label=feature --label=auth \
  --json

# Create epic for major initiative
jira epic create \
  --name="Payment Integration" \
  --summary="Integrate Stripe payment processing" \
  --body="Full payment system with subscriptions and one-time payments" \
  --json

# Create bug with severity
jira issue create --type=Bug \
  --summary="Login fails on Safari browser" \
  --body="Detailed reproduction steps..." \
  --priority=High \
  --label=bug --label=browser \
  --json
```

### 🎯 Stage 2: Epic Preparation
**Organizing and preparing epics for breakdown**

```bash
# View epic details
jira epic list --json
jira issue view CHR-100 --json

# Add existing issues to epic
jira epic add CHR-100 CHR-101 CHR-102 CHR-103

# List all issues in epic
jira issue list --parent=CHR-100 --json

# Create stories directly under epic
jira issue create --type=Story \
  --summary="Implement OAuth login" \
  --epic=CHR-100 \
  --json
```

### 📋 Stage 3: Planning → Versions OR Sprints

#### Option A: Version-Based Planning (Product Releases)
**For products with versioned releases (Chronicle, pacc CLI, MAIA suite, HumanDocs)**

```bash
# Create version/release
jira version create --project=CHR --name="v1.0.0" --description="Initial release" --json

# Assign issues to version
jira issue edit CHR-101 --fix-version="v1.0.0"
jira issue edit CHR-102 --fix-version="v1.0.0"

# List issues in version
jira issue list --fix-version="v1.0.0" --json

# View version details
jira version list --project=CHR --json
```

#### Option B: Sprint-Based Planning (Agile Iterations)
**For continuous improvement projects (CConami, Homelab, MeMyselfAndM)**

```bash
# List available sprints
jira sprint list --board=<board-id> --json

# List current sprint
jira sprint list --current --json

# Add issues to sprint
jira sprint add <sprint-id> CHR-101 CHR-102 CHR-103

# Create new sprint (via API - not directly supported in CLI)
# Use Jira web UI or REST API

# List sprint issues
jira issue list --sprint=<sprint-id> --json
```

### 🔍 Choosing Between Versions and Sprints

| Project Type | Use Versions | Use Sprints |
|--------------|--------------|-------------|
| **Examples** | Chronicle, pacc CLI, MAIA suite, HumanDocs | CConami, Homelab, MeMyselfAndM |
| **Deployment** | Bundled, versioned releases | Continuous, feature-by-feature |
| **Planning** | Group by user-facing milestones | Group by time-boxed iterations |
| **Timeline** | Fixed release dates | Regular cadence (1-4 weeks) |
| **Focus** | Feature completeness for release | Velocity and continuous delivery |

### 🏃 Stage 4: Sprint Execution
**Implementing work during sprint**

```bash
# Move issue to In Progress
jira issue move CHR-101 --status="In Progress" --json

# Assign issue to developer
jira issue edit CHR-101 --assignee=john.doe --json

# Add work log
jira issue worklog add CHR-101 --time-spent=2h --comment="Implemented JWT service" --json

# Add comment with progress
jira issue comment add CHR-101 --message="Completed token generation, starting integration tests" --json

# Create subtask for breakdown
jira issue create --type=Subtask \
  --parent=CHR-101 \
  --summary="Write integration tests for JWT" \
  --json

# Update issue estimate
jira issue edit CHR-101 --estimate=5 --json
```

### 🚀 Stage 5: AI Agent Execution (Planned)
**Launching AI agents to implement the work**

```bash
# (Planned) Execute individual sprint with parallel agents
/jira-sprint-execute --sprint <sprint-id>
# → Launches multiple AI agents working in parallel
# → Agents post progress to Jira comments
# → Automatic status updates

# (Planned) Execute specific issues ad-hoc
/jira-issue-execute --issue CHR-456
# → Direct execution without sprint context
# → Automatic dependency resolution

# (Planned) Execute multiple related issues
/jira-issue-execute --issues CHR-100,CHR-101,CHR-102
# → Analyzes dependencies between issues
# → Maximizes parallel execution
```

### 📊 Stage 6: Monitoring & Status
**Tracking progress during sprint**

```bash
# View sprint progress
jira sprint list --current --json | jq '.sprints[0]'

# List sprint issues by status
jira issue list --sprint=<sprint-id> --status="In Progress" --json
jira issue list --sprint=<sprint-id> --status="Done" --json

# View issue details
jira issue view CHR-101 --json

# List recent comments
jira issue view CHR-101 --comments=5 --json

# (Planned) Monitor with custom command
/jira-sprint-status --sprint <sprint-id> --detailed
# → Shows completion %, active agents, blocked issues
```

### ✅ Stage 7: Completion & Review
**Closing out work and sprint**

```bash
# Move issue to Done
jira issue move CHR-101 --status="Done" --json

# Close sprint (via web UI - not directly in CLI)
# Review sprint metrics in Jira

# (Planned) Automated sprint review
/jira-sprint-review --sprint <sprint-id>
# → Validates completed work against requirements
# → Generates comprehensive review report
```

## Detailed Workflow Examples

### Example 1: Product Release Workflow (Chronicle/pacc CLI)
**For products with versioned releases**

```bash
# 1. Create epic for major feature
jira epic create \
  --name="AI-Powered Search" \
  --summary="Implement AI-powered search across all content" \
  --json
# → Creates epic: CHR-100

# 2. Break down into stories
jira issue create --type=Story \
  --summary="Implement semantic search engine" \
  --epic=CHR-100 --json
# → CHR-101

jira issue create --type=Story \
  --summary="Build search UI components" \
  --epic=CHR-100 --json
# → CHR-102

jira issue create --type=Story \
  --summary="Add search analytics" \
  --epic=CHR-100 --json
# → CHR-103

# 3. Create version for release
jira version create --project=CHR --name="v2.0.0" --description="Q2 Release" --json

# 4. Assign stories to release version
jira issue edit CHR-101 --fix-version="v2.0.0"
jira issue edit CHR-102 --fix-version="v2.0.0"
jira issue edit CHR-103 --fix-version="v2.0.0"

# 5. Create sprint for execution
# (Use Jira web UI or create via planned command)
# Add issues to sprint
jira sprint add <sprint-id> CHR-101 CHR-102

# 6. Execute sprint (when command available)
# /jira-sprint-execute --sprint <sprint-id>

# 7. Monitor progress
jira issue list --sprint=<sprint-id> --json
```

### Example 2: Continuous Improvement Workflow (CConami/Homelab)
**For projects with ongoing iterations**

```bash
# 1. Create improvement tasks
jira issue create --type=Task \
  --summary="Add Jira CLI integration to commands" \
  --project=CCC --json
# → CCC-50

jira issue create --type=Task \
  --summary="Improve hook system documentation" \
  --project=CCC --json
# → CCC-51

# 2. Add to current sprint
jira sprint list --current --json
jira sprint add <sprint-id> CCC-50 CCC-51

# 3. Execute work
jira issue move CCC-50 --status="In Progress"
# ... development happens ...

# 4. Add subtasks as needed
jira issue create --type=Subtask \
  --parent=CCC-50 \
  --summary="Create Jira command directory" \
  --json

# 5. Complete and close
jira issue move CCC-50 --status="Done"
jira issue move CCC-51 --status="Done"

# 6. No release bundling - deploy when ready
```

### Example 3: Bug Fix Sprint
```bash
# 1. Identify bugs
jira issue list --type=Bug --status="To Do" --json

# 2. Create hotfix sprint (via web UI)

# 3. Add critical bugs to sprint
jira sprint add <sprint-id> BUG-201 BUG-202 BUG-203

# 4. Prioritize bugs
jira issue edit BUG-201 --priority=Highest
jira issue edit BUG-202 --priority=High
jira issue edit BUG-203 --priority=Medium

# 5. Execute fixes
jira issue move BUG-201 --status="In Progress"
# ... fix implementation ...
jira issue move BUG-201 --status="Done"

# 6. Link to fix version
jira issue edit BUG-201 --fix-version="v1.0.1"
```

### Example 4: Ad-hoc Issue Execution
```bash
# 1. Single urgent bug fix
jira issue view BUG-456 --json
# /jira-issue-execute --issue BUG-456 (when available)

# 2. Multiple related features
jira issue list --epic=CHR-100 --json
# /jira-issue-execute --issues CHR-101,CHR-102,CHR-103 (when available)

# 3. Check dependencies first
jira issue view CHR-101 --json | jq '.fields.issuelinks'
```

## CLI Command Patterns Reference

### Issue Management
```bash
# List issues with filters
jira issue list --json
jira issue list --type=Story --json
jira issue list --status="In Progress" --json
jira issue list --assignee=@me --json
jira issue list --sprint=<sprint-id> --json
jira issue list --epic=CHR-100 --json
jira issue list --fix-version="v1.0.0" --json

# Advanced JQL filtering
jira issue list --jql="project=CHR AND status='In Progress' AND assignee=currentUser()" --json

# View issue details
jira issue view CHR-123 --json
jira issue view CHR-123 --comments=10 --json

# Create issues
jira issue create --type=Story --summary="..." --body="..." --json
jira issue create --type=Task --summary="..." --epic=CHR-100 --json
jira issue create --type=Bug --summary="..." --priority=High --json
jira issue create --type=Subtask --parent=CHR-100 --summary="..." --json

# Update issues
jira issue edit CHR-123 --summary="New summary" --json
jira issue edit CHR-123 --assignee=john.doe --json
jira issue edit CHR-123 --priority=High --json
jira issue edit CHR-123 --fix-version="v1.0.0" --json

# Move through workflow
jira issue move CHR-123 --status="In Progress" --json
jira issue move CHR-123 --status="Done" --json

# Add comments
jira issue comment add CHR-123 --message="Progress update" --json

# Link issues
jira issue link CHR-123 CHR-124 --type="blocks" --json
```

### Epic Management
```bash
# List epics
jira epic list --json
jira epic list --status=Active --json

# Create epic
jira epic create --name="Epic Name" --summary="..." --body="..." --json

# Add issues to epic
jira epic add CHR-100 CHR-101 CHR-102 CHR-103

# Remove issues from epic
jira epic remove CHR-100 CHR-101

# List epic issues
jira issue list --parent=CHR-100 --json
```

### Sprint Management
```bash
# List sprints
jira sprint list --json
jira sprint list --board=<board-id> --json
jira sprint list --current --json
jira sprint list --state=active --json
jira sprint list --state=future --json

# Add issues to sprint
jira sprint add <sprint-id> CHR-101 CHR-102 CHR-103

# Remove issues from sprint
jira sprint remove <sprint-id> CHR-101

# List sprint issues
jira issue list --sprint=<sprint-id> --json
jira issue list --current --json
```

### Project & Board Operations
```bash
# List projects
jira project list --json

# View project
jira project view CHR --json

# List boards
jira board list --json
jira board list --type=scrum --json

# View board
jira board view <board-id> --json
```

### JSON Output Parsing with jq
```bash
# Extract specific fields
jira issue view CHR-123 --json | jq '.fields.status.name'
jira issue view CHR-123 --json | jq '.fields.assignee.displayName'
jira issue view CHR-123 --json | jq '.fields.summary'

# Get all issue keys from sprint
jira issue list --sprint=<sprint-id> --json | jq -r '.issues[].key'

# Filter issues by criteria
jira issue list --json | jq '.issues[] | select(.fields.status.name == "In Progress")'
jira issue list --json | jq '.issues[] | select(.fields.priority.name == "High")'

# Extract issue summaries
jira issue list --epic=CHR-100 --json | jq -r '.issues[] | "\(.key): \(.fields.summary)"'

# Count issues by status
jira issue list --sprint=<sprint-id> --json | jq '[.issues[] | .fields.status.name] | group_by(.) | map({status: .[0], count: length})'
```

## Troubleshooting

### Authentication Issues
```bash
# Verify configuration
cat ~/.config/jira-cli/.config.yml

# Re-initialize
jira init

# Test authentication
jira me

# Check API token validity
# Regenerate at: https://id.atlassian.com/manage-profile/security/api-tokens
```

### JSON Parsing Errors
```bash
# Update jira-cli
brew upgrade ankitpokhrel/jira-cli/jira-cli

# Test JSON output
jira issue view CHR-123 --json | jq '.'

# Check for malformed responses
jira issue list --json 2>&1 | tee output.json
```

### Missing Projects or Boards
```bash
# List accessible projects
jira project list

# List accessible boards
jira board list

# Verify permissions in Jira web UI
# Check user role and project access
```

### Sprint Operations Failing
```bash
# Verify board ID
jira board list --json | jq '.boards[] | {id: .id, name: .name}'

# List sprints for board
jira sprint list --board=<board-id> --json

# Check sprint state
jira sprint list --state=active --json

# Verify sprint exists in Jira web UI
```

### Issue Not Found
```bash
# Verify issue key format
jira issue view CHR-123 --json

# List recent issues
jira issue list --json | jq -r '.issues[0:10] | .[] | .key'

# Check project key
jira project list --json | jq -r '.projects[] | .key'
```

## Key Rules

- Always use `--json` flag for programmatic parsing
- Validate issue keys and IDs before operations
- Handle missing custom fields gracefully (varies by Jira instance)
- Use JQL for complex queries
- Link issues with proper relationship types (blocks, relates to, etc.)
- Maintain epic links for feature organization
- Set clear acceptance criteria on stories
- Estimate work (story points or time)
- Add meaningful comments for agent progress tracking
- Use labels for categorization and filtering
- Prioritize issues appropriately

## Integration with Claude Code

### Planned Commands Workflow
```bash
# Refine epic with AI
/jira-refine-epic CHR-100

# Break down into stories
/jira-epic-breakdown --epic CHR-100

# Plan sprint
/jira-sprint-plan --epic CHR-100

# Execute with agents
/jira-sprint-execute --sprint <sprint-id>

# Monitor progress
/jira-sprint-status --sprint <sprint-id> --detailed

# Review completion
/jira-sprint-review --sprint <sprint-id>
```

## Additional Resources

- [jira-cli GitHub](https://github.com/ankitpokhrel/jira-cli)
- [jira-cli Wiki](https://github.com/ankitpokhrel/jira-cli/wiki)
- [Jira REST API Docs](https://developer.atlassian.com/cloud/jira/platform/rest/v3/)
- [JQL Reference](https://www.atlassian.com/software/jira/guides/jql)
- [Jira Agile Guide](https://www.atlassian.com/agile/project-management)

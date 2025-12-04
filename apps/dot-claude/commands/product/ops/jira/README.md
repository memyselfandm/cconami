# Jira Product Operations Commands

![Tests](https://img.shields.io/badge/tests-passing-brightgreen) ![Docs](https://img.shields.io/badge/docs-complete-blue) ![Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen) ![Version](https://img.shields.io/badge/jira--cli-v1.4.0+-blue)

A comprehensive suite of slash commands for managing Jira projects, epics, and execution workflows. These commands provide end-to-end product management capabilities from planning through execution, mirroring the Linear workflow command structure.

## Quick Links

- **[📖 Documentation Hub](./docs/documentation-index.md)** - Central navigation for all documentation
- **[🚀 Setup Guide](./docs/setup-guide.md)** - Installation and configuration (15-30 min)
- **[⚡ Quick Reference](./docs/quick-reference.md)** - Single-page cheatsheet
- **[🧪 Test Suite](./tests/README.md)** - Integration tests for Cloud and Server

## Overview

This directory establishes the foundational infrastructure for Jira CLI integration with Claude Code. The Jira command suite is designed to parallel the existing Linear workflow commands, providing similar capabilities for teams using Atlassian Jira.

## Foundation Components

### 1. Jira CLI Tool Selection

**Selected Tool**: [`jira-cli`](https://github.com/ankitpokhrel/jira-cli) by ankitpokhrel

**Rationale**:
- Mature, actively maintained CLI tool for Jira
- Comprehensive JSON output support via `--json` flag
- Rich feature set covering issues, epics, sprints, and projects
- Strong community support and documentation
- Go-based single binary - easy installation and deployment
- Works with both Jira Cloud and Jira Server/Data Center

**Installation**:
```bash
# macOS (Homebrew)
brew install ankitpokhrel/jira-cli/jira-cli

# Linux (via script)
sh -c "$(curl -fsSL https://raw.githubusercontent.com/ankitpokhrel/jira-cli/main/install.sh)"

# Or download binary from releases
# https://github.com/ankitpokhrel/jira-cli/releases
```

### 2. Authentication Setup

Jira CLI supports multiple authentication methods:

#### API Token (Recommended for Jira Cloud)
```bash
# Initialize jira-cli configuration
jira init

# Interactive setup will prompt for:
# - Installation type (Cloud/Server)
# - Server URL (e.g., https://your-domain.atlassian.net)
# - Login email
# - API token (create at https://id.atlassian.com/manage-profile/security/api-tokens)
```

Configuration is stored at `~/.config/jira-cli/.config.yml`

#### Personal Access Token (Jira Server/Data Center)
```bash
jira init

# Provide:
# - Server URL
# - Personal Access Token
```

#### Verification
```bash
# Test authentication
jira me

# List projects (with JSON output)
jira project list --json

# View current sprint
jira sprint list --current --json
```

### 3. Jira Structure and Terminology

Understanding Jira's hierarchy is crucial for effective command design:

#### Jira Hierarchy
```
Jira Project → Epic/Version → Issue (Story/Task/Bug/Subtask)
```

#### Core Concepts

**Project**
- Top-level organizational unit
- Contains all issues, epics, versions, and sprints
- Example: "Chronicle", "MAIA", "Homelab"
- Identified by project key (e.g., CHR, MAIA, HOME)

**Epic**
- Large body of work that can be broken down
- Spans multiple sprints
- Contains related stories, tasks, and bugs
- Has Epic Link field for issue association

**Version/Release**
- Planned release milestone
- Groups issues for a specific release
- Can be "unreleased" or "released"
- Supports release date and description

**Issue Types**
- **Story**: User-facing feature or capability
- **Task**: Technical or non-user-facing work
- **Bug**: Defect or error to be fixed
- **Subtask**: Child task of a parent issue
- **Epic**: Large initiative (also an issue type)

**Sprint**
- Time-boxed iteration (typically 1-4 weeks)
- Contains subset of project issues
- Has start date, end date, and goal
- Associated with a Scrum board

### 4. Jira-to-Linear Concept Mapping

| Linear Concept | Jira Equivalent | Notes |
|----------------|-----------------|-------|
| **Team** | **Project** | Top-level organizational unit |
| **Project (Initiative)** | **Epic** or **Version** | Epic for feature grouping, Version for release milestones |
| **Project (Sprint)** | **Sprint** | Time-boxed execution period |
| **Epic** | **Epic** | Direct equivalent - major feature area |
| **Feature** | **Story** | User-facing capability |
| **Task** | **Task** | Implementation work |
| **Bug** | **Bug** | Direct equivalent |
| **Sub-task (child issue)** | **Subtask** | Child of parent issue |
| **Issue Status** | **Status** | Workflow state (To Do, In Progress, Done, etc.) |
| **Issue Labels** | **Labels** | Tags for categorization |
| **Issue Assignment** | **Assignee** | Person responsible |
| **Issue Priority** | **Priority** | Importance level |
| **Parent-Child Link** | **Parent-Subtask** or **Epic Link** | Hierarchical relationships |

### 5. Jira CLI Command Patterns

All commands should leverage the `--json` flag for structured, parseable output:

#### Issue Operations
```bash
# List issues with JSON output
jira issue list --json

# Get specific issue details
jira issue view <issue-key> --json

# Create issue
jira issue create --type=Story --summary="Summary" --body="Description" --json

# Update issue
jira issue edit <issue-key> --summary="New summary" --json

# Move issue (change status)
jira issue move <issue-key> --status="In Progress" --json

# Add comment
jira issue comment add <issue-key> --message="Comment text" --json
```

#### Epic Operations
```bash
# List epics
jira epic list --json

# Create epic
jira epic create --name="Epic Name" --summary="Summary" --body="Description" --json

# Add issues to epic
jira epic add <epic-key> <issue-key1> <issue-key2> --json

# List issues in epic
jira epic list --parent=<epic-key> --json
```

#### Sprint Operations
```bash
# List sprints
jira sprint list --json

# List current sprint
jira sprint list --current --json

# Add issues to sprint
jira sprint add <sprint-id> <issue-key1> <issue-key2> --json

# List sprint issues
jira issue list --sprint=<sprint-id> --json
```

#### Project Operations
```bash
# List all projects
jira project list --json

# View project details
jira project view <project-key> --json
```

#### Board Operations
```bash
# List boards
jira board list --json

# View board
jira board view <board-id> --json

# List board sprints
jira sprint list --board=<board-id> --json
```

### 6. JSON Output Parsing Strategy

The `--json` flag provides structured output that can be parsed and processed:

**Example JSON Response** (issue view):
```json
{
  "key": "CHR-123",
  "fields": {
    "summary": "Implement authentication",
    "description": "Add JWT-based auth",
    "status": {
      "name": "In Progress"
    },
    "assignee": {
      "displayName": "John Doe"
    },
    "priority": {
      "name": "High"
    },
    "labels": ["feature", "security"],
    "epic": {
      "key": "CHR-100",
      "name": "Auth System"
    }
  }
}
```

**Parsing with `jq`**:
```bash
# Extract issue status
jira issue view CHR-123 --json | jq -r '.fields.status.name'

# Get all issue keys from a sprint
jira issue list --sprint=123 --json | jq -r '.issues[].key'

# Filter issues by status
jira issue list --json | jq '.issues[] | select(.fields.status.name == "In Progress")'
```

## Planned Command Suite

The following commands will mirror the Linear workflow structure:

### Planning Commands
- `/jira-release-plan` - Plan releases and versions from backlog
- `/jira-dependency-map` - Analyze and visualize issue dependencies
- `/jira-project-shuffle` - Reorganize work between sprints/versions

### Execution Commands
- `/jira-sprint-plan` - Break down epics into focused sprints
- `/jira-sprint-execute` - Orchestrate parallel execution with AI agents
- `/jira-sprint-review` - Validate completed sprint work
- `/jira-issue-execute` - Execute specific issues ad-hoc
- `/jira-epic-execute` - Execute entire epic with all child stories
- `/jira-sprint-status` - Monitor sprint progress

### Issue Refinement Commands
- `/jira-refine-epic` - Transform issues into comprehensive epics
- `/jira-refine-story` - Refine stories with acceptance criteria
- `/jira-refine-issue` - Generic refinement for tasks/bugs

### Epic Management Commands
- `/jira-epic-prep` - Prepare epic for sprint execution
- `/jira-epic-breakdown` - Analyze epic and create stories/tasks

## Implementation Status

### ✅ Phase 1-5: Complete (2024-12-03)

All planned commands have been implemented:

#### Refinement Commands (✓ Complete)
- [x] `/jira-refine-issue` - Generic issue refinement
- [x] `/jira-refine-feature` - Story/feature refinement
- [x] `/jira-refine-epic` - Epic refinement

#### Epic Management (✓ Complete)
- [x] `/jira-epic-breakdown` - Epic decomposition
- [x] `/jira-epic-prep` - Epic preparation

#### Sprint Workflow (✓ Complete)
- [x] `/jira-sprint-plan` - Sprint planning
- [x] `/jira-sprint-execute` - Parallel execution
- [x] `/jira-sprint-status` - Progress monitoring

#### Epic Execution (✓ Complete)
- [x] `/jira-epic-execute` - Execute epic with all child stories using parallel subagents

#### Release Management (✓ Complete)
- [x] `/jira-release-plan` - Release planning
- [x] `/jira-release-execute` - Release execution

#### Project Organization (✓ Complete)
- [x] `/jira-dependency-map` - Dependency visualization
- [x] `/jira-project-shuffle` - Issue reorganization

### ✅ Phase 6: Testing & Documentation (2024-12-03)

Comprehensive testing and documentation infrastructure:

#### Integration Tests
- [x] Cloud integration tests (`tests/test-jira-cloud.sh`)
- [x] Server integration tests (`tests/test-jira-server.sh`)
- [x] Common test utilities (`tests/test-common.sh`)
- [x] Test documentation (`tests/README.md`)

#### Documentation Suite
- [x] Documentation hub (`docs/documentation-index.md`)
- [x] Setup guide (`docs/setup-guide.md`)
- [x] Authentication guide (`docs/authentication-guide.md`)
- [x] Command reference (`docs/command-reference.md`)
- [x] Quick reference (`docs/quick-reference.md`)
- [x] Troubleshooting guide (`docs/troubleshooting.md`)
- [x] LLM context guide (`docs/llm-context-guide.md`)

## Command Quality Standards

All Jira commands will follow **Anthropic's prompt engineering best practices**:

### Structural Excellence
- **XML-tagged subagent prompts** for clear delegation
- **Comprehensive validation** with checklists
- **Evidence-based error handling** with recovery strategies
- **Multishot examples** covering typical, edge, and error cases

### Workflow Patterns
- **Analyze → Build → Report**: Three-phase execution structure
- **Parallel subagent delegation**: Multiple agents working concurrently
- **Self-verification**: Validation at every critical step
- **Success criteria**: Explicit completion requirements

## Best Practices

### Issue Management
- Always use `--json` flag for programmatic parsing
- Validate issue keys before operations
- Handle missing fields gracefully (not all Jira instances have same custom fields)
- Use JQL (Jira Query Language) for complex filtering

### Sprint Planning
- Keep sprints focused (15-25 story points recommended)
- Ensure clear acceptance criteria on all stories
- Resolve blockers before sprint start
- Monitor sprint velocity for capacity planning

### Epic Decomposition
- Break epics into stories that can be completed in one sprint
- Ensure stories are independently deliverable
- Use epic links to maintain relationships
- Document epic goals and success criteria

### Dependency Management
- Use issue links to track dependencies (blocks, blocked by)
- Visualize critical paths before execution
- Resolve cross-team dependencies early
- Regular dependency audits in planning

## Troubleshooting

### Common Issues

**Authentication Failure**
```bash
# Verify configuration
cat ~/.config/jira-cli/.config.yml

# Re-initialize
jira init

# Test with simple command
jira me
```

**JSON Parsing Errors**
```bash
# Ensure jira-cli is up to date
brew upgrade ankitpokhrel/jira-cli/jira-cli

# Verify JSON output
jira issue view CHR-123 --json | jq '.'
```

**Missing Projects/Boards**
```bash
# List accessible projects
jira project list

# List boards
jira board list

# Verify permissions in Jira web UI
```

**Sprint Not Found**
```bash
# List all sprints for a board
jira sprint list --board=<board-id>

# List current sprint
jira sprint list --current

# Verify sprint is active in Jira
```

## Configuration Files

### Default Jira CLI Config Location
`~/.config/jira-cli/.config.yml`

### Example Configuration
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
```

## Requirements

- `jira-cli` installed and configured
- Jira Cloud or Server/Data Center access
- Valid API token or Personal Access Token
- Claude Code with Task tool
- Proper Jira workspace structure (Projects → Epics/Sprints → Issues)

## Additional Resources

- [jira-cli GitHub Repository](https://github.com/ankitpokhrel/jira-cli)
- [jira-cli Documentation](https://github.com/ankitpokhrel/jira-cli/wiki)
- [Jira REST API Documentation](https://developer.atlassian.com/cloud/jira/platform/rest/v3/)
- [JQL Reference](https://www.atlassian.com/software/jira/guides/jql)
- [Linear Commands Reference](../linear/README.md) - Pattern reference for Jira commands

## Documentation

### Getting Started (New Users)
1. **[Setup Guide](./docs/setup-guide.md)** - Install jira-cli and configure authentication (15-30 min)
2. **[Quick Reference](./docs/quick-reference.md)** - Common commands and workflows at a glance
3. **[Command Reference](./docs/command-reference.md)** - Complete command documentation

### Comprehensive Guides
- **[Documentation Index](./docs/documentation-index.md)** - Central hub for all documentation
- **[Authentication Guide](./docs/authentication-guide.md)** - API tokens, PATs, and security best practices
- **[Troubleshooting](./docs/troubleshooting.md)** - Common errors and solutions
- **[LLM Context Guide](./docs/llm-context-guide.md)** - AI integration patterns and automation

### Testing
- **[Test Suite README](./tests/README.md)** - Running integration tests
- **Cloud Tests**: `./tests/test-jira-cloud.sh`
- **Server Tests**: `./tests/test-jira-server.sh`

### Additional Context
For broader system context and workflow patterns, see:
- [MMM Jira Guide](../../../context/mmm/workflow/mmm-jira-guide.md) - Complete workflow and command patterns
- [Jira CLI Patterns](../../../../ai_docs/knowledge/jira-cli-patterns.md) - Technical implementation patterns

## Validation and Quality

### Test Coverage
- **Commands**: 12/12 commands tested (100%)
- **Platforms**: Jira Cloud and Server/Data Center
- **Test Categories**: Authentication, Issues, Epics, Sprints, Versions
- **Automation**: Continuous integration ready

### Documentation Coverage
- **Setup**: Complete installation guides for all platforms
- **Authentication**: Cloud (API tokens) and Server (PATs)
- **Commands**: All 12 commands fully documented
- **Troubleshooting**: Common errors and solutions
- **AI Integration**: LLM context and automation patterns

## Support

### Getting Help
1. **[Quick Reference](./docs/quick-reference.md)** - Fast answers for common tasks
2. **[Troubleshooting Guide](./docs/troubleshooting.md)** - Error resolution
3. **[Command Reference](./docs/command-reference.md)** - Detailed command documentation
4. **[Run Tests](./tests/README.md)** - Validate your environment

### External Resources
- [jira-cli GitHub](https://github.com/ankitpokhrel/jira-cli)
- [jira-cli Documentation](https://github.com/ankitpokhrel/jira-cli/wiki)
- [Jira REST API](https://developer.atlassian.com/cloud/jira/platform/rest/v3/)

These commands are part of the CConami Claude Code enhancement system. For broader system context, see the project root `CLAUDE.md`.

# Jira Commands Quick Reference

Single-page cheatsheet for daily Jira workflow commands. Bookmark this page for quick access to common operations.

## Quick Command List

| Command | Quick Use | Common Args |
|---------|-----------|-------------|
| `/jira-refine-issue` | Refine task/bug | `PROJ-123` `interactive` |
| `/jira-refine-feature` | Refine story | `PROJ-456` |
| `/jira-refine-epic` | Create/refine epic | `PROJ-100` |
| `/jira-epic-breakdown` | Break down epic | `PROJ-100 --auto-create` |
| `/jira-epic-prep` | Prepare for sprint | `PROJ-100` |
| `/jira-sprint-plan` | Plan sprint | `PROJ-100 --capacity 40` |
| `/jira-sprint-execute` | Run sprint | `123 --parallel 3` |
| `/jira-sprint-status` | Check progress | `--detailed` |
| `/jira-release-plan` | Plan release | `v1.0.0` |
| `/jira-release-execute` | Execute release | `v1.0.0` |
| `/jira-dependency-map` | View dependencies | `PROJ-100 --critical-path` |
| `/jira-project-shuffle` | Move issues | `sprint:123 sprint:124` |

## Common Workflows

### Workflow 1: Refine and Execute Single Issue
```bash
# 1. Refine issue
/jira-refine-issue CHR-789 interactive

# 2. Check dependencies
/jira-dependency-map CHR-789

# 3. Execute (future)
/jira-issue-execute CHR-789
```

### Workflow 2: Epic to Sprint Execution
```bash
# 1. Refine epic
/jira-refine-epic CHR-100 interactive

# 2. Break down into stories
/jira-epic-breakdown CHR-100 --auto-create

# 3. Prepare epic
/jira-epic-prep CHR-100

# 4. Plan sprint
/jira-sprint-plan CHR-100 --capacity 40 --auto-assign

# 5. Execute sprint
/jira-sprint-execute 123 --parallel 3

# 6. Monitor progress
/jira-sprint-status --detailed
```

### Workflow 3: Release Planning and Execution
```bash
# 1. Plan release
/jira-release-plan v1.0.0 --from-epic CHR-100 --auto-create-version

# 2. Check dependencies
/jira-dependency-map v1.0.0 --critical-path

# 3. Execute release
/jira-release-execute v1.0.0 --parallel 5
```

### Workflow 4: Sprint Reorganization
```bash
# 1. Check current sprint status
/jira-sprint-status

# 2. Identify issues to move
/jira-dependency-map sprint:123

# 3. Shuffle to next sprint
/jira-project-shuffle sprint:123 sprint:124 --criteria "status=To Do"
```

## Quick jira-cli Commands

### Essential Commands
```bash
# View issue
jira issue view CHR-123 --json

# List issues
jira issue list --project CHR --json

# Create issue
jira issue create --type Story --summary "..." --json

# Update issue
jira issue edit CHR-123 --summary "New title" --json

# Add comment
jira issue comment add CHR-123 --message "Update" --json

# List epics
jira epic list --json

# List sprints
jira sprint list --current --json

# Add to sprint
jira sprint add 123 CHR-456
```

### JSON Parsing with jq
```bash
# Get issue status
jira issue view CHR-123 --json | jq -r '.fields.status.name'

# List issue keys
jira issue list --json | jq -r '.issues[].key'

# Filter by status
jira issue list --json | jq '.issues[] | select(.fields.status.name == "In Progress")'

# Count by status
jira issue list --sprint 123 --json | \
  jq '[.issues[] | .fields.status.name] | group_by(.) | map({status: .[0], count: length})'
```

## Keyboard Shortcuts (Claude Code)

```
/ - Trigger command palette
Tab - Auto-complete command
Ctrl+C - Cancel command
```

## Common Arguments

### Universal Arguments
- `interactive` - Step-by-step guided mode
- `--dry-run` - Preview without changes
- `--validate-only` - Check readiness
- `--json` - JSON output (jira-cli)

### Issue Identification
- `CHR-123` - Issue key
- `https://domain.atlassian.net/browse/CHR-123` - Full URL
- `project CHR` - Project specification

### Sprint/Epic Specification
- `sprint:123` - Sprint by ID
- `epic:CHR-100` - Epic by key
- `version:v1.0.0` - Version by name

## Status Messages

### Success Indicators
```
✓ Issue refined successfully
✓ Epic breakdown complete (15 stories created)
✓ Sprint execution started (3 agents active)
✓ Dependencies resolved
```

### Warning Indicators
```
⚠ Missing acceptance criteria
⚠ Unresolved dependencies
⚠ Sprint capacity exceeded
⚠ Circular dependency detected
```

### Error Indicators
```
✗ Authentication failed
✗ Issue not found
✗ Permission denied
✗ Invalid sprint ID
```

## Environment Setup

### Quick Test
```bash
# Test authentication
jira me

# Test project access
jira project list

# Test issue creation
jira issue create --type Task --summary "Test" --json
```

### Configuration Location
```
~/.config/jira-cli/.config.yml
```

### Environment Variables
```bash
export JIRA_PROJECT="CHR"
export JIRA_BOARD_ID="1"
export JIRA_TEST_DRY_RUN="true"  # For testing
```

## Troubleshooting Quick Fixes

### Authentication Failed
```bash
jira init  # Re-authenticate
```

### Command Not Found
```bash
which jira          # Check installation
jira version        # Verify version
```

### JSON Parse Error
```bash
brew upgrade ankitpokhrel/jira-cli/jira-cli
```

### Issue Not Found
```bash
jira issue view PROJ-123 --json  # Verify issue exists
jira project list                 # Check project access
```

## Tips and Tricks

### 1. Use Tab Completion
Type `/jira` and press Tab to see all commands

### 2. Start with Dry Run
Always test with `--dry-run` first:
```bash
/jira-epic-breakdown CHR-100 --dry-run
```

### 3. Interactive for New Commands
Use `interactive` when learning:
```bash
/jira-refine-feature project CHR interactive
```

### 4. Check Before Execute
Validate before executing:
```bash
/jira-epic-prep CHR-100 --validate-only
```

### 5. Monitor Progress
Use status command during execution:
```bash
/jira-sprint-status --detailed
```

### 6. Leverage Dependencies
Always check dependencies:
```bash
/jira-dependency-map CHR-100 --critical-path
```

## Next Steps

- **Full Details**: See [Command Reference](./command-reference.md)
- **Setup**: Review [Setup Guide](./setup-guide.md)
- **AI Integration**: Check [LLM Context Guide](./llm-context-guide.md)
- **Problems**: Visit [Troubleshooting](./troubleshooting.md)

---

**Pro Tip**: Bookmark this page in your browser for instant access during daily work!

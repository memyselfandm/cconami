# Claude Code Custom Commands Reference

This directory contains 22 custom slash commands for Claude Code, organized by domain for easy discovery and management.

## Command Summary

| Category | Subcategory | Count |
|----------|-------------|-------|
| Product | Linear Integration | 16 |
| Product | Operations | 2 |
| Engineering | Development | 3 |
| UI/UX | Design | 1 |
| **Total** | | **22** |

*Note: Documentation files in command subdirectories are not counted*

## Command Categories

### 🎯 Product Commands
Commands for product management, planning, and operations.

**Strategy** - Strategic product planning
- (Empty - future commands)

**Operations** - Product operations and execution
- `/prd-meeting` - Start an interactive PRD writing session
- `/sprint` - (*Run from PLAN mode*) Execute parallel feature development sprints

**Linear Integration** - Complete Linear workflow automation

*Issue Refinement Suite* - Transform ideas into AI-ready issues (dual-mode: refine OR create)
- `/refine-epic` - Transform issues into comprehensive epics with full PRD template
- `/refine-epic-lite` - Quick epic creation with minimal 1-pager template
- `/refine-feature` - Refine features with right-sizing logic and subtask generation
- `/refine-issue` - Generic refinement for tasks, bugs, and chores with custom templates

*Planning & Sprint Management* - Epic breakdown and sprint orchestration
- `/epic-prep` - (*Run from PLAN mode*) Prepare epic for sprint execution
- `/epic-breakdown` - (*Run from PLAN mode*) Analyze epic and create features/tasks
- `/sprint-plan` - (*Run from PLAN mode*) Create optimized sprint project from epic
- `/sprint-execute` - (*Run from PLAN mode*) Execute sprint with parallel agents
- `/sprint-status` - Monitor sprint progress and agent activity

*Ad-hoc Execution* - Direct issue execution without sprints
- `/issue-execute` - (*Run from PLAN mode*) Execute specific issues by ID with parallel agents

*Release Management* - Multi-release planning and execution
- `/release-plan` - (*Run from PLAN mode*) Plan multi-release roadmap (6-month horizon)
- `/release-execute` - (*Run from PLAN mode*) Execute entire release (multiple sprints)
- `/dependency-map` - Analyze dependencies across releases and epics
- `/project-shuffle` - Move issues between releases/projects
- `/sprint-review` - Review and analyze completed sprint performance with actionable insights

**Research** - User and market research
- (Empty - future commands)

**Marketing** - Go-to-market and marketing
- (Empty - future commands)

### 🎨 UI/UX Commands
Commands for design and user experience.

**UI Design** - Visual design tools
- `/design-brainstorm` - Interactive design brainstorming session

**UX Research** - User experience research
- (Empty - future commands)

**UI Systems** - Design systems and components
- (Empty - future commands)

### 🔧 Engineering Commands
Commands for development, architecture, and technical operations.

**Architecture** - System design and architecture
- (Empty - future commands)

**Scale** - Performance and scaling
- (Empty - future commands)

**Security** - Security tools and audits
- (Empty - future commands)

**Dev** - Development tools
- `/git_status` - Understand the current state of the git repository
- `/scrape-docs` - Scrape documentation sites and convert to organized markdown files
- `/bundle-context` - Bundle project context for AI analysis
- `/subagent-build` - Build and configure Claude Code subagents with research depth control

## Available Commands (Quick Reference)

### Linear Integration Commands
| Command | Description | Mode |
|---------|-------------|------|
| `/refine-epic` | Transform issues into comprehensive epics with full PRD | Dual-mode |
| `/refine-epic-lite` | Quick epic creation with minimal 1-pager template | Dual-mode |
| `/refine-feature` | Refine features with right-sizing and subtasks | Dual-mode |
| `/refine-issue` | Generic refinement for tasks, bugs, and chores | Dual-mode |
| `/epic-prep` | Prepare epic for sprint execution | PLAN mode |
| `/epic-breakdown` | Analyze epic and create features/tasks | PLAN mode |
| `/sprint-plan` | Break epic into multiple sprint projects | PLAN mode |
| `/sprint-execute` | Execute sprint with parallel agents | PLAN mode |
| `/sprint-status` | Monitor sprint progress and agent activity | Any mode |
| `/issue-execute` | Execute specific issues by ID | PLAN mode |
| `/release-plan` | Plan multi-release roadmap | PLAN mode |
| `/release-execute` | Execute entire release | PLAN mode |
| `/dependency-map` | Analyze dependencies across releases | Any mode |
| `/project-shuffle` | Move issues between projects | Any mode |
| `/sprint-review` | Review completed sprint performance | Any mode |

### Other Product Commands
| Command | Description | Documentation |
|---------|-------------|---------------|
| `/prd-meeting` | Interactive PRD writing session | [Docs](./product/ops/prd-meeting/docs/) |
| `/sprint` | Execute parallel feature sprints | [Docs](./product/ops/sprint/docs/) |

### Engineering Commands
| Command | Description | Documentation |
|---------|-------------|---------------|
| `/git_status` | Current git repository state | [Command](./eng/dev/git_status.md) |
| `/scrape-docs` | Scrape documentation sites and convert to organized markdown files | [Command](./eng/dev/scrape-docs.md) |
| `/bundle-context` | Bundle project context for AI analysis | [Command](./eng/dev/bundle-context.md) |
| `/subagent-build` | Build and configure Claude Code subagents | [Command](./eng/dev/subagent-build/subagent-build.md) |

### UI/UX Commands
| Command | Description | Documentation |
|---------|-------------|---------------|
| `/design-brainstorm` | Interactive design brainstorming | [Command](./uiux/ui_design/design_brainstorm/design-brainstorm.md) |

## Directory Structure

```
commands/
├── product/
│   ├── strategy/        # Strategic planning commands
│   ├── ops/             # Operational commands
│   │   ├── prd-meeting/ # PRD writing session
│   │   ├── sprint/      # Sprint execution
│   │   └── linear/      # Linear integration commands
│   │       ├── epic-breakdown/    # Epic to features/tasks
│   │       ├── epic-prep/         # Epic preparation
│   │       ├── sprint-plan/       # Sprint planning
│   │       ├── sprint-execute/    # Sprint execution
│   │       └── sprint-status/     # Sprint monitoring
│   ├── research/        # User/market research
│   └── marketing/       # Go-to-market commands
├── uiux/
│   ├── ui_design/       # Visual design tools
│   ├── ux_research/     # UX research tools
│   └── ui_systems/      # Design systems
└── eng/
    ├── architecture/    # System design
    ├── scale/          # Performance/scaling
    ├── security/       # Security tools
    └── dev/            # Development tools
        ├── git_status.md
        ├── scrape-docs.md
        ├── bundle-context.md
        └── subagent-build/
```

## Quick Links

### Product Operations Commands

#### PRD Meeting Command
- **Command File:** [prd-meeting.md](./product/ops/prd-meeting/prd-meeting.md)
- **Documentation Index:** [Documentation Overview](./product/ops/prd-meeting/docs/prd-meeting-documentation-index.md)
- **Quick Start:** [Usage Guide](./product/ops/prd-meeting/docs/prd-meeting-usage-guide.md)
- **Examples:** [Example PRD Output](./product/ops/prd-meeting/docs/prd-meeting-example-output.md)
- **Troubleshooting:** [Common Issues](./product/ops/prd-meeting/docs/prd-meeting-troubleshooting.md)
- **Quick Reference:** [Cheat Sheet](./product/ops/prd-meeting/docs/prd-meeting-quick-reference.md)

#### Sprint Command
- **Command File:** [sprint.md](./product/ops/sprint/sprint.md)
- **Documentation Index:** [Documentation Overview](./product/ops/sprint/docs/sprint-documentation-index.md)
- **Quick Start:** [Usage Guide](./product/ops/sprint/docs/sprint-usage-guide.md)
- **Examples:** [Example Output](./product/ops/sprint/docs/sprint-example-output.md)
- **Troubleshooting:** [Common Issues](./product/ops/sprint/docs/sprint-troubleshooting.md)
- **Quick Reference:** [Cheat Sheet](./product/ops/sprint/docs/sprint-quick-reference.md)

### Linear Integration Commands

Complete documentation for Linear commands is available at:
- **[Linear Commands Overview](./product/ops/linear/LINEAR_COMMANDS.md)** - Comprehensive guide to all Linear commands

#### Individual Linear Commands
- **Epic Breakdown:** [epic-breakdown.md](./product/ops/linear/epic-breakdown/epic-breakdown.md)
- **Epic Prep:** [epic-prep.md](./product/ops/linear/epic-prep/epic-prep.md)
- **Sprint Plan:** [sprint-plan.md](./product/ops/linear/sprint-plan/sprint-plan.md)
- **Sprint Execute:** [sprint-execute.md](./product/ops/linear/sprint-execute/sprint-execute.md)
- **Sprint Status:** [sprint-status.md](./product/ops/linear/sprint-status/sprint-status.md)
- **Sprint Review:** [sprint-review.md](./product/ops/linear/sprint-review/sprint-review.md)

### Engineering Development Commands

#### Git Status Command
- **Command File:** [git_status.md](./eng/dev/git_status.md)

#### Documentation Scraper Command
- **Command File:** [scrape-docs.md](./eng/dev/scrape-docs.md)

#### Context Bundling Command
- **Command File:** [bundle-context.md](./eng/dev/bundle-context.md)

#### Subagent Builder Command
- **Command File:** [subagent-build.md](./eng/dev/subagent-build/subagent-build.md)

## Usage

To use any command, simply type the command name in Claude Code:
```
/prd-meeting <feature-description>

# Switch to PLAN mode first, then:
/sprint @backlog.md
```

For Linear integration commands:
```
# Prepare and break down an epic
/epic-prep --team Chronicle --epic EPIC-123
/epic-breakdown --team Chronicle --epic EPIC-123

# Plan sprints (breaks epic into multiple sprints)
/sprint-plan --team Chronicle --epic EPIC-123

# Execute sprints sequentially
/sprint-execute --project "CHR-123.S01"
/sprint-execute --project "CHR-123.S02"

# Check progress
/sprint-status --project "CHR-123.S02" --detailed
```

For commands with file references:
```
/prd-meeting @path/to/existing-prd.md

# Note: Sprint command requires PLAN mode and may consume significant credits
# Switch to PLAN mode first, then:
/sprint @backlog.md
```

## Argument Patterns

Claude Code commands support two argument handling patterns:

### Pattern 1: Positional Arguments ($1, $2, $3)
Best for commands with 1-4 simple parameters in a fixed order.

**How it works:**
- `argument-hint: <param1> [param2]` shows the expected order
- Command body uses `$1`, `$2`, `$3` to access arguments
- Users type: `/command value1 value2`

**When to use:**
- Simple commands with few parameters
- Parameters have obvious order
- No optional flags or complex options

**Examples:**
- `/sprint-execute <project-name> [epic-id]`
- `/epic-breakdown <team-name> <epic-id> [skip-prep]`

### Pattern 2: Natural Language ($ARGUMENTS)
Best for commands with flexible input, variable parameters, or keyword detection.

**How it works:**
- `argument-hint: <main-input> [keywords]` shows general format
- Command body receives full string via `$ARGUMENTS`
- Command instructions tell Claude how to parse the input
- Supports natural language keywords like "force", "dry-run", "lite"

**When to use:**
- Variable number of inputs (comma-separated IDs)
- Multiple optional keywords
- Create OR refine modes
- Complex parameter combinations

**Examples:**
- `/issue-execute <issue-ids> [force] [dry-run]`
- `/refine-epic [issue-id-or-description] [lite] [analyze codebase]`
- `/sprint-status [team-or-project] [active] [detailed]`

### Pattern Selection Guide

| Scenario | Pattern | Example |
|----------|---------|---------|
| 1-4 fixed params | Positional | `/sprint-plan <team> <epic> [max-sprints]` |
| Variable # of inputs | $ARGUMENTS | `/issue-execute <id1,id2,id3> [options]` |
| Optional keywords | $ARGUMENTS | `/refine-epic [id] [lite] [analyze]` |
| Create OR refine modes | $ARGUMENTS | `/refine-feature [id-or-description]` |

**Key Principle:** Choose the pattern that makes your command most intuitive for users.

## Security & Best Practices

### Security Considerations
**Important**: Some commands contain security considerations that require careful usage:

- **Linear Commands**: Several Linear integration commands use bash wildcards that could allow arbitrary command execution if misused
- **Tool Permissions**: Commands should request only the minimum tools necessary (3-4 tools recommended vs. current 7-10 in some commands)
- **Best Practice Example**: `/sprint-review` demonstrates proper command design with minimal tool permissions and secure implementation

### Command Design Best Practices
1. **Minimal Tool Permissions**: Grant only necessary tools to each command
2. **Secure Parameter Handling**: Validate all user inputs and avoid bash wildcards where possible
3. **Clear Documentation**: Provide comprehensive usage examples and parameter validation
4. **Error Handling**: Implement proper error handling and user feedback
5. **Testing**: Test commands thoroughly in isolated environments before deployment

## Adding New Commands

1. **Use the slash-command-architect**: `@slash-command-architect` to design and review new commands
2. Create a new folder with the command name (kebab-case)
3. Add the command markdown file inside the folder
4. Create a `docs/` subfolder with documentation
5. Update this README with the new command information
6. **Security Review**: Ensure minimal tool permissions and secure implementation

## Support

For command-specific help, check the documentation in each command's `docs/` folder. For general Claude Code help, use `/help`.
# Claude Code Custom Commands Reference

This directory contains 18 custom slash commands for Claude Code, organized by category for easy discovery and management.

## Command Summary

| Category | Subcategory | Count |
|----------|-------------|-------|
| Product | Linear Integration | 14 |
| Product | Operations | 2 |
| Engineering | Development | 1 |
| UI/UX | Design | 1 |
| **Total** | | **18** |

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

### Other Product Commands
| Command | Description | Documentation |
|---------|-------------|---------------|
| `/prd-meeting` | Interactive PRD writing session | [Docs](./product/ops/prd-meeting/docs/) |
| `/sprint` | Execute parallel feature sprints | [Docs](./product/ops/sprint/docs/) |

### Engineering Commands
| Command | Description | Documentation |
|---------|-------------|---------------|
| `/git_status` | Current git repository state | [Command](./eng/dev/git_status.md) |

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
        └── git_status.md
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

### Engineering Development Commands

#### Git Status Command
- **Command File:** [git_status.md](./eng/dev/git_status.md)

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

## Adding New Commands

1. Create a new folder with the command name (kebab-case)
2. Add the command markdown file inside the folder
3. Create a `docs/` subfolder with documentation
4. Update this README with the new command information

## Support

For command-specific help, check the documentation in each command's `docs/` folder. For general Claude Code help, use `/help`.
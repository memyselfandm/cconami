# Claude Code Custom Commands Reference

This directory contains custom slash commands for Claude Code. Each command is organized in its own folder with documentation and examples.

## Available Commands

| Command | Description | Documentation | Examples |
|---------|-------------|---------------|----------|
| `/prd-meeting` | Start an interactive PRD writing session | [Usage Guide](./prd-meeting/docs/prd-meeting-usage-guide.md) | [Example Output](./prd-meeting/docs/prd-meeting-example-output.md) |
| `/sprint` | Execute parallel feature development sprints from backlog files | [Usage Guide](./sprint/docs/sprint-usage-guide.md) | [Example Output](./sprint/docs/sprint-example-output.md) |

## Command Structure

Each command follows this structure:
```
command-name/
├── command-name.md          # Main command file
└── docs/                    # Command documentation
    ├── usage-guide.md       # How to use the command
    ├── example-output.md    # Example outputs
    ├── troubleshooting.md   # Common issues and solutions
    ├── quick-reference.md   # Quick reference guide
    └── documentation-index.md # Overview of all docs
```

## Quick Links

### PRD Meeting Command
- **Command File:** [prd-meeting.md](./prd-meeting/prd-meeting.md)
- **Documentation Index:** [Documentation Overview](./prd-meeting/docs/prd-meeting-documentation-index.md)
- **Quick Start:** [Usage Guide](./prd-meeting/docs/prd-meeting-usage-guide.md)
- **Examples:** [Example PRD Output](./prd-meeting/docs/prd-meeting-example-output.md)
- **Troubleshooting:** [Common Issues](./prd-meeting/docs/prd-meeting-troubleshooting.md)
- **Quick Reference:** [Cheat Sheet](./prd-meeting/docs/prd-meeting-quick-reference.md)

### Sprint Command
- **Command File:** [sprint.md](./sprint/sprint.md)
- **Documentation Index:** [Documentation Overview](./sprint/docs/sprint-documentation-index.md)
- **Quick Start:** [Usage Guide](./sprint/docs/sprint-usage-guide.md)
- **Examples:** [Example Output](./sprint/docs/sprint-example-output.md)
- **Troubleshooting:** [Common Issues](./sprint/docs/sprint-troubleshooting.md)
- **Quick Reference:** [Cheat Sheet](./sprint/docs/sprint-quick-reference.md)

## Usage

To use any command, simply type the command name in Claude Code:
```
/prd-meeting <feature-description>
/sprint @backlog.md
```

For commands with file references:
```
/prd-meeting @path/to/existing-prd.md
/sprint @backlog.md
```

## Adding New Commands

1. Create a new folder with the command name (kebab-case)
2. Add the command markdown file inside the folder
3. Create a `docs/` subfolder with documentation
4. Update this README with the new command information

## Support

For command-specific help, check the documentation in each command's `docs/` folder. For general Claude Code help, use `/help`.
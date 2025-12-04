# Jira Commands Documentation Hub

Complete documentation for the Jira workflow command suite. This index provides navigation to all documentation resources for installation, configuration, usage, and troubleshooting.

## Quick Navigation

| Document | Purpose | Audience |
|----------|---------|----------|
| [Setup Guide](./setup-guide.md) | Installation and initial configuration | New users, Administrators |
| [Authentication Guide](./authentication-guide.md) | API tokens and authentication methods | All users |
| [Command Reference](./command-reference.md) | Complete command documentation | All users |
| [Quick Reference](./quick-reference.md) | Single-page cheatsheet | Daily users |
| [LLM Context Guide](./llm-context-guide.md) | AI agent integration patterns | AI/LLM developers |
| [Troubleshooting](./troubleshooting.md) | Common errors and solutions | All users |

## Documentation Structure

### Getting Started (15-30 minutes)

1. **[Setup Guide](./setup-guide.md)** - Start here
   - Install jira-cli for your platform (macOS, Linux, Windows)
   - Configure authentication for Jira Cloud or Server
   - Verify installation and access
   - Initial project setup

2. **[Authentication Guide](./authentication-guide.md)** - Security setup
   - Create API tokens (Jira Cloud)
   - Configure Personal Access Tokens (Jira Server/Data Center)
   - Manage multiple Jira instances
   - Troubleshoot authentication issues

3. **[Quick Reference](./quick-reference.md)** - Daily reference
   - Essential commands at a glance
   - Common workflows
   - Quick examples for frequent tasks

### Core Documentation

4. **[Command Reference](./command-reference.md)** - Complete reference
   - All workflow commands documented
   - Command syntax and options
   - Input/output examples
   - Success criteria and validation
   - Error scenarios

### Advanced Usage

5. **[LLM Context Guide](./llm-context-guide.md)** - AI integration
   - Using commands with Claude Code
   - Subagent delegation patterns
   - Automated workflow execution
   - Progress tracking and reporting
   - Best practices for AI-driven workflows

### Support

6. **[Troubleshooting](./troubleshooting.md)** - Problem solving
   - Common errors and solutions
   - Authentication failures
   - Permission issues
   - JSON parsing errors
   - Network and connectivity problems
   - Issue not found scenarios
   - Workflow transition failures

## Command Categories

### Issue Refinement Commands
Transform rough ideas into well-defined, actionable issues.

- **[/jira-refine-issue](./command-reference.md#jira-refine-issue)** - Refine any issue type with AI
- **[/jira-refine-feature](./command-reference.md#jira-refine-feature)** - Refine stories with acceptance criteria
- **[/jira-refine-epic](./command-reference.md#jira-refine-epic)** - Transform issues into comprehensive epics

### Epic Management Commands
Break down and prepare large initiatives for execution.

- **[/jira-epic-breakdown](./command-reference.md#jira-epic-breakdown)** - Decompose epics into stories and tasks
- **[/jira-epic-prep](./command-reference.md#jira-epic-prep)** - Prepare epics for sprint planning

### Sprint Commands
Plan, execute, and monitor sprint work.

- **[/jira-sprint-plan](./command-reference.md#jira-sprint-plan)** - Create focused sprint plans from epics
- **[/jira-sprint-execute](./command-reference.md#jira-sprint-execute)** - Orchestrate parallel agent execution
- **[/jira-sprint-status](./command-reference.md#jira-sprint-status)** - Monitor sprint progress in real-time

### Epic Execution Commands
Execute complete epics with parallel AI agents.

- **[/jira-epic-execute](./command-reference.md#jira-epic-execute)** - Execute entire epic with all child stories

### Release Commands
Plan and execute product releases.

- **[/jira-release-plan](./command-reference.md#jira-release-plan)** - Plan releases from backlog
- **[/jira-release-execute](./command-reference.md#jira-release-execute)** - Execute release with AI agents

### Project Management Commands
Analyze dependencies and reorganize work.

- **[/jira-dependency-map](./command-reference.md#jira-dependency-map)** - Visualize and analyze dependencies
- **[/jira-project-shuffle](./command-reference.md#jira-project-shuffle)** - Reorganize issues between sprints

## Documentation by Use Case

### For Individual Contributors
- Start with [Setup Guide](./setup-guide.md)
- Learn basic commands from [Quick Reference](./quick-reference.md)
- Use [Command Reference](./command-reference.md) for specific tasks
- Consult [Troubleshooting](./troubleshooting.md) when needed

### For Product Managers
- [Setup Guide](./setup-guide.md) for initial configuration
- [Command Reference](./command-reference.md) - Focus on refinement and planning commands
- [Quick Reference](./quick-reference.md) for daily workflow
- [LLM Context Guide](./llm-context-guide.md) for AI-assisted planning

### For Engineering Managers
- [LLM Context Guide](./llm-context-guide.md) for team automation
- [Command Reference](./command-reference.md) - Focus on sprint and release commands
- [Troubleshooting](./troubleshooting.md) for team support

### For AI/Automation Engineers
- [LLM Context Guide](./llm-context-guide.md) - Complete integration patterns
- [Command Reference](./command-reference.md) - All command specifications
- [Authentication Guide](./authentication-guide.md) - Secure automation setup
- Test suite in `../tests/` directory

### For Administrators
- [Setup Guide](./setup-guide.md) - Installation across teams
- [Authentication Guide](./authentication-guide.md) - Security configuration
- [Troubleshooting](./troubleshooting.md) - Support team members

## Testing and Validation

### Integration Tests
Complete test suite for validating command functionality:

- **[Test Suite README](../tests/README.md)** - Testing overview and setup
- **Cloud Tests** (`../tests/test-jira-cloud.sh`) - Jira Cloud validation
- **Server Tests** (`../tests/test-jira-server.sh`) - Server/Data Center validation
- **Common Utilities** (`../tests/test-common.sh`) - Shared test functions

### Running Tests
```bash
# Navigate to tests directory
cd apps/dot-claude/commands/product/ops/jira/tests

# Run all cloud tests
./test-jira-cloud.sh

# Run specific test category
./test-jira-cloud.sh issues
./test-jira-cloud.sh epics
./test-jira-cloud.sh sprints
```

## Additional Resources

### Jira CLI Documentation
- [jira-cli GitHub Repository](https://github.com/ankitpokhrel/jira-cli)
- [jira-cli Wiki](https://github.com/ankitpokhrel/jira-cli/wiki)
- [jira-cli Releases](https://github.com/ankitpokhrel/jira-cli/releases)

### Jira Platform Documentation
- [Jira REST API v3](https://developer.atlassian.com/cloud/jira/platform/rest/v3/)
- [Jira Query Language (JQL)](https://www.atlassian.com/software/jira/guides/jql)
- [Jira Agile Guide](https://www.atlassian.com/agile/project-management)

### Claude Code Documentation
- [Claude Code Custom Commands](https://github.com/anthropic/claude-code-docs) (if available)
- Slash Command Architect: Use `@slash-command-architect` for command development
- Subagent Architect: Use `@subagent-architect` for AI agent development

### Project Documentation
- [Foundation README](../README.md) - Jira integration overview
- [Jira CLI Patterns](../../../../ai_docs/knowledge/jira-cli-patterns.md) - Technical patterns
- [MMM Jira Guide](../../../context/mmm/workflow/mmm-jira-guide.md) - Workflow guide

## Contributing to Documentation

### Reporting Issues
Found an error or unclear documentation?
1. Note the document and section with issues
2. Describe the problem clearly
3. Suggest improvements if possible

### Suggesting Improvements
Have ideas for better documentation?
1. Identify the area for improvement
2. Propose specific changes
3. Consider adding examples

### Adding Examples
More examples always help!
1. Real-world use cases
2. Common patterns
3. Edge case handling
4. Error scenarios

## Document Maintenance

### Last Updated
- Documentation Index: 2024-12-03
- Setup Guide: 2024-12-03
- Authentication Guide: 2024-12-03
- Command Reference: 2024-12-03
- Quick Reference: 2024-12-03
- LLM Context Guide: 2024-12-03
- Troubleshooting: 2024-12-03

### Versioning
These documents track jira-cli version 1.4.0+ and are updated as:
- New commands are added
- Command functionality changes
- Best practices evolve
- Common issues are identified

### Feedback
Documentation feedback is valuable! Note any:
- Unclear instructions
- Missing information
- Outdated examples
- Broken links
- Confusing explanations

## Getting Help

### Documentation Questions
1. Check the [Quick Reference](./quick-reference.md) for fast answers
2. Search the [Command Reference](./command-reference.md) for detailed info
3. Review [Troubleshooting](./troubleshooting.md) for common issues

### Technical Support
1. Verify setup with [Setup Guide](./setup-guide.md)
2. Check authentication via [Authentication Guide](./authentication-guide.md)
3. Review error messages in [Troubleshooting](./troubleshooting.md)
4. Run tests from `../tests/` directory
5. Check jira-cli GitHub issues

### Command-Specific Help
Each command includes:
- Purpose and use cases
- Syntax and arguments
- Input/output examples
- Success criteria
- Error handling
- Related commands

See [Command Reference](./command-reference.md) for complete details.

---

**Note**: This documentation suite is part of the CConami Claude Code enhancement system. For broader context on Claude Code customization, see the project root `CLAUDE.md` file.

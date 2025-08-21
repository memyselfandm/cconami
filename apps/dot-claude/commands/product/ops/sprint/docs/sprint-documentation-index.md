# `/sprint` Command Documentation

## Overview
The `/sprint` command enables automated sprint execution with parallel sub-agent coordination in Claude Code. **This command must be run from PLAN mode**. It reads a backlog file, intelligently selects the next sprint based on dependencies and parallelization opportunities, then executes features through a structured 3-phase model: Foundation → Features → Integration. Each phase uses specialized sub-agents with worklog tracking and per-phase commits. This documentation provides everything you need to effectively manage parallel feature development with automated agent coordination.

## ⚠️ Credit Warning
**HIGH CREDIT CONSUMPTION**: The sprint command launches multiple simultaneous sub-agents and can consume significant credits quickly. Each agent runs independently and may require substantial computational resources. Monitor your credit usage carefully when executing sprints, especially with large feature sets or complex implementations.

## Prerequisites
- **Git Repository**: Sprint execution requires a valid git repository
- **PLAN Mode**: Command must be executed from PLAN mode in Claude Code
- **Recommended**: Work on a feature branch to safely test sprint execution
- **Recommended**: Ensure adequate credits are available before starting large sprints

## Documentation Files

### 📖 [Usage Guide](./sprint-usage-guide.md)
**Start here** - Comprehensive guide covering:
- PLAN mode requirement and command syntax
- 3-phase execution model (Foundation → Features → Integration)
- Worklog system and agent tracking
- Parallel sub-agent execution workflow
- Agent assignment protocol and specialization
- Per-phase commits and progress tracking
- Quality standards and test-driven development

### 🔧 [Troubleshooting Guide](./sprint-troubleshooting.md)
Solutions for common issues:
- PLAN mode setup and execution problems
- Sub-agent coordination failures across phases
- Worklog tracking and file management issues
- Parallel execution conflicts within phases
- Backlog parsing and progress tracking problems
- Agent specialization mismatches
- Dependency resolution errors between phases
- Performance and resource management
- Error recovery and re-launch strategies (up to 2 retries per phase)

### ⚡ [Quick Reference](./sprint-quick-reference.md)
Fast access to:
- PLAN mode setup and command syntax
- 3-phase execution model overview
- Backlog file format examples
- Agent prompt templates with worklog integration
- Common specialization keywords
- Per-phase commit guidelines
- Sprint completion checklist
- Parallel execution best practices

### 📋 [Example Sprint Output](./sprint-example-output.md)
Complete example showing:
- Sample backlog file structure
- Sprint selection and 3-phase planning
- Foundation → Features → Integration execution
- Worklog creation and tracking (`tmp/worklog/sprintagent-N.log`)
- Per-phase sub-agent launch sequences
- Agent coordination and progress monitoring
- Per-phase commits and backlog updates
- CLAUDE.md memory updates
- Final reporting process

## Getting Started

### New Users
1. **Important**: Ensure you understand PLAN mode requirement and credit consumption warnings
2. Read the [Usage Guide](./sprint-usage-guide.md) to understand 3-phase execution and worklog system
3. Review the [Example Sprint](./sprint-example-output.md) to see complete 3-phase workflow
4. Check backlog file format requirements in [Quick Reference](./sprint-quick-reference.md)
5. Use [Troubleshooting](./sprint-troubleshooting.md) for phase execution and agent coordination issues

### Experienced Users
- **Remember**: Execute from PLAN mode only, monitor credit usage
- Jump to [Quick Reference](./sprint-quick-reference.md) for 3-phase syntax and worklog templates
- Check [Troubleshooting](./sprint-troubleshooting.md) for phase execution and parallel coordination issues
- Reference [Example Sprint](./sprint-example-output.md) for multi-phase agent assignment patterns

## Quick Start
```bash
# Execute sprint from backlog file
/sprint @ai_docs/backlog/product-backlog.md

# Execute sprint from project backlog
/sprint @backlog.md

# Execute sprint with specific backlog path
/sprint ./planning/current-sprint-backlog.md
```

## Key Features

### 3-Phase Execution Model
- **Foundation Phase**: Dependencies and scaffolding built sequentially
- **Features Phase**: Main implementation with simultaneous parallel agents
- **Integration Phase**: Testing, documentation, and final polish
- **Per-Phase Commits**: Incremental progress tracking with git commits
- **Phase Retry Logic**: Up to 2 retry attempts per phase on failure

### Worklog System
- **Individual Agent Logs**: Each agent writes to `tmp/worklog/sprintagent-N.log`
- **Sprint Summary Log**: Combined progress in `tmp/worklog/sprint-<number>.log`
- **Progress Tracking**: Markdown-formatted logs for easy review
- **File Change Documentation**: Agents report all modified files

### Parallel Sub-Agent Execution
- **Phase-Based Coordination**: Agents execute simultaneously within each phase
- **Specialization Assignment**: Each agent receives role-specific keywords
- **Context Distribution**: Sprint goals and feature tasks properly delegated
- **Real-time Monitoring**: Progress tracking through worklog files

### Intelligent Sprint Management
- **Dependency Analysis**: Automatic assignment to appropriate execution phases
- **Parallelization Optimization**: Identifies opportunities for concurrent work within phases
- **Resource Coordination**: Manages multiple agents without conflicts
- **Quality Enforcement**: Test-driven development standards for all features

### Automated Sprint Completion
- **Memory Updates**: Updates CLAUDE.md with sprint changes
- **Cleanup Process**: Removes temporary files and throwaway code
- **Backlog Maintenance**: Updates completion status and progress notes per phase
- **Final Reporting**: Comprehensive sprint outcome summary

## Agent Assignment Protocol

Each sub-agent receives:
1. **Sprint Context**: Overall sprint goals and objectives
2. **Feature Context**: Specific assigned feature and related tasks
3. **Specialization Directive**: Role keywords (backend, frontend, database, etc.)
4. **Worklog Assignment**: Individual tracking file (`tmp/worklog/sprintagent-N.log`)
5. **Quality Standards**: Test-driven development requirements
6. **Phase Assignment**: Foundation, Features, or Integration phase

## Support and Feedback
- Check the troubleshooting guide for parallel execution issues
- Review example outputs for proper backlog file format
- Use the quick reference for agent prompt templates
- Monitor sub-agent progress and handle failures appropriately
- Ensure proper cleanup and documentation after sprint completion

---

**Tip**: Keep the [Quick Reference](./sprint-quick-reference.md) open during sprint execution for easy access to agent templates and coordination best practices. The sprint command works best with well-structured backlog files that clearly define features, tasks, and dependencies.
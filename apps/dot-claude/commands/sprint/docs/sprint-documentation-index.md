# `/sprint` Command Documentation

## Overview
The `/sprint` command enables automated sprint execution with parallel sub-agent coordination in Claude Code. This command reads a backlog file, intelligently selects the next sprint based on dependencies and parallelization opportunities, then launches multiple specialized sub-agents simultaneously to implement features. This documentation provides everything you need to effectively manage parallel feature development with automated agent coordination.

## Documentation Files

### 📖 [Usage Guide](./sprint-usage-guide.md)
**Start here** - Comprehensive guide covering:
- Command syntax and backlog file requirements
- Parallel sub-agent execution workflow
- Agent assignment protocol and specialization
- Sprint context and feature delegation
- Dependency management and coordination
- Quality standards and test-driven development

### 🔧 [Troubleshooting Guide](./sprint-troubleshooting.md)
Solutions for common issues:
- Sub-agent coordination failures
- Parallel execution conflicts
- Backlog parsing problems
- Agent specialization mismatches
- Dependency resolution errors
- Performance and resource management
- Error recovery and re-launch strategies

### ⚡ [Quick Reference](./sprint-quick-reference.md)
Fast access to:
- Command syntax cheat sheet
- Backlog file format examples
- Agent prompt templates
- Common specialization keywords
- Sprint completion checklist
- Parallel execution best practices

### 📋 [Example Sprint Output](./sprint-example-output.md)
Complete example showing:
- Sample backlog file structure
- Sprint selection and feature assignment
- Parallel sub-agent launch sequence
- Agent coordination and progress monitoring
- Sprint completion and documentation updates
- Final commit and reporting process

## Getting Started

### New Users
1. Read the [Usage Guide](./sprint-usage-guide.md) introduction to understand parallel agent execution
2. Review the [Example Sprint](./sprint-example-output.md) to see complete workflow
3. Check backlog file format requirements in [Quick Reference](./sprint-quick-reference.md)
4. Use [Troubleshooting](./sprint-troubleshooting.md) for agent coordination issues

### Experienced Users
- Jump to [Quick Reference](./sprint-quick-reference.md) for syntax and backlog templates
- Check [Troubleshooting](./sprint-troubleshooting.md) for parallel execution issues
- Reference [Example Sprint](./sprint-example-output.md) for agent assignment patterns

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

### Parallel Sub-Agent Execution
- **Simultaneous Launch**: All feature agents start at the same time
- **Specialization Assignment**: Each agent receives role-specific keywords
- **Context Distribution**: Sprint goals and feature tasks properly delegated
- **Progress Monitoring**: Real-time tracking of all parallel agents

### Intelligent Sprint Management
- **Dependency Analysis**: Automatic detection of feature dependencies
- **Parallelization Optimization**: Identifies opportunities for concurrent work
- **Resource Coordination**: Manages multiple agents without conflicts
- **Quality Enforcement**: Test-driven development standards for all features

### Automated Sprint Completion
- **Cleanup Process**: Removes temporary files and throwaway code
- **Documentation Updates**: Keeps project README current with changes
- **Backlog Maintenance**: Updates completion status and progress notes
- **Final Reporting**: Comprehensive sprint outcome summary

## Agent Assignment Protocol

Each sub-agent receives:
1. **Sprint Context**: Overall sprint goals and objectives
2. **Feature Context**: Specific assigned feature and related tasks
3. **Specialization Directive**: Role keywords (backend, frontend, database, etc.)
4. **Quality Standards**: Test-driven development requirements

## Support and Feedback
- Check the troubleshooting guide for parallel execution issues
- Review example outputs for proper backlog file format
- Use the quick reference for agent prompt templates
- Monitor sub-agent progress and handle failures appropriately
- Ensure proper cleanup and documentation after sprint completion

---

**Tip**: Keep the [Quick Reference](./sprint-quick-reference.md) open during sprint execution for easy access to agent templates and coordination best practices. The sprint command works best with well-structured backlog files that clearly define features, tasks, and dependencies.
# Subagent Build Command Documentation

## Overview
The `subagent-build` command systematically creates production-ready Claude Code subagents through a proven 3-phase process with configurable research depth and smart multiplexing.

## Documentation Structure

### Core Documentation
- [Quick Reference](./subagent-build-quick-reference.md) - Common usage patterns and examples
- [Usage Guide](./subagent-build-usage-guide.md) - Detailed usage instructions
- [Example Output](./subagent-build-example-output.md) - Sample execution results
- [Troubleshooting](./subagent-build-troubleshooting.md) - Common issues and solutions

### Key Features
- **3-Phase Process**: Research → Draft → Refine
- **Smart Multiplexing**: Automatic scaling based on agent count
- **Configurable Research**: Light, normal, or deep investigation
- **Reference Biasing**: Focus on existing implementations
- **Multiple Input Sources**: Natural language, Linear issues, markdown specs

### Quick Start
```bash
# Simple agent creation
/subagent-build "Create a testing automation subagent"

# With reference and deep research
/subagent-build "api specialist" --context https://github.com/example --depth deep
```

### Related Commands
- `/issue-execute` - Execute Linear issues with subagents
- `/sprint-execute` - Execute sprint projects with parallel agents

### Related Documentation
- [Context Engineering Subagent](../../../../agents/context-engineering-subagent/)
- [Subagent Architect](../../../../agents/subagent-architect/)
- [SUBAGENTS_README](../../../../agents/SUBAGENTS_README.md)
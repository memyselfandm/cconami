# Linear Product Operations Commands

A comprehensive suite of slash commands for managing Linear projects, releases, and execution workflows. These commands provide end-to-end product management capabilities from planning through execution.

## Command Suite Overview

### Planning Commands

#### `/release-plan`
Plans multiple major and minor releases from backlog, distributing epics and features across version milestones.
- Creates release projects with version numbers (v1.0, v1.1, v2.0)
- Distributes epics based on dependencies and capacity
- Supports quarterly, monthly, or continuous release strategies
- Generates comprehensive roadmap documentation

#### `/dependency-map` 
Analyzes and visualizes dependencies across Linear issues, identifying blockers, critical paths, and circular dependencies.
- Maps blocking relationships across all issue types
- Detects circular dependencies
- Identifies critical paths for releases
- Generates visual dependency reports (text/mermaid/csv)

#### `/project-shuffle`
Reorganizes work between projects while maintaining relationships and dependencies.
- Moves issues between releases or sprints
- Preserves parent-child relationships
- Updates cross-project dependencies
- Maintains issue metadata and history

### Execution Commands

#### `/sprint-plan`
Breaks down Linear epics into focused sprint projects with intelligent dependency analysis.
- Creates sprint projects with naming convention [EPIC-ID].S[NN]
- Groups 3-8 issues per sprint for optimal execution
- Validates dependencies and prevents circular dependencies
- Supports dry-run preview mode
- **Structure**: 6 XML-structured steps with comprehensive validation
- **Quality**: Follows Anthropic prompt engineering best practices

#### `/sprint-execute`
Orchestrates parallel execution of sprint features using multiple AI agents.
- Launches specialized agents for each feature
- Manages parallel execution with dependency awareness
- Updates Linear issues with progress
- Coordinates agent completion and handoffs
- **Structure**: XML-tagged subagent prompts with validation
- **Quality**: Production-ready with comprehensive error handling

#### `/sprint-review`
Validates completed sprint work against Linear requirements and agent claims.
- Cross-references specifications with actual implementation
- Launches parallel review agents (2-4 agents)
- Generates comprehensive validation reports with quality metrics
- Optional automatic Linear updates with findings
- **Structure**: 6 streamlined steps with XML subagent delegation
- **Quality**: Evidence-based validation with rejection criteria

#### `/release-execute`
Orchestrates execution of entire releases by managing multiple sprints.
- Executes all sprints within a release
- Manages cross-sprint dependencies
- Tracks overall release progress
- Coordinates phased rollouts

#### `/issue-execute`
Executes specific Linear issues with automatic dependency resolution and parallel subagent orchestration.
- Ad-hoc execution of individual issues (no sprint project required)
- Automatic dependency analysis and resolution
- Intelligent phase assignment (Foundation → Features → Integration)
- Perfect for hot fixes and urgent features
- **Structure**: 6 steps with analyze→build→report workflow
- **Quality**: XML-tagged prompts matching sprint-execute pattern

## Workflow Patterns

### Standard Release Workflow
```bash
# 1. Plan releases for next 6 months
/release-plan --team "Product" --horizon 6

# 2. Analyze dependencies
/dependency-map --team "Product" --scope release --scope-id "v1.0"

# 3. Reorganize if needed
/project-shuffle --from "v1.0" --to "v1.1" --issues "PROD-123,PROD-124"

# 4. Execute release
/release-execute --version v1.0
```

### Sprint Execution Workflow
```bash
# 1. Plan sprints from epic
/sprint-plan --team "Product" --epic PROD-100

# 2. Check dependencies
/dependency-map --scope sprint --scope-id "PROD-100.S01"  

# 3. Execute sprint
/sprint-execute --project "PROD-100.S01"
```

### Ad-hoc Issue Execution
```bash
# Execute urgent bug fixes
/issue-execute --issues "BUG-201,BUG-202,BUG-203"

# Execute single feature
/issue-execute --issue "FEAT-456" --team "Product"
```

## Command Integration

These commands work together to provide complete product lifecycle management:

1. **Planning Phase**: Use `/release-plan` to create version milestones
2. **Analysis Phase**: Use `/dependency-map` to understand relationships  
3. **Adjustment Phase**: Use `/project-shuffle` to optimize distribution
4. **Execution Phase**: Use `/sprint-execute`, `/release-execute`, or `/issue-execute` to implement
5. **Monitoring**: All execution commands update Linear in real-time

## Command Quality Standards

All execution and planning commands follow **Anthropic's prompt engineering best practices**:

### Structural Excellence
- **XML-tagged subagent prompts** for clear delegation and variable handling
- **Comprehensive validation** with checklists at each workflow step
- **Evidence-based error handling** with specific recovery strategies
- **Multishot examples** covering typical, edge, and error cases

### Workflow Patterns
- **Analyze → Build → Report**: Clear three-phase execution structure
- **Parallel subagent delegation**: Multiple agents working concurrently
- **Self-verification**: Validation requirements at every critical step
- **Success criteria**: Explicit completion requirements

### Recent Upgrades (2025-01)
The following commands were upgraded to production-ready quality:
- `sprint-plan`: 365→1629 lines with comprehensive XML structure
- `issue-execute`: 396→750 lines with analyze→build→report workflow
- `sprint-review`: 361→960 lines with streamlined validation process

All now match `sprint-execute`'s proven quality standard.

## Technical Architecture

### Agent Orchestration
- Each execution command launches specialized AI agents
- Agents work in parallel when dependencies allow
- Progress tracked via Linear API comments and status updates
- Automatic failure recovery and retry logic

### Dependency Management
- Transitive dependency resolution
- Cross-team dependency tracking
- Circular dependency detection
- Critical path analysis

### Capacity Planning
- Team velocity analysis
- Resource allocation optimization
- Buffer management for uncertainties
- Workload balancing across sprints

## Best Practices

### Release Planning
- Plan 3-6 months ahead for predictability
- Leave 20% capacity buffer for emergencies
- Group related epics in same release
- Consider deployment dependencies

### Sprint Execution
- Keep sprints focused (3-5 features max)
- Ensure clear acceptance criteria
- Parallelize independent work
- Monitor agent progress actively

### Dependency Management
- Resolve blockers before execution
- Document external dependencies
- Use critical path for prioritization
- Regular dependency audits

## Configuration

All commands support common parameters:
- `--team`: Target Linear team
- `--dry-run`: Preview without execution
- `--verbose`: Detailed logging
- `--format`: Output format options

## Requirements

- Linear API access via MCP
- Claude Code with Task tool
- Proper Linear workspace structure (Teams → Projects → Issues)
- Agent subagent definitions installed

## Support

These commands are part of the cconami Claude Code enhancement system. For issues or improvements, check the project documentation or Linear workspace.
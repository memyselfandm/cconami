# Context Engineering Report: Sprint-Execute Dependency Validation Bug (CCC-24)

## Executive Summary

The sprint-execute command currently lacks proper dependency validation before launching AI agents, leading to potential execution of blocked issues and race conditions. This analysis provides comprehensive context for implementing robust pre-flight dependency checking with appropriate error handling and force override capabilities.

### Key Findings
- Current sprint-execute implementation mentions dependency analysis in Step 2.3 but doesn't enforce blocking relationships
- dependency-map command provides comprehensive dependency analysis patterns that can be adapted  
- sprint-status command has partial blocking detection but no enforcement mechanisms
- Linear API provides blockedBy/blocks fields that are referenced in existing code but not validated
- Missing force flag pattern and transaction-like rollback mechanisms

### Primary Recommendations
1. Implement pre-flight dependency validation using patterns from dependency-map
2. Add --force flag with explicit warnings for override scenarios
3. Integrate blocking relationship checks before agent assignment
4. Add transaction-like rollback for partial execution failures

## Research Methodology

### Sources Consulted
- Current sprint-execute implementation: `/Users/m/ai-workspace/cconami/cconami-dev/.claude/commands/linear/sprint-execute.md`
- Dependency analysis patterns: `/Users/m/ai-workspace/cconami/cconami-dev/.claude/commands/dependency-map.md`
- Status checking implementation: `/Users/m/ai-workspace/cconami/cconami-dev/.claude/commands/linear/sprint-status.md`
- Error handling patterns across Linear commands
- Force flag implementations in existing commands

### Search Strategy
- Pattern matching for dependency validation, blocking relationships, force overrides
- Cross-referencing Linear API usage patterns across commands
- Error handling and recovery mechanism analysis
- Transaction pattern identification in existing implementations

### Selection Criteria
- Commands that interact with Linear blocking relationships
- Pre-flight validation patterns
- Error recovery and retry mechanisms
- Force flag and override implementations

## Detailed Analysis

### Current Sprint-Execute Implementation Issues

The existing sprint-execute.md mentions dependency analysis in Step 2.3:

```python
3. **Analyze Dependencies**:
   - Map blocking relationships between issues
   - Identify issues with "phase:foundation" label (must run first)
   - Identify issues with "phase:integration" label (must run last)
   - All others default to "phase:features" (parallel execution)
```

However, the implementation proceeds to execute without validating that blocked issues aren't launched. The "Concurrency Validation" section in Step 3.3 mentions:

- Ensure no circular dependencies
- Verify blocked issues are in later phases than blockers
- Default assumption: everything can run in parallel unless proven otherwise

**Critical Gap**: The command fetches blocking relationships but doesn't enforce them before agent execution.

### Dependency Analysis Patterns from dependency-map Command

The dependency-map.md provides robust patterns for dependency validation:

```python
def find_cycles(graph):
    def dfs(node, visited, rec_stack, path):
        visited[node] = True
        rec_stack[node] = True
        path.append(node)
        
        for neighbor in graph.get(node, []):
            if not visited.get(neighbor):
                cycle = dfs(neighbor, visited, rec_stack, path.copy())
                if cycle:
                    return cycle
            elif rec_stack.get(neighbor):
                # Found cycle
                cycle_start = path.index(neighbor)
                return path[cycle_start:]
        
        rec_stack[node] = False
        return None
```

**Key Patterns for Adaptation**:
1. **Graph Construction**: Build adjacency lists for forward_graph (blocks) and reverse_graph (blocked_by)
2. **Circular Dependency Detection**: DFS-based cycle detection
3. **Dependency Depth Calculation**: Recursive traversal with cycle detection
4. **Critical Path Analysis**: Topological sorting with longest path calculation

### Linear API Dependency Fields

Based on codebase analysis, Linear API provides these relationship fields:

```python
relationships[issue.id] = {
    "blocks": issue.blocks,           # Issues this blocks
    "blocked_by": issue.blockedBy,    # Issues blocking this
    "parent": issue.parentId,         # Parent issue
    "children": issue.children,       # Child issues
    "related": issue.relatedIssues    # Related issues
}
```

**Validation Requirements**:
- Issues in `blockedBy` must be in "Done" state before execution
- Issues being executed cannot be in another issue's `blocks` list unless blocker is complete
- Cross-reference with issue states via `mcp__linear__get_issue` calls

### Error Handling Patterns from Existing Commands

The sprint-execute command already includes retry patterns:

```python
For each failed agent:
  if retry_count < 2:
    - Check Linear for any partial progress on main issue
    - Check subtask completion status
    - Relaunch agent with uncompleted subtasks only
    - Note retry in Linear comments
  else:
    - Mark issues as "Blocked"
    - Mark incomplete subtasks as "Blocked"
    - Add comment explaining failure
    - Continue with other agents
```

**Missing Pattern**: Pre-flight validation to prevent the need for recovery.

### Force Flag Implementation Patterns

Limited force flag usage found in codebase. The epic-prep.md mentions:
- Conservative matching rules: "Never force-match ambiguous features"
- Preference for safe operations over forced operations

**Recommended Pattern**:
```bash
/sprint-execute --project "Sprint-Name" --force-dependencies
# Should warn about blocked issues but proceed anyway
```

## Implementation Recommendations

### 1. Pre-Flight Dependency Validation

**Integration Point**: Add new Step 2.4 in sprint-execute after "Analyze Dependencies"

```python
### Step 2.4: Validate Dependencies (NEW)
1. **Check Blocking Relationships**:
   blocking_issues = []
   for issue in sprint_issues:
       for blocker_id in issue.blockedBy:
           blocker = mcp__linear__get_issue(blocker_id)
           if blocker.state != "Done":
               blocking_issues.append({
                   "issue": issue.id,
                   "blocked_by": blocker_id,
                   "blocker_state": blocker.state,
                   "blocker_title": blocker.title
               })

2. **Validate Execution Safety**:
   if blocking_issues and not force_flag:
       generate_blocking_report(blocking_issues)
       raise ExecutionBlocked(
           f"{len(blocking_issues)} issues have incomplete blockers. "
           f"Use --force-dependencies to override."
       )
   
3. **Cross-Team Dependency Check**:
   external_blockers = []
   for issue in sprint_issues:
       for blocker_id in issue.blockedBy:
           if not is_same_team(blocker_id, current_team):
               external_blockers.append(blocker_id)
```

### 2. Force Flag Implementation

**Command Line Addition**:
```yaml
argument-hint: --project <project-name> [--epic <epic-id>] [--force-dependencies]
```

**Implementation**:
```python
### Force Override Logic
if force_dependencies_flag:
    print("⚠️  WARNING: Forcing execution despite blocked dependencies")
    for blocking in blocking_issues:
        print(f"   - {blocking['issue']} blocked by {blocking['blocked_by']} ({blocking['blocker_state']})")
    
    if not confirm_force_execution():
        raise ExecutionCancelled("User cancelled forced execution")
    
    # Add force execution comments to Linear
    for issue in affected_issues:
        mcp__linear__add_comment(
            issue.id,
            f"🚨 Forced execution despite blocker {blocker_id} in {blocker_state} state"
        )
```

### 3. Enhanced Blocking Report Generation

```python
def generate_blocking_report(blocking_issues):
    """Generate detailed report of dependency blocks"""
    print("\n🚫 DEPENDENCY VALIDATION FAILED")
    print("═" * 50)
    
    # Group by blocker for clarity
    by_blocker = {}
    for block in blocking_issues:
        blocker_id = block['blocked_by']
        if blocker_id not in by_blocker:
            by_blocker[blocker_id] = []
        by_blocker[blocker_id].append(block)
    
    for blocker_id, blocked_list in by_blocker.items():
        blocker = blocked_list[0]  # Get blocker details
        print(f"\n🔒 {blocker_id}: {blocker['blocker_title']}")
        print(f"   State: {blocker['blocker_state']} (needs: Done)")
        print(f"   Blocking {len(blocked_list)} sprint issues:")
        
        for blocked in blocked_list:
            print(f"     - {blocked['issue']}")
    
    print(f"\n💡 RESOLUTION OPTIONS:")
    print(f"   1. Complete blocking issues first")
    print(f"   2. Remove dependencies if no longer needed")
    print(f"   3. Use --force-dependencies to override (not recommended)")
    print(f"   4. Move blocked issues to later sprint")
```

### 4. Transaction-like Rollback Implementation

```python
### Execution State Management
class SprintExecution:
    def __init__(self):
        self.started_agents = []
        self.updated_issues = []
        self.created_comments = []
    
    def rollback_on_dependency_failure(self):
        """Rollback changes if critical dependency failure occurs"""
        for agent in self.started_agents:
            # Signal agent termination
            terminate_agent(agent.id)
        
        for issue_update in self.updated_issues:
            # Revert issue state changes
            mcp__linear__update_issue(
                issue_update.id,
                state=issue_update.original_state
            )
        
        # Add rollback comment
        for issue in affected_issues:
            mcp__linear__add_comment(
                issue.id,
                f"🔄 Sprint execution rolled back due to dependency failure"
            )
```

### 5. Integration with Existing Dependency-Map Logic

**Reuse Pattern**: Extract dependency analysis from dependency-map into shared utility:

```python
# In Step 2.3, replace current logic with:
from dependency_analyzer import DependencyAnalyzer

analyzer = DependencyAnalyzer(sprint_issues)
dependency_graph = analyzer.build_graph()
circular_deps = analyzer.find_cycles(dependency_graph)
critical_path = analyzer.find_critical_path(dependency_graph)

if circular_deps:
    raise CircularDependencyError(
        f"Circular dependencies detected: {circular_deps}"
    )
```

## Pre-Execution Validation Flow

### Recommended Validation Sequence

1. **Issue Fetching** (existing Step 2.2)
2. **Dependency Graph Construction** (enhanced Step 2.3)
3. **Blocking Validation** (NEW Step 2.4)
   - Check blockedBy relationships
   - Validate blocker states
   - Detect cross-team dependencies
4. **Force Override Processing** (NEW Step 2.5)
   - Handle --force-dependencies flag
   - Generate warnings and confirmations
   - Add audit comments
5. **Agent Assignment** (existing Step 3.2, now conditional)

### Error Handling Strategy

```python
try:
    validate_dependencies(sprint_issues, force=force_flag)
except ExecutionBlocked as e:
    print(f"❌ {e}")
    print("\nUse /dependency-map --team {team} --scope sprint --scope-id {project} for detailed analysis")
    return
except CircularDependencyError as e:
    print(f"⚠️ CRITICAL: {e}")
    print("Resolve circular dependencies before execution")
    return
```

## Risk Assessment and Migration Strategy

### Implementation Risks
- 🟡 **Medium Risk**: Additional API calls may increase execution time
- 🟡 **Medium Risk**: Force flag could be misused, leading to problematic executions
- 🟢 **Low Risk**: Enhanced validation improves execution reliability

### Migration Strategy
1. **Phase 1**: Add validation logic with warnings (non-blocking)
2. **Phase 2**: Enable blocking validation with force override
3. **Phase 3**: Add transaction rollback capabilities

### Testing Strategy
1. **Unit Testing**: Validate dependency graph construction
2. **Integration Testing**: Test with various blocking scenarios
3. **End-to-End Testing**: Full sprint execution with blocked dependencies
4. **Force Flag Testing**: Validate override behavior and audit trails

## Source Bibliography

1. Sprint Execute Implementation. `/Users/m/ai-workspace/cconami/cconami-dev/.claude/commands/linear/sprint-execute.md` (Accessed: 2025-08-31)
2. Dependency Map Analysis. `/Users/m/ai-workspace/cconami/cconami-dev/.claude/commands/dependency-map.md` (Accessed: 2025-08-31)  
3. Sprint Status Monitoring. `/Users/m/ai-workspace/cconami/cconami-dev/.claude/commands/linear/sprint-status.md` (Accessed: 2025-08-31)
4. Linear Commands Architecture. `/Users/m/ai-workspace/cconami/cconami-dev/apps/dot-claude/commands/COMMANDS_README.md` (Accessed: 2025-08-31)
5. My Linear Guide Documentation. `/Users/m/ai-workspace/cconami/cconami-dev/ai_docs/knowledge/my-linear-guide.md` (Accessed: 2025-08-31)

## Next Steps

### Immediate Actions (CCC-24 Fix)
1. **Implement Pre-Flight Validation**: Add Step 2.4 with blocking relationship checks
2. **Add Force Flag**: Implement --force-dependencies with warnings and audit trail
3. **Enhance Error Reporting**: Detailed blocking issue reports with resolution suggestions
4. **Update Documentation**: Add dependency validation section to sprint-execute.md

### Follow-Up Enhancements
1. **Shared Dependency Library**: Extract common dependency analysis patterns
2. **Cross-Command Integration**: Use dependency validation in release-execute
3. **Performance Optimization**: Cache dependency graphs for repeated use
4. **Monitoring Integration**: Track force-flag usage and execution success rates

This comprehensive analysis provides all necessary context for implementing robust dependency validation in the sprint-execute command while maintaining backward compatibility and providing appropriate override mechanisms for edge cases.
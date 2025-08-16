# `/sprint` Troubleshooting Guide

## Overview

The `/sprint` command orchestrates complex parallel sub-agent execution for implementing multiple features simultaneously. This creates unique challenges around agent coordination, dependency management, and resource conflicts. This guide covers common issues and their solutions.

## Common Issue Categories

### 1. Sub-Agent Failures and Recovery

#### Issue 1.1: Agent Timeout Issues

**Problem:** Sub-agents fail to complete within expected timeframe, causing the sprint to hang or fail.

**Symptoms:**
- Sub-agents stop responding mid-execution
- Sprint appears stuck waiting for agent completion
- Error messages about task timeouts
- Partial implementations left in working directory

**Root Causes:**
- Complex features requiring more time than expected
- Sub-agents getting stuck in analysis paralysis
- Network issues affecting tool execution
- Memory constraints causing agent slowdown

**Solutions:**

1. **Immediate Recovery:**
   ```bash
   # Check current sub-agent status
   # Look for hung processes or incomplete work
   ps aux | grep claude
   
   # Review partial work in git
   git status
   git diff
   ```

2. **Manual Agent Restart:**
   - Identify which specific feature the failed agent was working on
   - Restart that sub-agent with explicit context about where it left off
   - Provide additional constraints: "Complete this feature within 30 minutes"

3. **Feature Scope Reduction:**
   ```
   # Instead of full feature implementation, break it down:
   ROLE: Implement ONLY the core functionality for [FEATURE_NAME]
   - Skip advanced error handling for now
   - Focus on happy path implementation
   - Leave comprehensive testing for next sprint
   ```

**Prevention:**
- Break large features into smaller, more manageable tasks in the backlog
- Set explicit time constraints in sub-agent prompts
- Use iterative approach: core functionality first, enhancements later

#### Issue 1.2: Repeated Agent Failures (>2 Attempts)

**Problem:** Same sub-agent fails multiple times, triggering the 2-failure limit and stopping execution.

**Symptoms:**
- Agent fails with same error multiple times
- Feature marked as failed after 2 attempts
- Sprint execution stops with unimplemented features

**Common Error Patterns:**
- **Import/dependency errors:** Agent can't find required modules
- **File structure confusion:** Agent creates files in wrong locations
- **Test framework issues:** Agent can't set up or run tests properly
- **Git conflicts:** Agent can't commit due to merge conflicts

**Solutions:**

1. **Analyze Failure Pattern:**
   ```bash
   # Review agent attempts and error messages
   # Look for consistent failure points
   git log --oneline -10
   
   # Check for file system issues
   find . -name "*.py" -type f | head -20
   ```

2. **Environmental Reset:**
   ```bash
   # Clean up partial work
   git reset --hard HEAD
   git clean -fd
   
   # Verify project structure
   ls -la
   ```

3. **Manual Feature Implementation:**
   - Take over the failed feature manually
   - Use the original task specification from the backlog
   - Implement with explicit knowledge of the failure patterns

4. **Backlog Task Refinement:**
   - Update the backlog to break down the problematic feature
   - Add more specific technical requirements
   - Include environmental setup instructions

**Prevention:**
- Include project structure context in sub-agent prompts
- Test feature specifications manually before sprint execution
- Maintain clear development environment documentation

#### Issue 1.3: Context Loss Between Attempts

**Problem:** Sub-agents lose context when restarted, leading to inconsistent implementations.

**Symptoms:**
- Restarted agents implement features differently
- Conflicting approaches between agent attempts
- Previous partial work gets overwritten or ignored

**Solutions:**

1. **Preserve Context Documentation:**
   ```bash
   # Before restarting agent, document current state
   git add -A
   git commit -m "WIP: [Feature] partial implementation before agent restart"
   ```

2. **Enhanced Restart Prompts:**
   ```
   ROLE: Continue implementing [FEATURE_NAME] - PREVIOUS ATTEMPT FAILED
   
   CONTEXT:
   - Previous agent attempted this feature and got to: [SPECIFIC_PROGRESS]
   - Current state: [DESCRIBE_CURRENT_FILES_AND_STRUCTURE]
   - Error encountered: [SPECIFIC_ERROR_MESSAGE]
   
   CONSTRAINTS:
   - DO NOT start from scratch
   - BUILD ON existing partial work
   - Address the specific error that caused previous failure
   ```

3. **State Preservation:**
   - Use git commits to preserve each agent attempt
   - Document agent progress in sprint notes
   - Include specific file references in restart prompts

**Prevention:**
- Use more granular git commits during sprint execution
- Maintain sprint state documentation throughout process
- Design features to be more independently implementable

### 2. Dependency and Parallelization Problems

#### Issue 2.1: Circular Dependencies

**Problem:** Features depend on each other, creating deadlocks in parallel execution.

**Symptoms:**
- Multiple agents waiting for other agents to complete
- Features that reference components not yet implemented
- Import errors due to missing dependencies between features

**Root Causes:**
- Poor dependency analysis in sprint planning
- Tightly coupled feature designs
- Shared components identified too late

**Solutions:**

1. **Dependency Analysis:**
   ```bash
   # Analyze current implementations for circular deps
   grep -r "import.*feature" apps/
   grep -r "from.*feature" apps/
   ```

2. **Sequential Fallback:**
   ```
   # If circular dependency detected, switch to sequential execution:
   1. Implement foundation features first (no dependencies)
   2. Implement dependent features second
   3. Integrate and test
   ```

3. **Shared Component Extraction:**
   ```
   # Create shared utilities first
   ROLE: Create shared utility components needed by multiple features
   
   TASKS:
   1. Extract common functionality into shared modules
   2. Create stable interfaces for dependent features
   3. Document usage patterns for other agents
   ```

**Prevention:**
- Perform dependency analysis during backlog creation
- Design features with minimal interdependencies
- Create shared components before feature implementation

#### Issue 2.2: Race Conditions

**Problem:** Agents modify the same files or resources simultaneously, causing conflicts.

**Symptoms:**
- Git merge conflicts during parallel execution
- File corruption or unexpected content
- Agents overwriting each other's work

**Solutions:**

1. **Immediate Conflict Resolution:**
   ```bash
   # Check for active conflicts
   git status
   git diff
   
   # Resolve conflicts manually
   git add -A
   git commit -m "Resolve merge conflicts from parallel agent execution"
   ```

2. **File-Level Coordination:**
   ```
   # Assign specific file ownership to agents
   Agent 1: Responsible for files matching pattern: backend/api/*
   Agent 2: Responsible for files matching pattern: frontend/components/*
   Agent 3: Responsible for files matching pattern: database/migrations/*
   ```

3. **Sequential Checkpoints:**
   ```
   # Implement checkpoint system:
   1. All agents implement their core logic
   2. Stop and resolve any conflicts
   3. Continue with integration tasks
   ```

**Prevention:**
- Design features with clear file ownership boundaries
- Use modular architecture to minimize file overlap
- Implement file locking conventions in backlog planning

#### Issue 2.3: Resource Conflicts

**Problem:** Multiple agents competing for same system resources (database, ports, etc.).

**Symptoms:**
- "Port already in use" errors
- Database connection failures
- Test suite conflicts

**Solutions:**

1. **Resource Allocation:**
   ```bash
   # Check resource usage
   lsof -i :8000-8010  # Check common ports
   ps aux | grep python  # Check running processes
   ```

2. **Dynamic Resource Assignment:**
   ```
   # Assign unique ports/resources to each agent:
   Agent 1: Use port 8001, database test_db_1
   Agent 2: Use port 8002, database test_db_2
   Agent 3: Use port 8003, database test_db_3
   ```

3. **Resource Cleanup:**
   ```bash
   # Clean up before sprint execution
   pkill -f "python.*manage.py runserver"
   docker-compose down
   ```

**Prevention:**
- Include resource allocation in sprint planning
- Use containerized development environments
- Design tests to use isolated resources

### 3. Backlog File Issues

#### Issue 3.1: Malformed Backlog Format

**Problem:** Backlog file doesn't follow expected structure, causing parsing errors.

**Symptoms:**
- Sprint command can't identify features or tasks
- Agents receive incomplete or garbled instructions
- Dependency parsing fails

**Common Format Issues:**
- Missing feature headers
- Inconsistent task formatting
- Missing or malformed dependency specifications
- Unclear task descriptions

**Solutions:**

1. **Backlog Validation:**
   ```bash
   # Check backlog structure
   grep -n "##" backlog.md  # Feature headers
   grep -n "- \[ \]" backlog.md  # Task items
   grep -n "Dependencies:" backlog.md  # Dependency sections
   ```

2. **Format Correction:**
   ```markdown
   # Correct format:
   ## Feature Name
   Description of the feature
   
   ### Tasks
   - [ ] Task 1 description
   - [ ] Task 2 description
   
   ### Dependencies
   - Feature B (must complete first)
   - Shared Component X
   
   ### Acceptance Criteria
   - Specific testable requirements
   ```

3. **Automatic Validation:**
   ```
   # Add backlog validation to sprint command:
   1. Verify all features have task sections
   2. Check for circular dependencies
   3. Validate task descriptions are actionable
   ```

**Prevention:**
- Use consistent backlog templates
- Include backlog format validation in PRD process
- Review backlog structure before sprint execution

#### Issue 3.2: Missing Dependencies

**Problem:** Features reference dependencies that aren't defined or available.

**Symptoms:**
- Agents fail when trying to use undefined components
- Import errors for missing modules
- Features that can't be implemented without missing pieces

**Solutions:**

1. **Dependency Audit:**
   ```bash
   # Find all dependency references
   grep -n "Dependencies:" backlog.md
   grep -n "requires:" backlog.md
   grep -n "depends on:" backlog.md
   ```

2. **Missing Dependency Implementation:**
   ```
   # Create additional agent for missing dependencies:
   ROLE: Implement missing dependencies for current sprint
   
   TASKS:
   1. Create [MISSING_COMPONENT]
   2. Implement basic interface
   3. Provide stub implementations for sprint completion
   ```

3. **Scope Adjustment:**
   ```
   # Modify feature requirements to work without missing dependencies:
   - Use mock implementations
   - Simplify requirements
   - Defer to future sprint
   ```

**Prevention:**
- Perform dependency analysis during PRD creation
- Include all required components in sprint scope
- Use dependency mapping tools

#### Issue 3.3: Unclear Task Descriptions

**Problem:** Task descriptions are too vague for sub-agents to implement effectively.

**Symptoms:**
- Agents request clarification repeatedly
- Implementations don't match intended functionality
- Agents implement minimal or incorrect solutions

**Examples of Poor Descriptions:**
- "Add user authentication" (too broad)
- "Make it work better" (non-specific)
- "Fix the database" (unclear problem)

**Solutions:**

1. **Task Specification Enhancement:**
   ```markdown
   # Instead of: "Add user authentication"
   # Use:
   - [ ] Implement JWT-based login endpoint (/api/auth/login)
   - [ ] Create user registration with email validation
   - [ ] Add password reset functionality with secure tokens
   - [ ] Implement role-based access control middleware
   ```

2. **Acceptance Criteria Addition:**
   ```markdown
   # Add specific, testable criteria:
   ### Acceptance Criteria
   - User can register with email/password
   - Login returns valid JWT token
   - Protected routes reject invalid tokens
   - Password requirements: 8+ chars, numbers, symbols
   ```

3. **Technical Context:**
   ```markdown
   # Include implementation guidance:
   ### Technical Notes
   - Use existing User model in models.py
   - Follow JWT implementation in auth.py
   - Add tests using existing test framework
   ```

**Prevention:**
- Write task descriptions as specific, actionable requirements
- Include acceptance criteria for all tasks
- Provide technical context and constraints

### 4. Git and Commit Problems

#### Issue 4.1: Merge Conflicts

**Problem:** Multiple agents creating conflicting changes that can't be automatically merged.

**Symptoms:**
- Git merge conflicts during agent execution
- Failed commits with conflict markers
- Corrupted or inconsistent file states

**Solutions:**

1. **Conflict Detection:**
   ```bash
   # Identify conflict files
   git status
   grep -r "<<<<<<< HEAD" .
   grep -r "=======" .
   grep -r ">>>>>>> " .
   ```

2. **Manual Resolution:**
   ```bash
   # Resolve conflicts manually
   # Edit conflicted files
   git add .
   git commit -m "Resolve merge conflicts from parallel agent execution"
   ```

3. **Agent Coordination:**
   ```
   # Restart agents with conflict awareness:
   ROLE: Continue feature implementation - RESOLVE MERGE CONFLICTS
   
   CONTEXT:
   - Previous agent work caused merge conflicts in: [FILE_LIST]
   - Conflicts resolved manually, now continue implementation
   - Avoid modifying: [CONFLICTED_SECTIONS]
   ```

**Prevention:**
- Design features with clear file ownership
- Use frequent, smaller commits
- Implement file locking conventions

#### Issue 4.2: Failed Commits

**Problem:** Sub-agents unable to commit their work due to various git issues.

**Symptoms:**
- "nothing to commit" errors when work was done
- Permission or authentication issues
- Invalid commit messages or formats

**Common Causes:**
- Files not staged properly
- Git configuration issues
- Working directory problems
- Pre-commit hooks failing

**Solutions:**

1. **Git State Diagnosis:**
   ```bash
   # Check git status and configuration
   git status
   git config --list
   git log --oneline -5
   ```

2. **Manual Commit Recovery:**
   ```bash
   # Stage and commit agent work manually
   git add -A
   git commit -m "Sprint: [Feature] implementation by sub-agent"
   ```

3. **Git Environment Reset:**
   ```bash
   # Reset git environment if corrupted
   git reset --soft HEAD~1  # If last commit was problematic
   git clean -fd  # Remove untracked files
   ```

**Prevention:**
- Verify git configuration before sprint execution
- Use consistent commit message formats
- Test commit permissions in development environment

#### Issue 4.3: Uncommitted Changes

**Problem:** Sub-agents leave work uncommitted, making sprint state unclear.

**Symptoms:**
- Untracked files after agent completion
- Modified files not committed
- Work appears incomplete when it's actually finished

**Solutions:**

1. **Work State Review:**
   ```bash
   # Review all uncommitted work
   git status
   git diff
   git diff --cached
   ```

2. **Selective Commit:**
   ```bash
   # Commit completed work, leave WIP
   git add completed_feature.py
   git commit -m "Sprint: Complete [Feature] implementation"
   
   # Document WIP separately
   git add wip_file.py
   git commit -m "WIP: [Feature] partial implementation"
   ```

3. **Sprint Cleanup Protocol:**
   ```
   # After all agents complete, run cleanup:
   1. Review all uncommitted changes
   2. Commit completed features
   3. Document incomplete work
   4. Clean up temporary files
   ```

**Prevention:**
- Include explicit commit instructions in agent prompts
- Monitor agent progress for commit frequency
- Implement automatic commit checkpoints

### 5. Performance Issues

#### Issue 5.1: Too Many Parallel Agents

**Problem:** System resources overwhelmed by running too many sub-agents simultaneously.

**Symptoms:**
- System slowdown or unresponsiveness
- Agents taking much longer than expected
- Memory or CPU exhaustion
- Network timeout errors

**Solutions:**

1. **Resource Monitoring:**
   ```bash
   # Check system resources
   top
   htop
   ps aux | grep claude
   free -h
   ```

2. **Agent Throttling:**
   ```
   # Implement staged execution:
   Phase 1: Start 2-3 core agents
   Phase 2: Start dependent agents after Phase 1 completion
   Phase 3: Start integration and testing agents
   ```

3. **Agent Optimization:**
   ```
   # Optimize agent prompts for efficiency:
   - Limit scope to essential functionality
   - Skip detailed documentation in initial implementation
   - Focus on core requirements first
   ```

**Prevention:**
- Limit concurrent agents based on system capabilities
- Use agent batching for large sprints
- Monitor system resources during execution

#### Issue 5.2: Memory Constraints

**Problem:** Agents consuming too much memory, causing system instability.

**Symptoms:**
- Out of memory errors
- System swap usage high
- Agents crashing unexpectedly
- Overall system slowdown

**Solutions:**

1. **Memory Usage Analysis:**
   ```bash
   # Monitor memory usage
   free -h
   ps aux --sort=-%mem | head -10
   pmap -x [process_id]
   ```

2. **Agent Memory Optimization:**
   ```
   # Modify agent prompts to reduce memory usage:
   - Process files in smaller chunks
   - Avoid loading large datasets
   - Use streaming operations where possible
   ```

3. **Sequential Fallback:**
   ```
   # If parallel execution impossible, switch to sequential:
   1. Complete one feature at a time
   2. Clean up memory between features
   3. Use checkpointing to save progress
   ```

**Prevention:**
- Monitor memory usage patterns during sprints
- Design features with memory constraints in mind
- Use efficient data processing approaches

#### Issue 5.3: Network Bottlenecks

**Problem:** Multiple agents overwhelming network resources or external APIs.

**Symptoms:**
- API rate limiting errors
- Network timeout failures
- Slow response times for external services
- Connection refused errors

**Solutions:**

1. **Network Usage Audit:**
   ```bash
   # Monitor network connections
   netstat -an | grep ESTABLISHED
   lsof -i
   ```

2. **Rate Limiting Implementation:**
   ```
   # Add rate limiting to agent prompts:
   - Use cached data where possible
   - Implement delays between API calls
   - Batch API requests efficiently
   ```

3. **External Service Management:**
   ```
   # Coordinate external service usage:
   Agent 1: Handle all database operations
   Agent 2: Handle all API calls
   Agent 3: Handle file operations only
   ```

**Prevention:**
- Design agents to minimize external service calls
- Use caching strategies for repeated operations
- Implement circuit breakers for external services

## Sprint Execution Best Practices

### Pre-Sprint Checklist

Before executing a sprint, verify:

- [ ] **Backlog Format:** Features clearly defined with specific tasks
- [ ] **Dependencies:** All dependencies identified and available
- [ ] **Resource Availability:** Sufficient system resources for parallel execution
- [ ] **Git State:** Clean working directory with no conflicts
- [ ] **Environment:** Development environment properly configured
- [ ] **Test Framework:** Testing infrastructure working properly

### During Sprint Monitoring

Monitor these indicators:

- **Agent Progress:** Regular updates from sub-agents
- **System Resources:** CPU, memory, and network usage
- **Git State:** Commit frequency and working directory status
- **Error Patterns:** Repeated failures or error messages
- **Feature Integration:** Cross-feature compatibility issues

### Post-Sprint Recovery

After sprint completion or failure:

1. **Document Issues:** Record what went wrong and why
2. **Update Backlog:** Mark completed tasks and note incomplete work
3. **Clean Environment:** Remove temporary files and reset state
4. **Lessons Learned:** Update troubleshooting guide with new scenarios
5. **Process Improvement:** Refine sprint execution based on experience

## Emergency Procedures

### Sprint Abort Protocol

If sprint execution becomes unrecoverable:

1. **Stop All Agents:** Kill any running sub-agents
2. **Save Work:** Commit any completed work to separate branches
3. **Reset Environment:** Clean working directory and reset to known state
4. **Document State:** Record what was completed and what failed
5. **Plan Recovery:** Determine which features can be salvaged

### System Recovery

If system becomes unstable:

1. **Resource Cleanup:** Kill excessive processes and free memory
2. **Service Restart:** Restart development services (database, web server)
3. **Environment Reset:** Reset development environment to clean state
4. **Gradual Restart:** Resume with reduced parallel agent count

### Data Recovery

If code or data gets corrupted:

1. **Git Recovery:** Use git reflog and branch recovery
2. **Backup Restoration:** Restore from recent backups if available
3. **Manual Recreation:** Recreate lost work from documentation
4. **Prevention Update:** Improve backup and checkpointing procedures

## Advanced Troubleshooting

### Agent Behavior Analysis

For complex agent issues:

1. **Prompt Analysis:** Review agent prompts for clarity and completeness
2. **Context Evaluation:** Ensure agents have sufficient context
3. **Tool Access:** Verify agents have necessary tools and permissions
4. **Specialization Match:** Ensure agent specialization matches task requirements

### Performance Profiling

For performance issues:

1. **Execution Timing:** Measure agent execution times
2. **Resource Profiling:** Profile CPU, memory, and I/O usage
3. **Bottleneck Identification:** Find limiting factors in parallel execution
4. **Optimization Opportunities:** Identify areas for improvement

### Integration Testing

For feature integration issues:

1. **Interface Compatibility:** Test feature interfaces and APIs
2. **Data Flow:** Verify data flows correctly between features
3. **Error Handling:** Test error conditions and edge cases
4. **Performance Impact:** Measure performance of integrated features

## When to Avoid `/sprint`

The sprint command may not be appropriate for:

### Too Simple
- Single feature implementations
- Minor bug fixes or tweaks
- Configuration changes
- Simple refactoring tasks

### Too Complex
- Features requiring extensive research
- Features with unknown technical feasibility
- Cross-system integration requiring deep architectural changes
- Features requiring significant external coordination

### Resource Constrained
- Limited system resources for parallel execution
- Network or API limitations preventing parallel work
- Time constraints requiring immediate completion
- Team coordination issues requiring human oversight

### Alternative Approaches

**For Simple Tasks:**
- Use regular Claude Code conversation
- Implement manually with assistant guidance
- Use single-focus development approach

**For Complex Tasks:**
- Break into multiple smaller sprints
- Use research and planning phase first
- Implement incrementally with manual coordination

**For Resource Constraints:**
- Use sequential implementation approach
- Implement with reduced scope
- Plan sprints for better resource availability

## Getting Help

If issues persist:

1. **Review Documentation:** Check PRD and backlog for clarity
2. **Simplify Scope:** Reduce feature complexity or parallel agents
3. **Manual Implementation:** Take over problematic features manually
4. **Process Refinement:** Update procedures based on experience
5. **Environment Upgrade:** Consider system or tool upgrades

Remember: The `/sprint` command is designed for complex parallel implementation. If the complexity exceeds system capabilities or creates more problems than it solves, consider alternative approaches that better match your constraints and requirements.
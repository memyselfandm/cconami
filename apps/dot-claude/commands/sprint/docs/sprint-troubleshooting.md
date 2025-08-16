# `/sprint` Troubleshooting Guide

## Overview

The `/sprint` command orchestrates complex parallel sub-agent execution for implementing multiple features simultaneously. This creates unique challenges around agent coordination, dependency management, and resource conflicts. This guide covers common issues and their solutions.

## Common Issue Categories

### 1. Rate Limit Issues

#### Issue 1.1: Credit Consumption During Sprint Execution

**Problem:** Sprint execution consumes Claude credits rapidly due to multiple parallel agents, causing rate limits to be hit.

**Symptoms:**
- Agents start failing with rate limit errors
- Sprint execution slows down or stops mid-execution
- "Rate limit exceeded" or "Credit limit reached" error messages
- Only some agents complete while others fail

**Root Causes:**
- Multiple agents running simultaneously consuming credits quickly
- Long-running agents with complex tasks using more credits than expected
- Previous sprint sessions already consumed significant credits
- Account credit limits lower than sprint requirements

**Solutions:**

1. **Immediate Recovery:**
   ```bash
   # Check current sprint progress
   ls -la tmp/worklog/
   git status
   
   # Identify which agents completed vs failed
   cat tmp/worklog/sprintagent-*.log
   ```

2. **Sequential Fallback:**
   ```
   # Switch to sequential execution to manage credit consumption:
   1. Complete foundation phase first (if not done)
   2. Execute features phase agents one at a time
   3. Monitor credit usage between each agent
   4. Use simpler prompts to reduce credit consumption per agent
   ```

3. **Scope Reduction:**
   ```
   # Reduce sprint scope to fit within credit limits:
   - Remove non-essential features from current sprint
   - Implement minimal viable versions of features
   - Defer testing and documentation to future sprint
   - Focus on core functionality only
   ```

4. **Credit Management:**
   ```
   # Before next sprint execution:
   - Check available credits in Claude account
   - Plan sprint size based on available credits
   - Consider breaking large sprints into smaller phases
   ```

**Prevention:**
- Monitor credit usage patterns during sprints
- Plan sprint scope based on available credits
- Use smaller, more focused sub-agents
- Implement credit usage tracking in sprint planning

### 2. Worklog Issues

#### Issue 2.1: Missing Worklog Directory

**Problem:** The `tmp/worklog` directory doesn't exist or has permission issues, causing agents to fail when trying to log progress.

**Symptoms:**
- Agents fail with "No such file or directory" errors for worklog paths
- Permission denied errors when writing to worklog files
- Empty or missing worklog files after agent completion
- Sprint execution stops due to worklog write failures

**Root Causes:**
- `tmp/worklog` directory not created during setup
- Directory permissions too restrictive
- Previous sprint execution didn't clean up properly
- File system issues or disk space problems

**Solutions:**

1. **Directory Creation:**
   ```bash
   # Create worklog directory with proper permissions
   mkdir -p tmp/worklog
   chmod 755 tmp/worklog
   
   # Verify directory exists and is writable
   ls -la tmp/
   touch tmp/worklog/test.log && rm tmp/worklog/test.log
   ```

2. **Permission Fixes:**
   ```bash
   # Fix directory permissions
   sudo chown $USER:$USER tmp/worklog
   chmod 755 tmp/worklog
   
   # Clear any problematic files
   rm -f tmp/worklog/sprintagent-*.log
   ```

3. **Gitignore Update:**
   ```bash
   # Ensure tmp/worklog is in .gitignore
   echo "tmp/worklog/" >> .gitignore
   git add .gitignore
   git commit -m "Add worklog directory to gitignore"
   ```

**Prevention:**
- Always run setup step before sprint execution
- Verify directory creation in sprint command
- Include worklog directory checks in pre-sprint validation

#### Issue 2.2: Corrupted or Incomplete Worklog Files

**Problem:** Agent worklog files are corrupted, incomplete, or contain invalid data.

**Symptoms:**
- Worklog files exist but contain garbled or incomplete information
- Agents report completion but worklogs show partial progress
- Sprint summary missing key information about agent work
- Difficulty determining what work was actually completed

**Root Causes:**
- Agents interrupted during worklog writing
- Multiple agents writing to same worklog file
- File system issues during agent execution
- Agent implementation errors in worklog formatting

**Solutions:**

1. **Worklog Recovery:**
   ```bash
   # Review existing worklog files
   for log in tmp/worklog/sprintagent-*.log; do
     echo "=== $log ==="
     cat "$log"
     echo
   done
   
   # Check git status to see actual work done
   git status
   git diff
   ```

2. **Manual Worklog Reconstruction:**
   ```bash
   # Create summary from git changes if worklogs corrupted
   git log --oneline -10
   git diff --name-only
   
   # Document actual changes in sprint log
   echo "## Sprint Recovery - Manual Summary" >> tmp/worklog/sprint-recovery.log
   git log --oneline -5 >> tmp/worklog/sprint-recovery.log
   ```

3. **Agent State Assessment:**
   ```bash
   # Determine which features were actually implemented
   # by analyzing code changes and running tests
   pytest # or appropriate test runner
   git diff --stat
   ```

**Prevention:**
- Include worklog validation in agent prompts
- Use unique worklog files for each agent
- Implement worklog backup mechanisms

### 3. Git Repository Issues

#### Issue 3.1: Not in Git Repository

**Problem:** Sprint command executed outside of a git repository, causing commit operations to fail.

**Symptoms:**
- "Not a git repository" errors during commit phases
- Agents complete work but commits fail
- Sprint execution stops at commit steps
- No version control for sprint changes

**Root Causes:**
- Working directory is not a git repository
- Git repository corrupted or missing .git directory
- Executing sprint command from wrong directory
- Git repository not properly initialized

**Solutions:**

1. **Repository Verification:**
   ```bash
   # Check if in git repository
   git status
   pwd
   ls -la .git/
   
   # Navigate to correct directory if needed
   cd /path/to/your/git/repo
   ```

2. **Repository Initialization:**
   ```bash
   # Initialize git repository if needed
   git init
   git add .
   git commit -m "Initial commit before sprint execution"
   ```

3. **Repository Recovery:**
   ```bash
   # If .git directory corrupted, recover from backup
   # Or re-initialize and restore from remote
   git clone <remote-url> .
   ```

**Prevention:**
- Always verify git repository status before sprint execution
- Include git repository check in pre-sprint validation
- Document proper working directory for sprint commands

#### Issue 3.2: Uncommitted Changes Blocking Commits

**Problem:** Existing uncommitted changes prevent sprint agents from making clean commits.

**Symptoms:**
- Commit operations fail due to existing uncommitted changes
- Git refuses to commit with "working directory not clean" errors
- Sprint changes mixed with pre-existing uncommitted work
- Difficulty tracking what was done by sprint vs existing work

**Root Causes:**
- Working directory had uncommitted changes before sprint
- Previous sprint execution left uncommitted work
- Manual development work not committed before sprint
- Merge conflicts or staging area issues

**Solutions:**

1. **Pre-Sprint Cleanup:**
   ```bash
   # Review and handle existing changes
   git status
   git diff
   
   # Option 1: Commit existing work
   git add -A
   git commit -m "Pre-sprint: commit existing work"
   
   # Option 2: Stash existing work
   git stash push -m "Pre-sprint stash"
   
   # Option 3: Reset if safe to lose changes
   git reset --hard HEAD
   git clean -fd
   ```

2. **Selective Staging:**
   ```bash
   # If sprint changes mixed with existing work
   git add -p  # Interactive staging
   git commit -m "Sprint: specific feature implementation"
   ```

3. **Branch Isolation:**
   ```bash
   # Create separate branch for sprint work
   git checkout -b sprint-$(date +%Y%m%d)
   # Execute sprint in clean branch
   ```

**Prevention:**
- Always start sprints with clean working directory
- Commit or stash existing work before sprint execution
- Use dedicated sprint branches for isolation

### 4. PLAN Mode Issues

#### Issue 4.1: PLAN Mode Not Activated

**Problem:** Sprint command executed without being in PLAN mode, potentially causing suboptimal execution or missing context.

**Symptoms:**
- Sprint command description indicates "Run from PLAN mode" but not in PLAN mode
- Reduced effectiveness in sprint planning and execution
- Missing strategic context for feature prioritization
- Subagents may lack proper architectural guidance

**Root Causes:**
- User forgot to activate PLAN mode before sprint execution
- PLAN mode not available or properly configured
- Confusion about when PLAN mode is required vs optional
- Missing PLAN mode setup in development environment

**Solutions:**

1. **Activate PLAN Mode:**
   ```
   # Activate PLAN mode before executing sprint
   # (Specific activation method depends on Claude Code configuration)
   # Then re-run sprint command
   /sprint [backlog-file]
   ```

2. **Verify PLAN Mode Status:**
   ```
   # Check if PLAN mode is active
   # Look for PLAN mode indicators in Claude Code interface
   # Verify enhanced planning capabilities are available
   ```

3. **Manual Planning Compensation:**
   ```
   # If PLAN mode unavailable, do manual planning:
   1. Read and analyze backlog thoroughly
   2. Identify dependencies and parallelization opportunities
   3. Plan detailed execution phases
   4. Provide extra context to subagents
   ```

**Prevention:**
- Always activate PLAN mode before sprint execution
- Include PLAN mode activation in sprint checklist
- Document PLAN mode requirements clearly

#### Issue 4.2: Insufficient Planning Context

**Problem:** Even in PLAN mode, insufficient context or analysis leads to poor sprint planning.

**Symptoms:**
- Subagents receive unclear or incomplete instructions
- Poor parallelization with dependency conflicts
- Features implemented incorrectly due to missing context
- Sprint execution requires frequent manual intervention

**Root Causes:**
- Backlog lacks sufficient detail for proper planning
- Missing architectural context in planning phase
- Inadequate dependency analysis
- Poor understanding of existing codebase state

**Solutions:**

1. **Enhanced Backlog Analysis:**
   ```
   # Before sprint execution, do detailed backlog review:
   1. Analyze each feature for complexity and dependencies
   2. Identify shared components and interfaces
   3. Plan integration points between features
   4. Document technical constraints and requirements
   ```

2. **Codebase Context Gathering:**
   ```bash
   # Gather architectural context
   find . -name "*.py" -o -name "*.js" -o -name "*.ts" | head -20
   grep -r "class\|function\|interface" --include="*.py" --include="*.js" | head -10
   ```

3. **Dependency Mapping:**
   ```
   # Create explicit dependency map:
   1. List all features in sprint
   2. Identify dependencies between features
   3. Plan execution order based on dependencies
   4. Assign phases appropriately
   ```

**Prevention:**
- Invest time in thorough planning before execution
- Maintain updated architectural documentation
- Use dependency analysis tools
- Include planning validation in sprint process

### 5. Sub-Agent Failures and Recovery

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

### 6. Foundation Phase Issues

#### Issue 6.1: Foundation Phase Failures Blocking Features

**Problem:** Agents in the foundation phase fail, preventing the features phase from executing.

**Symptoms:**
- Foundation phase completes unsuccessfully after 2 retry attempts
- Sprint execution stops before reaching features phase
- Shared components or dependencies not properly implemented
- Features phase agents would fail due to missing foundation

**Root Causes:**
- Foundation tasks too complex for single agent
- Unclear requirements for shared components
- Missing technical context for scaffolding
- Dependencies on external services or configurations

**Solutions:**

1. **Foundation Analysis:**
   ```bash
   # Review foundation phase requirements
   cat tmp/worklog/sprintagent-foundation-*.log
   git status
   
   # Identify what foundation work was attempted
   git log --oneline -5
   ```

2. **Manual Foundation Implementation:**
   ```
   # Take over foundation work manually:
   1. Implement shared components step by step
   2. Create stable interfaces for feature development
   3. Test foundation components before proceeding
   4. Document foundation for feature agents
   ```

3. **Foundation Scope Reduction:**
   ```
   # Simplify foundation requirements:
   - Implement minimal viable shared components
   - Use stub implementations for complex dependencies
   - Focus on interfaces rather than full implementations
   - Defer complex scaffolding to manual implementation
   ```

4. **Phase Restructuring:**
   ```
   # Move some foundation work to features phase:
   - Make features more self-contained
   - Reduce shared component dependencies
   - Allow features to implement their own dependencies
   ```

**Prevention:**
- Keep foundation phase minimal and focused
- Test foundation requirements before sprint execution
- Design features with minimal shared dependencies
- Include foundation validation in backlog planning

#### Issue 6.2: Foundation Phase Incomplete Implementation

**Problem:** Foundation phase completes "successfully" but doesn't provide sufficient groundwork for features.

**Symptoms:**
- Features phase agents fail due to missing foundation components
- Shared interfaces incomplete or incorrectly implemented
- Features can't find or use foundation components
- Integration phase fails due to foundation gaps

**Root Causes:**
- Foundation agent declared success prematurely
- Foundation requirements underspecified
- No validation of foundation component completeness
- Missing tests for foundation components

**Solutions:**

1. **Foundation Validation:**
   ```bash
   # Test foundation components before proceeding
   # Run any tests created by foundation agent
   pytest tests/foundation/ # or appropriate test location
   
   # Verify foundation files exist and are usable
   ls -la shared/ common/ foundation/ # or appropriate directories
   ```

2. **Foundation Completion:**
   ```
   # Complete missing foundation work:
   1. Implement missing shared components
   2. Fix incomplete interfaces
   3. Add proper error handling to foundation code
   4. Test foundation components thoroughly
   ```

3. **Feature Phase Adaptation:**
   ```
   # Modify feature agents to handle foundation gaps:
   - Provide alternative implementations for missing components
   - Include foundation completion in feature tasks
   - Make features more self-sufficient
   ```

**Prevention:**
- Include explicit validation criteria for foundation phase
- Require tests for all foundation components
- Use acceptance criteria for foundation tasks
- Validate foundation before proceeding to features

### 7. Integration Phase Issues

#### Issue 7.1: Integration Phase Test Failures

**Problem:** Integration phase fails due to test failures, compatibility issues, or feature conflicts.

**Symptoms:**
- Integration phase agents fail with test errors
- Features work individually but fail when integrated
- Compatibility issues between implemented features
- Performance degradation in integrated system

**Root Causes:**
- Features implemented with different assumptions
- Missing integration points between features
- Incomplete testing during feature development
- Resource conflicts between features

**Solutions:**

1. **Integration Analysis:**
   ```bash
   # Analyze integration failures
   pytest -v  # Run all tests to see failures
   cat tmp/worklog/sprintagent-integration-*.log
   
   # Check for conflicts
   git status
   git diff
   ```

2. **Manual Integration:**
   ```
   # Fix integration issues manually:
   1. Resolve API compatibility issues
   2. Fix shared resource conflicts
   3. Implement missing integration points
   4. Update tests to reflect integrated behavior
   ```

3. **Feature Compatibility Fixes:**
   ```
   # Update features for compatibility:
   - Standardize interfaces between features
   - Resolve naming conflicts
   - Fix shared dependency issues
   - Update configuration for integrated system
   ```

4. **Integration Scope Reduction:**
   ```
   # Reduce integration complexity:
   - Test features individually first
   - Integrate features one at a time
   - Use feature flags to isolate problems
   - Defer complex integration to future sprint
   ```

**Prevention:**
- Design features with integration in mind
- Include integration requirements in feature specifications
- Use consistent interfaces and patterns across features
- Plan integration points during sprint planning

### 8. CLAUDE.md Update Issues

#### Issue 8.1: Memory Update Conflicts

**Problem:** Sprint execution fails when trying to update CLAUDE.md due to conflicts or formatting issues.

**Symptoms:**
- CLAUDE.md update step fails during sprint finalization
- Merge conflicts in CLAUDE.md during update
- Sprint changes not properly documented in project memory
- Inconsistent or corrupted CLAUDE.md after sprint

**Root Causes:**
- CLAUDE.md modified manually during sprint execution
- Multiple agents trying to update CLAUDE.md simultaneously
- Formatting conflicts between existing and new content
- Missing or corrupted CLAUDE.md file

**Solutions:**

1. **Manual CLAUDE.md Update:**
   ```bash
   # Review current CLAUDE.md state
   cat CLAUDE.md
   git status CLAUDE.md
   
   # Manually update with sprint changes
   # Add implemented features and architectural changes
   # Document new patterns and components
   ```

2. **Conflict Resolution:**
   ```bash
   # Resolve CLAUDE.md conflicts
   git diff CLAUDE.md
   # Edit CLAUDE.md to resolve conflicts
   git add CLAUDE.md
   git commit -m "Update CLAUDE.md with sprint changes"
   ```

3. **Memory Reconstruction:**
   ```
   # Reconstruct CLAUDE.md updates from sprint work:
   1. Review all implemented features
   2. Document new architectural patterns
   3. Update project context and capabilities
   4. Add new components and interfaces to memory
   ```

**Prevention:**
- Lock CLAUDE.md during sprint execution
- Use separate memory files for sprint documentation
- Include CLAUDE.md backup before sprint execution
- Design memory update process to handle conflicts

#### Issue 8.2: Incomplete Memory Documentation

**Problem:** CLAUDE.md update doesn't properly capture all sprint changes and new context.

**Symptoms:**
- CLAUDE.md update succeeds but misses key sprint changes
- Future development lacks context about sprint implementations
- Architectural changes not properly documented
- Missing documentation about new patterns or components

**Root Causes:**
- Automated update process too simplistic
- Sprint summary missing key technical details
- Worklog files incomplete or unclear
- No validation of memory update completeness

**Solutions:**

1. **Comprehensive Memory Review:**
   ```bash
   # Review all sprint changes for memory update
   git log --oneline -10
   git diff --name-only HEAD~5
   cat tmp/worklog/sprint-*.log
   
   # Identify all architectural changes
   find . -name "*.py" -newer tmp/worklog/sprint-start.marker
   ```

2. **Manual Memory Enhancement:**
   ```
   # Manually update CLAUDE.md with comprehensive changes:
   1. Document all new features and their purposes
   2. Update architectural overview with new components
   3. Add new patterns and best practices discovered
   4. Document integration points and dependencies
   5. Update development workflow based on sprint learnings
   ```

3. **Memory Validation:**
   ```
   # Validate memory update completeness:
   - Cross-check CLAUDE.md against implemented features
   - Verify all major architectural changes documented
   - Ensure new components and interfaces described
   - Test that memory provides sufficient context for future development
   ```

**Prevention:**
- Include detailed technical context in worklog requirements
- Use structured memory update templates
- Validate memory updates against sprint objectives
- Maintain comprehensive sprint change documentation

### 9. Dependency and Parallelization Problems

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

### 10. Backlog File Issues

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

### 11. Git and Commit Problems

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

### 12. Performance Issues

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

- [ ] **PLAN Mode:** Activated and ready for enhanced planning
- [ ] **Credit Availability:** Sufficient Claude credits for planned sprint scope
- [ ] **Git Repository:** Working in a valid git repository with clean state
- [ ] **Worklog Directory:** `tmp/worklog` exists and is writable
- [ ] **Backlog Format:** Features clearly defined with specific tasks
- [ ] **Dependencies:** All dependencies identified and available
- [ ] **Resource Availability:** Sufficient system resources for parallel execution
- [ ] **Git State:** Clean working directory with no conflicts
- [ ] **Environment:** Development environment properly configured
- [ ] **Test Framework:** Testing infrastructure working properly
- [ ] **CLAUDE.md Backup:** Current CLAUDE.md backed up before sprint execution

### During Sprint Monitoring

Monitor these indicators:

- **Agent Progress:** Regular updates from sub-agents
- **Credit Consumption:** Monitor rate of Claude credit usage
- **Worklog Files:** Verify agents are logging progress properly
- **Phase Completion:** Ensure each phase completes successfully before proceeding
- **System Resources:** CPU, memory, and network usage
- **Git State:** Commit frequency and working directory status
- **Error Patterns:** Repeated failures or error messages
- **Feature Integration:** Cross-feature compatibility issues

### Post-Sprint Recovery

After sprint completion or failure:

1. **Document Issues:** Record what went wrong and why
2. **Update Backlog:** Mark completed tasks and note incomplete work
3. **CLAUDE.md Validation:** Verify memory updates captured sprint changes
4. **Worklog Archive:** Archive sprint worklogs for future reference
5. **Credit Usage Analysis:** Review credit consumption patterns
6. **Clean Environment:** Remove temporary files and reset state
7. **Lessons Learned:** Update troubleshooting guide with new scenarios
8. **Process Improvement:** Refine sprint execution based on experience

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
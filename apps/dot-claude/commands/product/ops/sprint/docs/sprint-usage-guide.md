# `/sprint` Command Usage Guide

## Overview
The `/sprint` command provides an intelligent sprint execution system that reads backlog files, analyzes roadmaps and dependencies, and launches parallel sub-agents to implement features simultaneously. It's designed for efficient, automated development sprints with comprehensive project management and git workflow integration.

## ⚠️ Credit Consumption Warning

**HIGH CREDIT USAGE ALERT**: The `/sprint` command launches multiple parallel AI agents that consume significant credits. Each sub-agent runs independently and can hit rate limits.

**Credit Consumption Factors:**
- **Multiple Agents**: Each feature launches a separate AI agent (2-6 agents typical)
- **Long Execution**: Agents run for extended periods (30-120 minutes each)
- **Retry Logic**: Failed agents restart up to 2 times, tripling potential usage
- **Rate Limits**: Claude API rate limits may cause delays and timeouts

**Recommendations:**
- Start with small sprints (1-2 features) to gauge credit usage
- Monitor your Claude credits before launching large sprints
- Consider running sprints during off-peak hours to avoid rate limits
- Use the worklog system to track progress and avoid duplicate work

## Command Syntax
```
/sprint <backlog-file>
```

## Quick Start Examples

### Example 1: Standard Backlog File
```
/sprint @ai_docs/backlogs/mvp-sprint-1.md
```

### Example 2: Feature-Specific Backlog
```
/sprint @ai_docs/backlogs/user-auth-backlog.md
```

### Example 3: Project Root Backlog
```
/sprint @backlog.md
```

## Setup Requirements

### Prerequisites
**Git Repository Setup:**
- Must be run in a git repository with clean working directory
- Recommend creating a dedicated branch or worktree for sprint work
- Ensure you're on the correct branch before starting

**Branch/Worktree Strategy:**
```bash
# Option 1: Feature branch (recommended for most cases)
git checkout -b sprint-feature-batch-1

# Option 2: Git worktree (for parallel sprint execution)
git worktree add ../project-sprint-1 main
cd ../project-sprint-1
```

**Environment Validation:**
- Clean git status: `git status` should show no uncommitted changes
- All dependencies installed and working
- Development server can start without errors
- Tests can run successfully

## 4-Step Execution Process

### Step 1: Setup
**What Happens:**
- Creates `tmp/worklog` directory for agent logging
- Adds worklog directory to .gitignore
- Cleans up any previous sprint worklogs
- Validates environment and git repository state

**What You'll See:**
```
Setting up sprint workspace...
Created tmp/worklog directory
Added worklog to .gitignore
Cleaned previous sprint logs
Validating git repository state... ✓ Clean
```

### Step 2: Plan the Sprint
**What Happens:**
- Reads and parses the specified backlog file
- Analyzes current roadmap progress and completed features
- Identifies available features ready for implementation
- Evaluates dependencies between features
- Assigns sub-agents to specializations and execution phases
- Creates execution plan with 3 phases: Foundation → Features → Integration

**Agent Assignment Process:**
- **Specialization Matching**: Agents receive roles matching feature requirements
- **Phase Assignment**: Agents distributed across Foundation/Features/Integration phases
- **Numbering**: Each agent gets incremental number for worklog tracking
- **Dependency Analysis**: Ensures proper execution order

**What You'll See:**
```
Reading backlog: @ai_docs/backlogs/mvp-sprint-1.md
Analyzing roadmap progress...
Found 8 features total, 3 completed, 5 remaining
Planning execution phases:
  Foundation Phase: 1 agent (database setup)
  Features Phase: 3 agents (auth, catalog, search)
  Integration Phase: 1 agent (testing, docs)
Agent assignments created with worklogs: sprintagent-1.log through sprintagent-5.log
```

### Step 3: Execute the Sprint
Executes three sequential phases with parallel agents within each phase:

#### Phase 1: Foundation (Dependencies & Scaffolding)
**Purpose**: Build shared dependencies, scaffolding, and infrastructure that other features need
**Execution**: Sequential (must complete before Features phase)
**Typical Work**: Database schemas, shared utilities, base components, authentication setup

**What Happens:**
- Launches foundation agents and waits for completion
- Reads agent worklogs and commits foundation work
- Updates backlog with completed foundation tasks
- **Credit Impact**: 1-2 agents running for 15-45 minutes each

#### Phase 2: Features (Main Execution)
**Purpose**: Implement the core features of the sprint
**Execution**: Parallel (all agents run simultaneously)
**Typical Work**: Feature implementation, API endpoints, UI components, business logic

**What Happens:**
- Launches ALL feature agents simultaneously in parallel
- Waits for ALL agents to complete successfully
- Reads all agent worklogs and commits feature work
- Updates backlog with completed features
- **Credit Impact**: 2-6 agents running simultaneously for 30-90 minutes each

#### Phase 3: Integration (Testing & Polish)
**Purpose**: Integration testing, documentation, and final polish
**Execution**: Parallel within phase, sequential after Features
**Typical Work**: End-to-end tests, documentation updates, performance optimization

**What Happens:**
- Launches integration agents after Features phase completes
- Handles testing, documentation, and final polish work
- Commits integration work and updates backlog
- **Credit Impact**: 1-2 agents running for 15-30 minutes each

**Error Handling Per Phase:**
- Failed agents automatically restart (up to 2 retries per agent)
- If any agent fails 3 times, sprint stops with error report
- Worklog preservation for debugging and recovery

### Step 4: Finalize and Report
**What Happens:**
- Scans project for temporary files and cleanup
- Updates backlog file with final sprint progress
- Updates project documentation (CLAUDE.md)
- Makes final cleanup commits
- Generates comprehensive sprint summary report

**Final Deliverables:**
- Clean git history with meaningful commits per phase
- Updated backlog reflecting completed work
- Sprint summary in `tmp/worklog/sprint-<number>.log`
- Updated project documentation

## Worklog System

The sprint command uses a comprehensive worklog system for tracking agent progress and enabling recovery:

### Worklog Structure
```
tmp/worklog/
├── sprintagent-1.log    # Foundation agent worklog
├── sprintagent-2.log    # Feature agent 1 worklog
├── sprintagent-3.log    # Feature agent 2 worklog
├── sprintagent-4.log    # Integration agent worklog
└── sprint-1.log         # Overall sprint summary
```

### Agent Worklog Contents
Each agent maintains a detailed log with:
- **Progress Updates**: Real-time implementation progress
- **Files Touched**: Complete list of modified/created files
- **Challenges**: Problems encountered and solutions
- **Test Results**: TDD progress and test outcomes
- **Summary**: Final summary of completed work

### Sprint Summary Log
The main sprint log contains:
- **Phase Summaries**: What was accomplished in each phase
- **Commit References**: Git commits made during the sprint
- **Agent Performance**: Success/failure rates and timing
- **Backlog Updates**: Features and tasks completed

### Using Worklogs for Recovery
- **Resuming Failed Sprints**: Worklog shows exactly where each agent stopped
- **Debugging Issues**: Detailed error logs and context preservation
- **Progress Tracking**: Monitor sprint progress in real-time
- **Credit Optimization**: Avoid restarting completed work

## Backlog Preparation

### Converting Plans to Backlog Format
Most projects start with high-level plans or PRDs. Here's how to convert them to sprint-ready backlogs:

#### Step 1: Extract Core Features
From your PRD/plan, identify distinct features:
```markdown
# Original Plan
"Build user authentication with registration, login, and profile management"

# Converted to Features
### Feature: User Registration System
### Feature: User Login System  
### Feature: User Profile Management
```

#### Step 2: Define Dependencies
Map which features depend on others:
```markdown
### Feature: User Registration System
**Dependencies:** None
**Status:** Ready

### Feature: User Login System
**Dependencies:** User Registration System
**Status:** Blocked

### Feature: User Profile Management
**Dependencies:** User Login System
**Status:** Blocked
```

#### Step 3: Break Down Into Tasks
Convert feature descriptions into 3-5 specific, actionable tasks:
```markdown
### Feature: User Registration System
**Tasks:**
1. Create user model with email, password hash, and timestamps
2. Implement registration endpoint with input validation
3. Add email verification system with token generation
4. Create registration form component with error handling
5. Write comprehensive unit tests for registration flow
```

#### Step 4: Add Specializations
Assign technical specializations for agent assignment:
```markdown
### Feature: User Registration System
**Specialization:** backend, database, api
**Priority:** High
```

#### Step 5: Set Initial Status
Mark features as Ready/Blocked based on dependencies:
```markdown
### Feature: User Registration System
**Status:** Ready  # No dependencies, can start immediately

### Feature: User Profile Management
**Status:** Blocked  # Depends on registration being complete
```

### Backlog Preparation Checklist
- [ ] All features broken down into 3-5 specific tasks
- [ ] Dependencies clearly mapped between features
- [ ] At least 2-3 features marked as "Ready" for first sprint
- [ ] Specializations assigned (backend, frontend, database, etc.)
- [ ] Priorities set (High/Medium/Low)
- [ ] Acceptance criteria included in task descriptions
- [ ] Testing requirements specified for each feature

## Backlog File Format Requirements

### File Structure
Backlog files must be structured Markdown documents with specific sections:

```markdown
# Project Backlog - [Project Name]

## Roadmap Overview
Brief description of the overall project goals and current status.

## Sprint History
Previous sprint summaries and outcomes.

## Available Features

### Feature: [Feature Name]
**Status:** [Ready/In Progress/Completed/Blocked]
**Dependencies:** [List of prerequisite features or none]
**Specialization:** [backend, frontend, database, api, etc.]
**Priority:** [High/Medium/Low]

**Description:**
Detailed description of the feature requirements.

**Tasks:**
1. Task description with acceptance criteria
2. Another task with specific implementation details
3. Testing requirements and validation steps
4. Documentation updates needed
5. [Maximum 5 tasks per feature]

### Feature: [Next Feature Name]
[Same structure as above]
```

### Required Sections

#### 1. Roadmap Overview
- Project vision and goals
- Current development phase
- Key milestones and progress indicators

#### 2. Sprint History
- Previous sprint outcomes
- Lessons learned
- Velocity and capacity insights

#### 3. Available Features
- Individual feature definitions
- Status tracking (Ready/In Progress/Completed/Blocked)
- Dependency mapping
- Priority levels

### Feature Specification Requirements

#### Status Values
- **Ready**: Feature has no blocking dependencies and is ready for implementation
- **In Progress**: Feature is currently being worked on
- **Completed**: Feature has been fully implemented and tested
- **Blocked**: Feature cannot proceed due to dependencies or external factors

#### Specialization Keywords
Use these keywords to help with agent assignment:
- `backend` - Server-side development, APIs, business logic
- `frontend` - User interface, React/Vue components, user experience
- `database` - Data modeling, queries, migrations, schema design
- `api` - REST/GraphQL API development, endpoint design
- `testing` - Test automation, QA, validation frameworks
- `devops` - Deployment, CI/CD, infrastructure
- `mobile` - Mobile app development, React Native
- `integration` - Third-party services, external APIs

#### Dependency Mapping
List dependencies clearly:
```markdown
**Dependencies:** 
- User Authentication System (must be completed first)
- Database Schema v2 (required for data models)
- None (if no dependencies)
```

## Backlog File Examples

### Example 1: E-Commerce MVP Backlog
```markdown
# E-Commerce Platform Backlog

## Roadmap Overview
Building an MVP e-commerce platform with user auth, product catalog, and checkout flow.
Target launch: Q2 2024. Currently in Phase 1 (core infrastructure).

## Sprint History
**Sprint 1 (Completed):** Database setup, user authentication foundation
**Sprint 2 (In Progress):** Product catalog and inventory management

## Available Features

### Feature: User Registration System
**Status:** Ready
**Dependencies:** None
**Specialization:** backend, database
**Priority:** High

**Description:**
Implement complete user registration with email verification, password validation,
and profile management capabilities.

**Tasks:**
1. Create user model with email, password, and profile fields
2. Implement registration endpoint with validation
3. Add email verification system with tokens
4. Create password reset functionality
5. Write comprehensive unit tests for user registration flow

### Feature: Product Catalog Frontend
**Status:** Ready  
**Dependencies:** Product Catalog API (completed in previous sprint)
**Specialization:** frontend, api
**Priority:** High

**Description:**
Build responsive product listing and detail pages with search and filtering.

**Tasks:**
1. Create product listing component with pagination
2. Implement product detail page with image gallery
3. Add search functionality with filters
4. Integrate with product API endpoints
5. Add responsive design and mobile optimization
```

### Example 2: Backend API Focused Backlog
```markdown
# API Development Backlog

## Roadmap Overview
Building robust REST API for mobile and web clients. Focus on scalability,
security, and comprehensive documentation.

## Available Features

### Feature: Authentication API
**Status:** Ready
**Dependencies:** None
**Specialization:** backend, api, testing
**Priority:** High

**Description:**
JWT-based authentication system with role-based access control.

**Tasks:**
1. Implement JWT token generation and validation
2. Create role-based middleware for route protection
3. Add refresh token mechanism
4. Implement rate limiting for auth endpoints
5. Create comprehensive API documentation

### Feature: User Profile Management
**Status:** Blocked
**Dependencies:** Authentication API
**Specialization:** backend, database
**Priority:** Medium

**Description:**
Complete user profile CRUD operations with file upload support.

**Tasks:**
1. Design user profile data model
2. Create profile CRUD endpoints
3. Implement file upload for profile images
4. Add profile validation and sanitization
5. Write integration tests for profile management
```

## Sub-Agent Management and Parallelization

### Agent Assignment Strategy
The sprint command uses intelligent agent assignment based on:

1. **Feature Specialization Matching**: Agents receive roles that match the feature's technical requirements
2. **Dependency Awareness**: Agents working on dependent features coordinate automatically
3. **Workload Balancing**: Features are distributed to optimize parallel execution
4. **Expertise Allocation**: Complex features get principal-level agent assignments

### Parallel Execution Model
```
Sprint Launch
├── Agent 1: Backend API (Feature A)
├── Agent 2: Frontend Components (Feature B) 
├── Agent 3: Database Schema (Feature C)
└── Agent 4: Integration Tests (Feature D)
     ↓
All agents work simultaneously
     ↓
Completion monitoring and coordination
     ↓
Sprint completion and cleanup
```

### Agent Communication and Coordination
- **Shared Context**: All agents have access to PRD and project documentation
- **Progress Tracking**: Central monitoring of all agent progress
- **Dependency Resolution**: Automatic coordination when Feature B depends on Feature A
- **Failure Handling**: Isolated failures don't affect other agents

### Agent Prompt Template
Each sub-agent receives a specialized prompt:
```
ROLE: Act as a principal software engineer specializing in [SPECIALIZATION]

CONTEXT:
- PRD: @ai_docs/prds/00_pacc_mvp_prd.md
- Helpful documentation: @ai_docs/knowledge/*

INSTRUCTIONS:
1. Implement this feature using test-driven-development
[Feature details and tasks from backlog]
2. Commit your work when finished
3. Report to the main agent with a summary
```

## Error Handling and Recovery Procedures

### Agent Failure Recovery
**Automatic Recovery Process:**
1. **First Failure**: Agent is automatically restarted with full context
2. **Second Failure**: Agent is restarted with additional debugging context
3. **Third Failure**: Escalation to user with detailed failure analysis

**Failure Context Preservation:**
- Git status and uncommitted changes
- Partial implementation progress
- Error messages and debugging information
- Dependencies and integration points

### Common Failure Scenarios and Solutions

#### Compilation/Build Errors
**Detection**: Agent reports build failures or syntax errors
**Recovery**: Agent receives debugging context and specific error details
**Prevention**: Ensure proper development environment setup in backlog

#### Dependency Issues
**Detection**: Agent cannot proceed due to missing dependencies
**Recovery**: Automatic coordination with blocking feature agents
**Prevention**: Clear dependency mapping in backlog file

#### Test Failures
**Detection**: Agent reports failing tests during TDD implementation
**Recovery**: Agent focuses on test fixes with additional test context
**Prevention**: Clear acceptance criteria in feature tasks

#### Git Conflicts
**Detection**: Multiple agents modifying overlapping files
**Recovery**: Intelligent merge conflict resolution with context awareness
**Prevention**: Feature isolation and clear code ownership boundaries

### Monitoring and Diagnostics
The sprint command provides real-time monitoring:
```
Sprint Progress: 3/4 agents active
├── Agent 1 (Backend API): ✓ Completed - 4 commits
├── Agent 2 (Frontend): 🔄 In Progress - implementing component tests
├── Agent 3 (Database): ✓ Completed - schema migration successful  
└── Agent 4 (Integration): ❌ Failed - restarting with debug context
```

## Best Practices for Effective Sprint Execution

### Backlog Preparation
**Before Running Sprint:**
1. **Clear Dependencies**: Ensure all "Ready" features truly have no blockers
2. **Right-Size Features**: Break large features into smaller, manageable chunks
3. **Specific Tasks**: Write detailed, actionable tasks with clear acceptance criteria
4. **Test Requirements**: Include testing expectations in every feature
5. **Documentation Updates**: Plan for README and documentation updates

### Feature Sizing Guidelines
```
# Good Feature Size (2-4 hours per agent)
### Feature: User Login Form
**Tasks:**
1. Create login component with form validation
2. Integrate with authentication API
3. Add error handling and loading states
4. Write component unit tests
5. Update user flow documentation

# Too Large (split into multiple features)
### Feature: Complete User Management System
**Tasks:**
1. Build user registration, login, profile management
2. Implement admin panel with user controls
3. Add role-based permissions system
[This should be 3-4 separate features]

# Too Small (combine with related work)
### Feature: Change Button Color
**Tasks:**
1. Update button CSS from blue to green
[This should be part of a larger UI update feature]
```

### Dependency Management
**Clear Dependency Declaration:**
```markdown
### Feature: User Profile Dashboard
**Dependencies:** 
- User Authentication System (must be 100% complete)
- User Profile API (endpoints must be tested and deployed)
**Status:** Blocked (waiting for dependencies)
```

**Dependency-Free Parallel Work:**
```markdown
### Feature: Product Image Upload
**Dependencies:** None
**Status:** Ready

### Feature: Product Search Filters  
**Dependencies:** None
**Status:** Ready

### Feature: Shopping Cart UI
**Dependencies:** None (uses mock data initially)
**Status:** Ready
```

### Git Workflow and Commit Strategy
**Pre-Sprint Setup:**
- Ensure clean working directory (`git status` should be clean)
- Create feature branch for sprint if needed
- Update from main branch to get latest changes

**During Sprint - Per-Phase Commits:**
- **Foundation Phase**: Single commit after all foundation agents complete
- **Features Phase**: Single commit after all feature agents complete
- **Integration Phase**: Single commit after all integration agents complete
- **Finalization**: Final cleanup commit

**Commit Message Format:**
```bash
git commit -m "feat: foundation phase - database schema and auth setup

- Added user authentication schema (Agent 1)
- Set up database migrations and seeding
- Created shared utility functions

Sprint 1 - Foundation Phase Complete"
```

**Individual Agent Work:**
- Agents do NOT commit their work (per command instructions)
- Work is staged and committed by main sprint coordinator
- Worklogs track individual agent contributions
- Clean, meaningful commits per phase rather than per agent

**Post-Sprint:**
- All work already committed in organized phase-based commits
- No need for squashing - commits are already clean
- Update documentation reflected in final commit

## Advanced Patterns

### "Kage-bunshin-no-jutsu" - Multiple Parallel Sprints
For large projects with independent modules, you can run multiple sprints in parallel using git worktrees:

**Setup Multiple Sprint Environments:**
```bash
# Create separate worktrees for parallel sprints
git worktree add ../project-sprint-frontend main
git worktree add ../project-sprint-backend main
git worktree add ../project-sprint-mobile main

# Run sprints in parallel in different terminals
# Terminal 1:
cd ../project-sprint-frontend
/sprint @ai_docs/backlogs/frontend-sprint-1.md

# Terminal 2: 
cd ../project-sprint-backend
/sprint @ai_docs/backlogs/backend-sprint-1.md

# Terminal 3:
cd ../project-sprint-mobile
/sprint @ai_docs/backlogs/mobile-sprint-1.md
```

**⚠️ Credit Consumption Warning for Parallel Sprints:**
- **Exponential Credit Usage**: Each sprint uses 2-6 agents, parallel sprints multiply this
- **Rate Limit Conflicts**: Multiple sprints may compete for API rate limits
- **Recommended Limit**: Maximum 2 parallel sprints to avoid quota issues
- **Monitor Carefully**: Check credit usage frequently during parallel execution

### Sprint Size Optimization for Credit Management
**Small Sprints (1-2 features):**
- Lower credit consumption
- Faster feedback loops
- Less risk of rate limit issues
- Easier to debug and recover

**Medium Sprints (3-4 features):**
- Balanced efficiency and risk
- Good parallelization opportunities
- Moderate credit consumption
- Recommended for most cases

**Large Sprints (5+ features):**
- High credit consumption
- Higher risk of agent failures
- Longer execution times
- Use only for well-tested workflows

### Rate Limit Management Strategies
**Timing Optimization:**
- Run sprints during off-peak hours (nights, weekends)
- Stagger sprint execution if running multiple sprints
- Monitor Claude API status for known issues

**Sprint Batching:**
```markdown
# Instead of one large sprint:
/sprint @backlogs/mega-sprint.md  # 8 features, 6 agents, 4+ hours

# Break into smaller sprints:
/sprint @backlogs/sprint-1-foundation.md  # 2 features, 2 agents, 1 hour
/sprint @backlogs/sprint-2-features.md    # 3 features, 3 agents, 1.5 hours  
/sprint @backlogs/sprint-3-polish.md      # 3 features, 2 agents, 1 hour
```

### Multi-Sprint Coordination
For large projects, coordinate multiple sprints:

```markdown
# Sprint 1: Foundation
- User authentication
- Database setup  
- Basic API structure

# Sprint 2: Core Features (depends on Sprint 1)
- Product catalog
- User profiles
- Search functionality

# Sprint 3: Advanced Features (depends on Sprint 2)
- Shopping cart
- Payment integration
- Order management
```

### Feature Flag Integration
Plan for gradual rollouts:
```markdown
### Feature: Advanced Search
**Tasks:**
1. Implement search algorithm behind feature flag
2. Create A/B testing framework
3. Add search analytics tracking
4. Create admin toggle for feature activation
5. Document feature flag usage
```

### Performance and Monitoring
Include performance considerations:
```markdown
### Feature: Product Catalog API
**Tasks:**
1. Implement paginated product endpoints
2. Add database query optimization
3. Create performance benchmarks and tests
4. Add monitoring and logging
5. Document API rate limits and usage patterns
```

## Integration with Development Workflow

### Pre-Sprint Checklist
- [ ] Backlog file is complete and up-to-date
- [ ] All "Ready" features have clear, actionable tasks
- [ ] Dependencies are properly mapped and resolved
- [ ] Development environment is properly configured
- [ ] Git workspace is clean and up-to-date

### During Sprint Execution
- **Monitor Progress**: Watch agent status and completion updates
- **Handle Escalations**: Respond to agent failures requiring user input
- **Track Dependencies**: Ensure dependent features coordinate properly
- **Review Commits**: Monitor git commits for quality and completeness

### Post-Sprint Activities
- **Review Implementation**: Test completed features thoroughly
- **Update Documentation**: Ensure README and docs reflect new capabilities
- **Plan Next Sprint**: Update backlog with lessons learned and new priorities
- **Demo and Feedback**: Share completed features with stakeholders

### Continuous Improvement
**Sprint Retrospectives:**
- Analyze agent performance and failure patterns
- Identify backlog improvements for better agent execution
- Refine feature sizing and dependency mapping
- Update development environment and tooling

**Backlog Evolution:**
- Track feature completion velocity
- Adjust task complexity based on agent performance
- Improve task descriptions based on common issues
- Refine specialization assignments for better agent matching

## Troubleshooting

### Common Issues and Solutions

#### "No Ready Features Found"
**Problem**: Backlog has no features with "Ready" status
**Solution**: 
- Review feature dependencies and mark resolved ones as "Ready"
- Ensure proper status values are used (Ready/In Progress/Completed/Blocked)
- Check that feature prerequisites are actually completed

#### "Agent Repeatedly Failing"
**Problem**: Sub-agent fails more than twice on same feature
**Solution**:
- Review feature tasks for clarity and specificity
- Check development environment setup and dependencies
- Simplify complex features into smaller, manageable tasks
- Verify that prerequisite features are truly complete

#### "Sprint Taking Too Long"
**Problem**: Agents running longer than expected
**Solution**:
- Review feature sizing - may be too large for single sprint
- Check for unexpected dependencies or blockers
- Consider splitting large features into smaller ones
- Monitor agent progress and intervene if needed

#### "Git Conflicts Between Agents"
**Problem**: Multiple agents modifying same files causing conflicts
**Solution**:
- Improve feature isolation in backlog planning
- Use clearer file and directory ownership boundaries
- Consider sequential execution for highly coupled features
- Review code architecture for better separation of concerns

#### "Incomplete Feature Implementation"
**Problem**: Agent reports completion but feature seems incomplete
**Solution**:
- Add more specific acceptance criteria to feature tasks
- Include comprehensive testing requirements
- Add verification steps to task descriptions
- Review and improve feature specification quality

### Debugging Failed Sprints
When sprints fail repeatedly:

1. **Analyze the Backlog**: Review feature complexity and task clarity
2. **Check Dependencies**: Ensure all prerequisites are actually complete
3. **Review Environment**: Verify development setup and tool availability
4. **Simplify Features**: Break complex features into smaller, focused tasks
5. **Test Individually**: Try running single features manually to identify issues
6. **Check Credit Limits**: Ensure sufficient credits before launching large sprints
7. **Review Worklogs**: Examine agent worklogs for patterns in failures

### Credit and Rate Limit Troubleshooting

#### "Rate Limit Exceeded" Errors
**Problem**: Agents failing due to Claude API rate limits
**Solutions**:
- Wait 10-15 minutes before retrying
- Reduce sprint size (fewer parallel agents)
- Run sprints during off-peak hours
- Check Claude API status page for known issues

#### "Insufficient Credits" Errors
**Problem**: Account running out of credits mid-sprint
**Solutions**:
- Check credit balance before starting sprints
- Use smaller sprint sizes to conserve credits
- Purchase additional credits before large sprints
- Monitor credit usage during execution

#### Agent Timeout Issues
**Problem**: Agents taking too long and timing out
**Solutions**:
- Break large features into smaller tasks
- Reduce complexity of individual tasks
- Check if agents are waiting for rate limits
- Verify development environment is properly set up

---

**Remember**: The `/sprint` command is designed for efficient, automated development sprints with significant credit consumption. Success depends on well-structured backlog files, clear feature specifications, proper dependency management, and adequate credit budgeting. When in doubt, start with smaller, simpler features to build confidence and understand credit usage patterns before tackling complex multi-agent sprints.
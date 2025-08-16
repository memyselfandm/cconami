# `/sprint` Command Usage Guide

## Overview
The `/sprint` command provides an intelligent sprint execution system that reads backlog files, analyzes roadmaps and dependencies, and launches parallel sub-agents to implement features simultaneously. It's designed for efficient, automated development sprints with comprehensive project management and git workflow integration.

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

## Command Workflow: 5-Phase Execution

### Phase 1: Backlog Analysis and Roadmap Review
**What Happens:**
- Reads and parses the specified backlog file
- Analyzes current roadmap progress and completed features
- Identifies available features ready for implementation
- Evaluates dependencies between features
- Determines parallelization opportunities

**What You'll See:**
```
Reading backlog file: @ai_docs/backlogs/mvp-sprint-1.md
Analyzing roadmap progress...
Found 8 features total, 3 completed, 5 remaining
Identified 3 features ready for parallel implementation
Dependencies analyzed: Feature B depends on Feature A completion
```

### Phase 2: Sprint Planning and Agent Assignment
**What Happens:**
- Selects optimal features for the current sprint based on dependencies
- Plans parallel execution strategy
- Assigns specializations to each feature (backend, frontend, database, etc.)
- Prepares context and task specifications for each sub-agent
- Validates that all prerequisites are met

**Sprint Selection Criteria:**
- Features with no blocking dependencies
- Features that can be parallelized effectively
- Optimal team size (typically 2-4 parallel agents)
- Estimated complexity and time considerations

### Phase 3: Parallel Sub-Agent Launch
**What Happens:**
- Launches all assigned sub-agents simultaneously using the Task tool
- Each agent receives specialized context and role assignment
- Agents work independently on their assigned features
- Parallel execution begins across all selected features

**Sub-Agent Assignments Include:**
- Sprint context and overall goals
- Specific feature and task details from backlog
- Role specialization (e.g., "backend API development", "React frontend")
- Quality standards and testing requirements
- PRD references and documentation links

### Phase 4: Execution Monitoring and Management
**What Happens:**
- Monitors progress of all running sub-agents
- Handles agent failures and recovery procedures
- Manages communication between dependent agents
- Tracks completion status across all features

**Failure Recovery:**
- Automatic restart for failed agents (up to 2 retries)
- Context preservation for resumed work
- Escalation to user after repeated failures

### Phase 5: Sprint Completion and Cleanup
**What Happens:**
- Reviews all unstaged changes and removes temporary files
- Updates project documentation (README, etc.)
- Updates backlog file with completed tasks and progress notes
- Makes final commits for clean workspace
- Generates comprehensive sprint report

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

### Git Workflow Integration
**Pre-Sprint Setup:**
- Ensure clean working directory (`git status` should be clean)
- Create feature branch for sprint if needed
- Update from main branch to get latest changes

**During Sprint:**
- Each agent commits work independently
- Meaningful commit messages with feature context
- Regular intermediate commits to prevent work loss

**Post-Sprint:**
- Clean up any temporary or debugging code
- Squash commits if needed for cleaner history
- Update documentation to reflect new features

## Advanced Usage Patterns

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

---

**Remember**: The `/sprint` command is designed for efficient, automated development sprints. Success depends on well-structured backlog files, clear feature specifications, and proper dependency management. When in doubt, start with smaller, simpler features to build confidence before tackling complex multi-agent sprints.
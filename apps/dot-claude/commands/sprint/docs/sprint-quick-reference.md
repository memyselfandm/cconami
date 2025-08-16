# `/sprint` Quick Reference Guide

## Command Syntax
```bash
/sprint @backlog.md                      # Execute sprint from backlog file (PLAN mode required)
/sprint @ai_docs/backlogs/mvp.md         # Common backlog path
/sprint @planning/sprint-backlog.md      # Alternative backlog location
```

**IMPORTANT:** Must be run from PLAN mode in Claude Code.

## Sprint Execution Overview

### 4-Step Process
1. **Setup** - Create worklog folder, cleanup previous runs
2. **Plan Sprint** - Analyze backlog, assign agents to phases
3. **Execute** - Run 3 execution phases with sub-agents
4. **Finalize** - Cleanup, update backlog, final commits

### 3 Execution Phases
| Phase | Purpose | Execution | Duration |
|-------|---------|-----------|----------|
| **Foundation** | Dependencies & scaffolding | Sequential | 5-15 min |
| **Features** | Main implementation | **Parallel** | 15-60+ min |
| **Integration** | Testing & polish | Parallel | 10-20 min |

## Quick Setup Checklist

### Pre-Sprint Requirements
- [ ] Switch to PLAN mode in Claude Code
- [ ] Ensure backlog file exists and is well-formatted
- [ ] Dependencies are clearly identified
- [ ] PRD and documentation are up to date
- [ ] Git workspace is clean

### During Sprint
- [ ] Monitor worklog files: `tmp/worklog/sprintagent-N.log`
- [ ] Watch for failed agents (max 2 retries per phase)
- [ ] Track completion status in backlogs

### Post-Sprint
- [ ] Review `tmp/worklog/sprint-<number>.log` summary
- [ ] Verify backlog updates
- [ ] Check final commits

## Backlog Conversion Template

### Convert Existing Backlogs
```markdown
# Add these sections to your existing backlog:

## Sprint Planning Context
- **Current Sprint:** [number] of [total]
- **Phase:** [Foundation/Features/Integration]
- **Parallelization:** [Independent/Sequential/Mixed]

## Execution Phases
### Foundation Phase
- [ ] Feature dependencies that must be built first
- [ ] Shared components and scaffolding

### Features Phase  
- [ ] Main feature implementations (parallel execution)
- [ ] Independent feature modules

### Integration Phase
- [ ] Testing and validation
- [ ] Documentation updates
- [ ] Final polish and cleanup
```

## Backlog File Format Templates

### Basic Backlog Structure
```markdown
# Project Backlog

## Current Sprint Status
- Sprint: 1 of 3
- Target: MVP Release
- Dependencies: None

## Features

### Feature 1: User Authentication
**Priority:** High
**Dependencies:** None
**Effort:** Medium

**Description:** Implement secure user login/logout system

**Tasks:**
- [ ] Create user model and database schema
- [ ] Implement JWT authentication middleware
- [ ] Build login/logout API endpoints
- [ ] Add password hashing and validation
- [ ] Create user registration workflow

### Feature 2: Dashboard UI
**Priority:** High
**Dependencies:** User Authentication
**Effort:** Large

**Description:** Build main user dashboard interface

**Tasks:**
- [ ] Design responsive dashboard layout
- [ ] Implement navigation components
- [ ] Add user profile display
- [ ] Create data visualization widgets
- [ ] Add real-time data updates
```

### Advanced Backlog with Parallelization
```markdown
# E-commerce Platform Backlog

## Roadmap
- **Phase 1:** Core Platform (Weeks 1-4)
- **Phase 2:** Advanced Features (Weeks 5-8)
- **Phase 3:** Optimization (Weeks 9-12)

## Sprint 2 Scope
**Parallel Track A: Frontend**
- Product Catalog UI
- Shopping Cart Interface

**Parallel Track B: Backend**
- Payment Processing
- Inventory Management

**Sequential Dependencies:**
1. Database Schema → API Endpoints → Frontend Integration

## Features

### Product Catalog System
**Track:** Backend + Frontend
**Parallelizable:** Yes
**Dependencies:** Database setup

**Backend Tasks:**
- [ ] Product model and migrations
- [ ] Category management API
- [ ] Search and filtering endpoints
- [ ] Image upload handling

**Frontend Tasks:**
- [ ] Product listing components
- [ ] Category navigation
- [ ] Search interface
- [ ] Product detail pages
```

## Sub-Agent Prompt Template

### Standard Template
```
VARIABLES:
$agentnumber: [ASSIGNED NUMBER]
$worklog: `tmp/worklog/sprintagent-$agentnumber.log`

ROLE: Act as a principal software engineer specializing in [SPECIALIZATIONS]

CONTEXT:
<optional PRD reference, if provided in backlog>
- PRD: @ai_docs/prds/00_pacc_mvp_prd.md
</optional PRD reference>
- Helpful documentation: @ai_docs/knowledge/*

FEATURE:
[Assigned FEATURE, TASKS, and ACCEPTANCE CRITERIA from backlog file]

INSTRUCTIONS:
1. Implement this feature using test-driven-development. Write meaningful, honest tests that will validate complete implementation of the feature.
2. Do not commit your work.
3. Log your progress in $worklog using markdown.
4. When you've completed your work, summarize your changes along with a list of files you touched in $worklog
5. Report to the main agent with a summary of your work.
```

### Specialized Templates by Domain

#### Frontend Specialist
```
ROLE: Act as a senior frontend engineer specializing in React/TypeScript and UI/UX design

CONTEXT:
- Design System: @docs/design-system.md
- Component Library: @src/components/
- API Documentation: @docs/api-spec.yaml

SPECIALIZATION FOCUS:
- Responsive design implementation
- Component reusability and composition
- State management patterns
- Performance optimization
```

#### Backend Specialist
```
ROLE: Act as a senior backend engineer specializing in API development and database design

CONTEXT:
- Database Schema: @docs/database-schema.md
- API Standards: @docs/api-guidelines.md
- Security Requirements: @docs/security-spec.md

SPECIALIZATION FOCUS:
- RESTful API design
- Database optimization
- Security implementation
- Error handling and logging
```

#### DevOps Specialist
```
ROLE: Act as a DevOps engineer specializing in CI/CD and infrastructure automation

CONTEXT:
- Deployment Guide: @docs/deployment.md
- Infrastructure: @infra/
- Monitoring: @monitoring/

SPECIALIZATION FOCUS:
- Container orchestration
- Pipeline automation
- Monitoring and alerting
- Security scanning
```

## Sprint Patterns

### Sequential Pattern
```
Features → Dependencies → Order
A → None → 1st
B → A → 2nd
C → A,B → 3rd
```
**Use When:** Strong dependencies, shared resources, learning from previous features

### Parallel Pattern
```
Features → Dependencies → Execution
A → None → Parallel
B → None → Parallel
C → None → Parallel
```
**Use When:** Independent features, sufficient team capacity, clear boundaries

### Mixed Pattern
```
Phase 1: A,B (parallel)
Phase 2: C (depends on A)
Phase 3: D (depends on B,C)
```
**Use When:** Some dependencies exist, want to maximize parallelization

## Rate Limit Management Tips

### Managing Claude Credits
- **Foundation Phase:** Usually 1-2 agents, moderate usage
- **Features Phase:** 3-6+ agents in parallel, **high usage**
- **Integration Phase:** 1-3 agents, moderate usage

### Credit Conservation Strategies
- Start with smaller sprints (1-3 features) to gauge usage
- Break large features into smaller, focused tasks
- Use specific specializations to reduce trial-and-error
- Provide clear acceptance criteria to minimize rework
- Monitor worklog files to catch issues early

### Warning Signs
- Multiple agent retries (check task clarity)
- Agents generating excessive code changes
- Unclear feature specifications leading to rework

## Worklog File Patterns

### Individual Agent Logs
```
tmp/worklog/sprintagent-1.log    # Agent 1 progress
tmp/worklog/sprintagent-2.log    # Agent 2 progress  
tmp/worklog/sprintagent-N.log    # Agent N progress
```

### Sprint Summary Log
```
tmp/worklog/sprint-1.log         # Overall sprint summary
tmp/worklog/sprint-2.log         # Next sprint summary
```

### Monitoring Commands
```bash
# Watch all agent progress
tail -f tmp/worklog/sprintagent-*.log

# Check specific agent
cat tmp/worklog/sprintagent-3.log

# Sprint summary
cat tmp/worklog/sprint-1.log
```

## Quick Examples by Project Type

### Web Application Sprints
```bash
# Frontend-heavy sprint
/sprint @backlogs/ui-components.md
# Features: Navigation, Forms, Dashboard widgets

# Full-stack feature sprint  
/sprint @backlogs/user-management.md
# Features: Auth, Profile, Permissions

# Integration sprint
/sprint @backlogs/third-party.md
# Features: Payment, Email, Analytics
```

### API/Backend Sprints
```bash
# Data model sprint
/sprint @backlogs/database-design.md
# Features: Schema, Migrations, Indexes

# API endpoints sprint
/sprint @backlogs/rest-api.md
# Features: CRUD operations, Validation, Auth

# Performance sprint
/sprint @backlogs/optimization.md
# Features: Caching, Monitoring, Scaling
```

### Full-Stack Feature Sprints
```bash
# E-commerce feature
/sprint @backlogs/shopping-cart.md
# Features: Cart API, Cart UI, Checkout flow

# Social features
/sprint @backlogs/social.md
# Features: Comments, Likes, Sharing

# Admin features
/sprint @backlogs/admin-panel.md
# Features: User management, Analytics, Settings
```

### Bug Fix Sprints
```bash
# Critical bugs
/sprint @backlogs/hotfixes.md
# Features: Security patches, Data corruption, Performance

# UI/UX improvements
/sprint @backlogs/ui-fixes.md
# Features: Responsive issues, Accessibility, Polish

# Performance optimization
/sprint @backlogs/perf-fixes.md
# Features: Query optimization, Memory leaks, Loading times
```

## Time Expectations by Sprint Size

### Small Sprint (1-3 features)
- **Planning:** 5-10 minutes
- **Execution:** 15-45 minutes
- **Completion:** 5 minutes
- **Total:** 25-60 minutes

### Medium Sprint (4-6 features)
- **Planning:** 10-15 minutes
- **Execution:** 30-90 minutes
- **Completion:** 10 minutes
- **Total:** 50-115 minutes

### Large Sprint (7+ features)
- **Planning:** 15-25 minutes
- **Execution:** 60-180+ minutes
- **Completion:** 15 minutes
- **Total:** 90-220+ minutes

### Factors Affecting Duration
- **Code complexity** (simple CRUD vs complex algorithms)
- **Test coverage requirements** (unit, integration, e2e)
- **Documentation depth** (inline comments vs full docs)
- **Integration complexity** (standalone vs many dependencies)
- **Team experience** (familiar stack vs new technology)

## Git Workflow Integration

### Pre-Sprint Git Setup
```bash
# Ensure clean workspace
git status
git stash  # if needed

# Create feature branch for sprint
git checkout -b sprint-2-user-features
git push -u origin sprint-2-user-features
```

### During Sprint Git Patterns
```bash
# Sub-agents will create commits like:
# "Implement user authentication API endpoints"
# "Add login/logout UI components"
# "Create user registration workflow"

# Monitor progress with:
git log --oneline --since="1 hour ago"
git status
```

### Post-Sprint Git Cleanup
```bash
# Review all changes
git log --oneline origin/main..HEAD

# Create PR for sprint
gh pr create --title "Sprint 2: User Management Features" \
  --body "Implements authentication, profiles, and permissions"

# Or merge to main if using trunk-based development
git checkout main
git merge sprint-2-user-features
git push origin main
```

### Branching Strategies

#### Feature Branch per Sprint (Recommended)
```
main → sprint-1-auth → merge
main → sprint-2-dashboard → merge
main → sprint-3-payments → merge
```

#### Feature Branch per Sub-Agent
```
main → auth-backend → merge
main → auth-frontend → merge
main → dashboard-ui → merge
```

#### Trunk-Based (Advanced)
```
main ← direct commits from sub-agents
```

## Common Sprint Configurations

### MVP Development Sprint
```markdown
## Features
- Core user flows (login, signup, main feature)
- Basic UI/UX (responsive, accessible)
- Essential integrations (auth, database)

## Pattern: Mixed (auth first, then parallel UI/backend)
## Duration: 60-120 minutes
## Agents: 2-3 specialists
```

### Feature Addition Sprint
```markdown
## Features
- New feature implementation
- Integration with existing system
- Tests and documentation

## Pattern: Sequential (design → backend → frontend → integration)
## Duration: 45-90 minutes
## Agents: 2-3 specialists
```

### Bug Fix Sprint
```markdown
## Features
- Critical bug fixes
- Performance improvements
- Technical debt reduction

## Pattern: Parallel (independent fixes)
## Duration: 30-60 minutes  
## Agents: 3-5 specialists
```

### Refactoring Sprint
```markdown
## Features
- Code organization
- Performance optimization
- Documentation updates

## Pattern: Sequential (dependencies matter for refactoring)
## Duration: 45-75 minutes
## Agents: 2-3 specialists
```

## Troubleshooting Quick Fixes

### "Sub-agent failed multiple times"
→ Check for unclear requirements, missing context, or technical blockers

### "Features taking longer than expected"
→ Break down into smaller tasks, check for hidden dependencies

### "Git conflicts during sprint"
→ Ensure proper branching strategy, coordinate file changes

### "Tests failing after sprint"
→ Sub-agents may need better test context, add test examples to backlog

### "Documentation out of sync"
→ Include documentation updates as explicit tasks in backlog

### "Sprint scope too large"
→ Split into multiple smaller sprints, focus on MVP per sprint

## Pro Tips

### Backlog Optimization
- Keep features at 3-5 tasks each
- Be specific about acceptance criteria
- Include technical constraints upfront
- Reference related PRDs and docs

### Sub-Agent Success
- Provide clear specialization keywords
- Include relevant context files
- Specify quality standards explicitly
- Give concrete examples when possible

### Sprint Monitoring
- Check progress every 15-30 minutes
- Look for stuck agents early
- Validate commits as they happen
- Keep sprint scope flexible

### Git Integration
- Use descriptive branch names
- Enable branch protection if needed
- Plan merge strategy before sprint
- Include sprint summary in PR descriptions

---

**Pro Tip:** Start with small sprints to calibrate timing and sub-agent effectiveness before attempting larger feature implementations!
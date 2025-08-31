---
allowed-tools: mcp__linear__get_issue, mcp__linear__list_issues, mcp__linear__create_issue, mcp__linear__update_issue, mcp__linear__list_comments, mcp__linear__list_teams, mcp__linear__list_issue_labels
argument-hint: <issue-id-or-url> [--interactive] [--output-format <type>] [--validate-only]
description: Transform a Linear issue into a comprehensive, shovel-ready epic using AI-optimized PRD template
---

# /refine-epic - Convert Linear Issue to Shovel-Ready Epic

## Command Purpose
Transform a minimal Linear issue into a comprehensive, AI-ready epic using the full AI-optimized Epic/PRD template. This ensures AI coding agents have maximum context for epic breakdown, sprint planning, and implementation.

## Usage
```
/refine-epic <issue-id-or-url> [options]
```

### Parameters
- **issue-id-or-url** (required): Linear issue identifier (e.g., "PROJ-123") or full Linear URL
- **--team <name>** (optional): Target Linear team if different from source issue
- **--interactive** (optional): Step through template sections with guided prompts
- **--output-format <type>** (optional): Output format - `epic-issue` (default), `notion-page`, `markdown-file`
- **--validate-only** (optional): Check issue accessibility and preview current content

## Step-by-Step Process

### 1. Issue Analysis & Context Gathering
**Retrieve and analyze the source Linear issue:**
- Fetch issue details using Linear MCP `get_issue` 
- Extract current title, description, labels, and comments
- Identify the team, project, and current status
- Gather any linked issues, PRs, or dependencies
- Check for existing epic relationships

**Context expansion:**
- Search for related issues in the same team/project using `list_issues`
- Look for similar features or components already implemented
- Identify relevant team members and stakeholders from issue history
- Extract any technical constraints from existing codebase context

**Validation checks:**
- [ ] Issue exists and is accessible
- [ ] User has permission to view/edit the issue
- [ ] Team/project context is available
- [ ] Issue is appropriate for epic expansion (not already a detailed epic)

### 2. Interactive Template Population

**For Refine Mode:**
- Analysis of existing issue content
- Intelligent prompts for missing critical information
- Cross-referencing with related Linear issues
- Suggestions based on detected patterns

**For Create Mode - Comprehensive Prompts:**
Guide through all template sections interactively:
1. Problem Statement (required)
2. User Stories (required)
3. Acceptance Criteria (required)
4. Technical Requirements (required)
5. Success Metrics (optional but recommended)
6. User Journeys (optional)
7. Data & State Management (if applicable)
8. Integration Points (if applicable)
9. Testing Strategy (optional)
10. Rollout Plan (optional)

### Template Section Breakdown

#### **Executive Context**
```
Prompt Flow:
1. Extract product name from Linear team/project
2. Auto-assign Epic ID (suggest format: EPIC-[team-prefix]-[number])
3. Infer priority from existing issue priority or prompt user
4. Estimate complexity based on description length and scope
```

#### **Problem Space**
```
Interactive Prompts:
- "What's the current reality users face? (extracted: [current description])"
- "What specific pain points does this address?"
- "Describe the ideal end state after this epic"
- "What business metrics will this impact?"

AI Analysis:
- Extract pain points from existing issue description
- Identify missing context areas
- Suggest business value based on feature type
```

#### **User Journeys**
```
Smart Templates by Issue Type:
- Authentication features → Login/signup flows
- Dashboard features → Navigation and data viewing
- API features → Integration and usage flows
- DevOps features → Deployment and monitoring flows

Interactive Flow:
1. "Who is the primary user of this feature?"
2. "What triggers them to use this feature?"
3. "Walk through their ideal experience step-by-step"
4. "What could go wrong? How should errors be handled?"
```

#### **Success Criteria**
```
Auto-Generation Framework:
- Convert vague goals into measurable outcomes
- Add performance requirements based on feature type
- Include test coverage and quality gates
- Suggest monitoring and alerting criteria

Template Prompts:
- "How will you know this epic is functionally complete?"
- "What performance standards must this meet?"
- "What quality gates are required?"
```

#### **Technical Context**
```
Linear Integration:
- Extract technical labels from issue (frontend, backend, etc.)
- Identify affected system components from description
- Suggest architectural touchpoints based on feature type
- Include links to related Linear issues and dependencies

Smart Prompts:
- "What existing systems does this touch?"
- "Are there any hard technical constraints?"
- "What code areas should AI agents examine first?"
```

#### **Feature Decomposition Hints**
```
AI-Powered Analysis:
- Break down scope into logical feature groups
- Identify dependency chains and parallel work opportunities
- Suggest foundation → features → integration phases
- Flag high-complexity areas needing research

Output Structure:
1. Foundation Phase (minimize - only true blockers)
2. Features Phase (maximize - 70-90% of work)
3. Integration Phase (finalize - testing and docs)
```

#### **Data & State Management**
```
Context-Aware Prompts:
- Database features → Schema changes and relationships
- Frontend features → Client state and caching
- API features → Server state and persistence
- Real-time features → WebSocket/polling requirements

Auto-Detection:
- Scan for database-related keywords
- Identify state management patterns from description
- Suggest appropriate data flow architectures
```

#### **Integration Points**
```
System Analysis:
- Cross-reference with existing Linear issues to find integration patterns
- Identify common external services used by the team
- Suggest API contract changes based on feature requirements
- Map to existing authentication and authorization systems
```

#### **Testing Strategy**
```
Feature-Type Templates:
- UI features → E2E testing focus
- API features → Integration testing focus
- Algorithm features → Unit testing focus
- Security features → Penetration testing requirements

Smart Suggestions:
- Critical user workflows from user journeys
- Edge cases from problem space analysis
- Performance testing based on success criteria
```

#### **Non-Functional Requirements**
```
Intelligent Defaults:
- Performance baselines from similar features
- Security requirements based on data sensitivity
- Scalability projections from business context
- Accessibility standards from team practices

Context Prompts:
- "What performance is required?"
- "What security considerations apply?"
- "What's the expected scale/growth?"
```

#### **Documentation & Knowledge**
```
Auto-Generated List:
- API docs for backend features
- User guides for frontend features
- Architecture docs for system changes
- Deployment guides for infrastructure changes

Team Pattern Detection:
- Analyze team's documentation patterns from other issues
- Suggest appropriate documentation types
- Include knowledge transfer requirements
```

#### **Rollout & Monitoring**
```
Feature Flag Strategy:
- Suggest feature flags for user-facing changes
- Recommend gradual rollout for high-risk features
- Include rollback strategies for critical systems

Observability:
- Business metrics from success criteria
- Technical metrics from performance requirements
- User metrics from user journey analysis
```

### 3. AI Agent Guidance Generation

**Parallelization Analysis:**
- Analyze feature decomposition for dependency patterns
- Categorize features as definitely parallel, possibly parallel, or sequential
- Provide explicit guidance for AI epic-breakdown command
- Estimate output scale (features, tasks, total issues)

**Special Considerations:**
- Extract unique aspects from original issue
- Identify patterns to follow from team's previous work
- Flag anti-patterns based on past issues or failures
- Include implementation hints specific to the technology stack

### 4. Output Generation & Validation

#### **Epic Issue Creation** (default output)
```
Create comprehensive Linear issue:
- Title: "Epic: [Original Title]"
- Description: Full template populated with gathered information
- Labels: Add "epic", "shovel-ready", plus existing relevant labels
- Priority: Carry over or upgrade from source issue
- Parent: Link to original issue as parent if appropriate
- Project: Keep in same project or suggest epic-appropriate project
```

#### **Alternative Output Formats**
```
Notion Page:
- Create structured Notion page with template
- Include all gathered context and analysis
- Link back to Linear issue
- Format for easy sharing and collaboration

Markdown File:
- Generate standalone markdown file
- Include all template sections
- Format for version control or documentation systems
- Include metadata headers for easy parsing
```

### 5. Validation & Quality Assurance

**Completeness Check:**
- [ ] All template sections populated with meaningful content
- [ ] Success criteria are measurable and testable
- [ ] Technical context provides sufficient guidance for AI agents
- [ ] User journeys cover primary and error scenarios
- [ ] Feature decomposition enables parallel execution
- [ ] Dependencies are clearly identified

**AI-Readiness Validation:**
- [ ] Sufficient technical context for implementation decisions
- [ ] Clear parallelization guidance provided
- [ ] Acceptance criteria are objectively testable
- [ ] Integration points are explicitly defined
- [ ] Edge cases and error handling specified

**Team Alignment Check:**
- [ ] Consistent with team's technical patterns
- [ ] Follows established architectural principles
- [ ] Uses team's preferred documentation formats
- [ ] Aligns with current sprint/project priorities

## Command Output Examples

### **Standard Flow**
```
🔍 Analyzing Linear issue PROJ-123...
✅ Issue found: "Add user authentication system"
📋 Team: Chronicle, Project: Core Features
🔄 Populating AI-optimized epic template...

📝 Gathering Context:
  ✅ Extracted basic requirements from description
  ✅ Found 3 related authentication issues
  ✅ Identified technical stack: React + FastAPI + PostgreSQL
  ✅ Detected integration points: OAuth, JWT tokens

🤖 AI-Optimization Analysis:
  📦 Estimated 4-6 features across 3 phases
  🔧 Foundation: JWT infrastructure, user schema
  ⚡ Features: Login, signup, password reset, OAuth (parallel)
  🔗 Integration: Security testing, documentation

✅ Epic created: EPIC-CHRON-001
🔗 View: https://linear.app/chronicle/issue/EPIC-CHRON-001
📊 Ready for /epic-breakdown command
```

### **Interactive Mode**
```
🔍 Found issue PROJ-123: "Add user authentication system"

📋 Let's flesh this out into a shovel-ready epic...

Executive Context:
  Product: Chronicle ✅ (auto-detected)
  Epic ID: EPIC-CHRON-001 ✅ (auto-generated)
  Priority: P1 ❓ What priority should this epic have? [P0-P4]: P1
  Complexity: Large ❓ This looks like a Large epic. Agree? [y/n]: y

Problem Space:
  Current Reality: ❓ What authentication challenges do users face today?
  > Currently no authentication system, users can't secure their data
  
  Desired Reality: ❓ What should the ideal authentication experience be?
  > Secure, fast login with multiple options (email/password, OAuth)
  
  Business Value: ❓ Why is this important for the business?
  > Enables user accounts, data security, and premium features

[Continue through each section...]

✅ Epic template complete! Creating Linear issue...
```

### **Validation Mode**
```
🔍 Analyzing issue PROJ-123 for epic potential...

✅ Issue Analysis:
  - Title: "Add user authentication system"
  - Team: Chronicle
  - Current Status: Backlog
  - Labels: backend, security, p1
  - Description: 2 paragraphs (expandable)

📋 Epic Expansion Potential: HIGH
  - Complex feature requiring multiple components
  - Cross-system integration requirements
  - Multiple user-facing capabilities
  - Clear parallelization opportunities

🤖 AI-Readiness Assessment:
  ❌ Missing technical constraints
  ❌ No clear success criteria
  ❌ Limited implementation guidance
  ✅ Good basic scope definition

📊 Recommended: Proceed with epic expansion
   Estimated effort: 2-3 hours for comprehensive template
```

## Integration with Epic Workflow

**Post-Epic Creation:**
```bash
# Immediate next steps
/epic-breakdown EPIC-CHRON-001  # Convert epic to features/tasks
/sprint-plan --epic EPIC-CHRON-001  # Create sprint project(s)
/sprint-execute sprint-2024-12-01  # Deploy AI agents
```

**Quality Gates:**
- Epic must pass AI-readiness validation before breakdown
- All template sections must have meaningful content
- Success criteria must be objectively measurable
- Technical context must provide sufficient implementation guidance

## Error Handling

**Common Issues & Solutions:**
```
❌ "Issue not found" 
   → Verify issue ID format and team access permissions

❌ "Insufficient permissions"
   → Check Linear workspace access and issue permissions

❌ "Issue too small for epic"
   → Suggest keeping as feature-level issue or combining with related work

❌ "Issue already detailed"
   → Offer to enhance existing content or create child epic

❌ "Template section incomplete"
   → Provide specific prompts for missing information
   → Offer to continue with partial content and flag for review
```

**Recovery & Continuation:**
```
- Save progress to temporary state for long interactive sessions
- Allow resuming from specific template sections
- Provide partial output if user interrupts process
- Offer to update existing epic instead of creating new one
```

## Advanced Options

**Batch Processing:**
```bash
# Process multiple related issues
/epic-dev PROJ-123,PROJ-124,PROJ-125 --combine-epic

# Process all issues in a project
/epic-dev --project "Core Features" --filter "label:enhancement"
```

**Template Customization:**
```bash
# Use team-specific template variations
/epic-dev PROJ-123 --template team-backend
/epic-dev PROJ-123 --template team-frontend

# Skip specific sections
/epic-dev PROJ-123 --skip rollout,monitoring
```

**Integration Mode:**
```bash
# Auto-create follow-up commands
/epic-dev PROJ-123 --auto-breakdown --auto-sprint-plan

# Connect to external documentation
/epic-dev PROJ-123 --link-figma --link-github-discussions
```

## Benefits

**For Product Managers:**
- Systematic approach to epic definition
- Consistent template usage across team
- Built-in AI-optimization for development efficiency
- Integration with existing Linear workflow

**For AI Development:**
- Maximum context for implementation decisions
- Clear parallelization guidance
- Comprehensive acceptance criteria
- Technical constraints and preferences explicit

**For Team Collaboration:**
- Shared understanding of epic scope and requirements
- Clear success criteria and definition of done
- Documented technical and business context
- Structured approach to complex feature planning
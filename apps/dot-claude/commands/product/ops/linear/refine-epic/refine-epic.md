---
allowed-tools: mcp__linear__get_issue, mcp__linear__list_issues, mcp__linear__create_issue, mcp__linear__update_issue, mcp__linear__list_comments, mcp__linear__list_teams, mcp__linear__list_issue_labels, Task, Glob, Grep
argument-hint: [issue-id-or-url] [--lite] [--analyze-codebase] [--interactive] [--team <name>] [--title <text>]
description: Transform a Linear issue into a comprehensive epic using full PRD or lite 1-pager template, with optional codebase analysis
---

# /refine-epic - Convert Linear Issue to Shovel-Ready Epic

## Command Purpose
Transform a minimal Linear issue into a comprehensive, AI-ready epic using either the full AI-optimized Epic/PRD template or a lightweight 1-pager template. Optionally enhance with codebase analysis for better technical grounding. This ensures AI coding agents have maximum context for epic breakdown, sprint planning, and implementation.

## Usage

### Multi-Mode Operation
```bash
# Mode 1: Refine existing epic (default: comprehensive)
/refine-epic CCC-123 [options]

# Mode 2: Refine with lightweight template
/refine-epic CCC-123 --lite

# Mode 3: Refine with codebase analysis
/refine-epic CCC-123 --analyze-codebase

# Mode 4: Combined lite + analysis
/refine-epic CCC-123 --lite --analyze-codebase

# Mode 5: Create new epic from scratch
/refine-epic --team "Team Name" --title "Epic Title"

# Mode 6: Interactive mode for guided refinement
/refine-epic CCC-123 --interactive
```

### Parameters
- **issue-id-or-url** (optional): Linear issue ID or URL. If omitted with --team, creates new epic
- **--lite** (optional): Use lightweight 1-pager template instead of comprehensive PRD
- **--analyze-codebase** (optional): Add lightweight codebase analysis to inform epic refinement
- **--team <name>** (optional): Target Linear team (required for create mode)
- **--title <text>** (optional): Initial title for new epic (create mode)
- **--interactive** (optional): Step through template sections with guided prompts
- **--validate-only** (optional): Check issue accessibility and preview current content
- **--skip-validation** (optional): Skip readiness checks for faster refinement (lite mode only)

## Template Selection

### Choose Template Based on Flags

**Comprehensive PRD Template (default):**
- Use when --lite flag is NOT present
- Best for production features, multi-team work
- 12+ sections with deep detail
- 30+ minutes to complete

**Lightweight 1-Pager Template (--lite):**
- Use when --lite flag IS present
- Perfect for MVPs, personal projects, hackathons
- 6 essential sections only
- 5 minutes to complete

**Codebase Analysis Enhancement (--analyze-codebase):**
- Works with either template
- Adds lightweight technical context
- Launches parallel analysis agents
- Enhances Technical Approach section

## Step-by-Step Process

### Step 0: Mode Detection
```python
# Determine operation mode
if issue_id_provided:
    mode = "refine"
    issue = mcp__linear__get_issue(issue_id)
else:
    mode = "create"
    if not team_provided:
        error("--team required for create mode")

# Select template
if lite_flag:
    template = "lite"  # 1-pager
else:
    template = "comprehensive"  # Full PRD

# Enable analysis if requested
if analyze_codebase_flag:
    enable_codebase_analysis = True
```

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

#### For Comprehensive Template (Default)

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

#### For Lite Template (--lite Flag)

**Quick 1-Pager Focus:**
1. Problem Statement (2-3 sentences max)
2. Solution Overview (5 key points)
3. Success Criteria (5-6 measurable items)
4. Technical Approach (1 paragraph, enhanced with --analyze-codebase)
5. Feature Breakdown (3-6 features)
6. Risks & Dependencies (only critical)

**Interactive Prompts (Lite Mode):**
```
For Refine Mode - Only ask for missing essentials:
❓ What problem does this solve? (if not clear)
❓ What's the main approach? (if vague)
❓ When is this successful? (if no criteria)

For Create Mode - Quick 5-question flow:
1️⃣ What problem does this solve? (2-3 sentences)
2️⃣ How will you solve it? (3-5 bullet points)
3️⃣ What does success look like? (3-5 criteria)
4️⃣ Technical approach? (1 paragraph or skip)
5️⃣ What features? (list 3-5 or auto-generate)
```

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

### 2A. Codebase Analysis Enhancement (--analyze-codebase Flag)

When the `--analyze-codebase` flag is present, perform lightweight reconnaissance:

```python
# Lightweight Codebase Analysis
if analyze_codebase:
    # Infer technical areas from epic description
    analysis_areas = extract_technical_areas(epic_description)
    # Examples: "authentication", "API", "database", "frontend components"
    
    # Launch parallel analysis agents (lightweight, not full breakdown)
    analysis_tasks = []
    for area in analysis_areas:
        agent_prompt = f"""
        Quick codebase check for {area}:
        1. Check if related code exists in project directories
        2. Use Glob to find main files/components: **/*{area}*
        3. Use Grep to identify existing patterns or constraints
        4. Note any ai_docs/knowledge/* relevant to {area}
        5. Return brief technical context (1 paragraph)
        
        Focus on:
        - Existing implementations to follow
        - Architectural patterns in use
        - Technical constraints or requirements
        - Integration points
        """
        analysis_tasks.append(Task(agent_prompt))
    
    # Synthesize findings
    technical_context = synthesize_analysis_results(analysis_tasks)
    
    # Enhance epic template with findings
    if template == "lite":
        epic_template['technical_approach'] += f"\n\nCodebase Context:\n{technical_context}"
    else:
        epic_template['technical_context'] += f"\n\nCodebase Analysis:\n{technical_context}"
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

#### **Epic Issue Creation** (adapts to template type)

**For Comprehensive Template (default):**
```
Create comprehensive Linear issue:
- Title: "Epic: [Original Title]"
- Description: Full PRD template populated with all 12+ sections
- Labels: Add "epic", "shovel-ready", plus existing relevant labels
- Priority: Carry over or upgrade from source issue
- Parent: Link to original issue as parent if appropriate
- Project: Keep in same project or suggest epic-appropriate project
```

**For Lite Template (--lite flag):**
```python
refined_description = f"""
# Epic: {title}

## 🎯 Problem
{problem_statement}

## 💡 Solution
{solution_bullets}

## ✅ Success Criteria
{success_checkboxes}

## 🛠 Technical Approach
{tech_paragraph}
{codebase_context if analyze_codebase else ""}

## 📦 Features
{feature_list}

## ⚠️ Risks & Dependencies
{risks_if_any}

---
*Refined with /refine-epic --lite for quick epic definition*
"""

mcp__linear__update_issue(
    id=issue_id,
    title=f"Epic: {title}",
    description=refined_description,
    labels=["epic", "epic-lite"] + existing_labels
)
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

### **Standard Flow (Comprehensive Template)**
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

### **Lite Template Mode (--lite)**
```
/refine-epic CCC-123 --lite

🚀 Quick Epic Refinement Starting...
📋 Found epic: "Build notification system"
⚡ Using lightweight 1-pager template

🔍 Quick Assessment:
  ✅ Has basic description
  ⚠️ Missing clear problem statement
  ⚠️ No success criteria

💬 Let's quickly fill in the gaps:
  
  Problem this solves? 
  > Users miss important updates and can't configure alerts

  Main success criteria? (what makes this done?)
  > Users can subscribe to events, receive real-time notifications, manage preferences

📝 Generating lean epic...

✅ Epic refined: CCC-123
⏱️ Time: 3 minutes
📄 Size: 1 page (vs 5+ for full epic)
🔗 View: https://linear.app/team/issue/CCC-123
```

### **With Codebase Analysis (--analyze-codebase)**
```
/refine-epic CCC-123 --analyze-codebase

🔍 Analyzing Linear issue CCC-123...
✅ Issue found: "Add user authentication system"

🔬 Launching codebase analysis agents...
  Agent-1: Analyzing authentication patterns...
  Agent-2: Checking existing user models...
  Agent-3: Reviewing API structure...
  
📊 Codebase Analysis Results:
  ✅ Found existing JWT utilities in lib/auth/
  ✅ User model exists in models/user.ts
  ✅ API follows REST patterns with middleware
  ⚠️ No OAuth implementation found
  
🔄 Enhancing epic with codebase context...

✅ Epic created with technical grounding: EPIC-CHRON-001
📊 Technical context enhanced with actual codebase patterns
```

### **Combined Lite + Analysis**
```
/refine-epic CCC-123 --lite --analyze-codebase

🚀 Quick Epic with Codebase Context
📋 Using 1-pager template + technical analysis

🔬 Quick codebase scan...
  ✅ Found relevant patterns in 3 areas
  
📝 Generating lean epic with technical context...

✅ Epic refined: CCC-123
⏱️ Time: 5 minutes
📄 Size: 1 page with codebase insights
🎯 Ready for breakdown with technical grounding
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
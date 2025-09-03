---
allowed-tools: mcp__linear__get_issue, mcp__linear__list_issues, mcp__linear__update_issue, mcp__linear__create_issue, mcp__linear__list_comments, mcp__linear__list_teams, mcp__linear__list_issue_labels
argument-hint: [feature-id-or-url] [--team <name>] [--parent-epic <id>] [--interactive] [--create-subtasks]
description: Refine Linear features with AI templates and right-sizing - refine existing or create new from ideas
---

# /refine-feature - Refine Linear Feature with AI-Optimized Template

## Command Purpose
Transform a basic Linear feature issue into a comprehensive, AI-ready feature specification using proven templates and right-sizing logic from epic breakdown. This ensures features are properly scoped, have clear acceptance criteria, and include well-defined subtasks for efficient AI agent execution.

## Usage

### Dual-Mode Operation
```bash
# Mode 1: Refine existing feature
/refine-feature PROJ-456 [options]

# Mode 2: Create new feature from idea
/refine-feature --team "Team Name" [options]
```

### Parameters
- **feature-id-or-url** (optional): Linear feature ID or URL. If omitted, creates new feature
- **--team <name>** (required for create mode): Target Linear team
- **--parent-epic <id>** (optional): Link to parent epic (useful in create mode)
- **--interactive** (optional): Step through refinement sections with guided prompts
- **--create-subtasks** (optional): Automatically generate and create subtasks
- **--validate-only** (optional): Check readiness without changes (refine mode only)

## Step-by-Step Process

### Step 0: Mode Detection
```python
if feature_id_provided:
    # REFINE MODE - enhance existing feature
    mode = "refine"
    feature = mcp__linear__get_issue(feature_id)
else:
    # CREATE MODE - build new feature from scratch
    mode = "create"
    if not team_provided:
        prompt_for_team()
```

### 1A. Refine Mode: Feature Analysis & Readiness

**Retrieve and analyze the source Linear feature:**
- Fetch feature details using Linear MCP `get_issue`
- Extract current title, description, labels, and comments
- Identify parent epic (if exists) for context
- Check for existing subtasks or related issues
- Assess current completeness level

### 1B. Create Mode: Feature Setup

**Build new feature from idea:**
```
🆕 Creating New Feature

📝 What feature do you want to build?
> [User provides feature description]

🏷️ Feature title?
> [User provides or auto-generate]

🔗 Parent epic? (optional, ID or skip)
> [Link to epic if part of larger initiative]

[Continue with feature template...]
```

**Minimum Readiness Criteria:**
```
Feature Readiness Checklist:
- [ ] Clear, specific title (not vague like "Update UI")
- [ ] Description with functional requirements
- [ ] User story OR clear functional requirement
- [ ] At least 3 acceptance criteria
- [ ] Technical context or implementation hints
- [ ] Complexity estimated (small/medium/large)
- [ ] Priority set (P0-P4)
```

**Readiness Decision:**
- If missing critical elements, provide specific guidance
- Offer to proceed with partial refinement if 4+ criteria met
- Block if less than 3 criteria met (too vague to refine)

### 2. Feature Right-Sizing Analysis

**AI Agent Feature Sizing Guidelines:**
```
SMALL Feature (1-2 days for AI agent):
- Single component or endpoint
- Clear acceptance criteria (3-5 items)
- No external dependencies
- 1-3 subtasks
- Examples: Add button, create simple API endpoint, update config

MEDIUM Feature (2-3 days for AI agent):
- Multiple related components
- 5-8 acceptance criteria
- Some integration required
- 3-5 subtasks
- Examples: Complete form with validation, CRUD operations, integration

LARGE Feature (3-5 days for AI agent):
- Complete subsystem or workflow
- 8-12 acceptance criteria
- Multiple integrations
- 5-8 subtasks
- Examples: Full authentication flow, complex dashboard, data pipeline

⚠️ If larger than LARGE: Recommend splitting into multiple features
```

**Size Assessment:**
- Analyze current feature scope
- If oversized, provide splitting recommendations
- If undersized, check if it should be a task instead

### 3. Feature Template Population

**Gather information through:**
- Existing issue content analysis
- Parent epic context (if available)
- Related issues and patterns
- Intelligent prompts for missing sections

### Feature Template Structure

#### **Feature Summary**
```
Prompt Flow:
1. Extract or generate user story
2. Identify business value
3. Confirm complexity estimate
4. Set execution phase if part of epic
```

#### **Functional Requirements**
```
Analysis Areas:
- What the feature does (behavior)
- User interactions and flows
- Data inputs and outputs
- Edge cases and error handling
```

#### **Technical Requirements**
```
Technical Context:
- Core implementation approach
- Technical area (frontend/backend/database/etc.)
- Existing patterns to follow
- New components or modifications needed
- Integration points
```

#### **Acceptance Criteria**
```
Criteria Framework:
- Convert vague requirements to measurable outcomes
- Include functional tests (Given/When/Then format)
- Add performance requirements if applicable
- Include error handling scenarios
- Minimum 3, maximum 12 criteria
```

#### **Execution Context**
```
Planning Elements:
- Dependencies on other features
- Can parallelize with (if part of epic)
- Agent specialization needed
- Estimated complexity and effort
```

#### **Definition of Done**
```
Standard Checklist:
- [ ] All acceptance criteria met
- [ ] Tests written and passing
- [ ] No regressions introduced
- [ ] Code reviewed (if applicable)
- [ ] Documentation updated
- [ ] Linear status updated to Done
```

### 4. Subtask Generation

**Analyze feature for implementation steps:**
```python
Subtask Analysis:
1. Break down into logical implementation units
2. Each subtask should be completable in 2-4 hours
3. Maximum 5 subtasks (split feature if more needed)
4. Include at least one testing subtask
```

**Subtask Template:**
```markdown
## Subtask: [Component/Area]: [Action]

### Scope
- Specific changes to make
- Files to modify
- Components to create/update

### Technical Details
- Implementation approach
- Patterns to follow
- Dependencies

### Testing Approach
- Unit tests needed
- Integration tests
- Manual testing steps

### Acceptance Criteria
- [ ] Specific deliverable 1
- [ ] Specific deliverable 2
- [ ] Tests pass
```

### 5. Output Generation & Updates

#### **For Create Mode:**
```python
new_feature = mcp__linear__create_issue(
    team=team_name,
    title=feature_title,
    description=refined_description,
    labels=["type:feature", f"complexity:{size}"],
    parentId=parent_epic_id if provided else None,
    priority=priority
)
print(f"✅ Created feature: {new_feature.identifier}")
print(f"🔗 View: {new_feature.url}")

if create_subtasks:
    create_subtasks_for_feature(new_feature.id)
```

#### **For Refine Mode:**
```python
mcp__linear__update_issue(
    id=feature_id,
    description=refined_description,
    labels=updated_labels
)
print(f"✅ Refined feature: {feature.identifier}")

if create_subtasks:
    create_subtasks_for_feature(feature_id)
```

## Command Output Examples

### **Create Mode: New Feature from Idea**
```
/refine-feature --team "Chronicle" --parent-epic CCC-6

🆕 Creating New Feature

📝 What feature do you want to build?
> Add OAuth login with Google and GitHub

🏷️ Feature title?
> OAuth Social Login Integration

👤 User story?
> As a user, I want to login with my Google or GitHub account so I can access the app without creating a new password

🎯 Acceptance criteria? (3-5 items)
> - Google OAuth works
> - GitHub OAuth works  
> - Account linking for existing users
> - Error handling for failed auth

🔍 Size assessment:
  Analyzing scope... MEDIUM (3-5 subtasks, 2-3 days)
  ✅ Size appropriate for single feature

🛠 Technical approach?
> Use Passport.js for OAuth, store tokens securely, link to existing accounts by email

📦 Generate subtasks? (y/n): y
  Creating 4 subtasks:
  1. Backend: OAuth strategy setup
  2. Frontend: Social login buttons
  3. Backend: Account linking logic
  4. Testing: E2E auth flow tests

✅ Feature created: CHRON-457
📦 4 subtasks created
🔗 View: https://linear.app/chronicle/issue/CHRON-457
```

### **Refine Mode: Existing Feature**
```
🔍 Analyzing Linear feature PROJ-456...
✅ Feature found: "Add user profile editing"
📋 Team: Chronicle, Parent Epic: User Management

📊 Readiness Assessment:
  ✅ Clear title and description
  ✅ User story present
  ⚠️ Only 2 acceptance criteria (need 3+)
  ❌ Missing technical context
  ✅ Complexity: MEDIUM

🔧 Right-Sizing Analysis:
  Current: MEDIUM (appropriate size)
  Estimated: 3-5 subtasks needed
  Parallelizable: Yes (with other profile features)

📝 Refining Feature:
  ✅ Generated comprehensive user story
  ✅ Expanded to 6 acceptance criteria
  ✅ Added technical requirements
  ✅ Defined 4 implementation subtasks

✅ Feature refined: PROJ-456
🔗 View: https://linear.app/chronicle/issue/PROJ-456
📊 Ready for AI agent execution
```

### **Interactive Mode**
```
🔍 Found feature PROJ-456: "Add user profile editing"

📋 Let's refine this feature for AI execution...

Feature Summary:
  User Story: ❓ Current: "As a user, I want to edit my profile"
  > Enhance this? [y/n]: y
  > "As a user, I want to edit my profile information including name, 
    email, and avatar so that I can keep my account information current"

Functional Requirements:
  ❓ What specific fields can users edit?
  > Name, email, avatar image, bio, timezone
  
  ❓ Are there any validation rules?
  > Email must be unique, name required, avatar max 5MB

Technical Requirements:
  ❓ Frontend framework/approach?
  > React with existing form components
  
  ❓ Backend API pattern?
  > REST API with PATCH endpoint

[Continue through sections...]

Generate Subtasks? [y/n]: y
  ✅ Created 4 subtasks:
  1. Backend: Update user profile API endpoint
  2. Frontend: Create profile edit form component
  3. Frontend: Add image upload for avatar
  4. Testing: Add E2E tests for profile editing
```

### **Validation Mode**
```
🔍 Analyzing feature PROJ-456 readiness...

✅ Feature Analysis:
  - Title: "Add user profile editing"
  - Team: Chronicle
  - Status: Backlog
  - Labels: frontend, p2
  - Description: 1 paragraph (needs expansion)

📋 Readiness Score: 4/7
  ✅ Clear title
  ✅ Basic description
  ✅ Priority set
  ✅ Team assigned
  ❌ Missing user story
  ❌ Insufficient acceptance criteria (only 2)
  ❌ No technical context

🔧 Size Assessment: MEDIUM
  - Scope appears appropriate
  - No splitting needed
  - Could benefit from 3-5 subtasks

📊 Recommendation: Proceed with refinement
   Missing elements can be generated/inferred
```

## Integration with Workflow

**Pre-Refinement:**
```bash
# Check epic for context
/linear:get-epic EPIC-CHRON-001

# Review related features
/linear:list-features --epic EPIC-CHRON-001
```

**Post-Refinement:**
```bash
# Execute with AI agent
/agent-execute PROJ-456

# Or add to sprint
/sprint-plan --add-feature PROJ-456
```

## Error Handling

**Common Issues & Solutions:**
```
❌ "Feature not found"
   → Verify issue ID and team access

❌ "Issue is not a feature"
   → Check if issue is labeled as epic or task
   → Suggest appropriate refine command

❌ "Feature too vague"
   → Requires manual input before refinement
   → Provide specific examples of missing info

❌ "Feature already refined"
   → Offer to re-refine with latest template
   → Or enhance specific sections only

❌ "Parent epic not ready"
   → Suggest refining epic first
   → Or proceed with standalone feature
```

## Advanced Options

**Batch Processing:**
```bash
# Refine multiple features
/refine-feature PROJ-456,PROJ-457,PROJ-458

# Refine all features in epic
/refine-feature --epic EPIC-CHRON-001 --all
```

**Partial Refinement:**
```bash
# Only update specific sections
/refine-feature PROJ-456 --only acceptance-criteria,subtasks

# Skip sections
/refine-feature PROJ-456 --skip technical-requirements
```

## Benefits

**For Product Teams:**
- Consistent feature specifications
- Clear acceptance criteria
- Proper scope management
- Better estimation accuracy

**For AI Development:**
- Well-defined implementation path
- Clear subtask breakdown
- Technical context included
- Testable acceptance criteria

**For Quality:**
- Comprehensive test coverage planning
- Clear definition of done
- Edge cases identified
- Performance requirements explicit
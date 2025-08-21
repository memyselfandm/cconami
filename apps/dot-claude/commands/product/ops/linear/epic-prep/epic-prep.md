---
allowed-tools: mcp__linear__*, Write
argument-hint: --team <team-name> --epic <epic-id> [--execute]
description: (*Run from PLAN mode*) Analyze and prepare a Linear epic for sprint execution by ensuring proper structure and completeness
---

# Epic Preparation Command
Analyze a Linear epic to ensure it's properly structured with features and tasks, fix metadata gaps, match orphan features, and report readiness for sprint execution.

## Usage
- `--team <name>`: (Required) Linear team name
- `--epic <id>`: (Required) Epic issue ID to prepare
- `--execute`: (Optional) Apply changes (default is dry-run mode showing planned changes)

## Instructions

### Step 1: Gather Epic Context
1. **Fetch Epic Details**:
   - Use `mcp__linear__get_issue` with epic ID
   - Extract: title, description, objectives, priority, labels, state
   - Parse description for goals, success criteria, scope

2. **Get Team Context**:
   - Use `mcp__linear__get_team` to get team ID and metadata
   - Use `mcp__linear__list_issue_labels` to understand available labels
   - Use `mcp__linear__list_issue_statuses` to get workflow states

3. **Analyze Current Epic Structure**:
   - Use `mcp__linear__list_issues` with parentId=epic_id to get direct children
   - For each child, check if it has sub-issues (feature vs task)
   - Build hierarchy map: Epic → Features → Tasks
   - Identify loose tasks not under features

### Step 2: Epic Completeness Analysis

1. **Parse Epic Objectives**:
   ```
   From epic description, identify:
   - Core features needed (look for bullets, sections, "must have")
   - Technical components (frontend, backend, database, API)
   - Non-functional requirements (performance, security, testing)
   - Success metrics and acceptance criteria
   ```

2. **Map Existing Coverage**:
   ```
   For each identified objective/component:
   - Check if matching feature exists in epic
   - Assess completeness of feature's subtasks
   - Note gaps in coverage
   ```

3. **Feature Gap Identification**:
   ```
   Missing features detected when:
   - Epic mentions component with no corresponding feature
   - Technical area has no representation (e.g., no testing features)
   - Acceptance criteria references unimplemented functionality
   - Common patterns missing (e.g., API needs auth but no auth feature)
   ```

### Step 3: Orphan Feature Discovery

1. **Query Potential Orphans**:
   - Use `mcp__linear__list_issues` with:
     - team filter
     - No parent (orphan features)
     - State = backlog/todo
     - Has child issues (indicates feature-level)

2. **Alignment Analysis**:
   ```
   Score each orphan (0-100):
   +30: Title keywords match epic domain
   +20: Labels overlap with epic labels
   +20: Description references epic concepts
   +15: Technical stack alignment
   +10: Similar priority level
   +5: Created around same time as epic
   
   Only match if score >= 70 (high confidence)
   ```

3. **Conservative Matching Rules**:
   - Never force-match ambiguous features
   - Prefer creating new features over questionable matches
   - Document matching reasoning for review

### Step 4: Feature Structure Creation

1. **Feature Template**:
   ```markdown
   Title: [Epic Short Name] - [Feature Area]
   Example: "Auth System - User Registration"
   
   Description:
   ## Overview
   [2-3 sentences about the feature]
   
   ## Acceptance Criteria
   - [ ] [Specific measurable outcome]
   - [ ] [User-facing functionality]
   - [ ] [Technical requirement]
   
   ## Technical Approach
   [Brief technical direction if known]
   
   ## Dependencies
   - [Other features this depends on]
   - [External services/APIs needed]
   ```

2. **Subtask Structure**:
   Each feature should have 3-7 subtasks:
   ```
   Required:
   - "Implement [Feature] core functionality"
   - "Add tests for [Feature]"
   
   Conditional (add based on complexity):
   - "Design [Feature] API/interface"
   - "Create [Feature] database schema/migrations"  
   - "Implement [Feature] UI components"
   - "Add [Feature] documentation"
   - "Integrate [Feature] with [System]"
   ```

3. **Metadata Standards**:
   ```
   Features inherit from epic:
   - Priority (same as epic)
   - Sprint/cycle (if epic has one)
   - Project (if epic has one)
   
   Features should have:
   - Labels: [technical-area], [complexity], [component]
   - Estimate: Based on subtask count (S=1-2, M=3-4, L=5+)
   - Assignee: Leave empty for sprint planning
   ```

### Step 5: Metadata Correction

1. **Priority Alignment**:
   - All features inherit epic priority
   - Subtasks inherit feature priority
   - Fix any priority mismatches

2. **Label Standardization**:
   ```
   Required labels:
   - Technical area: frontend, backend, database, api, infrastructure
   - Complexity: complexity-low, complexity-medium, complexity-high
   - Component: Based on epic domain
   - Type: feature, task, bug, improvement
   ```

3. **Description Enhancement**:
   For issues with poor descriptions:
   ```
   Add sections:
   - **Goal**: What this accomplishes
   - **Acceptance Criteria**: How we know it's done
   - **Technical Notes**: Implementation guidance
   ```

4. **Relationship Fixes**:
   - Ensure all tasks have feature parents
   - Set proper blocks/blocked-by relationships
   - Fix orphaned subtasks

### Step 6: Change Execution

1. **Dry Run Mode (Default)**:
   ```markdown
   ## 🔍 Epic Analysis: [Epic Title]
   
   ### Current State
   - Features: X found
   - Tasks: Y found (Z orphaned)
   - Coverage: N% of objectives
   
   ### Planned Changes
   
   #### 🆕 New Features to Create (X)
   1. **[Feature Name]**
      - Reason: [Gap identified]
      - Subtasks: [List]
   
   #### 🔗 Orphan Features to Match (Y)
   1. **[Orphan Feature]** → Epic
      - Confidence: X%
      - Reasoning: [Alignment factors]
   
   #### 🔧 Metadata Fixes (Z)
   1. Issue [ID]: [Fix description]
   
   ### No Changes Applied (dry-run)
   To execute: Add --execute flag
   ```

2. **Execute Mode**:
   When --execute flag present:
   ```
   For each new feature:
   - mcp__linear__create_issue with feature details
   - mcp__linear__create_issue for each subtask
   - Set proper parent relationships
   
   For each orphan match:
   - mcp__linear__update_issue to set parentId
   - Add comment explaining match
   
   For each metadata fix:
   - mcp__linear__update_issue with corrections
   - Add audit comment if significant change
   ```

### Step 7: Readiness Assessment

1. **Completeness Metrics**:
   ```
   Calculate scores:
   - Feature Coverage: % of objectives with features
   - Task Coverage: % of features with proper subtasks  
   - Metadata Quality: % with priorities, labels, descriptions
   - Dependency Clarity: % with defined relationships
   ```

2. **Risk Assessment**:
   ```
   Identify risks:
   - 🔴 High: Missing critical features
   - 🟡 Medium: Incomplete task breakdown
   - 🟢 Low: Minor metadata gaps
   ```

3. **Final Report**:
   ```markdown
   # 📋 Epic Preparation Report
   
   ## Epic: [Title] ([ID])
   Team: [Team Name]
   
   ## 📊 Actions Taken
   
   ### New Features Created: X
   - [Feature]: [Reason for creation]
   
   ### Orphan Features Matched: Y
   - [Feature]: [Match confidence]%
   
   ### Metadata Corrections: Z
   - Priority fixes: A
   - Label additions: B
   - Description improvements: C
   
   ## 🎯 Readiness Assessment
   
   ### Completeness: XX%
   - ✅ Feature Coverage: XX%
   - ✅ Task Breakdown: XX%
   - ⚠️ Metadata Quality: XX%
   - ✅ Dependencies Mapped: XX%
   
   ### Ready for Sprint: [YES/NO]
   
   [If YES]:
   ✅ Epic is ready for sprint execution
   - Recommended sprint size: [Small/Medium/Large]
   - Estimated agent count: X
   - Parallelization potential: High/Medium/Low
   
   Next step: Run `/lsprint --team [team] --epic [epic-id]`
   
   [If NO]:
   ❌ Epic needs further preparation
   
   Required actions:
   1. [Specific action needed]
   2. [Another requirement]
   
   Recommended:
   - [Optional improvement]
   - [Best practice suggestion]
   
   ## 🔄 Change Summary
   - Issues created: X
   - Issues modified: Y
   - Relationships updated: Z
   
   ## 📝 Audit Trail
   All changes logged as Linear comments with:
   - Timestamp
   - Change type
   - Reasoning
   ```

### Step 8: Edge Cases

1. **Massive Epics**:
   - If >30 features needed, suggest splitting epic
   - Recommend phased approach

2. **Vague Epics**:
   - If objectives unclear, report this
   - Suggest epic refinement before feature creation
   - Provide template for epic description improvement

3. **Conflicting Structure**:
   - If existing structure conflicts with best practices
   - Document current state
   - Propose migration path

4. **External Dependencies**:
   - Identify blockers outside team control
   - Flag in risk assessment
   - Suggest mitigation strategies

## Feature Creation Examples

### Example 1: API Feature
```
Title: User System - REST API
Description:
## Overview
RESTful API endpoints for user management including CRUD operations, authentication, and authorization.

## Acceptance Criteria
- [ ] All endpoints follow REST conventions
- [ ] Proper HTTP status codes returned
- [ ] Request/response validation implemented
- [ ] API documentation generated

Subtasks:
1. Design User API schema and endpoints
2. Implement User CRUD endpoints
3. Add authentication middleware
4. Implement authorization checks
5. Add API tests
6. Generate OpenAPI documentation
```

### Example 2: Frontend Feature
```
Title: User System - Registration Flow
Description:
## Overview  
Multi-step registration form with validation, error handling, and email verification.

## Acceptance Criteria
- [ ] Form validates input client-side
- [ ] Graceful error handling
- [ ] Email verification flow works
- [ ] Responsive on mobile

Subtasks:
1. Design registration UI components
2. Implement form validation logic
3. Connect to registration API
4. Add email verification handling
5. Add registration flow tests
```

## Notes
- Always preserve existing work - never delete issues
- Use conservative matching for orphans
- Add audit comments for traceability
- Respect team's existing conventions when found
---
allowed-tools: mcp__linear__*
argument-hint: --team <team-name> --epic <epic-id> [--max-sprints <number>]
description: (*Run from PLAN mode*) Break down a Linear epic into focused sprint projects, prioritizing parallelization and avoiding dependency clashes
---

# Linear Multi-Sprint Planning Command
Analyze a Linear epic and break it down into focused sprint projects. Group features into sprints, prioritizing parallelization and avoiding dependency clashes.

## Usage
- `--team <name>`: (Required) Linear team name containing the epic
- `--epic <epic-id>`: (Required) Epic ID to break down into sprints
- `--max-sprints <number>`: (Optional) Maximum number of sprints to create. Default: 6

## Instructions

### Step 1: Gather Epic Context

1. **Query Epic and Team Details**:
   - Use `mcp__linear__get_issue` to get epic details
   - Use `mcp__linear__get_team` to get team info
   - Use `mcp__linear__list_projects` to find existing sprint projects with pattern `[EPIC-ID].S[NN]`
     ```
     Look for: CHR-25.S01, CHR-25.S02, etc.
     Extract highest NN value and start from NN+1
     If no existing sprints for this epic, start with .S01
     ```

2. **Get Epic Children (WITH PAGINATION)**:
   - Use `mcp__linear__list_issues` with:
     ```
     parentId: [epic-id]  // ONLY direct children of the epic
     limit: 50           // Use pagination to avoid token limits
     ```
   - If nextPageToken returned, make additional calls until all children retrieved
   - CRITICAL: Only get issues where parentId exactly matches the epic ID
   - Do NOT use team filters or other criteria that would pull in unrelated issues

2. **Analyze Epic Scope**:
   ```
   Epic Analysis:
   - Total features: [count]
   - Total tasks: [count] 
   - Priority distribution: [P0: X, P1: Y, P2: Z, P3: W]
   - Technical areas: [frontend, backend, database, testing, docs]
   - Blocking relationships: [map dependencies between issues]
   ```

### Step 2: Sprint Grouping Strategy

**Core Principle**: Group features into sprints, prioritizing parallelization and avoiding dependency clashes.

1. **Identify Dependencies**:
   ```
   Map blocking relationships:
   - Issues that block others (must go in earlier sprints)
   - Issues that are blocked (must go in later sprints)
   - Issues with no dependencies (can be flexibly placed)
   ```

2. **Sprint Ordering Logic**:
   ```
   Sprint 1: Critical blockers + Foundation
   - P0 issues that block other work
   - Shared infrastructure/components that others depend on
   - Database migrations/schema changes
   
   Sprint 2-N: Feature groups with minimal cross-dependencies
   - Group related features together
   - Ensure features in same sprint don't conflict
   - Balance complexity across sprints
   - Prefer smaller, focused sprints over large ones
   
   Final Sprint: Integration + Polish
   - Testing and validation work
   - Documentation completion
   - Final integration tasks
   ```

3. **Sprint Sizing Preference**:
   ```
   Target: Small to medium sprints (3-8 issues)
   - Easier to test and integrate
   - Less risk of pattern deviation
   - Cleaner agent coordination
   - Avoid large sprints (9+ issues) due to complexity risks
   ```

### Step 3: Create Sprint Breakdown

1. **Generate Sprint Plan**:
   ```markdown
   ## Epic Sprint Breakdown: [Epic Title]
   
   **Epic**: [Epic ID] - [Epic Title]
   **Total Issues**: [count] ([X] features, [Y] tasks)
   **Sprint Count**: [N] sprints
   
   ### Sprint [EPIC-ID].S01: [Focus Area]
   **Issues** ([count] total):
   - [ISSUE-ID]: [Title] (P[priority])
   - [Continue for all issues...]
   
   **Rationale**: [Why these issues are grouped together]
   **Dependencies**: [What this sprint delivers for future sprints]
   
   ### Sprint [EPIC-ID].S02: [Focus Area]
   **Issues** ([count] total):
   - [ISSUE-ID]: [Title] (P[priority])
   - [Continue for all issues...]
   
   **Rationale**: [Why these issues are grouped together]
   **Dependencies**: [What this sprint requires from previous sprints]
   
   [Continue for all sprints...]
   
   ### Sprint Dependencies
   - Sprint S02 requires: [Deliverables from S01]
   - Sprint S03 requires: [Deliverables from S01, S02]
   - [Map all cross-sprint dependencies]
   ```

### Step 4: Create Sprint Projects in Linear (Skip if --dry-run)

**If --dry-run flag is provided**: Skip project creation and only output the sprint breakdown plan.

**If not dry-run**: Create the actual Linear projects:

1. **Create Each Sprint Project**:
   ```
   For each sprint in the breakdown:
   
   1. Use mcp__linear__create_project with:
      - name: [EPIC-ID].S[NN] (e.g., "CHR-25.S02")
      - teamId: From team query
      - description: Sprint focus and execution strategy
   
   2. Move assigned issues to sprint:
      - Use mcp__linear__update_issue to set projectId
      - Update status to "Planned"
   ```

2. **Sprint Project Description Template**:
   ```markdown
   ## Sprint: [Focus Area Description]
   
   **Epic**: [Epic ID] - [Epic Title]
   **Sprint**: [X] of [Total] in epic breakdown
   
   ## Issues ([COUNT] total)
   - [ISSUE-ID]: [Title] (P[priority], [labels])
   - [Continue for all issues...]
   
   ## Sprint Focus
   [1-2 sentences explaining why these issues are grouped together]
   
   ## Dependencies
   **Requires from previous sprints**:
   - [Specific deliverable from Sprint SXX]
   - [Specific deliverable from Sprint SYY]
   
   **Delivers for future sprints**:
   - [Deliverable needed by Sprint SXX]
   - [Deliverable needed by Sprint SYY]
   
   ## Agent Execution Strategy
   
   ### Parallelization Within Sprint
   - Independent work streams: [NUMBER]
   - Technical areas: [areas that can work in parallel]
   - Agent specializations: [suggested groupings]
   
   ### Execution Phases
   **Phase 1: Foundation** ([count] issues if needed)
   - [Issues that must complete first within this sprint]
   
   **Phase 2: Features** ([count] issues - majority)
   - [Issues that can run in parallel]
   
   **Phase 3: Integration** ([count] issues if needed)
   - [Final testing/validation within this sprint]
   
   ## Success Criteria
   - [ ] All [COUNT] issues moved to Done
   - [ ] [Sprint-specific deliverables completed]
   - [ ] Ready for next sprint execution
   ```

### Step 5: Generate Sprint Report

**For --dry-run**: Show the complete sprint breakdown plan
**For actual execution**: Show created projects with Linear URLs

```markdown
🎯 Epic Sprint Breakdown: [Epic Title] (--dry-run mode)

📊 Epic Analysis:
  - Epic ID: [EPIC-ID]
  - Total Issues: [COUNT] (direct children only)
  - Priority Distribution: [X] P0, [Y] P1, [Z] P2, [W] P3
  - Technical Areas: [list areas]

🚀 Proposed Sprint Plan: [X] Focused Sprints

### [EPIC-ID].S01: [Focus Area]
  📦 [COUNT] issues
  🎯 [Sprint objective]
  📋 Issues: [list all issues with IDs and titles]

### [EPIC-ID].S02: [Focus Area]
  📦 [COUNT] issues
  🎯 [Sprint objective]
  ⚠️  Requires: [Dependencies from S01]
  📋 Issues: [list all issues with IDs and titles]

[Continue for all sprints...]

📋 Next Steps:
  - Review sprint breakdown
  - Run without --dry-run to create projects:
    /sprint-plan --team [team] --epic [epic-id]
  - Or execute first sprint:
    /sprint-execute --project "[EPIC-ID].S01"
```

## Sprint Grouping Patterns

### Pattern 1: Foundation → Features → Integration
```
S01: Critical fixes and shared infrastructure
S02: Core feature group A
S03: Core feature group B  
S04: Advanced features
S05: Integration and polish
```

### Pattern 2: Layer-Based
```
S01: Database and schema
S02: Backend APIs
S03: Frontend components
S04: Integration and testing
```

### Pattern 3: Domain-Based
```
S01: Authentication features
S02: Dashboard features  
S03: Reporting features
S04: Admin features
S05: Documentation and polish
```

## Pagination Strategy for Issue Retrieval

**Critical Implementation Notes**:

1. **Epic Children Retrieval Pattern**:
   ```javascript
   let allEpicIssues = [];
   let pageToken = null;
   
   do {
     const response = await mcp_linear_list_issues({
       parentId: epicId,  // ONLY direct children
       limit: 50,         // Manageable chunk size
       after: pageToken   // Pagination cursor
     });
     
     allEpicIssues.push(...response.issues);
     pageToken = response.nextPageToken;
   } while (pageToken);
   ```

2. **Validation Check**:
   ```javascript
   // Verify all retrieved issues are actually children of the epic
   const validIssues = allEpicIssues.filter(issue => 
     issue.parent && issue.parent.id === epicId
   );
   
   if (validIssues.length !== allEpicIssues.length) {
     console.warn(`Found ${allEpicIssues.length - validIssues.length} issues that are not children of epic ${epicId}`);
   }
   ```

3. **Token Limit Management**:
   ```
   - Use limit: 50 per request (prevents token overflow)
   - Process issues in batches if needed
   - Log pagination progress for large epics
   - Stop if total token count approaches limits
   ```

### Sprint Composition
- ✅ 3-8 issues per sprint (focused scope)
- ✅ Related features grouped together
- ✅ Minimal cross-sprint dependencies
- ✅ Clear rationale for grouping
- ❌ Avoid 9+ issue sprints (complexity risk)

### Dependency Management
- ✅ Map all blocking relationships
- ✅ Earlier sprints deliver what later sprints need
- ✅ No circular dependencies
- ✅ Clear handoff points between sprints

### Sprint Focus
- ✅ Each sprint has clear theme/objective
- ✅ Issues share context or domain
- ✅ Technical areas complement each other
- ✅ Testable and integrable as unit

## Example Output

```
🎯 Breaking down Epic CHR-25: Dashboard Production Ready

📊 Epic Analysis:
  - Total Issues: 47 (14 features, 33 tasks)
  - Priority: 8 P0, 12 P1, 18 P2, 9 P3
  - Technical Areas: frontend, backend, database, testing, docs

🚀 Sprint Plan: 6 Focused Sprints Created

### CHR-25.S01: Critical Fixes
  📦 8 issues
  🎯 Fix breaking errors preventing dashboard use
  🔗 https://linear.app/chronicle/project/chr-25-s01-abc

### CHR-25.S02: Type System Alignment  
  📦 9 issues
  🎯 Align types with new hooks schema
  ⚠️  Requires: Database fixes from S01
  🔗 https://linear.app/chronicle/project/chr-25-s02-def

### CHR-25.S03: Display Components
  📦 12 issues
  🎯 Update event display and session handling
  ⚠️  Requires: Type definitions from S02
  🔗 https://linear.app/chronicle/project/chr-25-s03-ghi

### CHR-25.S04: Production Integration
  📦 10 issues
  🎯 Wire real data and remove demo mode
  ⚠️  Requires: Display components from S03
  🔗 https://linear.app/chronicle/project/chr-25-s04-jkl

### CHR-25.S05: Production UI
  📦 6 issues
  🎯 Professional interface and environment
  ⚠️  Requires: Data integration from S04
  🔗 https://linear.app/chronicle/project/chr-25-s05-mno

### CHR-25.S06: Documentation
  📦 2 issues
  🎯 Complete docs and final testing
  ⚠️  Requires: All features from S01-S05
  🔗 https://linear.app/chronicle/project/chr-25-s06-pqr

📋 Execution Order: S01 → S02 → S03 → S04 → S05 → S06

✅ Ready for execution! Start with:
   /sprint-execute --project "CHR-25.S01"
```
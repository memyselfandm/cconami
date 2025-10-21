---
allowed-tools: mcp__linear__*
argument-hint: <team-name> <epic-id> [max-sprints] [dry-run]
description: (*Run from PLAN mode*) Break down a Linear epic into focused sprint projects, prioritizing parallelization and avoiding dependency clashes
---

<context>
# Linear Multi-Sprint Planning Command

## Purpose
Breaking down epics into sprint projects enables:
- **Parallel execution by multiple AI agents** - Independent work streams can run simultaneously
- **Clear dependency management** - Earlier sprints deliver what later sprints need
- **Predictable delivery timelines** - Focused sprints with clear scope and objectives
- **Risk mitigation through focused scope** - Smaller, testable units reduce complexity
- **Optimal resource allocation** - Balance work distribution across execution phases

## Sprint Planning Philosophy
This command prioritizes:
1. **Parallelization** - Group independent work to maximize concurrent agent execution
2. **Dependency Safety** - Sequence sprints so earlier ones deliver prerequisites for later ones
3. **Scope Focus** - Target 3-8 issues per sprint for manageable complexity
4. **Clear Handoffs** - Each sprint has explicit deliverables and dependencies
5. **Execution Readiness** - Sprints are structured for immediate execution with /sprint-execute

## When to Use This Command
- **After epic preparation**: Epic should be analyzed and refined with /epic-prep
- **Before execution planning**: Create sprint structure before launching agents
- **For multi-week initiatives**: Break down work that spans multiple development cycles
- **To visualize delivery timeline**: Understand sequence and dependencies across sprint phases
- **For workload balancing**: Distribute issues across time and resources effectively

## Command Arguments
- `$1` (team-name): (Required) Linear team name containing the epic
- `$2` (epic-id): (Required) Epic ID to break down into sprints (e.g., CHR-123)
- `$3` (max-sprints): (Optional) Maximum number of sprints to create. Default: 6
- `$4` (dry-run): (Optional) Pass "true" or "yes" to preview sprint breakdown without creating Linear projects
</context>

<instructions>
<step number="1">
<action>Gather Epic Context</action>

<thinking>
Before creating sprints, we need to understand:
- What is the epic's current state and priority?
- How many sprints already exist for this epic?
- What team resources and permissions are available?
- What is the complete set of work items to be distributed?
</thinking>

<details>
**Query Epic and Team Details**:

1. **Fetch Epic Metadata**
   - Use `mcp__linear__get_issue` with epic ID to retrieve:
     - Epic title, description, and current state
     - Priority level and labels
     - Any existing parent/child relationships
   - Validate epic is accessible and in appropriate state for sprint planning

2. **Get Team Context**
   - Use `mcp__linear__get_team` to fetch team information:
     - Team ID and team name
     - Workspace information
   - Validate user has necessary permissions for project creation

3. **Discover Existing Sprint Numbering**
   - Use `mcp__linear__list_projects` to find existing sprint projects
   - Look for pattern: `[EPIC-ID].S[NN]` (e.g., CHR-25.S01, CHR-25.S02)
   - Extract highest NN value from existing sprints
   - Start new sprints from NN+1 (or S01 if no existing sprints found)

**Get Epic Children (WITH PAGINATION)**:

4. **Retrieve All Epic Issues**
   - Use `mcp__linear__list_issues` with parameters:
     ```
     parentId: [epic-id]  // ONLY direct children of the epic
     limit: 50            // Use pagination to avoid token limits
     after: [pageToken]   // Pagination cursor (null for first request)
     ```
   - Loop through all pages until `nextPageToken` is null
   - Collect all issues into a single array for analysis

5. **Validate Retrieved Issues**
   - Verify each issue's `parentId` exactly matches the epic ID
   - Filter out any incorrectly retrieved issues
   - Log warning if any issues were incorrectly included
   - Confirm total count matches expected epic scope
</details>

<validation>
After gathering context, verify:
- [ ] Epic exists and is accessible
- [ ] Team ID successfully retrieved
- [ ] User has project creation permissions
- [ ] Existing sprint numbering determined (or confirmed none exist)
- [ ] All epic children retrieved (pagination complete)
- [ ] No incorrectly retrieved issues (parentId validation passed)
- [ ] Total issue count is reasonable for sprint planning (not 0, not 100+)
</validation>

<error_handling>
**Epic Not Found**:
- Verify epic ID format (e.g., CHR-123, not full URL or UUID)
- Check team name matches Linear workspace exactly
- Confirm user has read access to epic in Linear

**Permission Denied**:
- Check user access level in Linear workspace
- Verify user can create projects in specified team
- Suggest upgrading permissions or using different team

**Pagination Failures**:
- Retry with exponential backoff (2s, 4s, 8s delays)
- Reduce page size from 50 to 25 if timeouts occur
- Log partial results and continue with retrieved issues
- Warn about potential incompleteness in sprint plan

**No Issues Found**:
- Confirm epic has child issues in Linear
- Suggest running /epic-breakdown to create epic structure
- Provide guidance on manual issue creation if needed
</error_handling>
</step>

<step number="2">
<action>Analyze Epic Scope and Dependencies</action>

<thinking>
To create effective sprints, we need to understand:
- What types of work are included? (features, tasks, bugs)
- What are the priority distributions?
- Which technical areas are involved?
- What dependencies exist between issues?
- Are there any circular dependencies to resolve?
</thinking>

<details>
**Comprehensive Epic Analysis**:

1. **Categorize Issues by Type**
   ```
   Count by label/type:
   - Features: [count with 'feature' label]
   - Tasks: [count with 'task' label or no specific type label]
   - Bugs: [count with 'bug' label]
   - Documentation: [count with 'docs' label]
   ```

2. **Analyze Priority Distribution**
   ```
   Priority breakdown:
   - P0 (Critical): [count] - Must be in early sprints
   - P1 (High): [count] - Should be in early/mid sprints
   - P2 (Medium): [count] - Can be distributed flexibly
   - P3 (Low): [count] - Can be in later sprints
   - No Priority: [count] - Assign based on context
   ```

3. **Identify Technical Areas**
   ```
   Examine issue titles, descriptions, and labels to categorize:
   - Frontend: [count] - UI components, pages, styling
   - Backend: [count] - APIs, services, business logic
   - Database: [count] - Schema, migrations, queries
   - Testing: [count] - Unit tests, E2E tests, validation
   - Documentation: [count] - Docs, READMEs, guides
   - Infrastructure: [count] - CI/CD, deployment, config
   ```

4. **Map Blocking Relationships**
   ```
   Dependency analysis:
   - Issues that block others (must go in earlier sprints)
   - Issues that are blocked (must go in later sprints)
   - Issues with no dependencies (flexible placement)
   - Groups of mutually dependent issues (keep together)
   ```

5. **Detect Circular Dependencies**
   ```
   Check for cycles:
   - Issue A blocks B, B blocks C, C blocks A (invalid)
   - If found: Flag for user review and resolution
   - Suggest breaking cycles by removing redundant blocks
   ```

**Generate Epic Analysis Report**:
```markdown
Epic Analysis: [Epic Title]
- Total Issues: [count] (direct children only)
- Features: [count] | Tasks: [count] | Bugs: [count]
- Priority Distribution: P0: [X], P1: [Y], P2: [Z], P3: [W]
- Technical Areas: [list of areas with counts]
- Blocking Issues: [count issues that block others]
- Blocked Issues: [count issues that are blocked]
- Independent Issues: [count with no dependencies]
- Circular Dependencies: [NONE or list cycles]
```
</details>

<validation>
After epic analysis, verify:
- [ ] All issues categorized by type
- [ ] Priority distribution calculated correctly
- [ ] Technical areas identified for all issues
- [ ] Dependency graph is complete and accurate
- [ ] No circular dependencies exist (or flagged for resolution)
- [ ] Analysis ready for sprint grouping logic
</validation>

<error_handling>
**Circular Dependencies Detected**:
- Map the dependency cycle clearly for user
- Suggest breaking points in the cycle
- Recommend epic restructuring if needed
- Proceed with non-conflicting issues if possible

**Missing Priority Data**:
- Infer priority from issue labels and descriptions
- Default to P2 (Medium) if unclear
- Note assumptions in sprint plan output

**Insufficient Technical Context**:
- Group by related keywords in titles/descriptions
- Use label information to infer technical areas
- Note uncertainty in sprint rationale
</error_handling>
</step>

<step number="3">
<action>Create Sprint Grouping Strategy</action>

<thinking>
Effective sprint grouping requires balancing:
- Dependency sequencing (blocked work comes after blockers)
- Parallel execution potential (minimize cross-sprint dependencies)
- Sprint size targets (3-8 issues per sprint)
- Technical coherence (related work in same sprint)
- Resource distribution (avoid overloading any single sprint)

The grouping should follow proven patterns while adapting to epic-specific needs.
</thinking>

<details>
**Core Sprint Ordering Logic**:

1. **Sprint 1: Foundation (If Needed)**
   ```
   Include ONLY if present:
   - P0 issues that block other work
   - Shared infrastructure/components that others depend on
   - Database migrations or schema changes
   - Critical bug fixes that prevent other development

   Target: 0-5% of total work (prefer ZERO if possible)
   Keep this sprint minimal - most work should be parallelizable
   ```

2. **Sprints 2-N: Feature Groups (Bulk of Work)**
   ```
   Group related features together:
   - Issues in same technical area (frontend, backend, etc.)
   - Issues working with same domain models or data
   - Issues with shared context or user stories
   - Issues that can execute in parallel

   Distribution rules:
   - Ensure features in same sprint don't have file conflicts
   - Balance complexity across sprints
   - Prefer smaller, focused sprints over large ones
   - Keep related features together for context efficiency

   Target: 70-85% of total work distributed across feature sprints
   Most issues should fall into this phase for maximum parallelization
   ```

3. **Final Sprint: Integration + Polish (If Needed)**
   ```
   Include ONLY if present:
   - End-to-end testing that requires all features
   - Documentation completion that covers all features
   - Final integration tasks that wire everything together
   - Deployment configurations and production readiness

   Target: 10-20% of total work (prefer 10-15%)
   Keep reasonable size - avoid dumping everything here
   ```

**Sprint Sizing Guidelines**:
```
Optimal: 3-8 issues per sprint
- Focused scope for clear execution
- Easier to test and validate
- Lower risk of pattern deviation
- Cleaner agent coordination

Acceptable: 9-12 issues per sprint (if needed for max-sprints constraint)
- Note increased complexity in sprint description
- Consider internal phasing within sprint
- Monitor more closely during execution

Avoid: 13+ issues per sprint
- High complexity and coordination risk
- Consider increasing max-sprints
- Or break into sub-phases explicitly
```

**Dependency-Aware Sequencing**:
```
For each sprint S(n):
1. List all issues assigned to S(n)
2. Check if any issue in S(n) is blocked by issue in S(n+1) or later
3. If found: Reorder sprints or move blocking issue to earlier sprint
4. Validate no circular dependencies created by reordering
5. Document cross-sprint dependencies explicitly
```
</details>

<validation>
After creating sprint grouping, verify:
- [ ] Sprint 1 contains less than 10% of work (ideally 0-5%)
- [ ] Sprints 2-N contain 70-85% of work (feature phase)
- [ ] Final sprint contains 10-20% of work (if needed)
- [ ] All sprints meet size targets (3-8 issues preferred)
- [ ] No issue in sprint N is blocked by issue in sprint N+1 or later
- [ ] Cross-sprint dependencies are explicitly documented
- [ ] Each sprint has clear focus and rationale
- [ ] Total sprint count within --max-sprints parameter
</validation>

<error_handling>
**Too Many Issues for Max Sprints**:
- Automatically increase sprint sizes proportionally
- Create larger sprints with internal phasing documented
- Warn user about increased complexity per sprint
- Suggest increasing --max-sprints parameter

**Heavy Foundation Phase** (>15% of work):
- Re-evaluate which issues are truly blocking
- Challenge assumptions about dependencies
- Consider if some "foundation" work can parallelize
- Note concern in sprint plan output

**Unbalanced Sprint Sizes**:
- Redistribute issues across sprints for better balance
- Combine small sprints if under 3 issues
- Split large sprints if over 12 issues
- Prioritize keeping related work together
</error_handling>
</step>

<step number="4">
<action>Generate Sprint Breakdown Plan</action>

<thinking>
The sprint breakdown plan needs to be comprehensive enough for:
- User review and approval (dry-run mode)
- Execution planning (sprint-execute command)
- Team visibility (Linear project descriptions)
- Historical reference (understanding past decisions)
</thinking>

<details>
**Create Detailed Sprint Plan Document**:

For each sprint, generate:

```markdown
### [EPIC-ID].S[NN]: [Focus Area/Theme]

**Issues**: [COUNT] total
  - [ISSUE-ID]: [Title] (P[priority], [type-label])
  - [ISSUE-ID]: [Title] (P[priority], [type-label])
  - [Continue for all issues in sprint...]

**Sprint Objective**: [1-2 sentence description of what this sprint delivers]

**Technical Focus**: [Primary technical areas: frontend, backend, database, etc.]

**Rationale**: [Why these specific issues are grouped together - shared context, technical dependencies, logical progression]

**Dependencies**:
  - **Requires from previous sprints**: [Specific deliverables from earlier sprints, or "None" if first sprint]
  - **Delivers for future sprints**: [What this sprint provides that later sprints need, or "None" if no dependencies]

**Execution Notes**: [Any special considerations for running this sprint]
```

**Complete Sprint Breakdown Structure**:

```markdown
## Epic Sprint Breakdown: [Epic Title]

**Epic**: [EPIC-ID] - [Epic Title] ([Current State])
**Total Issues**: [COUNT] ([X] features, [Y] tasks, [Z] bugs)
**Sprint Count**: [N] sprints
**Sprint Numbering**: [EPIC-ID].S01 through [EPIC-ID].S[NN]

### Priority Distribution Across Sprints:
- Sprint 1: [P0 count] P0, [P1 count] P1, [P2 count] P2, [P3 count] P3
- Sprint 2: [P0 count] P0, [P1 count] P1, [P2 count] P2, [P3 count] P3
- [Continue for all sprints...]

### Execution Phases:
- **Foundation Phase**: Sprint S01 (if needed) - [X]% of work
- **Features Phase**: Sprints S02-S[N-1] - [Y]% of work
- **Integration Phase**: Sprint S[N] (if needed) - [Z]% of work

[Detailed sprint breakdowns for each sprint as shown above...]

### Sprint Dependencies Map:
```
S01 (Foundation) → Provides: [deliverables]
S02 (Features) → Requires: [from S01] → Provides: [deliverables]
S03 (Features) → Requires: [from S01, S02] → Provides: [deliverables]
[Continue mapping all dependencies...]
```

### Parallelization Potential:
- Sprints that can run in parallel: [list any truly independent sprints]
- Estimated serial execution: [if all sprints run sequentially]
- Recommended execution: [sequential for safety, or parallel if validated]
```
</details>

<validation>
After generating sprint plan, verify:
- [ ] All epic issues assigned to exactly one sprint
- [ ] No issues missing from sprint assignments
- [ ] Sprint numbering follows convention [EPIC-ID].S[NN]
- [ ] Each sprint has clear objective and rationale
- [ ] Dependencies are explicitly documented
- [ ] Phase distribution percentages calculated correctly
- [ ] Plan is comprehensive enough for execution
</validation>

<error_handling>
**Issues Missing from Plan**:
- Review epic children list vs assigned issues
- Identify any unassigned issues
- Add to appropriate sprint or note exclusion reason

**Unclear Sprint Objectives**:
- Review issue descriptions for common themes
- Infer objective from technical area or feature domain
- Default to generic description if truly unclear

**Complex Dependency Chains**:
- Simplify dependency documentation for clarity
- Focus on critical path dependencies
- Note minor dependencies separately
</error_handling>
</step>

<step number="5">
<action>Create Sprint Projects in Linear (Skip if --dry-run)</action>

<thinking>
This step only executes if --dry-run flag is NOT provided.
We need to create actual Linear projects and assign issues to them.
This requires careful sequencing and error handling.
</thinking>

<details>
**If --dry-run flag provided**:
- Skip all Linear project creation
- Skip all issue assignments
- Proceed directly to Step 6 (output sprint plan only)

**If NOT dry-run**: Execute project creation workflow:

1. **Create Each Sprint Project**
   ```
   For each sprint in the breakdown plan:

   a) Use mcp__linear__create_project with:
      - name: "[EPIC-ID].S[NN]" (e.g., "CHR-25.S02")
      - teamId: [from team query in Step 1]
      - description: [Full sprint description template below]

   b) Capture returned project ID for issue assignment

   c) Add 200ms delay between project creations (rate limiting)
   ```

2. **Sprint Project Description Template**
   ```markdown
   ## Sprint: [Focus Area Description]

   **Epic**: [EPIC-ID] - [Epic Title]
   **Sprint**: [X] of [Total] in epic breakdown
   **Phase**: [Foundation | Features | Integration]

   ## Objective
   [Sprint objective from plan]

   ## Issues ([COUNT] total)
   - [ISSUE-ID]: [Title] (P[priority], [type-label])
   - [ISSUE-ID]: [Title] (P[priority], [type-label])
   - [Continue for all issues...]

   ## Technical Focus
   [Primary technical areas with brief description]

   ## Sprint Rationale
   [Why these issues are grouped - from plan]

   ## Dependencies
   **Requires from previous sprints**:
   - [Specific deliverable from Sprint SXX] or "None"

   **Delivers for future sprints**:
   - [Deliverable needed by Sprint SYY] or "None"

   ## Execution Strategy

   ### Parallelization Within Sprint
   - Independent work streams: [NUMBER identified]
   - Technical areas for parallel work: [list areas]
   - Suggested agent specializations: [based on technical areas]

   ### Execution Phases (if applicable)
   **Phase 1: Foundation** ([count] issues)
   - [Issues that must complete first within this sprint]

   **Phase 2: Features** ([count] issues - majority)
   - [Issues that can run in parallel]

   **Phase 3: Integration** ([count] issues)
   - [Final testing/validation within this sprint]

   ## Success Criteria
   - [ ] All [COUNT] issues completed and tested
   - [ ] [Sprint-specific deliverable 1] completed
   - [ ] [Sprint-specific deliverable 2] completed
   - [ ] Dependencies for next sprint ready
   - [ ] Ready for next sprint execution

   ## Execution Command
   ```
   /sprint-execute "[EPIC-ID].S[NN]"
   ```
   ```

3. **Assign Issues to Sprint Projects**
   ```
   For each issue in sprint:

   a) Use mcp__linear__update_issue with:
      - id: [issue UUID, not identifier]
      - projectId: [sprint project ID from creation]
      - status: "Planned" (if not already in flight)

   b) Batch updates in groups of 10 (rate limiting)

   c) Add 100ms delay between batches

   d) Track successful and failed assignments
   ```

4. **Handle Rate Limiting**
   ```
   Implement exponential backoff for Linear API:
   - On 429 (Too Many Requests): Wait 2s, retry
   - On second 429: Wait 4s, retry
   - On third 429: Wait 8s, retry
   - After 3 retries: Log error and continue with remaining
   ```

5. **Validation After Creation**
   ```
   For each created project:
   - Verify project exists with correct name
   - Confirm all issues successfully assigned
   - Check no duplicate assignments
   - Validate project description formatted correctly
   ```
</details>

<validation>
After creating Linear projects (if not dry-run), verify:
- [ ] All sprint projects created successfully
- [ ] Project names follow [EPIC-ID].S[NN] convention
- [ ] All issues assigned to correct sprint projects
- [ ] No issues assigned to multiple sprints
- [ ] Project descriptions complete with all sections
- [ ] Linear URLs captured for final report
</validation>

<error_handling>
**Project Creation Failure**:
- Log error with project name and error message
- Continue creating remaining projects
- Report failed projects in final output
- Provide manual creation instructions if needed

**Issue Assignment Failure**:
- Log issue ID and error message
- Continue with remaining issue assignments
- Report unassigned issues in final output
- Suggest manual assignment in Linear

**Rate Limiting Exceeded**:
- Implement exponential backoff as specified
- If persistent: Pause for 30s and retry
- If still failing: Complete as dry-run mode
- Provide output for manual execution

**Partial Success**:
- Complete as much as possible
- Clearly report what succeeded vs failed
- Provide Linear URLs for successful projects
- Give specific next steps for completing failed items
</error_handling>
</step>

<step number="6">
<action>Generate Final Sprint Report</action>

<thinking>
The final report needs to be different based on execution mode:
- Dry-run: Proposed plan for review
- Actual execution: Created projects with Linear URLs

Both should be comprehensive and actionable.
</thinking>

<details>
**For --dry-run Mode** (Proposed Plan):

```markdown
🎯 Epic Sprint Breakdown: [Epic Title] (DRY-RUN MODE)

📊 Epic Analysis:
  - Epic ID: [EPIC-ID] ([Current State])
  - Total Issues: [COUNT] ([X] features, [Y] tasks, [Z] bugs)
  - Priority Distribution: [X] P0, [Y] P1, [Z] P2, [W] P3
  - Technical Areas: [list areas with counts]
  - Dependencies: [X] blocking relationships identified

🚀 Proposed Sprint Plan: [N] Focused Sprints

[For each sprint, show:]

### [EPIC-ID].S[NN]: [Focus Area]
  📦 [COUNT] issues ([X]% of epic)
  🎯 [Sprint objective]
  🔧 [Technical focus areas]
  ⚠️  Requires: [Dependencies from previous sprints, or "None - first sprint"]
  ✅ Delivers: [What this provides for future sprints]

  📋 Issues:
    - [ISSUE-ID]: [Title] (P[priority], [type])
    - [ISSUE-ID]: [Title] (P[priority], [type])
    - [Continue for all issues...]

[Continue for all sprints...]

📈 Sprint Distribution:
  - Foundation Phase: Sprint S01 ([X]% of work) [if present]
  - Features Phase: Sprints S[02]-S[N-1] ([Y]% of work)
  - Integration Phase: Sprint S[N] ([Z]% of work) [if present]

🔗 Sprint Dependencies:
  [Show dependency chain from plan]

📋 Next Steps:
  ✅ Review sprint breakdown above
  ✅ Validate dependencies and groupings
  ✅ Run without dry-run to create projects:
     /sprint-plan [team] [epic-id]
  ✅ Or adjust and re-run dry-run:
     /sprint-plan [team] [epic-id] [N] yes
```

**For Actual Execution** (Projects Created):

```markdown
🎯 Epic Sprint Breakdown Complete: [Epic Title]

📊 Epic Analysis:
  - Epic ID: [EPIC-ID] ([Current State])
  - Total Issues: [COUNT] ([X] features, [Y] tasks, [Z] bugs)
  - Priority Distribution: [X] P0, [Y] P1, [Z] P2, [W] P3
  - Technical Areas: [list areas with counts]

🚀 Sprint Projects Created: [N] Sprints

[For each sprint, show:]

### [EPIC-ID].S[NN]: [Focus Area]
  📦 [COUNT] issues assigned
  🎯 [Sprint objective]
  🔗 https://linear.app/[workspace]/project/[project-id]
  ⚠️  Requires: [Dependencies from previous sprints, or "None"]

  📋 Issues:
    - [ISSUE-ID]: [Title] (P[priority]) ✅ Assigned
    - [ISSUE-ID]: [Title] (P[priority]) ✅ Assigned
    - [Continue for all issues...]

[Continue for all sprints...]

📈 Sprint Distribution:
  - Foundation Phase: Sprint S01 ([X]% of work)
  - Features Phase: Sprints S[02]-S[N-1] ([Y]% of work)
  - Integration Phase: Sprint S[N] ([Z]% of work)

📋 Execution Order: S01 → S02 → S03 → ... → S[N]

✅ All [N] sprint projects created successfully!

🚀 Next Steps:
  1. Review sprint projects in Linear
  2. Validate issue assignments and dependencies
  3. Execute first sprint:
     /sprint-execute "[EPIC-ID].S01"
  4. After S01 completes, execute S02, and so on...
```

**For Partial Success** (Some Failures):

```markdown
⚠️  Epic Sprint Breakdown Partially Complete: [Epic Title]

✅ Successful: [X] of [N] sprints created
❌ Failed: [Y] of [N] sprints

[Show successful sprints with URLs as in "Actual Execution" above]

❌ Failed Sprint Projects:
  - [EPIC-ID].S[NN]: [Focus Area] - Error: [error message]
  - [EPIC-ID].S[MM]: [Focus Area] - Error: [error message]

📋 Manual Steps Required:
  1. Create failed sprint projects manually in Linear:
     - Project name: [EPIC-ID].S[NN]
     - Team: [team name]
     - Description: [See sprint plan above]

  2. Assign issues to failed sprint projects:
     [List issue IDs that need manual assignment]

  3. Or retry command after addressing errors

🚀 For successful sprints, proceed with execution:
   /sprint-execute "[EPIC-ID].S01"
```

**For Complete Failure**:

```markdown
❌ Epic Sprint Breakdown Failed: [Epic Title]

Error: [Primary error message]

📊 Epic Analysis Completed:
  - Total Issues: [COUNT]
  - Sprint Plan Generated: [N] sprints designed

❌ Linear Project Creation Failed:
  - [Detailed error explanation]
  - [Possible causes]
  - [Suggested fixes]

📋 Sprint Plan (for manual execution):
  [Output the complete sprint breakdown plan as in dry-run mode]

🔧 Troubleshooting Steps:
  1. [Specific step based on error type]
  2. [Another specific step]
  3. Retry command after addressing issues
  4. Or use --dry-run to validate plan:
     /sprint-plan [team] [epic-id] 6 yes
```
</details>

<validation>
After generating final report, verify:
- [ ] Report format matches execution mode (dry-run vs actual)
- [ ] All sprint information included and accurate
- [ ] Linear URLs included for created projects (if applicable)
- [ ] Next steps are clear and actionable
- [ ] Any errors or failures clearly documented
- [ ] Success metrics accurately calculated
</validation>

<error_handling>
**Output Formatting Issues**:
- Fall back to plain text if markdown rendering fails
- Ensure all critical information present regardless of format
- Log formatting errors but don't fail the command

**Missing Information**:
- Note any missing data explicitly in output
- Provide best-effort information with uncertainty noted
- Include debugging information if relevant

**User Guidance**:
- Always provide clear next steps
- Include command examples with actual values
- Link to relevant documentation if available
</error_handling>
</step>
</instructions>

<tool_usage_strategy>
## Linear MCP Tools

This command uses Linear MCP tools strategically:

### Step 1: Context Gathering
- **mcp__linear__get_issue**: Fetch epic details (title, description, state, priority)
  - Single call per epic
  - Returns complete epic metadata

- **mcp__linear__get_team**: Get team ID and workspace info
  - Single call per team
  - Required for project creation permissions

- **mcp__linear__list_projects**: Find existing sprint projects
  - Query with team filter
  - Extract sprint numbering pattern [EPIC-ID].S[NN]

- **mcp__linear__list_issues**: Retrieve epic children WITH PAGINATION
  - Parameters: `parentId=[epic-id]`, `limit=50`, `after=[token]`
  - Loop until `nextPageToken` is null
  - Validate each issue's parentId matches epic

### Step 5: Project Creation (SKIP IF DRY-RUN)
- **mcp__linear__create_project**: Create each sprint project
  - Parameters: `name`, `teamId`, `description`
  - Returns project ID for issue assignment
  - Add 200ms delay between calls (rate limiting)

- **mcp__linear__update_issue**: Assign issues to sprint projects
  - Parameters: `id` (UUID), `projectId`, `status="Planned"`
  - Batch updates in groups of 10
  - Add 100ms delay between batches

## Rate Limiting Strategy
```
Project Creation:
- Maximum 5 projects per second
- 200ms delay between create_project calls
- Exponential backoff on 429 errors (2s, 4s, 8s)

Issue Assignment:
- Batch in groups of 10 issues
- 100ms delay between batches
- Exponential backoff on 429 errors

Pagination:
- Request 50 issues per page
- No artificial delays (Linear handles this)
- Implement retry logic for timeouts
```

## Error Recovery
```
On API Failure:
1. Log error with context (project name, issue ID, etc.)
2. Implement exponential backoff for retries
3. Continue with remaining operations
4. Report failures in final output

On Rate Limit:
1. Respect 429 response codes
2. Wait specified duration from rate limit headers
3. Retry with exponential backoff
4. Fall back to dry-run mode if persistent

On Timeout:
1. Reduce pagination page size (50 → 25)
2. Retry individual operation
3. Continue with partial results if needed
4. Document incomplete data in output
```

## Token Budget Management
```
Optimization Techniques:
- Use pagination to avoid large single responses
- Limit issue retrieval to direct children only (parentId filter)
- Cache team and epic data to avoid duplicate calls
- Batch issue updates to reduce individual API calls
- Generate project descriptions programmatically vs fetching templates
```
</tool_usage_strategy>

<examples>
## Example 1: Typical Epic Breakdown

**Input**:
```
/sprint-plan Chronicle CHR-100
```

**Context**:
- 20 issues total (12 features, 8 tasks)
- Balanced priority distribution (4 P0, 6 P1, 8 P2, 2 P3)
- Clear dependency chain from database → backend → frontend
- No circular dependencies

**Output**:
```markdown
🎯 Epic Sprint Breakdown Complete: Dashboard Overhaul

📊 Epic Analysis:
  - Epic ID: CHR-100 (In Progress)
  - Total Issues: 20 (12 features, 8 tasks)
  - Priority Distribution: 4 P0, 6 P1, 8 P2, 2 P3
  - Technical Areas: frontend (8), backend (6), database (4), testing (2)

🚀 Sprint Projects Created: 4 Sprints

### CHR-100.S01: Database Foundation
  📦 3 issues (15% of epic)
  🎯 Create database schema and migrations for new dashboard data model
  🔗 https://linear.app/chronicle/project/chr-100-s01
  ⚠️  Requires: None - foundation sprint
  ✅ Delivers: Database schema for backend APIs

  📋 Issues:
    - CHR-101: Create dashboard_widgets table (P0) ✅
    - CHR-102: Create user_preferences table (P0) ✅
    - CHR-103: Add migration scripts (P1) ✅

### CHR-100.S02: Backend APIs
  📦 6 issues (30% of epic)
  🎯 Build REST APIs for dashboard widget management
  🔗 https://linear.app/chronicle/project/chr-100-s02
  ⚠️  Requires: Database schema from S01
  ✅ Delivers: APIs for frontend consumption

  📋 Issues:
    - CHR-104: Widget CRUD endpoints (P0) ✅
    - CHR-105: User preferences API (P1) ✅
    - CHR-106: Dashboard layout service (P1) ✅
    - CHR-107: Widget data aggregation (P1) ✅
    - CHR-108: API authentication (P2) ✅
    - CHR-109: API documentation (P2) ✅

### CHR-100.S03: Frontend Components
  📦 8 issues (40% of epic)
  🎯 Create React components for customizable dashboard
  🔗 https://linear.app/chronicle/project/chr-100-s03
  ⚠️  Requires: Backend APIs from S02
  ✅ Delivers: Complete dashboard UI

  📋 Issues:
    - CHR-110: Widget container component (P0) ✅
    - CHR-111: Widget library (P1) ✅
    - CHR-112: Drag-and-drop layout (P1) ✅
    - CHR-113: Preferences dialog (P2) ✅
    - CHR-114: Widget settings panel (P2) ✅
    - CHR-115: Dashboard header (P2) ✅
    - CHR-116: Responsive design (P2) ✅
    - CHR-117: Loading states (P3) ✅

### CHR-100.S04: Testing & Polish
  📦 3 issues (15% of epic)
  🎯 End-to-end tests and documentation
  🔗 https://linear.app/chronicle/project/chr-100-s04
  ⚠️  Requires: All features from S01-S03
  ✅ Delivers: Production-ready dashboard

  📋 Issues:
    - CHR-118: E2E test suite (P1) ✅
    - CHR-119: User documentation (P2) ✅
    - CHR-120: Performance optimization (P3) ✅

📈 Sprint Distribution:
  - Foundation Phase: Sprint S01 (15% of work)
  - Features Phase: Sprints S02-S03 (70% of work)
  - Integration Phase: Sprint S04 (15% of work)

📋 Execution Order: S01 → S02 → S03 → S04

✅ All 4 sprint projects created successfully!

🚀 Next Steps:
  1. Review sprint projects in Linear
  2. Execute first sprint: /sprint-execute "CHR-100.S01"
  3. After S01 completes, execute S02, and so on...
```

## Example 2: Large Epic with Max Sprint Limit

**Input**:
```
/sprint-plan Chronicle CHR-200 3
```

**Context**:
- 45 issues total (too many for comfortable 3-8 issue sprints)
- User constrained to max 3 sprints
- Must distribute 45 issues across 3 sprints = ~15 issues per sprint

**Output**:
```markdown
🎯 Epic Sprint Breakdown Complete: Platform Rewrite

📊 Epic Analysis:
  - Epic ID: CHR-200 (Planned)
  - Total Issues: 45 (25 features, 20 tasks)
  - Priority Distribution: 10 P0, 15 P1, 15 P2, 5 P3
  - Technical Areas: frontend (20), backend (15), database (5), testing (5)

⚠️  Note: Sprint sizing is larger than recommended due to --max-sprints=3 constraint
    Recommended: 6-8 sprints for this epic size
    Actual: 3 sprints (~15 issues per sprint)

🚀 Sprint Projects Created: 3 Sprints

### CHR-200.S01: Core Infrastructure (Phase 1)
  📦 12 issues (27% of epic)
  🎯 Database, authentication, and core services
  🔗 https://linear.app/chronicle/project/chr-200-s01

  **Internal Phases**:
  - Phase 1a: Database (4 issues) - Run first
  - Phase 1b: Auth & Services (8 issues) - After database complete

  [Issue list...]

### CHR-200.S02: Feature Development (Phase 2)
  📦 18 issues (40% of epic)
  🎯 Main application features and UI
  🔗 https://linear.app/chronicle/project/chr-200-s02

  **Internal Phases**:
  - Phase 2a: Backend APIs (6 issues)
  - Phase 2b: Frontend Components (12 issues) - Can parallelize internally

  [Issue list...]

### CHR-200.S03: Integration & Launch (Phase 3)
  📦 15 issues (33% of epic)
  🎯 Testing, documentation, deployment
  🔗 https://linear.app/chronicle/project/chr-200-s03

  [Issue list...]

📈 Sprint Distribution:
  - Foundation Phase: Sprint S01 Phase 1a (9% of work)
  - Features Phase: Sprint S01 Phase 1b, S02 (58% of work)
  - Integration Phase: Sprint S03 (33% of work)

⚠️  Execution Recommendations:
  - Consider internal phasing within each sprint
  - Monitor closely for complexity and coordination issues
  - May want to increase max-sprints parameter to 6 for more focused sprints
```

## Example 3: Dry-Run Preview

**Input**:
```
/sprint-plan Chronicle CHR-150 6 yes
```

**Context**:
- User wants to preview sprint breakdown before creating projects
- 15 issues with clear feature groupings
- Well-balanced for 3 sprints

**Output**:
```markdown
🎯 Epic Sprint Breakdown: Authentication System (DRY-RUN MODE)

📊 Epic Analysis:
  - Epic ID: CHR-150 (Planned)
  - Total Issues: 15 (10 features, 5 tasks)
  - Priority Distribution: 3 P0, 5 P1, 5 P2, 2 P3
  - Technical Areas: backend (8), frontend (5), testing (2)
  - Dependencies: 8 blocking relationships identified

🚀 Proposed Sprint Plan: 3 Focused Sprints

### CHR-150.S01: Authentication Backend
  📦 5 issues (33% of epic)
  🎯 Core authentication services and JWT implementation
  🔧 backend, database
  ⚠️  Requires: None - foundation sprint
  ✅ Delivers: Auth APIs for frontend, JWT token system

  📋 Issues:
    - CHR-151: User authentication service (P0, feature)
    - CHR-152: JWT token generation (P0, feature)
    - CHR-153: Session management (P1, feature)
    - CHR-154: Password hashing (P1, task)
    - CHR-155: Auth middleware (P1, task)

### CHR-150.S02: Authentication UI
  📦 5 issues (33% of epic)
  🎯 Login, registration, and password reset interfaces
  🔧 frontend
  ⚠️  Requires: Auth APIs from S01
  ✅ Delivers: Complete authentication user flows

  📋 Issues:
    - CHR-156: Login page component (P0, feature)
    - CHR-157: Registration form (P1, feature)
    - CHR-158: Password reset flow (P1, feature)
    - CHR-159: Auth state management (P2, task)
    - CHR-160: Form validation (P2, task)

### CHR-150.S03: OAuth & Security
  📦 5 issues (34% of epic)
  🎯 Third-party OAuth and security hardening
  🔧 backend, frontend, testing
  ⚠️  Requires: Core auth from S01, UI from S02
  ✅ Delivers: Production-ready authentication system

  📋 Issues:
    - CHR-161: Google OAuth integration (P1, feature)
    - CHR-162: GitHub OAuth integration (P1, feature)
    - CHR-163: Security audit (P2, task)
    - CHR-164: E2E auth tests (P2, task)
    - CHR-165: Auth documentation (P3, task)

📈 Sprint Distribution:
  - Foundation Phase: Sprint S01 (33% of work)
  - Features Phase: Sprint S02 (33% of work)
  - Integration Phase: Sprint S03 (34% of work)

🔗 Sprint Dependencies:
  S01 (Backend) → Provides: Auth APIs, JWT system
  S02 (UI) → Requires: Auth APIs → Provides: User flows
  S03 (OAuth) → Requires: Core auth + UI → Provides: Production system

📋 Next Steps:
  ✅ Review sprint breakdown above
  ✅ Validate dependencies and groupings
  ✅ Run without dry-run to create projects:
     /sprint-plan Chronicle CHR-150
  ✅ Or adjust sprint count and re-preview:
     /sprint-plan Chronicle CHR-150 4 yes
```

## Example 4: Epic with Circular Dependencies (Error Case)

**Input**:
```
/sprint-plan Chronicle CHR-300
```

**Context**:
- Issues have circular blocking relationships
- CHR-301 blocks CHR-302, CHR-302 blocks CHR-303, CHR-303 blocks CHR-301
- Cannot safely sequence sprints

**Output**:
```markdown
❌ Epic Sprint Breakdown Failed: API Redesign

📊 Epic Analysis Completed:
  - Epic ID: CHR-300 (Planned)
  - Total Issues: 18 (12 features, 6 tasks)

❌ Circular Dependency Detected:

Dependency Cycle Found:
  CHR-301 (Auth middleware) → blocks → CHR-302 (API gateway)
  CHR-302 (API gateway) → blocks → CHR-303 (Rate limiting)
  CHR-303 (Rate limiting) → blocks → CHR-301 (Auth middleware)

🔧 Resolution Required:

These issues cannot be sequenced into sprints due to circular dependencies.
Please review and resolve the dependency cycle in Linear:

Option 1: Remove redundant blocking relationship
  - If CHR-301 truly needs CHR-303, then CHR-303 cannot need CHR-301
  - Review which direction is correct and remove the other

Option 2: Break dependency with interface/contract
  - Define interface/contract first (new issue)
  - Remove direct blocking relationships
  - Each issue implements against contract independently

Option 3: Restructure issues
  - Combine tightly coupled issues into single larger issue
  - Or split issues into independent sub-issues

📋 Next Steps:
  1. Review dependency relationships in Linear:
     - CHR-301: https://linear.app/chronicle/issue/CHR-301
     - CHR-302: https://linear.app/chronicle/issue/CHR-302
     - CHR-303: https://linear.app/chronicle/issue/CHR-303

  2. Remove or adjust blocking relationships

  3. Retry sprint planning:
     /sprint-plan Chronicle CHR-300

  4. Or preview with dry-run after fixing:
     /sprint-plan Chronicle CHR-300 6 yes
```

## Example 5: Single-Sprint Epic (Simple Case)

**Input**:
```
/sprint-plan Chronicle CHR-50
```

**Context**:
- Only 5 issues, all independent
- No dependencies between issues
- Small enough for single sprint

**Output**:
```markdown
🎯 Epic Sprint Breakdown Complete: Mobile Responsive Fixes

📊 Epic Analysis:
  - Epic ID: CHR-50 (In Progress)
  - Total Issues: 5 (3 features, 2 tasks)
  - Priority Distribution: 1 P0, 2 P1, 2 P2
  - Technical Areas: frontend (5)
  - Dependencies: None - all issues independent

🚀 Sprint Projects Created: 1 Sprint

### CHR-50.S01: Mobile Responsive Fixes
  📦 5 issues (100% of epic)
  🎯 Fix responsive design issues across mobile devices
  🔗 https://linear.app/chronicle/project/chr-50-s01
  ⚠️  Requires: None - all independent work
  ✅ Delivers: Mobile-responsive application

  📋 Issues:
    - CHR-51: Fix navbar on mobile (P0, feature) ✅
    - CHR-52: Responsive dashboard layout (P1, feature) ✅
    - CHR-53: Mobile menu component (P1, feature) ✅
    - CHR-54: Touch gesture support (P2, task) ✅
    - CHR-55: Mobile viewport meta tag (P2, task) ✅

📈 Sprint Distribution:
  - Features Phase: Sprint S01 (100% of work)

✨ Single-Sprint Epic: All work can be completed in one focused sprint

🚀 Next Steps:
  1. Review sprint project in Linear
  2. Execute sprint: /sprint-execute "CHR-50.S01"
  3. All issues can be parallelized - expect fast completion!
```
</examples>

<output_format>
## Standard Output (Successful Execution - Not Dry-Run)

```markdown
🎯 Epic Sprint Breakdown Complete: [Epic Title]

📊 Epic Analysis:
  - Epic ID: [EPIC-ID] ([Current State])
  - Total Issues: [COUNT] ([X] features, [Y] tasks, [Z] bugs)
  - Priority Distribution: [X] P0, [Y] P1, [Z] P2, [W] P3
  - Technical Areas: [list areas with counts]

🚀 Sprint Projects Created: [N] Sprints

[For each sprint:]
### [EPIC-ID].S[NN]: [Focus Area]
  📦 [COUNT] issues assigned
  🎯 [Sprint objective]
  🔗 [Linear project URL]
  ⚠️  Requires: [Dependencies] or "None"

  📋 Issues:
    - [ISSUE-ID]: [Title] (P[N]) ✅ Assigned
    [Continue for all issues...]

[Repeat for all sprints...]

📈 Sprint Distribution:
  - Foundation Phase: [details] ([X]% of work)
  - Features Phase: [details] ([Y]% of work)
  - Integration Phase: [details] ([Z]% of work)

📋 Execution Order: S01 → S02 → ... → S[N]

✅ All [N] sprint projects created successfully!

🚀 Next Steps:
  1. Review sprint projects in Linear
  2. Execute first sprint: /sprint-execute "[EPIC-ID].S01"
  3. After S01 completes, execute subsequent sprints in order
```

## Dry-Run Output (Preview Mode)

```markdown
🎯 Epic Sprint Breakdown: [Epic Title] (DRY-RUN MODE)

📊 Epic Analysis:
  - Epic ID: [EPIC-ID] ([Current State])
  - Total Issues: [COUNT] ([X] features, [Y] tasks, [Z] bugs)
  - Priority Distribution: [X] P0, [Y] P1, [Z] P2, [W] P3
  - Technical Areas: [list areas with counts]
  - Dependencies: [X] blocking relationships identified

🚀 Proposed Sprint Plan: [N] Focused Sprints

[For each sprint:]
### [EPIC-ID].S[NN]: [Focus Area]
  📦 [COUNT] issues ([X]% of epic)
  🎯 [Sprint objective]
  🔧 [Technical focus areas]
  ⚠️  Requires: [Dependencies] or "None"
  ✅ Delivers: [What this provides for future sprints]

  📋 Issues:
    - [ISSUE-ID]: [Title] (P[N], [type])
    [Continue for all issues...]

[Repeat for all sprints...]

📈 Sprint Distribution:
  - Foundation Phase: [details] ([X]% of work)
  - Features Phase: [details] ([Y]% of work)
  - Integration Phase: [details] ([Z]% of work)

🔗 Sprint Dependencies:
  [Visual or textual dependency chain]

📋 Next Steps:
  ✅ Review sprint breakdown above
  ✅ Validate dependencies and groupings
  ✅ Run without dry-run to create projects:
     /sprint-plan [team] [epic-id]
  ✅ Or adjust and re-run dry-run:
     /sprint-plan [team] [epic-id] [N] yes
```

## Error Output (Failure Cases)

```markdown
❌ Epic Sprint Breakdown Failed: [Epic Title]

Error: [Specific error message]

📊 Epic Analysis [Completed|Attempted]:
  [Include any analysis that was completed]

❌ [Specific Failure Type]:
  [Detailed explanation of what went wrong]
  [Possible causes]
  [Specific error details]

🔧 Resolution Steps:
  1. [Specific actionable step based on error]
  2. [Another specific step]
  3. [Final recommendation]

📋 [Additional Context]:
  [Sprint plan if generated, debugging info, etc.]

📋 Next Steps:
  [Specific commands or actions to resolve the issue]
```

## Partial Success Output

```markdown
⚠️  Epic Sprint Breakdown Partially Complete: [Epic Title]

✅ Successful: [X] of [N] sprints created
❌ Failed: [Y] of [N] sprints

[Show successful sprints with full details and URLs]

❌ Failed Sprint Projects:
  - [EPIC-ID].S[NN]: [Error details]
  [Continue for all failed sprints...]

📋 Manual Steps Required:
  [Specific instructions to complete failed items]

🚀 For successful sprints, proceed with:
   /sprint-execute "[EPIC-ID].S01"
```
</output_format>

<success_criteria>
## Command Execution Success Criteria

The sprint-plan command is considered successful when:

### Planning Success (Dry-Run and Actual)
- [ ] Epic successfully retrieved from Linear
- [ ] All epic children retrieved with pagination
- [ ] Epic scope analysis completed (types, priorities, technical areas)
- [ ] Dependencies mapped without circular dependencies
- [ ] Sprint grouping strategy applied successfully
- [ ] All issues assigned to exactly one sprint
- [ ] Sprint numbering follows [EPIC-ID].S[NN] convention
- [ ] Phase distribution meets guidelines (Foundation <10%, Features 70-85%, Integration 10-20%)
- [ ] Each sprint has 3-8 issues (or justified larger size)
- [ ] Cross-sprint dependencies explicitly documented
- [ ] Comprehensive sprint breakdown plan generated

### Execution Success (Non-Dry-Run Only)
- [ ] All sprint projects created successfully in Linear
- [ ] All issues assigned to correct sprint projects
- [ ] No duplicate issue assignments
- [ ] Project descriptions complete with all required sections
- [ ] Linear URLs captured for all projects
- [ ] Final report includes all sprint details and URLs
- [ ] Clear next steps provided for sprint execution

### Quality Standards
- [ ] Sprint objectives are clear and specific
- [ ] Rationales explain why issues are grouped
- [ ] Dependencies are actionable and specific
- [ ] Technical focus areas accurately represent issue content
- [ ] Execution strategy is practical and achievable
- [ ] Success criteria for each sprint are measurable

### Error Handling Success
- [ ] All errors are caught and reported clearly
- [ ] Partial success is handled gracefully
- [ ] Recovery steps are specific and actionable
- [ ] User can understand what failed and why
- [ ] Command degrades gracefully (e.g., falls back to dry-run if creation fails)

### User Experience Success
- [ ] Output is well-formatted and readable
- [ ] Emojis enhance clarity without cluttering
- [ ] Next steps are immediately clear
- [ ] User can proceed with confidence
- [ ] Integration with sprint-execute is seamless
</success_criteria>

<integration_notes>
## Integration with Other Linear Commands

### Upstream Commands (Run Before sprint-plan)
- **`/epic-prep`**: Validates and prepares epic structure
  - Ensures epic has proper structure before sprint planning
  - Creates missing features if needed
  - Validates parent-child relationships
  - **Best Practice**: Always run epic-prep before sprint-plan

- **`/epic-breakdown`**: Breaks epic into features and tasks
  - AI-powered analysis creates comprehensive issue hierarchy
  - Identifies dependencies and technical areas
  - Optimizes for parallel execution potential
  - **Best Practice**: Run after epic-prep, before sprint-plan

### Downstream Commands (Run After sprint-plan)
- **`/sprint-execute`**: Executes a single sprint project
  - Takes project name as first positional parameter
  - Launches AI agents to implement sprint work
  - Posts progress to Linear comments
  - Updates issue statuses automatically
  - **Best Practice**: Execute sprints sequentially (S01, then S02, etc.)

- **`/sprint-status`**: Monitors sprint execution progress
  - Check completion percentage
  - View active AI agents
  - Identify blocked issues
  - Track overall sprint health

### Parallel Commands (Related Workflows)
- **`/dependency-map`**: Visualize epic dependencies
  - Can run before sprint-plan to understand dependency complexity
  - Helps validate sprint sequencing decisions
  - Identifies circular dependencies proactively

- **`/project-shuffle`**: Reorganize work between sprints
  - Move issues between sprint projects if priorities change
  - Rebalance sprint workload
  - Update cross-sprint dependencies

### Complete Workflow Example
```bash
# 1. Prepare epic structure
/epic-prep Chronicle CHR-100 yes

# 2. Break down epic into features (optional but recommended)
/epic-breakdown Chronicle CHR-100

# 3. Visualize dependencies (optional)
/dependency-map Chronicle CHR-100

# 4. Plan sprint breakdown (THIS COMMAND)
/sprint-plan Chronicle CHR-100 6 yes  # Preview first
/sprint-plan Chronicle CHR-100        # Create projects

# 5. Execute sprints sequentially
/sprint-execute "CHR-100.S01"
# Wait for S01 completion, then:
/sprint-execute "CHR-100.S02"
# Continue for remaining sprints...

# 6. Monitor progress throughout
/sprint-status "CHR-100.S01" yes
```

### Data Flow Between Commands
```
epic-prep → validates structure
  ↓
epic-breakdown → creates features & tasks
  ↓
sprint-plan → groups into sprint projects
  ↓
sprint-execute → implements sprint work
  ↓
sprint-status → monitors execution
```

### Common Integration Patterns

**Pattern 1: Full Epic Lifecycle**
```bash
/epic-prep <team> <epic> yes → /epic-breakdown <team> <epic> → /sprint-plan <team> <epic> → /sprint-execute (×N)
```

**Pattern 2: Quick Sprint from Existing Epic**
```bash
/sprint-plan <team> <epic> 6 yes → review → /sprint-plan <team> <epic> → /sprint-execute
```

**Pattern 3: Dependency-Aware Planning**
```bash
/dependency-map <team> <epic> → /sprint-plan <team> <epic> 6 yes → adjust → /sprint-plan <team> <epic>
```

**Pattern 4: Iterative Planning**
```bash
/sprint-plan <team> <epic> 3 yes → review
/sprint-plan <team> <epic> 5 yes → compare
/sprint-plan <team> <epic> 4 → execute chosen plan
```
</integration_notes>

<performance_notes>
## Token Budget Management

### Token Consumption Estimates
- Epic context gathering: ~500-1000 tokens
- Issue retrieval (per 50 issues): ~5000-10000 tokens
- Epic analysis: ~1000-2000 tokens
- Sprint breakdown generation: ~2000-5000 tokens
- Project creation (per sprint): ~500-1000 tokens
- Final report: ~2000-5000 tokens

**Total for typical 20-issue epic with 4 sprints**: ~20,000-35,000 tokens

### Optimization Strategies

1. **Pagination for Large Epics**
   - Retrieve issues in chunks of 50
   - Prevents token overflow on epics with 50+ issues
   - Process issues incrementally vs loading all at once

2. **Caching Strategy**
   - Cache team data (reused across all operations)
   - Cache epic metadata (used in multiple steps)
   - Avoid re-fetching same issue data

3. **Selective Data Retrieval**
   - Only fetch direct children (parentId filter)
   - Don't fetch full issue history or comments
   - Retrieve only necessary fields for analysis

4. **Dry-Run Efficiency**
   - Dry-run mode skips all project creation API calls
   - Uses same analysis pipeline with zero Linear writes
   - Perfect for iterative planning without token cost of creation

5. **Batch Operations**
   - Group issue updates in batches of 10
   - Reduces API overhead and token usage
   - Minimizes rate limiting impact

### Performance Tips for Large Epics

**For epics with 50+ issues**:
- Use `--dry-run` first to validate plan
- Consider increasing `--max-sprints` to keep sprint sizes manageable
- Monitor token usage during issue retrieval
- May need multiple command runs if pagination is extensive

**For epics with complex dependencies**:
- Dependency analysis can be token-intensive
- Consider using /dependency-map separately first
- Simplify dependency chains before sprint planning if possible

**For rapid iteration**:
- Always start with `--dry-run` mode
- Adjust `--max-sprints` parameter between runs
- Only create projects once plan is validated
- Dry-run mode is essentially zero-cost for experimentation

### Rate Limiting Considerations
- Linear API has rate limits per workspace
- Command implements delays (200ms between projects, 100ms between batches)
- Exponential backoff on 429 errors prevents token waste on retries
- Batch operations reduce total API call count

### Resource Optimization
```
Small Epic (≤20 issues):
  - Single-pass analysis
  - Minimal token usage
  - Fast execution (<30s)

Medium Epic (21-50 issues):
  - 1-2 pagination cycles
  - Moderate token usage
  - Medium execution (~30-60s)

Large Epic (51+ issues):
  - Multiple pagination cycles
  - Higher token usage
  - Longer execution (~60-120s)
  - Consider --dry-run first
```
</performance_notes>

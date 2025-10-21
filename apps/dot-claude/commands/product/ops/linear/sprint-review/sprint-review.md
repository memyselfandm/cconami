---
allowed-tools: Bash(date:*), Bash(git log:*), Bash(git diff:*), Todo, Task, Read, Grep, Glob, mcp__linear__*
argument-hint: <project-name> [epic-id] [update-linear]
description: (*Run from PLAN mode*) Thoroughly review completed sprint work, validate agent claims against actual implementation, and generate comprehensive validation report
---

# Linear Sprint Review Command
Comprehensive post-sprint validation that cross-references Linear requirements with actual implementation and agent completion claims.

The command analyzes what was supposed to be done (Linear specs), what agents claimed to do (comments), and what was actually implemented (code review), generating detailed validation reports with quality metrics.

## Variables
- `$1` (project-name): (Required) Linear sprint project name to review
- `$2` (epic-id): (Optional) Specific epic ID for additional context
- `$3` (update-linear): (Optional) Pass "yes" or "true" to auto-confirm Linear issue updates with findings

## Workflow

### Step 1: Parse Arguments and Setup
1. Parse command arguments: `$1` contains project name, `$2` contains optional epic ID, `$3` contains optional update-linear flag
2. Validate update-linear flag: check if `$3` is "yes" or "true" for auto-confirmation mode
3. Initialize review tracking structures for findings aggregation

### Step 2: Gather Sprint Context and Claims
1. Use the Task tool to execute the `sprint_context_subagent_prompt` below, replacing `$PROJECT_NAME` with the actual project identifier
   <sprint_context_subagent_prompt>
      Execute the following steps to gather comprehensive sprint context:

      1. **Fetch Sprint Project Details**:
         - Use `mcp__linear__get_team` to get team context
         - Use `mcp__linear__list_projects` to find the project with identifier $PROJECT_NAME
         - Extract project ID from the matching sprint project
         - Get project description and status

      2. **Fetch All Sprint Issues**:
         - Use `mcp__linear__list_issues` with project filter to get all issues in the sprint
         - For each issue:
           - Fetch complete issue details with `mcp__linear__get_issue` including:
             - Description and acceptance criteria
             - Labels (especially phase:*, area:*, type:*)
             - Priority level and current state
             - Parent/child relationships
           - If issue has children (`hasChildren`), use `mcp__linear__list_issues` with `parentId` to fetch sub-issues
         - Build complete issue hierarchy

      3. **Extract Agent Completion Claims**:
         For each issue with comments:
         - Use `mcp__linear__list_comments` to fetch all comments
         - Identify agent comments with patterns:
           - "🤖 Agent-[N] starting work"
           - "✅" or "completed" markers
           - File modification claims ("Files modified:", "modified:", "changed:")
           - Test claims ("Tests added:", "tests:", "test coverage:")
           - Completion summaries
         - Extract agent numbers from comments
         - Build file lists from agent reports
         - Map completion status claims per issue
         - Capture the most recent/final completion comment

      4. **Build Comprehensive Context Package**:
         Create structured report with:
         - Sprint overview (project name, total issues, completion claims)
         - Issue-by-issue details including:
           - Issue ID, title, description
           - Acceptance criteria
           - Priority and labels
           - Parent/child relationships
           - Agent assignment (extracted from comments)
           - Agent completion claims (what they said they did)
           - Files claimed to be modified
           - Tests claimed to be added
           - Current Linear status
         - Summary of claimed vs reported completion
         - List of all files mentioned for validation

      5. Return analysis report to main agent in the following format:
         ```markdown
         # Sprint Context Report: [Sprint Project Name]

         ## Sprint Overview
         - Project ID: [ID]
         - Total Issues: [COUNT]
         - Issues with Agent Claims: [COUNT]
         - Unique Agents: [LIST]

         ## Issues for Review

         [For each issue:]
         ### [ISSUE-IDENTIFIER]: [Issue Title]
         **Linear Specification**:
         - Priority: [P0/P1/P2/P3]
         - Labels: [labels]
         - Description: [summary]
         - Acceptance Criteria:
           - [Criterion 1]
           - [Criterion 2]
           - [...]

         **Sub-Issues** (if any):
         - [SUB-ISSUE-ID]: [Title] ([Status])

         **Agent Claims**:
         - Agent: Agent-[N]
         - Claimed Status: [Completed/In Progress/etc]
         - Claimed Files Modified:
           - [file1.ts]
           - [file2.test.ts]
           - [...]
         - Claimed Tests: [YES/NO] - [count if specified]
         - Completion Comment: "[Most relevant agent comment]"

         **Current Linear Status**: [Linear state]

         [Repeat for all issues...]

         ## Files to Validate
         [Deduplicated list of all files mentioned by agents across all issues]
         - [file path 1]
         - [file path 2]
         - [...]

         ## Summary Statistics
         - Total Issues: [COUNT]
         - With Agent Claims: [COUNT]
         - Claimed Complete: [COUNT]
         - Claimed Files: [COUNT unique files]
         ```
   </sprint_context_subagent_prompt>

### Step 3: Parallel Review Validation

Based on the context report from Step 2, launch parallel review agents to validate agent claims against actual implementation.

1. **Group Issues for Review**:
   - Analyze the context report from Step 2
   - Group issues by technical area for efficient review (frontend, backend, database, etc.)
   - Assign 2-4 issues per review agent for balanced workload
   - Balance complexity across agents
   - Maximum 4 parallel review agents for manageability

2. **Launch Validated Review Agents**:
   ⚠️ CRITICAL: Launch review agents in parallel for efficiency

   Use multiple Task tool calls in a single message to launch agents concurrently, using the `review_agent_prompt_template` below:

   <review_agent_prompt_template>
```markdown
# Role
You are Review-Agent-[ASSIGNED NUMBER], a principal engineer performing thorough code review of sprint implementation work.

# Assigned Issues for Review
[LIST OF 2-4 ISSUE IDs WITH IDENTIFIERS]

## Issue Details
[For each assigned issue, include:]
### [ISSUE-IDENTIFIER]: [Issue Title]
**Linear Specification**:
- Description: [summary]
- Acceptance Criteria:
  - [Criterion 1]
  - [Criterion 2]
- Priority: [P0/P1/P2/P3]
- Labels: [labels]

**Agent Claims** (Agent-[N]):
- Claimed completion: [Status]
- Claimed files modified: [list]
- Claimed tests: [YES/NO with count]
- Completion comment: "[quote from Linear]"

**Sub-Issues** (if any):
- [SUB-ISSUE-ID]: [Title] - Claimed: [status]

# Validation Objectives
1. Verify all claimed files were actually modified and changes match requirements
2. Validate implementation matches Linear specifications and acceptance criteria
3. Check test coverage for new functionality (unit tests, integration tests)
4. Confirm ALL acceptance criteria are met (not just some)
5. Identify any incomplete, placeholder, or incorrect work
6. Assess code quality, best practices, and maintainability
7. Verify sub-issues were actually completed if claimed

# Validation Workflow

## Step 1: Verify File Modifications
For each file claimed to be modified:
1. Use Read tool to examine the file
2. Verify the file actually exists and contains relevant changes
3. Check if changes relate to the issue requirements
4. Look for related files that should have been modified but weren't mentioned
5. Document any discrepancies between claims and reality

## Step 2: Validate Implementation Against Specs
For each issue:
1. Cross-reference code implementation with Linear description
2. Check EACH acceptance criterion individually
3. Verify edge cases and error handling are implemented
4. Look for configuration or environment changes needed
5. Check for integration points and API contracts

## Step 3: Verify Test Coverage
1. Search for test files related to modified code
2. Use Glob tool to find test files: `**/*{.test,.spec}.*`
3. Read test files to verify meaningful test coverage
4. Check that tests actually test the new functionality (not just existing code)
5. Verify tests are passing (check for skip/todo markers)
6. Rate test quality: comprehensive vs basic vs missing

## Step 4: Quality Assessment
Evaluate code quality on these dimensions:
1. **Correctness**: Does it work as specified?
2. **Completeness**: Are all requirements met?
3. **Quality**: Clean code, no shortcuts, proper patterns?
4. **Tests**: Adequate coverage and quality?
5. **Maintainability**: Readable, documented, follows standards?

IMPORTANT REVIEW STANDARDS:
- ❌ REJECT if placeholder/mock code exists unless explicitly required by spec
- ❌ REJECT if acceptance criteria are not fully met
- ❌ REJECT if tests are claimed but missing or inadequate
- ⚠️  PARTIAL if implementation works but has quality issues
- ✅ ACCEPT only if fully complete with good quality

## Step 5: Generate Validation Report
For EACH assigned issue, provide detailed findings:

# Review Report

## [ISSUE-IDENTIFIER]: [Issue Title]

### Implementation Status
**Overall**: [COMPLETE ✅ | INCOMPLETE ⚠️ | INCORRECT ❌]

**Quality Score**: [1-10]/10
- Correctness: [1-10]
- Completeness: [1-10]
- Code Quality: [1-10]
- Test Coverage: [1-10]
- Maintainability: [1-10]

### Claimed vs Actual Implementation

**Agent Claimed**:
- Files: [list from agent comments]
- Tests: [YES/NO]
- Status: [what agent said]

**Actually Found**:
- Files Modified: [actual files with real changes]
- Files Missing: [claimed but not found or no relevant changes]
- Additional Files: [modified but not mentioned]
- Tests Found: [YES/NO with file paths]
- Test Quality: [COMPREHENSIVE/ADEQUATE/BASIC/MISSING]

**Discrepancies**:
- [Specific discrepancy 1 with evidence]
- [Specific discrepancy 2 with evidence]
- [List ALL differences between claims and reality]

### Acceptance Criteria Validation

[For EACH acceptance criterion:]
- [ ] **Criterion 1**: [Description]
  - Status: [MET ✅ | NOT MET ❌ | PARTIAL ⚠️]
  - Evidence: [File:line or explanation]

- [ ] **Criterion 2**: [Description]
  - Status: [MET ✅ | NOT MET ❌ | PARTIAL ⚠️]
  - Evidence: [File:line or explanation]

[Continue for all criteria...]

### Specific Issues Found

[List ALL problems discovered:]
1. **[Issue Type]** (file:line): [Detailed description]
   - Impact: [HIGH/MEDIUM/LOW]
   - Evidence: [Code quote or explanation]

2. **[Issue Type]** (file:line): [Detailed description]
   - Impact: [HIGH/MEDIUM/LOW]
   - Evidence: [Code quote or explanation]

[If no issues found, explicitly state: "No significant issues found."]

### Code Quality Notes

**Strengths**:
- [What was done well]

**Concerns**:
- [Quality issues or technical debt introduced]

**Recommendations**:
- [Specific improvements needed]

### Final Recommendation

**Recommendation**: [ACCEPT ✅ | REWORK ⚠️ | REJECT ❌]

**Rationale**: [1-2 sentences explaining the recommendation]

**Required Actions** (if not ACCEPT):
1. [Specific action needed]
2. [Another specific action]

---

[Repeat above structure for each assigned issue]

# Summary for Agent-[N]
- Issues Reviewed: [COUNT]
- Accepted: [COUNT]
- Needs Rework: [COUNT]
- Rejected: [COUNT]
- Average Quality Score: [X.X]/10
```
   </review_agent_prompt_template>

3. **Monitor Review Execution**:
   - Track review agent progress
   - Wait for ALL review agents to complete
   - Collect structured reports from each agent

### Step 4: Consolidate Findings

1. **Aggregate Review Results**:
   - Collect reports from all review agents (from Step 3)
   - Combine findings for all reviewed issues
   - Cross-reference with original requirements from Step 2
   - Build comprehensive findings database

2. **Calculate Sprint Metrics**:
   ```python
   # Issue Completion Metrics
   total_issues = [count from Step 2]
   fully_complete = [count with ACCEPT recommendation]
   needs_rework = [count with REWORK recommendation]
   rejected = [count with REJECT recommendation]

   completion_rate = (fully_complete / total_issues) * 100
   quality_rate = ((fully_complete + needs_rework) / total_issues) * 100

   # Quality Metrics
   avg_quality_score = [average of all quality scores from reviews]
   avg_correctness = [average correctness scores]
   avg_completeness = [average completeness scores]
   avg_test_coverage = [average test coverage scores]

   # Discrepancy Metrics
   issues_with_discrepancies = [count where claimed ≠ actual]
   discrepancy_rate = (issues_with_discrepancies / total_issues) * 100

   # Test Coverage
   issues_with_tests = [count where tests were found]
   test_coverage_rate = (issues_with_tests / total_issues) * 100
   ```

3. **Identify Critical Issues**:
   - Flag all issues with REJECT recommendations
   - Flag issues with high-impact problems
   - Flag acceptance criteria not met
   - Flag missing tests despite claims
   - Assess severity: CRITICAL / HIGH / MEDIUM / LOW
   - Prioritize by impact and effort to fix

4. **Build Agent Accountability Map**:
   ```python
   for agent in unique_agents:
       issues_assigned = [issues claiming this agent]
       issues_claimed_complete = [from agent comments]
       issues_actually_complete = [with ACCEPT recommendation]

       accuracy_rate = (issues_actually_complete / issues_claimed_complete) * 100
       avg_quality = [average quality score for this agent's issues]
   ```

### Step 5: Generate Comprehensive Report

Generate detailed validation report with all findings:

```markdown
## Sprint Review Report: [Project Name]

**Review Date**: [Current Date]
**Sprint Project**: [Project Name] ([Linear URL])
**Reviewer**: Claude Code Sprint Review
**Review Type**: Automated Post-Sprint Validation

---

### Executive Summary

**Sprint Completion**:
- Total Issues in Sprint: [X]
- Issues Reviewed: [X]
- Fully Complete: [X] ([XX]%) ✅
- Needs Rework: [X] ([XX]%) ⚠️
- Rejected/Incomplete: [X] ([XX]%) ❌

**Quality Assessment**:
- Overall Quality Score: [X.X]/10
- Test Coverage Rate: [XX]%
- Discrepancy Rate: [XX]%

**Critical Findings**: [X] critical issues requiring immediate attention

---

### Sprint Metrics

#### Completion Status
| Status | Count | Percentage |
|--------|-------|------------|
| ✅ Fully Complete | [X] | [XX]% |
| ⚠️ Needs Rework | [X] | [XX]% |
| ❌ Rejected/Incomplete | [X] | [XX]% |
| **Total** | **[X]** | **100%** |

#### Quality Dimensions (Average Scores)
| Dimension | Score | Rating |
|-----------|-------|--------|
| Correctness | [X.X]/10 | [Excellent/Good/Fair/Poor] |
| Completeness | [X.X]/10 | [Excellent/Good/Fair/Poor] |
| Code Quality | [X.X]/10 | [Excellent/Good/Fair/Poor] |
| Test Coverage | [X.X]/10 | [Excellent/Good/Fair/Poor] |
| Maintainability | [X.X]/10 | [Excellent/Good/Fair/Poor] |
| **Overall** | **[X.X]/10** | **[Rating]** |

#### Test Coverage
- Issues with Tests: [X]/[Y] ([XX]%)
- Issues Missing Tests: [X]
- Test Quality: [breakdown by comprehensive/adequate/basic]

---

### Critical Findings

[If critical issues exist:]

⚠️ **IMMEDIATE ATTENTION REQUIRED**

The following issues have critical problems that must be addressed:

1. **[ISSUE-KEY]: [Issue Title]**
   - **Problem**: [Critical issue description]
   - **Impact**: [Why this is critical]
   - **Required Action**: [Specific fix needed]
   - **Priority**: CRITICAL

2. **[ISSUE-KEY]: [Issue Title]**
   - **Problem**: [Critical issue description]
   - **Impact**: [Why this is critical]
   - **Required Action**: [Specific fix needed]
   - **Priority**: HIGH

[If no critical issues:]
✅ No critical issues identified

---

### Issue-by-Issue Review

[For each issue, in order of priority:]

#### [ISSUE-KEY]: [Issue Title]

**Linear Specification**:
- **Description**: [Brief summary]
- **Priority**: [P0/P1/P2/P3]
- **Labels**: [labels]
- **Acceptance Criteria**:
  - [Criterion 1]
  - [Criterion 2]
  - [...]

**Agent Claims** (Agent-[N]):
- **Claimed Completion**: [YES/NO]
- **Claimed Files**: [list]
- **Claimed Tests**: [YES/NO]
- **Completion Comment**: "[Quote from Linear]"

**Review Findings**:
- **Implementation Status**: [COMPLETE ✅ | INCOMPLETE ⚠️ | INCORRECT ❌]
- **Quality Score**: [X]/10
- **Test Coverage**: [FOUND ✅ | MISSING ❌ | PARTIAL ⚠️]

**Actual Implementation**:
- **Files Modified**: [actual file list]
- **Tests Found**: [test file paths or "None"]
- **Implementation Details**: [What was actually built]

**Acceptance Criteria Status**:
- [✅ | ❌ | ⚠️] Criterion 1: [Status explanation]
- [✅ | ❌ | ⚠️] Criterion 2: [Status explanation]
- [Continue for all criteria...]

**Discrepancies Found**:
[If any discrepancies:]
- **Claimed vs Actual**: [Specific discrepancy with evidence]
- **Missing Implementation**: [What's missing]
- **Incorrect Implementation**: [What's wrong]

[If no discrepancies:]
- No significant discrepancies between claims and implementation

**Specific Issues**:
[If issues found:]
1. **[Issue Type]** (file:line): [Description]
   - Impact: [HIGH/MEDIUM/LOW]

[If no issues:]
- No significant issues found

**Recommendation**: [ACCEPT ✅ | REWORK ⚠️ | REJECT ❌]
**Rationale**: [Explanation]

[If not ACCEPT:]
**Required Actions**:
1. [Specific action]
2. [Another action]

---

[Repeat for all issues...]

---

### Agent Performance Analysis

#### Agent Accountability Report
| Agent | Issues Assigned | Claimed Complete | Actually Complete | Accuracy Rate | Avg Quality |
|-------|----------------|------------------|-------------------|---------------|-------------|
| Agent-1 | [X] | [X] | [X] | [XX]% | [X.X]/10 |
| Agent-2 | [X] | [X] | [X] | [XX]% | [X.X]/10 |
| Agent-3 | [X] | [X] | [X] | [XX]% | [X.X]/10 |
| **Total** | **[X]** | **[X]** | **[X]** | **[XX]%** | **[X.X]/10** |

#### Agent Performance Notes
[Commentary on agent performance, patterns observed, areas for improvement]

---

### Quality Assessment

#### Code Quality Summary
- **Adherence to Standards**: [Score/10] - [Commentary]
- **Test Coverage**: [XX]% - [Commentary]
- **Documentation**: [Score/10] - [Commentary]
- **Best Practices**: [Score/10] - [Commentary]

#### Technical Debt Identified
[If technical debt found:]
- [Technical debt item 1]
- [Technical debt item 2]

[If none:]
- No significant technical debt identified

#### Strengths Observed
- [Positive observation 1]
- [Positive observation 2]

#### Areas for Improvement
- [Improvement area 1]
- [Improvement area 2]

---

### Recommendations

#### Immediate Actions Required
[If critical issues exist:]
1. **[HIGH PRIORITY]**: [Action description]
   - Affected Issues: [ISSUE-IDs]
   - Estimated Effort: [Hours/Days]

2. **[HIGH PRIORITY]**: [Action description]
   - Affected Issues: [ISSUE-IDs]
   - Estimated Effort: [Hours/Days]

[If no immediate actions:]
✅ No immediate actions required

#### Follow-up Tasks
[Optional improvements and cleanup:]
- [ ] [Follow-up task 1]
- [ ] [Follow-up task 2]
- [ ] [Follow-up task 3]

#### Process Improvements
[Suggestions for future sprints:]
- [Process improvement 1]
- [Process improvement 2]

---

### Linear Update Proposals

[If --update-linear flag NOT provided and discrepancies found:]

**Proposed Linear Updates**:

The following issues have discrepancies and should be updated in Linear:

1. **[ISSUE-KEY]**: Add review comment with findings
   - Status change: [Current] → [Proposed]
   - Comment: "[Proposed comment text]"

2. **[ISSUE-KEY]**: Add review comment with findings
   - Status change: [Current] → [Proposed]
   - Comment: "[Proposed comment text]"

[Continue for all issues needing updates...]

To apply these updates, run with update-linear flag (third argument as "yes") or confirm below.

---

### Review Metadata
- **Review Duration**: [Estimated time]
- **Review Agents Used**: [Count]
- **Total Files Reviewed**: [Count]
- **Report Generated**: [Timestamp]
```

### Step 6: Update Linear and Finalize

1. **Determine Update Mode**:
   ```python
   if has_discrepancies:
       if update_linear_flag:
           auto_confirm = True
       else:
           # Present findings and ask for confirmation
           print(f"Found {discrepancy_count} issues with significant discrepancies.")
           print(f"\nProposed updates:")
           print(f"- Add validation comments to {issue_count} issues")
           print(f"- Update status for {incomplete_count} incomplete issues")
           print(f"\nProceed with Linear updates? (y/n)")
           # Wait for user confirmation
   else:
       print("No significant discrepancies found. No Linear updates needed.")
   ```

2. **Update Linear Issues** (if confirmed):
   For each issue needing updates:
   ```python
   # Add comprehensive review comment
   mcp__linear__create_comment(
       issueId=issue_id,
       body=f"""## Sprint Review Validation

**Review Date**: {date}
**Status**: {implementation_status}
**Quality Score**: {quality_score}/10

**Findings**:
{detailed_findings}

**Recommendation**: {recommendation}

{required_actions if not ACCEPT}

---
*Generated by Claude Code Sprint Review*
"""
   )

   # Update issue status if needed
   if recommendation == "REJECT" or recommendation == "REWORK":
       mcp__linear__update_issue(
           id=issue_id,
           state="In Progress",  # or "Backlog" for rejected
           # Add "needs-review" or "rework" label
       )
   ```

3. **Add Sprint Project Summary**:
   ```python
   # Add summary comment to sprint project
   mcp__linear__create_comment(
       projectId=project_id,
       body=f"""## Sprint Review Complete

**Review Date**: {date}
**Total Issues**: {total}
**Completion Rate**: {completion_rate}%
**Quality Score**: {avg_quality}/10

**Summary**:
- ✅ Fully Complete: {complete_count}
- ⚠️ Needs Rework: {rework_count}
- ❌ Rejected: {reject_count}

[Link to full review report]

---
*Generated by Claude Code Sprint Review*
"""
   )
   ```

4. **Generate Final Summary**:
   ```markdown
   ✅ Sprint Review Complete

   **Review Summary**:
   - Sprint Project: [Name]
   - Issues Reviewed: [X]/[Y]
   - Completion Rate: [XX]%
   - Quality Score: [X.X]/10
   - Discrepancies Found: [X]
   - Critical Issues: [X]
   - Linear Updated: [YES/NO]

   **Status Breakdown**:
   - ✅ Accepted: [X] issues
   - ⚠️ Needs Rework: [X] issues
   - ❌ Rejected: [X] issues

   **Next Steps**:
   [If critical issues:]
   - Address critical issues immediately
   - [Specific action items]

   [If rework needed:]
   - Review issues marked for rework
   - [Specific recommendations]

   [If all accepted:]
   - Sprint successfully validated
   - Ready for closure

   **Linear Project**: [Linear URL]
   **Full Report**: [See detailed report above]
   ```

## Error Handling

### Review Agent Failures
```python
for failed_agent in failed_review_agents:
    if retry_count < 2:
        print(f"⚠️ Retrying Review-Agent-{failed_agent['number']} (attempt {retry_count + 1}/2)...")

        # Relaunch with same assignment
        relaunch_review_agent(failed_agent)

        # Log retry
        failed_retries.append({
            'agent': failed_agent['number'],
            'attempt': retry_count + 1,
            'issues': failed_agent['issues']
        })
    else:
        # Mark issues as unreviewable
        print(f"❌ Review-Agent-{failed_agent['number']} failed after retries")

        for issue_id in failed_agent['issues']:
            unreviewable_issues.append({
                'issue_id': issue_id,
                'reason': f"Review agent failed: {failed_agent['error']}",
                'recommendation': "Manual review required"
            })

        # Include in final report
        print(f"⚠️ {len(failed_agent['issues'])} issues require manual review")
```

### Linear API Failures
```python
# Context Gathering (Step 2)
if linear_api_failure:
    - Implement exponential backoff (2s, 4s, 8s delays)
    - Retry up to 3 times
    - Cache partial data if available
    - If persistent failure:
        - Report error to user
        - Provide manual review instructions
        - Exit gracefully with partial data if useful

# Linear Updates (Step 6)
if update_failure:
    - Log failed updates
    - Retry with exponential backoff
    - Provide manual update instructions
    - Include failed updates in final summary
    - Don't fail entire review for update failures
```

### Code Access Issues
```python
if file_not_found or read_error:
    - Document inaccessible files in review report
    - Note as "Unable to verify" in findings
    - Flag affected issues for manual review
    - Continue with available files
    - Include access issues in recommendations
```

### Incomplete Context
```python
if missing_agent_claims or missing_issues:
    - Document gaps in context
    - Note assumptions made
    - Flag for manual verification
    - Continue with available information
    - Include data gaps in report caveats
```

## Optimization Guidelines

### Review Efficiency
- **Parallel Processing**: Launch 2-4 review agents concurrently for faster validation
- **Balanced Workload**: Distribute 2-4 issues per agent to avoid overload
- **Technical Grouping**: Group issues by area (frontend, backend) for context efficiency
- **File Deduplication**: Review each file once even if multiple issues touch it

### Review Quality
- **Evidence-Based**: Require specific file:line references for all findings
- **Criteria-Focused**: Check EACH acceptance criterion individually
- **Test-Aware**: Actively search for and validate test coverage
- **Consistency**: Apply same standards across all issues and agents

### Linear Integration
- **Batch Comments**: Prepare all comments before API calls
- **Rate Limiting**: Implement delays between Linear API calls
- **Error Resilience**: Cache comments locally if API fails
- **Audit Trail**: Maintain complete record of all updates

### Reporting Quality
- **Actionable**: Provide specific, actionable recommendations
- **Evidence-Based**: Support all findings with concrete evidence
- **Complete**: Cover all issues, even if no problems found
- **Clear**: Use consistent formatting and clear language

## Review Quality Standards

### Thoroughness Requirements
- ✅ Every claimed file MUST be checked for actual modifications
- ✅ ALL acceptance criteria MUST be validated individually
- ✅ Test coverage MUST be actively searched for and verified
- ✅ Code quality MUST be assessed on multiple dimensions
- ✅ Sub-issues MUST be verified if parent claims completion
- ✅ Related files MUST be checked even if not explicitly mentioned

### Evidence Requirements
- ✅ Provide specific file paths and line numbers for findings
- ✅ Quote actual code vs expected implementation
- ✅ Document exact discrepancies with evidence
- ✅ Include quality metrics and scores
- ✅ Reference Linear specifications in findings
- ✅ Support recommendations with rationale

### Objectivity Standards
- ✅ Use consistent evaluation criteria across all issues
- ✅ Document both strengths and weaknesses
- ✅ Avoid subjective assessments without evidence
- ✅ Focus on spec compliance and quality metrics
- ✅ Be honest about incomplete or incorrect work
- ✅ Provide constructive, actionable feedback

### Rejection Criteria
- ❌ REJECT if placeholder/mock code exists unless explicitly required
- ❌ REJECT if acceptance criteria are not met
- ❌ REJECT if tests are claimed but missing or inadequate
- ❌ REJECT if implementation doesn't match specifications
- ❌ REJECT if critical functionality is incomplete

## Example Execution

```bash
$ /sprint-review "Sprint 2024-12-001: Authentication"

🔍 Parsing arguments: project name "Sprint 2024-12-001: Authentication"

📋 Fetching sprint context and claims from Linear...
   ⏳ Analyzing sprint project and issues...
   ⏳ Extracting agent completion claims...
   ✅ Context gathered: 20 issues with agent claims

📊 Sprint Context Summary:
   Total Issues: 20
   Issues with Claims: 18
   Unique Agents: 5
   Claimed Files: 47

🤖 Launching parallel review validation...
   ⏳ Review-Agent-1 analyzing 4 issues...
   ⏳ Review-Agent-2 analyzing 5 issues...
   ⏳ Review-Agent-3 analyzing 5 issues...
   ⏳ Review-Agent-4 analyzing 4 issues...

✅ All review agents completed

📊 Consolidating findings...
   ⏳ Aggregating review results...
   ⏳ Calculating sprint metrics...
   ⏳ Identifying critical issues...

📊 Sprint Review Results:
   Completion Rate: 75% (15/20 issues fully complete)
   Quality Score: 7.8/10
   Test Coverage: 85%
   Discrepancies Found: 8 issues
   Critical Issues: 3

⚠️  Critical Findings:
   - AUTH-101: Tests not implemented despite claims
   - AUTH-105: Partial implementation missing error handling
   - AUTH-112: Implementation doesn't match acceptance criteria

📝 Generating comprehensive report...

✅ Report generated (see above)

⚠️  Found 8 issues with discrepancies requiring Linear updates

Proposed updates:
- Add validation comments to 8 issues
- Update status for 5 incomplete issues
- Add "needs-rework" label to 3 issues

Proceed with Linear updates? (y/n) [or pass "yes" as third argument to auto-confirm]

[User responds: y]

🔄 Updating Linear...
   ✅ Updated AUTH-101 with review findings
   ✅ Updated AUTH-105 with review findings
   ✅ Updated AUTH-112 with review findings
   ✅ Updated 5 additional issues
   ✅ Added sprint review summary to project

✅ Sprint Review Complete

**Review Summary**:
- Sprint Project: Sprint 2024-12-001: Authentication
- Issues Reviewed: 20/20
- Completion Rate: 75%
- Quality Score: 7.8/10
- Discrepancies Found: 8
- Critical Issues: 3
- Linear Updated: YES

**Status Breakdown**:
- ✅ Accepted: 15 issues
- ⚠️ Needs Rework: 3 issues
- ❌ Rejected: 2 issues

**Next Steps**:
- Address critical issues immediately (AUTH-101, AUTH-105, AUTH-112)
- Review issues marked for rework
- Re-test after fixes applied

**Linear Project**: https://linear.app/team/project/sprint-2024-12-001
**Full Report**: [Detailed report generated above]
```

---
allowed-tools: Bash(date:*), Bash(git log:*), Bash(git diff:*), Todo, Task, Read, Grep, Glob, mcp__linear__get_project, mcp__linear__list_issues, mcp__linear__get_issue, mcp__linear__list_comments, mcp__linear__create_comment, mcp__linear__update_issue
argument-hint: --project <project-name> [--epic <epic-id>] [--update-linear]
description: (*Run from PLAN mode*) Thoroughly review completed sprint work, validate agent claims against actual implementation, and generate comprehensive validation report
---

# Linear Sprint Review Command
Comprehensive post-sprint validation that cross-references Linear requirements with actual implementation and agent completion claims.

## Usage
- `--project <name>`: (Required) Linear sprint project name to review
- `--epic <id>`: (Optional) Specific epic ID for additional context
- `--update-linear`: (Optional) Auto-confirm Linear issue updates with findings

This command performs thorough validation of sprint execution, comparing what was supposed to be done (Linear specs) with what agents claimed to do (comments) versus what was actually implemented (code review).

Execute the WORKFLOW step by step.

## WORKFLOW

### Step 1: Parse Arguments and Setup
1. Extract project name and optional epic ID from arguments
2. Parse --update-linear flag for auto-confirmation mode
3. Initialize review tracking structures

!echo "🔍 Parsing arguments: $ARGUMENTS"

### Step 2: Gather Linear Sprint Data

!echo "📋 Fetching sprint data from Linear..."

Use the Task tool to launch concurrent subagents fetch and return to you the following context:
1. **Query Sprint Project**:
   - Get project details using Linear MCP
   - Get all sprint issues with full context
   - Fetch issue details including sub-issues

2. **Fetch Detailed Issue Information**:
   - Get full issue details for each sprint issue
   - Extract all comments containing agent claims
   - Map files mentioned in completion comments
   - Build comprehensive sprint context

3. **Build Sprint Context**:
   - Consolidate project, epic, and issue data
   - Map agent claims to specific issues
   - Extract claimed file modifications
   - Compile acceptance criteria by issue

### Step 3: Analyze Agent Claims

1. **Extract Completion Patterns**:
   - Look for agent completion markers in comments
   - Pattern matching for:
     - Agent start/completion notifications
     - File modification claims
     - Test implementation claims
     - Status update comments

2. **Map Claims to Issues**:
   - Extract agent numbers from comments
   - Build file lists from agent reports
   - Parse completion status claims
   - Summarize claimed implementation work

3. **Identify Review Priorities**:
   - Prioritize issues with multiple agent claims
   - Identify complex acceptance criteria
   - Map parent issues with sub-issues
   - Ensure the review plan covers the entire sprint's implementation scope

### Step 4: Orchestrate Parallel Review

!echo "🤖 Launching parallel review agents..."

1. **Group Issues for Review**:
   - Group by technical area for efficient review
   - Assign 2-4 issues per review agent
   - Balance complexity across agents

2. **Launch Review Agents**:
   Use Task tool to create multiple concurrent review agents, each with:
   - **Linear Context**: Issue descriptions, acceptance criteria, and technical requirements
   - **Agent Claims**: Comments from completion reports and progress updates
   - **Validation Directive**: Cross-reference claims with actual implementation
   - **Quality Standards**: Test coverage, code completeness, and spec adherence
   - **Reporting Format**: Structured findings for consolidation
   - **Review Agent Prompt Template:**
```
VARIABLES:
$reviewAgentNumber: [ASSIGNED NUMBER]
$linearIssueIds: [COMMA-SEPARATED LINEAR ISSUE IDS]
$issueDetails: [ISSUE DESCRIPTIONS AND ACCEPTANCE CRITERIA]
$agentClaims: [AGENT COMPLETION COMMENTS]
$filesModified: [FILES CLAIMED TO BE MODIFIED]

ROLE: You are a principal engineer performing a throrough code review of multiple engineers' work at the end of a sprint

CONTEXT:
- Linear Issues to Review: $linearIssueIds
- Agent Completion Claims: [EXTRACTED FROM LINEAR COMMENTS]
- Files Allegedly Modified: $filesModified
- Acceptance Criteria: [FROM LINEAR ISSUES]

GOALS:
1. Verify all claimed files were actually modified
2. Validate implementation matches Linear specifications
3. Check test coverage for new functionality
4. Confirm acceptance criteria are met
5. Identify any incomplete or incorrect work
6. Assess code quality and best practices

WORKFLOW:
1. Read all files mentioned in $filesModified
2. Search for related test files and verify test coverage
3. Cross-reference implementation with Linear requirements
IMPORTANT: There should be no mock or placeholder code unless the acceptance critera explicitly calls for it. If there is mock/placeholder implementation, mark the implementation status as INCOMPLETE and REJECT the issue. Provide details about the incomplete implementation (filenames, line numbers, code blocks)
4. Document all discrepancies found
5. Rate implementation quality (1-10 scale)
6. Provide specific evidence for all findings
7. Return structured validation report

REPORT FORMAT:
- Issue ID: [LINEAR-ID]
- Implementation Status: [COMPLETE/INCOMPLETE/INCORRECT]
- Quality Score: [1-10]
- Claimed vs Actual:
  - Agent claimed: [SUMMARY]
  - Actually implemented: [SUMMARY]
  - Discrepancies: [LIST]
- Test Coverage: [FOUND/MISSING/PARTIAL]
- Acceptance Criteria Met: [YES/NO/PARTIAL]
- Specific Issues Found: [DETAILED LIST]
- Recommendation: [ACCEPT/REWORK/REJECT]
```

### Step 5: Consolidate Findings

1. **Aggregate Review Results**:
   - Combine findings from all review agents
   - Cross-reference original requirements
   - Identify implementation gaps
   - Calculate quality scores
   - Determine recommended actions

2. **Calculate Sprint Metrics**:
   - Total issues reviewed vs. planned
   - Completion rates by category
   - Quality score distribution
   - Test coverage statistics
   - Discrepancy rate calculation

3. **Identify Critical Issues**:
   - Flag issues with critical discrepancies
   - Assess severity and impact
   - Suggest remediation approaches
   - Prioritize rework requirements

### Step 6: Generate Comprehensive Report

```markdown
## Sprint Review Report: [Project Name]

### Executive Summary
- **Sprint Project**: [Name]
- **Review Date**: [Date]
- **Total Issues Reviewed**: [X]/[Y]
- **Overall Completion Rate**: [PERCENTAGE]%
- **Quality Score**: [X.X]/10
- **Test Coverage**: [PERCENTAGE]%
- **Discrepancy Rate**: [PERCENTAGE]%

### Sprint Metrics
- ✅ Fully Complete: [X] issues ([PERCENTAGE]%)
- ⚠️ Partially Complete: [X] issues ([PERCENTAGE]%)
- ❌ Incomplete/Incorrect: [X] issues ([PERCENTAGE]%)
- 🧪 With Tests: [X] issues ([PERCENTAGE]%)

### Critical Findings
[List any critical discrepancies or issues requiring immediate attention]

### Issue-by-Issue Review

#### [ISSUE-KEY]: [Issue Title]
**Linear Specification**:
- Description: [Summary]
- Acceptance Criteria: [List]
- Priority: [Level]

**Agent Claims** (Agent-[N]):
- Claimed completion: [YES/NO]
- Files modified: [List]
- Tests added: [YES/NO]
- Completion comment: "[Quote]"

**Review Findings**:
- Implementation Status: [COMPLETE/INCOMPLETE/INCORRECT]
- Quality Score: [X]/10
- Actual Implementation: [Description]
- Files Actually Modified: [List]
- Test Coverage: [FOUND/MISSING/PARTIAL]

**Discrepancies**:
- [List specific discrepancies between claims and reality]

**Recommendation**: [ACCEPT/REWORK/REJECT]

[Repeat for each issue...]

### Agent Performance Analysis

#### Agent Accountability Report
| Agent | Issues Assigned | Claimed Complete | Actually Complete | Accuracy Rate |
|-------|----------------|------------------|-------------------|---------------|
| Agent-1 | X | X | X | XX% |
| Agent-2 | X | X | X | XX% |
[Continue for all agents...]

### Quality Assessment

#### Code Quality Metrics
- Adherence to Standards: [SCORE]
- Test Coverage: [PERCENTAGE]
- Documentation: [SCORE]
- Best Practices: [SCORE]

#### Technical Debt Identified
- [List any technical debt or quality issues]

### Recommendations

#### Immediate Actions Required
1. [High-priority fixes]
2. [Critical rework items]

#### Follow-up Tasks
- [Additional testing needed]
- [Documentation updates]
- [Refactoring opportunities]

### Linear Update Proposals
[If discrepancies found, list proposed Linear comment updates]
```

### Step 7: Update Linear (If Confirmed)

1. **Present Findings to User**:
   ```markdown
   ## Linear Update Confirmation
   
   Found [X] issues with significant discrepancies.
   
   Proposed updates:
   - Add validation comments to [X] issues
   - Update status for [X] incomplete issues
   - Add detailed findings to each issue
   
   Proceed with Linear updates? [Requires confirmation unless --update-linear flag]
   ```

2. **Update Linear Issues using subagents (Task tool)** (if confirmed):
   - Add comprehensive review comments to issues with discrepancies
   - Update issue status for incomplete work
   - Add labels for issues needing rework
   - Create sprint review summary comment

3. **Add Sprint Review Summary**:
   - Add summary comment to sprint project
   - Include key metrics and completion rates
   - Reference full report availability
   - Document review completion date

### Step 8: Final Summary

!echo "✅ Sprint Review Complete"

```markdown
✅ Sprint Review Complete

**Review Summary**:
- Reviewed: [X]/[Y] issues
- Completion Rate: [PERCENTAGE]%
- Quality Score: [X.X]/10
- Discrepancies Found: [X]
- Linear Updated: [YES/NO]

**Next Steps**:
[List any required follow-up actions]

Linear Project: [URL]
```

## Error Handling

### Review Agent Failures
- Implement retry logic for failed review agents
- Fall back to single-issue review if needed
- Document unreviewable issues in final report
- Continue processing with available data

### Linear API Issues
- Implement retry logic with exponential backoff
- Cache data locally for report generation
- Provide manual update instructions if API fails
- Maintain partial functionality during outages

### Code Access Issues
- Document files that couldn't be accessed
- Flag for manual review
- Continue with available information
- Include access issues in final report

## Review Quality Standards

### Thoroughness Requirements
- Every claimed file must be checked
- All acceptance criteria must be validated
- Test coverage must be verified
- Code quality must be assessed

### Evidence Requirements
- Provide specific file paths and line numbers
- Quote actual vs expected implementation
- Document exact discrepancies found
- Include quality metrics and scores

### Objectivity Standards
- Use consistent evaluation criteria
- Document both positives and negatives
- Avoid subjective assessments without evidence
- Focus on spec compliance and quality

## Example Execution

```
$ /sprint-review --project "Sprint 2024-12-001: Authentication"

🔍 Fetching sprint data from Linear...
📋 Found 20 completed issues with agent claims

🤖 Launching 5 parallel review agents...
⏳ Review agents analyzing implementation...
✅ All review agents completed

📊 Sprint Review Results:
  Completion Rate: 85% (17/20 issues fully complete)
  Quality Score: 7.8/10
  Discrepancies Found: 8 issues
  Critical Issues: 3

⚠️ Significant discrepancies found in 3 issues:
  - AUTH-101: Tests not implemented despite claims
  - AUTH-105: Partial implementation missing error handling
  - AUTH-112: Implementation doesn't match acceptance criteria

Would you like to update Linear with detailed findings? (y/n)

[If yes]
✅ Linear updated with comprehensive review findings
📊 Full report available above
```
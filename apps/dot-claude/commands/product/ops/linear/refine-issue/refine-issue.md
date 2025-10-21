---
allowed-tools: Bash, WebFetch
argument-hint: [issue-id-or-url] [team name] [type task|bug|chore] [template path-or-url]
description: Generic issue refinement for tasks, bugs, and chores - refine existing or create new from ideas
---

# /refine-issue - Flexible Issue Refinement & Creation

## Command Purpose
Refine existing Linear issues OR create new ones from scratch using appropriate templates for tasks, bugs, and chores. Supports custom templates for team-specific requirements. This is the Swiss Army knife of issue refinement - use specialized commands (`refine-epic`, `refine-feature`) when available.

## Workflow

### Step 1: Parse Arguments
Parse natural language input from $ARGUMENTS to extract:

**Issue ID or URL** (optional):
- Look for patterns matching `XXX-NNN` format (e.g., CCC-789)
- Or full Linear URLs
- If omitted AND team name provided, creates new issue

**Keywords** (optional):
- `interactive` - Step through all sections with prompts
- `validate-only` or `validate only` - Check readiness without changes (refine mode only)
- `team` followed by a name - Target Linear team (required for create mode)
- `type` followed by task/bug/chore - Issue type (auto-detected if not specified)
- `template` followed by path or URL - Custom template markdown file

**Examples of valid inputs:**
- `CCC-789` - Refine existing issue
- `team Chronicle type bug` - Create new bug report
- `CCC-789 interactive` - Refine with guided prompts
- `team Chronicle template https://example.com/template.md` - Create with custom template
- `https://linear.app/team/issue/CCC-789` - Refine from URL

### Step 2: Mode Detection
```python
if issue_id_provided:
    # REFINE MODE - enhance existing issue
    mode = "refine"
    # Get issue using linctl
else:
    # CREATE MODE - build from scratch
    mode = "create"
    if not team_provided:
        prompt_for_team()
```

### Step 1A: Refine Mode (Existing Issue)

**Fetch and analyze:**
- Get issue using linctl: `linctl issue get [ID] --json`
- Detect type from labels or content
- Check current completeness
- Apply appropriate template

**Readiness Assessment:**
```
Generic Issue Readiness:
- [ ] Clear, specific title
- [ ] Description with context
- [ ] Acceptance criteria or definition of done
- [ ] Type identifiable (task/bug/chore)
- [ ] Priority set
```

### Step 1B: Create Mode (New Issue)

**Interactive Creation Flow:**
```
🆕 Creating New Issue

1️⃣ What's your issue about? (brief description)
> [User provides initial idea]

2️⃣ Issue title?
> [User provides title or auto-generate from description]

3️⃣ What type? (task/bug/chore)
> [Auto-detect or user selects]

[Continue with type-specific template...]
```

### Step 2: Apply Type-Specific Template

#### Task Template
```markdown
## Task: [Title]

### Objective
What needs to be done and why?

### Scope
- [ ] Specific deliverable 1
- [ ] Specific deliverable 2
- [ ] Specific deliverable 3

### Implementation Notes
Technical approach and considerations

### Definition of Done
- [ ] Code complete and tested
- [ ] Documentation updated
- [ ] PR merged
```

#### Bug Template
```markdown
## Bug: [Title]

### Description
Brief summary of the issue

### Steps to Reproduce
1. Step one
2. Step two
3. Step three

### Expected Behavior
What should happen

### Actual Behavior
What actually happens

### Environment
- Version/commit:
- Browser/OS:
- Relevant config:

### Fix Verification
How to verify the fix works
```

#### Chore Template
```markdown
## Chore: [Title]

### Purpose
Why this maintenance is needed

### Tasks
- [ ] Maintenance task 1
- [ ] Maintenance task 2
- [ ] Maintenance task 3

### Impact
What changes after completion

### Verification
How to confirm completion
```

### Step 3: Custom Template Support

**Loading Custom Templates:**
```python
if custom_template_provided:
    if template_path.startswith("http"):
        # Fetch from URL
        template = WebFetch(template_path, "Extract markdown template")
    else:
        # Load from local file
        template = read_file(template_path)
    apply_custom_template(template)
```

**Custom Template Format:**
```markdown
# Custom Bug Template Example
## Required Sections
- Problem Statement
- Reproduction Steps
- System State
- Proposed Solution
- Test Plan

## Optional Sections
- Performance Impact
- Security Considerations
```

### Step 4: Interactive Refinement

**Guided Prompts (based on gaps):**
```
Missing: Clear reproduction steps
❓ How can someone reproduce this issue?
> 1. Login as admin 2. Navigate to settings 3. Click save without changes

Missing: Success criteria  
❓ How will we know this is fixed?
> Error no longer appears, settings save correctly

Missing: Priority
❓ How urgent? (P0-P4)
> P2 - affects multiple users but has workaround
```

### Step 5: Create or Update Issue

**For Create Mode:**
Create the new issue using linctl:
```bash
linctl issue create --team "[TEAM]" --title "[TITLE]" --description "[DESCRIPTION]" --priority [P0-P4]
linctl label add [NEW-ID] [issue-type] refined
```

Display the created issue identifier and URL.

**For Refine Mode:**
Update the existing issue using linctl:
```bash
linctl issue update [ID] --description "[REFINED-DESCRIPTION]"
linctl label add [ID] [updated-labels]
```

Display confirmation that the issue was refined.

## Command Output Examples

### Create Mode: New Bug Report
```
/refine-issue --team "Chronicle" --type bug

🆕 Creating New Bug Report

📝 Describe the bug:
> Login button doesn't work on mobile Safari

🏷️ Title for this bug?
> Mobile Safari: Login button unresponsive

📱 Steps to reproduce?
> 1. Open app in mobile Safari
> 2. Tap login button
> 3. Nothing happens

🎯 Expected behavior?
> Should open login modal

💥 Actual behavior?
> No response to tap

📊 Environment details?
> iOS 15+, Safari, Production

✅ Bug created: CHRON-234
🔗 View: https://linear.app/chronicle/issue/CHRON-234
```

### Refine Mode: Enhance Existing Task
```
/refine-issue PROJ-567

🔍 Analyzing issue PROJ-567...
📋 Type detected: Task
✅ Title: "Update API documentation"

⚠️ Missing Elements:
- No clear scope defined
- No acceptance criteria
- Missing implementation notes

💬 Let's enhance this task:

Scope of work? (what exactly needs updating?)
> All v2 endpoints need request/response examples

Success criteria?
> All endpoints documented, examples verified, published to docs site

✅ Task refined: PROJ-567
📊 Readiness: 6/6 criteria met
```

### Custom Template Mode
```
/refine-issue --team "Security" --template @templates/security-issue.md

🔐 Using Security Issue Template

[Follows custom template structure...]

✅ Security issue created: SEC-101
```

## Interactive Mode Examples

### Full Interactive Creation
```
/refine-issue --team "Chronicle" --interactive

🆕 Interactive Issue Creation

1️⃣ BASICS
   Type? (task/bug/chore): task
   Title? API rate limiting implementation
   Priority? (P0-P4): P1

2️⃣ DESCRIPTION
   What needs to be done?
   > Implement rate limiting on all public API endpoints

3️⃣ SCOPE
   Specific deliverables? (list 3-5)
   > - Rate limit middleware
   > - Redis backend for counters
   > - Configuration per endpoint
   > - Client error responses

4️⃣ TECHNICAL
   Implementation approach?
   > Use Redis for distributed rate limiting, Express middleware

5️⃣ DONE CRITERIA
   How do we know it's complete?
   > All endpoints protected, tests pass, docs updated

✅ Task created: CHRON-789
```

## Template Detection Logic

**Auto-Detection Rules:**
- Contains "error", "broken", "fix" → Bug
- Contains "implement", "build", "create" → Task  
- Contains "update", "upgrade", "maintain" → Chore
- Has reproduction steps → Bug
- Has technical specs → Task
- Otherwise → Prompt user

## Error Handling

```
❌ "Team not found"
   → List available teams using linctl
   → Prompt to select from list

❌ "No content provided"
   → Can't create empty issue
   → Prompt for at least title and description

❌ "Custom template not found"
   → Check file path or URL
   → Fall back to default template

❌ "Issue already well-refined"
   → Show current state
   → Ask if user wants to enhance further
```

## Tips for Best Results

### When Creating
1. **Start with clear description** - Even one sentence helps
2. **Choose right type** - Templates are optimized per type
3. **Be specific** - Vague issues stay vague even after refinement
4. **Add context** - Why does this matter?

### When Refining
1. **Check type first** - Wrong type = wrong template
2. **Preserve existing good content** - Don't overwrite quality
3. **Focus on gaps** - Add what's missing
4. **Validate assumptions** - Confirm auto-detected elements

### Custom Templates
1. **Keep it focused** - One template per issue type
2. **Required vs optional** - Mark mandatory sections
3. **Include examples** - Show what good looks like
4. **Version control** - Track template changes

## Comparison with Specialized Commands

| Use Case | Best Command | Why |
|----------|-------------|-----|
| Epic planning | `/refine-epic` | Comprehensive template |
| Quick epic | `/refine-epic-lite` | Minimal overhead |
| Feature work | `/refine-feature` | Right-sizing logic |
| Everything else | `/refine-issue` | Flexible templates |

## Integration Examples

```bash
# Quick bug report
/refine-issue --team "Chronicle" --type bug

# Enhance vague task
/refine-issue PROJ-123

# Batch refinement
/refine-issue PROJ-123,PROJ-124,PROJ-125

# With custom template
/refine-issue --template https://company.com/templates/incident.md
```

## Benefits

**Flexibility:**
- Works for any issue type
- Custom templates for team standards
- Create or refine in one command

**Speed:**
- Quick creation from ideas
- Auto-detection reduces prompts
- Templates ensure completeness

**Quality:**
- Consistent structure across issues
- Nothing important forgotten
- AI-ready output

**Simplicity:**
- One command for multiple use cases
- Intuitive mode detection
- Smart defaults

---

*Part of the linear:refine-[type] command suite for AI-optimized issue management*
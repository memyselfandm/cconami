---
allowed-tools: mcp__linear__get_issue, mcp__linear__create_issue, mcp__linear__update_issue, mcp__linear__list_issues, mcp__linear__list_teams
argument-hint: [issue-id-or-url] [--team <name>] [--skip-validation]
description: (**DEPRECATED**) Use /refine-epic --lite instead - lite template now integrated into main command
---

# ⚠️ DEPRECATED: Lightweight Epic Refinement (1-Pager)

> **⚠️ This command has been deprecated and consolidated into `/refine-epic`.**  
> The refine-epic command now includes the lite template via the `--lite` flag.  
> Use `/refine-epic [issue-id] --lite` instead.

---

## Migration Guide

**Old command:**
```bash
/refine-epic-lite CCC-123
/refine-epic-lite --team "Chronicle"
```

**New command:**
```bash
/refine-epic CCC-123 --lite
/refine-epic --team "Chronicle" --lite
```

**Additional benefits in the consolidated command:**
- Combined with `--analyze-codebase` for technical context
- Switch between comprehensive and lite templates seamlessly
- Better integration with the epic workflow

---

## Legacy Documentation (For Reference Only)

## Command Purpose
Transform a basic Linear epic into a lean, focused specification using a minimal 1-page template. Perfect for personal projects, MVPs, hackathons, and situations where speed matters more than comprehensive documentation.

## Usage

### Dual-Mode Operation
```bash
# Mode 1: Refine existing epic
/refine-epic-lite CCC-123 [options]

# Mode 2: Create new epic from idea  
/refine-epic-lite --team "Team Name" [options]
```

### Parameters
- **issue-id-or-url** (optional): Linear issue ID or URL. If omitted, creates new epic
- **--team <name>** (required for create mode): Target Linear team
- **--skip-validation** (optional): Skip readiness checks for even faster refinement
- **--title <text>** (optional): Initial title for new epic (create mode)

## Why Use Epic Lite?

**Choose epic-lite when:**
- Working on personal projects
- Building MVPs or prototypes
- Planning hackathon projects
- Need quick documentation
- Don't need enterprise-level detail
- Want to capture ideas fast

**Use full refine-epic when:**
- Building for production
- Multiple teams involved
- Need comprehensive documentation
- Require detailed testing strategy
- Complex integrations

## Step-by-Step Process

### Step 0: Mode Detection
```python
if issue_id_provided:
    # REFINE MODE - enhance existing epic
    mode = "refine"
    issue = mcp__linear__get_issue(issue_id)
else:
    # CREATE MODE - build new epic from scratch
    mode = "create"
    if not team_provided:
        prompt_for_team()
```

### 1A. Refine Mode: Quick Analysis
**Fetch and assess the Linear issue:**
- Get issue via `mcp__linear__get_issue`
- Extract title, description, and labels
- Check if already has epic-level detail
- Identify any linked features

### 1B. Create Mode: Quick Setup
**Build new epic from idea:**
```
🆕 Creating Lightweight Epic

📝 What's your epic idea? (brief description)
> [User provides initial concept]

🏷️ Epic title?
> [User provides or auto-generate from description]

[Continue with minimal template...]
```

**Minimal validation (unless --skip-validation):**
- Has a title
- Has some description
- Marked as epic or can be converted

### 2. Rapid Template Population

**The 1-Pager Template** focuses on essentials only:

#### Problem Statement
```
What problem are we solving? (2-3 sentences max)
- Extract from description or prompt user
- Focus on the "why" not the "how"
```

#### Solution Overview
```
How will we solve it? (5 key points)
- High-level approach
- Main components or features
- Key technical decisions
```

#### Success Criteria
```
What does "done" look like? (5-6 measurable items)
- Convert vague goals to specific outcomes
- Make them checkable/testable
- Focus on user-visible results
```

#### Technical Approach
```
Brief implementation notes (1 paragraph)
- Tech stack and patterns
- Major architectural decisions
- Integration points
```

#### Feature Breakdown
```
What features will we build? (simple list)
- Extract from description
- Break into 3-6 features max
- Each feature = 1-3 days of work
```

#### Risks & Dependencies
```
Any blockers or concerns? (only if critical)
- Major technical risks
- External dependencies
- Time constraints
```

### 3. Interactive Prompts (Minimal)

**For Refine Mode - Only ask for missing essentials:**
```
❓ What problem does this solve? (if not clear)
❓ What's the main approach? (if vague)
❓ When is this successful? (if no criteria)
```

**For Create Mode - Quick 5-question flow:**
```
1️⃣ What problem does this solve? (2-3 sentences)
2️⃣ How will you solve it? (3-5 bullet points)
3️⃣ What does success look like? (3-5 criteria)
4️⃣ Technical approach? (1 paragraph or skip)
5️⃣ What features? (list 3-5 or auto-generate)
```

**Skip these (unlike full epic):**
- User journeys
- Detailed acceptance criteria
- Testing strategy
- Non-functional requirements
- Rollout plans
- Monitoring strategy

### 4. Create or Update Linear Issue

**For Create Mode:**
```python
new_epic = mcp__linear__create_issue(
    team=team_name,
    title=f"Epic: {title}",
    description=refined_description,
    labels=["epic", "epic-lite"],
    priority=priority or 3  # Default P3 for quick epics
)
print(f"✅ Created lightweight epic: {new_epic.identifier}")
print(f"🔗 View: {new_epic.url}")
```

**For Refine Mode:**
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

## 📦 Features
{feature_list}

## ⚠️ Risks & Dependencies
{risks_if_any}

---
*Refined with /refine-epic-lite for quick epic definition*
"""

mcp__linear__update_issue(id, description=refined_description)
```

## Command Output Examples

### Create Mode: New Epic from Idea
```
/refine-epic-lite --team "Chronicle"

🆕 Quick Epic Creation (1-pager)

📝 What's your epic idea?
> Build a dashboard for analytics

🎯 What problem does this solve? (2-3 sentences)
> Users can't see their data. No insights into usage patterns.

💡 Key solution points? (3-5 bullets)  
> - Real-time dashboard
> - Custom widgets
> - Export capabilities

✅ Success looks like? (3-5 criteria)
> - Users can view metrics
> - Data updates live
> - Reports exportable

🛠 Technical notes? (optional, press enter to skip)
> React dashboard with WebSocket updates

📦 Main features? (or press enter to auto-generate)
> [Enter - auto-generating from description...]

✅ Epic created: CHRON-890
⏱️ Time: 3 minutes
📄 Size: 1 page
🔗 View: https://linear.app/chronicle/issue/CHRON-890
```

### Refine Mode: Existing Epic (5 minutes)
```
🚀 Quick Epic Refinement Starting...
📋 Found epic: "Build notification system"

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

### Skip Validation Mode (2 minutes)
```
🚀 Ultra-Quick Mode (--skip-validation)
📋 Epic: "Build notification system"

📝 Extracting essentials from existing content...
✨ Auto-generating missing sections...

✅ Epic refined: CCC-123
⏱️ Time: 90 seconds
📄 Minimal viable epic ready
```

## Template Example Output

```markdown
# Epic: Build Real-time Notification System

## 🎯 Problem
Users miss critical updates and have no control over what notifications they receive. Support gets complaints about missed deadlines and important messages. Current email-only approach is too slow and inflexible.

## 💡 Solution
- WebSocket-based real-time notifications
- Configurable notification preferences per user
- Multiple channels: in-app, email, Slack
- Event-driven architecture for scalability
- Simple subscription management UI

## ✅ Success Criteria
- [ ] Users can subscribe/unsubscribe to notification types
- [ ] Notifications appear within 2 seconds of events
- [ ] Support for at least 3 channels (in-app, email, Slack)
- [ ] 99% delivery rate for critical notifications
- [ ] Preference changes take effect immediately
- [ ] No duplicate notifications sent

## 🛠 Technical Approach
Build event-driven notification service using WebSockets for real-time delivery. Use Redis for pub/sub, PostgreSQL for preferences storage. Frontend will use React hooks for real-time updates. Implement retry logic for failed deliveries and batching for email notifications to prevent spam.

## 📦 Features
1. Notification preferences UI
2. WebSocket notification service
3. Email notification integration
4. Slack webhook integration
5. Notification history/audit log

## ⚠️ Risks & Dependencies
- Requires WebSocket infrastructure setup
- Slack workspace admin approval needed
- May need rate limiting for high-volume events
```

## Interactive Mode Example

```
/refine-epic-lite CCC-123 --interactive

🚀 Interactive Lite Refinement (still quick!)

Current title: "Build notification system"
Current description: "We need notifications"

Let's quickly enhance this:

1️⃣ PROBLEM (required)
   Current: None found
   ❓ What problem does this solve? (2-3 sentences)
   > Users miss updates, support overwhelmed with "I didn't know" complaints

2️⃣ SOLUTION (required)  
   ❓ How will you solve this? (list 3-5 key points)
   > - Real-time WebSocket notifications
   > - User preferences
   > - Multi-channel delivery

3️⃣ SUCCESS (required)
   ❓ What indicates success? (3-5 measurable items)
   > Users can configure preferences, <2 sec delivery, 99% reliability

4️⃣ TECHNICAL (optional)
   ❓ Any key technical decisions? (or press enter to auto-generate)
   > [Enter pressed - auto-generating...]

5️⃣ FEATURES (auto-detected)
   Found 4 potential features from description
   ✅ Looks good? (y/n): y

✅ Epic refined in 4 minutes!
```

## Comparison: Lite vs Full

| Aspect | Epic Lite | Full Epic |
|--------|-----------|-----------|
| Size | 1 page | 5+ pages |
| Time | 5 minutes | 30+ minutes |
| Sections | 6 essential | 15+ comprehensive |
| User Journeys | None | Multiple detailed |
| Testing Strategy | None | Full test plan |
| NFRs | None | Performance, Security, etc |
| Best For | MVPs, personal | Production, teams |

## Error Handling

```
❌ "Issue not found"
   → Check issue ID and permissions

❌ "Too vague to refine"
   → Even lite needs basic content
   → Add at least a sentence of description

❌ "Already fully refined"
   → Epic already has comprehensive detail
   → No need for refinement
```

## Tips for Best Results

1. **Start with something** - Even one sentence helps
2. **Focus on outcomes** - What will users see/do?
3. **Keep it simple** - Save details for features
4. **List features clearly** - Makes breakdown easier
5. **Only add risks if blocking** - Don't overthink

## Integration with Workflow

```bash
# Quick epic creation flow
/refine-epic-lite CCC-123          # Create lean epic
/epic-breakdown CCC-123            # Break into features
/refine-feature CCC-124,CCC-125    # Refine resulting features
```

## Benefits

**Speed:**
- 5-minute epic definition
- 80% less content than full epic
- No analysis paralysis

**Clarity:**
- Forces focus on essentials
- Easy to read and understand
- Clear feature list for breakdown

**Flexibility:**
- Perfect for changing requirements
- Easy to update and iterate
- Not over-committed to details

**AI-Friendly:**
- Still provides context for agents
- Clear success criteria
- Technical notes for implementation

## When to Upgrade to Full Epic

Consider using `/refine-epic` instead when:
- Scope grows beyond 5-6 features
- Multiple teams involved
- Need detailed test plans
- Compliance requirements
- Complex integrations
- Production deployment

---

## Complete Migration Examples

**Refine existing epic with lite template:**
```bash
# Old: /refine-epic-lite CCC-123
# New:
/refine-epic CCC-123 --lite
```

**Create new lite epic:**
```bash  
# Old: /refine-epic-lite --team "Chronicle"
# New:
/refine-epic --team "Chronicle" --lite
```

**Combine lite template with codebase analysis:**
```bash
# New feature not available in old command:
/refine-epic CCC-123 --lite --analyze-codebase
```

*This was part of the linear:refine-[type] command suite - now consolidated for better workflow integration*
---
allowed-tools: Bash(linctl:*)
argument-hint: [team name] [project name] [active] [detailed]
description: Check status of Linear sprints, showing progress, active agents, and blocked issues
---

# Linear Sprint Status Command
Query Linear to display the current status of sprints, including progress metrics, active agent work, and any blocked issues.

## Workflow

### Step 1: Parse Arguments
Parse natural language input from $ARGUMENTS to extract:

**Keywords** (optional):
- `active` - Only show currently active sprints (issues in "In Progress" state)
- `detailed` - Include individual issue details and agent assignments
- `team` followed by a name - Show all sprints for a specific team
- `project` followed by a name - Show detailed status for specific sprint project

**Examples of valid inputs:**
- (empty) - Shows all active sprints across all teams
- `active` - Only active sprints
- `team Chronicle` - All sprints for Chronicle team
- `project Sprint-2024-12-001 detailed` - Detailed view of specific sprint
- `team Chronicle active` - Active sprints for Chronicle team
- `Sprint-2024-12-001` - Can infer project name without "project" keyword

### Step 2: Determine Query Scope

Based on parsed arguments from Step 1:

1. **Determine scope**:
   ```python
   if project_name_provided:
       # Detailed view of single sprint
       scope = "single_project"
   elif team_name_provided:
       # All sprints for one team
       scope = "team_sprints"
   else:
       # All active sprints across workspace
       scope = "all_active"
   ```

2. **Set detail level**:
   - Default: Summary statistics only
   - With `detailed` keyword: Include issue-level information
   - With `active` keyword: Filter to sprints with "In Progress" issues

### Step 3: Query Linear Data

#### For Single Project Status
```python
1. Use linctl project list --json to find project
2. Use linctl issue list --project <project-id> --json to get all issues
3. Get all issues regardless of state
4. Use linctl comment list --issue <issue-id> --json for recent activity (if --detailed)
```

#### For Team Sprints
```python
1. Use linctl team get <team-name> --json to get team ID
2. Use linctl project list --team <team-id> --json to get team projects
3. Filter projects matching "Sprint YYYY-MM-NNN" pattern
4. For each sprint project, get issue counts by state using linctl issue list --project <project-id> --json
```

#### For All Active Sprints
```python
1. Use linctl team list --json to get all teams
2. For each team, use linctl project list --team <team-id> --json
3. Filter for sprint projects with active issues
4. Aggregate statistics across teams
```

### Step 4: Analyze Sprint State

1. **Calculate Phase Progress**:
   ```python
   # Group issues by phase labels
   foundation_issues = filter_by_label("phase:foundation")
   feature_issues = filter_by_label("phase:features")
   integration_issues = filter_by_label("phase:integration")
   
   # Calculate completion per phase
   foundation_complete = count(state="Done") / total
   features_complete = count(state="Done") / total
   integration_complete = count(state="Done") / total
   ```

2. **Identify Active Agents**:
   ```python
   # Find issues in "In Progress" state
   active_issues = filter(state="In Progress")
   
   # Extract agent assignments from labels
   active_agents = []
   for issue in active_issues:
       agent_label = extract_label_pattern("agent:*")
       if agent_label:
           active_agents.append({
               "agent": agent_label,
               "issue": issue.key,
               "title": issue.title
           })
   ```

3. **Detect Blocked Issues**:
   ```python
   # Find blocked issues
   blocked_issues = filter(state="Blocked")
   
   # Also check for stalled "In Progress" issues
   # (Look for issues with no recent comments)
   for issue in in_progress_issues:
       last_comment = get_most_recent_comment(issue)
       if not recent_activity(last_comment):  # No update in last hour
           potentially_stalled.append(issue)
   ```

4. **Calculate Metrics**:
   ```python
   metrics = {
       "total_issues": len(all_issues),
       "completed": count(state="Done"),
       "in_progress": count(state="In Progress"),
       "blocked": count(state="Blocked"),
       "not_started": count(state in ["Backlog", "Planned", "Todo"]),
       "completion_rate": completed / total * 100,
       "parallelization_rate": features_count / total * 100
   }
   ```

### Step 5: Format Status Output

#### Summary View (Default)
```markdown
## Linear Sprint Status

### Active Sprints (3 total)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📦 **Sprint 2024-12-001: Authentication**
Team: Chronicle | Project: [Linear URL]
Progress: ████████░░ 80% (16/20 issues)
- ✅ Done: 16
- 🔄 In Progress: 2 (2 agents active)
- ⏳ Not Started: 1
- 🚫 Blocked: 1

📦 **Sprint 2024-12-002: Real-time Features**
Team: Chronicle | Project: [Linear URL]
Progress: ███░░░░░░░ 30% (6/20 issues)
- ✅ Done: 6
- 🔄 In Progress: 8 (5 agents active)
- ⏳ Not Started: 6
- 🚫 Blocked: 0

📦 **Sprint 2024-11-015: Database Migration**
Team: Another-Product | Project: [Linear URL]
Progress: ██████████ 100% (12/12 issues)
- ✅ Done: 12
- 🎉 SPRINT COMPLETE

### Aggregate Metrics
- Total Active Sprints: 2
- Total Issues: 52
- Overall Completion: 65%
- Active Agents: 7
- Blocked Issues: 1
```

#### Detailed View (--detailed flag)
```markdown
## Sprint Status: Sprint 2024-12-001: Authentication

### Overview
Team: Chronicle
Progress: ████████░░ 80% (16/20 issues)
Parallelization: 75% of issues in features phase

### Phase Breakdown

#### Foundation (1 issue) ✅ Complete
- [DONE] ISSUE-101: Database migrations

#### Features (15 issues) 🔄 87% Complete
**Completed (13):**
- ✅ ISSUE-102: JWT token generation
- ✅ ISSUE-103: Token validation
- ✅ ISSUE-104: Google OAuth setup
[... continue for all completed]

**In Progress (2):**
- 🔄 ISSUE-115: Session management (Agent-7)
  Last update: "Implementing Redis connection pool"
- 🔄 ISSUE-116: Rate limiting (Agent-8)
  Last update: "Writing rate limit tests"

#### Integration (4 issues) ⏳ 25% Complete
**Completed (1):**
- ✅ ISSUE-117: API documentation

**Not Started (2):**
- ⏳ ISSUE-118: E2E test suite
- ⏳ ISSUE-119: Performance testing

**Blocked (1):**
- 🚫 ISSUE-120: Production deployment guide
  Reason: Waiting for infrastructure team approval

### Active Agents (2)
- **Agent-7**: Working on ISSUE-115 (Session management)
  Started: 15 minutes ago
  Specialization: backend, redis, nodejs

- **Agent-8**: Working on ISSUE-116 (Rate limiting)
  Started: 8 minutes ago
  Specialization: backend, middleware, testing

### Recent Activity (last hour)
- ✅ Agent-5 completed ISSUE-109 (Password hashing)
- ✅ Agent-6 completed ISSUE-110 (Email verification)
- 🔄 Agent-7 started ISSUE-115
- 🔄 Agent-8 started ISSUE-116
- 💬 Comment on ISSUE-120: "Awaiting security review"

### Recommendations
⚠️ ISSUE-120 is blocked - consider escalating
💡 2 integration issues ready to start
🚀 Features phase 87% complete - prepare integration agents
```

#### Active Sprints Only (--active flag)
```markdown
## Currently Executing Sprints

🏃 **Active Now (2 sprints, 7 agents)**

### Sprint 2024-12-001: Authentication
- Agents Working: 2 (Agent-7, Agent-8)
- Current Phase: Features (87% complete)
- Issues in Progress:
  - ISSUE-115: Session management (Agent-7)
  - ISSUE-116: Rate limiting (Agent-8)

### Sprint 2024-12-002: Real-time Features  
- Agents Working: 5 (Agent-1 through Agent-5)
- Current Phase: Features (40% complete)
- Issues in Progress:
  - ISSUE-201: WebSocket server (Agent-1)
  - ISSUE-202: Event streaming (Agent-2)
  - ISSUE-203: Client reconnection (Agent-3)
  - ISSUE-204: Message queuing (Agent-4)
  - ISSUE-205: Subscription management (Agent-5)

💤 **Idle Sprints (1)**
- Sprint 2024-12-003: UI Polish (0 agents, waiting to start)
```

### Step 5: Special Status Indicators

#### Detect Concerning Patterns
```python
warnings = []

# Check for stalled agents
if issue.state == "In Progress" and no_recent_update(issue, hours=1):
    warnings.append(f"⚠️ {issue.key} may be stalled (no updates for 1+ hour)")

# Check for too many blocked issues
if blocked_count > total_count * 0.2:  # More than 20% blocked
    warnings.append(f"🚨 High blockage rate: {blocked_count}/{total_count} issues blocked")

# Check for imbalanced phases
if features_percentage < 60:
    warnings.append(f"⚠️ Low parallelization: Only {features_percentage}% in features phase")

# Check for sprint duration
if sprint_age > 10:  # Sprints shouldn't run more than 10 days
    warnings.append(f"⏰ Long-running sprint: Started {sprint_age} days ago")
```

#### Success Indicators
```python
successes = []

if completion_rate == 100:
    successes.append("🎉 Sprint complete! Ready to archive")
    
if parallelization_rate > 80:
    successes.append(f"⚡ Excellent parallelization: {parallelization_rate}%")
    
if active_agents > 5:
    successes.append(f"🚀 High concurrency: {active_agents} agents working in parallel")
```

### Step 6: Error Handling

1. **Linear API Issues**:
   - If unable to fetch issues: Show cached data with warning
   - If rate limited: Show partial data with retry time

2. **Malformed Sprint Projects**:
   - Skip projects not matching sprint pattern
   - Note any issues without proper phase labels

3. **Missing Data**:
   - Handle issues without agent assignments gracefully
   - Show "Unknown" for missing specializations

## Output Formats

### JSON Export Option (--json)
```json
{
  "sprints": [
    {
      "name": "Sprint 2024-12-001: Authentication",
      "team": "Chronicle",
      "progress": {
        "total": 20,
        "completed": 16,
        "in_progress": 2,
        "blocked": 1,
        "not_started": 1,
        "completion_percentage": 80
      },
      "phases": {
        "foundation": {"total": 1, "completed": 1},
        "features": {"total": 15, "completed": 13},
        "integration": {"total": 4, "completed": 1}
      },
      "active_agents": ["agent-7", "agent-8"],
      "blocked_issues": ["ISSUE-120"]
    }
  ],
  "summary": {
    "total_sprints": 3,
    "active_sprints": 2,
    "total_agents_working": 7,
    "overall_completion": 65
  }
}
```

### Slack/Discord Format (--slack)
```
*Sprint Status Update*
• Active Sprints: 2
• Agents Working: 7
• Overall Progress: 65%

*Sprint 2024-12-001*: 80% complete (2 agents active)
*Sprint 2024-12-002*: 30% complete (5 agents active)

⚠️ 1 issue blocked in Sprint 2024-12-001
```

## Usage Examples

```bash
# Show all active sprints
/sprint-status

# Show all sprints for Chronicle team
/sprint-status --team Chronicle

# Detailed view of specific sprint
/sprint-status --project "Sprint 2024-12-001: Authentication" --detailed

# Only show currently executing work
/sprint-status --active

# Get JSON output for automation
/sprint-status --json > sprint-status.json
```
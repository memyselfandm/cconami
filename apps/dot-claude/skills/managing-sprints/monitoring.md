# Sprint Monitoring

Check sprint progress, active agents, and blockers.

## Usage

```
/managing-sprints status [sprint-id] [--active] [--detailed] [--team TEAM]
```

## Arguments

- `sprint-id` (optional): Specific sprint to check
- `--active`: Show only active sprints
- `--detailed`: Include agent activity details
- `--team`: Filter by team name

## Workflow

### Step 1: Gather Sprint Data

```python
if sprint_id:
    # Single sprint
    sprints = [pm_context.get_project(sprint_id)]
else:
    # All sprints
    sprints = pm_context.list_projects({
        status: "active" if active_only else None
    })

    if team_filter:
        sprints = [s for s in sprints if s.team == team_filter]
```

### Step 2: Analyze Each Sprint

```python
for sprint in sprints:
    items = pm_context.list_items({project: sprint.id})

    sprint.stats = {
        "total": len(items),
        "done": len([i for i in items if i.status_type == "done"]),
        "in_progress": len([i for i in items if i.status_type == "in_progress"]),
        "blocked": len([i for i in items if "blocked" in i.labels]),
        "todo": len([i for i in items if i.status_type == "todo"])
    }

    sprint.progress = sprint.stats["done"] / sprint.stats["total"] * 100

    # Identify blockers
    sprint.blockers = [i for i in items if "blocked" in i.labels]
```

### Step 3: Generate Report

**Summary View:**

```markdown
## Sprint Status

| Sprint | Progress | Done | In Progress | Blocked | Todo |
|--------|----------|------|-------------|---------|------|
{for sprint in sprints:}
| {sprint.name} | {sprint.progress}% | {done} | {in_progress} | {blocked} | {todo} |
```

**Detailed View (--detailed):**

```markdown
## Sprint: {sprint.name}

### Progress
{progress_bar(sprint.progress)}
{sprint.stats.done}/{sprint.stats.total} items complete

### By Phase
- Foundation: {foundation_done}/{foundation_total}
- Features: {features_done}/{features_total}
- Integration: {integration_done}/{integration_total}

### Active Work
{for item in in_progress_items:}
- [{item.key}] {item.title}
  - Assignee: {item.assignee}
  - Started: {item.updated_at}
  - Last activity: {last_comment_time}

### Blockers
{for blocker in blockers:}
⚠️ [{blocker.key}] {blocker.title}
   Blocked by: {blocker.blocked_by}
   Reason: {blocker.block_reason}

### Recently Completed
{for item in recently_done[:5]:}
✅ [{item.key}] {item.title}
   Completed: {item.updated_at}

### Upcoming
{for item in todo_items[:5]:}
⏳ [{item.key}] {item.title}
   Priority: {item.priority}
```

### Step 4: Agent Activity (if --detailed)

If agents are running, check their status:

```python
# Check for running background tasks
agents = get_running_agents()

for agent in agents:
    output = read_agent_output(agent.output_file)
    agent.status = parse_agent_status(output)
    agent.current_task = parse_current_task(output)
    agent.completed = parse_completed_tasks(output)
```

```markdown
### Agent Activity

**Agent-1** (engineering-agent)
- Status: {agent.status}
- Current: {agent.current_task}
- Completed: {len(agent.completed)} items
- Last output: {last_line}

**Agent-2** (engineering-agent)
- Status: {agent.status}
...
```

## Status Indicators

| Symbol | Meaning |
|--------|---------|
| ✅ | Complete |
| ⏳ | In Progress |
| ⚠️ | Blocked |
| 🔴 | Failed/Error |
| ⏸️ | Paused |

## Progress Bar

```
[████████████░░░░░░░░] 60%
```

## Example Output

```
📊 Sprint Status: CCC-123.S01

Progress: [████████████████░░░░] 80%
          16/20 items complete

By Phase:
  Foundation: 2/2 ✅
  Features:   12/15 (80%)
  Integration: 2/3

Active Work:
  ⏳ [CCC-145] OAuth Google provider
     Agent-2, started 15 min ago

  ⏳ [CCC-147] Password reset flow
     Agent-3, started 10 min ago

Blockers:
  ⚠️ [CCC-150] E2E auth tests
     Waiting for: CCC-145, CCC-147

Next Up:
  ⏳ [CCC-151] Update documentation
  ⏳ [CCC-152] Performance optimization
```

## Refresh Interval

For long-running sprints, suggest periodic refresh:

```
Last updated: {timestamp}
Run again to refresh, or use --watch for auto-refresh
```

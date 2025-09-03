---
allowed-tools: Task, mcp__linear__*, TodoWrite, Bash(git:*), Bash(date:*)
argument-hint: --version <release-version> [--team <team-name>] [--mode <sequential|parallel>]
description: Execute an entire release with multiple sprints, coordinating cross-team work and managing inter-sprint dependencies
---

# Linear Release Execution Command

Orchestrate the execution of an entire release containing multiple sprints, managing cross-team coordination, inter-sprint dependencies, and providing comprehensive progress tracking across all release activities.

## Usage
- `--version <release>`: (Required) Release version to execute (e.g., v1.0, v2.0)
- `--team <name>`: Team name (required if multiple teams have same release)
- `--mode <type>`: Execution mode: sequential, parallel (default: sequential)
- `--skip-validation`: Skip dependency validation before execution
- `--auto-commit`: Automatically commit after each sprint phase
- `--generate-notes`: Create release notes during execution

## Release Execution Strategy

### Execution Modes
1. **Sequential Mode**: Execute sprints one after another
   - Safer for dependent work
   - Easier rollback
   - Clear phase boundaries
   
2. **Parallel Mode**: Execute independent sprints simultaneously
   - Faster delivery
   - Requires careful dependency management
   - Higher resource utilization

### Release Structure
```
Release v1.0
├── Sprint 1: Foundation (Week 1-2)
├── Sprint 2: Core Features (Week 3-4)
├── Sprint 3: Advanced Features (Week 5-6)
└── Sprint 4: Polish & Release (Week 7-8)
```

### Cross-Sprint Coordination
- Shared release context across all sprints
- Inter-sprint dependency tracking
- Unified progress reporting
- Coordinated milestone delivery

## Instructions

### Step 1: Initialize Release Execution
1. **Launch Program Manager for Analysis**:
   ```
   Use the program-manager subagent for release coordination
   
   Prompt: "Prepare release $VERSION for execution. Analyze all 
   sprints, identify inter-sprint dependencies, validate readiness, 
   and create execution plan with $MODE mode consideration."
   ```

2. **Gather Release Data**:
   ```python
   # Find release issue
   release = mcp__linear__list_issues(
     team: team,
     label: f"release:{version}",
     type: "release"
   )[0]
   
   # Get all sprints in release
   sprints = mcp__linear__list_projects(
     team: team,
     name_pattern: f"{version}.S*"
   )
   
   # Get all issues in release
   release_issues = mcp__linear__list_issues(
     team: team,
     label: f"release:{version}"
   )
   ```

### Step 2: Validate Release Readiness

1. **Dependency Validation**:
   ```python
   def validate_release_dependencies():
     violations = []
     
     # Check inter-sprint dependencies
     for sprint in sprints:
       sprint_issues = get_sprint_issues(sprint)
       for issue in sprint_issues:
         for dep_id in issue.blockedBy:
           dep = mcp__linear__get_issue(dep_id)
           if dep.sprint and dep.sprint.order > sprint.order:
             violations.append({
               "issue": issue.id,
               "depends_on": dep_id,
               "problem": "depends_on_later_sprint"
             })
     
     return violations
   ```

2. **Capacity Check**:
   ```python
   def validate_release_capacity():
     total_effort = 0
     team_capacity = {}
     
     for sprint in sprints:
       sprint_effort = calculate_sprint_effort(sprint)
       total_effort += sprint_effort
       
       # Check per-team capacity
       for team in get_sprint_teams(sprint):
         if team not in team_capacity:
           team_capacity[team] = get_team_capacity(team)
         team_capacity[team] -= sprint_effort
     
     overloaded = [t for t, cap in team_capacity.items() if cap < 0]
     return {"total": total_effort, "overloaded_teams": overloaded}
   ```

3. **Readiness Assessment**:
   ```python
   readiness = {
     "sprints_ready": 0,
     "total_sprints": len(sprints),
     "issues_ready": 0,
     "total_issues": len(release_issues),
     "blockers": [],
     "missing_acceptance_criteria": [],
     "unassigned_issues": []
   }
   ```

### Step 3: Create Execution Plan

1. **Sequential Execution Plan**:
   ```python
   def create_sequential_plan(sprints):
     execution_plan = {
       "mode": "sequential",
       "phases": []
     }
     
     for i, sprint in enumerate(sorted(sprints, key=lambda s: s.order)):
       phase = {
         "order": i + 1,
         "sprint": sprint.name,
         "start_condition": "previous_complete" if i > 0 else "immediate",
         "issues": get_sprint_issues(sprint),
         "agents_needed": calculate_agents_needed(sprint),
         "estimated_duration": estimate_sprint_duration(sprint),
         "dependencies": get_sprint_dependencies(sprint)
       }
       execution_plan["phases"].append(phase)
     
     return execution_plan
   ```

2. **Parallel Execution Plan**:
   ```python
   def create_parallel_plan(sprints):
     # Group sprints by dependency level
     dependency_groups = analyze_sprint_dependencies(sprints)
     
     execution_plan = {
       "mode": "parallel",
       "waves": []
     }
     
     for level, sprint_group in dependency_groups.items():
       wave = {
         "level": level,
         "sprints": [s.name for s in sprint_group],
         "can_parallel": True,
         "total_agents": sum(calculate_agents_needed(s) for s in sprint_group),
         "estimated_duration": max(estimate_sprint_duration(s) for s in sprint_group)
       }
       execution_plan["waves"].append(wave)
     
     return execution_plan
   ```

### Step 4: Execute Release

#### Sequential Mode Execution
```python
def execute_sequential_release(plan):
  release_log = []
  
  for phase in plan["phases"]:
    sprint = phase["sprint"]
    
    # Update Linear status
    mcp__linear__create_comment(
      issueId: release.id,
      body: f"🚀 Starting Sprint {sprint}"
    )
    
    # Execute sprint using sprint-execute command
    result = execute_sprint(
      project: sprint,
      context: f"Release {version} - Sprint {phase['order']}"
    )
    
    release_log.append({
      "sprint": sprint,
      "status": result.status,
      "completed_issues": result.completed,
      "failed_issues": result.failed,
      "duration": result.duration
    })
    
    # Check for failures
    if result.status == "failed" and not continue_on_failure:
      handle_sprint_failure(sprint, result)
      break
    
    # Commit if auto-commit enabled
    if auto_commit:
      commit_sprint_work(sprint, result)
    
    # Generate incremental release notes
    if generate_notes:
      update_release_notes(version, sprint, result)
  
  return release_log
```

#### Parallel Mode Execution
```python
def execute_parallel_release(plan):
  release_log = []
  
  for wave in plan["waves"]:
    # Launch all sprints in wave simultaneously
    wave_tasks = []
    
    for sprint_name in wave["sprints"]:
      # Create task for each sprint
      task = create_sprint_task(
        sprint: sprint_name,
        agents: calculate_agents_needed(sprint_name),
        context: f"Release {version} - Wave {wave['level']}"
      )
      wave_tasks.append(task)
    
    # Execute all tasks in parallel
    results = execute_parallel_tasks(wave_tasks)
    
    # Wait for wave completion
    wave_complete = wait_for_completion(wave_tasks, timeout=wave["estimated_duration"])
    
    # Process results
    for sprint_name, result in results.items():
      release_log.append({
        "sprint": sprint_name,
        "wave": wave["level"],
        "status": result.status,
        "completed": result.completed_issues
      })
    
    # Check wave success before continuing
    if not all(r.status == "success" for r in results.values()):
      handle_wave_failure(wave, results)
      if not continue_on_failure:
        break
  
  return release_log
```

### Step 5: Monitor Release Progress

1. **Real-time Status Updates**:
   ```python
   def monitor_release_progress():
     while release_active:
       status = {
         "overall_progress": calculate_release_progress(),
         "active_sprints": get_active_sprints(),
         "completed_sprints": get_completed_sprints(),
         "active_agents": count_active_agents(),
         "recent_completions": get_recent_completions(minutes=30),
         "current_blockers": identify_blockers()
       }
       
       # Update Linear
       update_release_status(release.id, status)
       
       # Check for issues
       if status["current_blockers"]:
         handle_blockers(status["current_blockers"])
       
       sleep(300)  # Check every 5 minutes
   ```

2. **Milestone Tracking**:
   ```python
   milestones = {
     "alpha": {"target": "Sprint 2", "criteria": "Core features complete"},
     "beta": {"target": "Sprint 3", "criteria": "Feature complete"},
     "rc": {"target": "Sprint 4", "criteria": "All tests passing"},
     "ga": {"target": "Sprint 4", "criteria": "Release criteria met"}
   }
   
   def check_milestones(completed_sprints):
     for milestone, config in milestones.items():
       if config["target"] in completed_sprints:
         if evaluate_criteria(config["criteria"]):
           announce_milestone(milestone, version)
   ```

### Step 6: Generate Release Artifacts

1. **Release Notes Generation**:
   ```markdown
   # Release Notes - v1.0
   
   ## 🎯 Release Highlights
   - New authentication system with OAuth support
   - Redesigned user interface with dark mode
   - Performance improvements (3x faster load times)
   - Enhanced security with 2FA
   
   ## ✨ New Features
   ### Sprint 1 - Foundation
   - Database migration system
   - Core API framework
   - Authentication service
   
   ### Sprint 2 - Core Features
   - User management
   - Permission system
   - API endpoints
   
   ## 🐛 Bug Fixes
   - Fixed memory leak in background workers
   - Resolved race condition in auth flow
   
   ## 📊 Release Metrics
   - Total Issues Completed: 67
   - Sprints Executed: 4
   - Agents Deployed: 23
   - Total Duration: 8 weeks
   - Success Rate: 94%
   ```

2. **Final Release Report**:
   ```python
   def generate_release_report():
     report = {
       "version": version,
       "status": "completed",
       "summary": {
         "sprints_completed": len(completed_sprints),
         "issues_delivered": count_completed_issues(),
         "features_shipped": list_shipped_features(),
         "bugs_fixed": count_bug_fixes()
       },
       "metrics": {
         "planned_duration": planned_weeks,
         "actual_duration": actual_weeks,
         "velocity": issues_per_week,
         "quality": test_pass_rate,
         "automation_rate": agent_success_rate
       },
       "lessons_learned": gather_retrospective_notes()
     }
     
     # Save report
     save_release_report(version, report)
     
     # Update Linear release issue
     mcp__linear__update_issue(
       id: release.id,
       state: "Done",
       description: append_report_summary(report)
     )
   ```

## Output Examples

### Release Start
```
🚀 Release v1.0 Execution Starting

📋 Release Overview:
  Version: v1.0 - Foundation Release
  Sprints: 4 (sequential mode)
  Total Issues: 67
  Timeline: 8 weeks
  Teams: Backend, Frontend, QA

✅ Validation Passed:
  • No circular dependencies
  • Capacity adequate (85% utilization)
  • All issues have acceptance criteria

📊 Execution Plan:
  Week 1-2: Sprint 1 - Foundation (15 issues)
  Week 3-4: Sprint 2 - Core Features (22 issues)
  Week 5-6: Sprint 3 - Advanced Features (20 issues)
  Week 7-8: Sprint 4 - Polish & Release (10 issues)

Starting Sprint 1...
```

### Mid-Release Status
```
📊 Release v1.0 - Progress Update

⏱️ Week 4 of 8

✅ Completed:
  • Sprint 1: Foundation (100%)
  • Sprint 2: Core Features (65%)

🔄 Active:
  Sprint 2 - Core Features
  • 8 agents active
  • 14/22 issues complete
  • ETA: 2 days

📈 Metrics:
  • Overall Progress: 42%
  • Velocity: 8.5 issues/week
  • Success Rate: 92%
  • On Track: ✅

⚠️ Risks:
  • API Gateway showing performance issues
  • Consider adding caching in Sprint 3
```

### Release Completion
```
🎉 Release v1.0 Complete!

📊 Final Summary:
  Duration: 7.5 weeks (0.5 weeks ahead)
  Issues Completed: 65/67 (97%)
  Features Shipped: 12
  Bugs Fixed: 8

✅ Milestones Achieved:
  • Alpha: Week 2 ✅
  • Beta: Week 5 ✅
  • RC: Week 7 ✅
  • GA: Week 7.5 ✅

📈 Performance:
  • Agent Success Rate: 94%
  • Average Sprint Duration: 1.9 weeks
  • Parallel Efficiency: 87%
  • Test Pass Rate: 98%

📝 Artifacts Generated:
  • Release notes: v1.0-release-notes.md
  • Changelog: CHANGELOG.md updated
  • Metrics report: releases/v1.0-report.json

🚀 Ready for deployment!
```

## Error Handling

```
❌ "Sprint execution failed"
   → Sprint X failed with Y errors
   → Review logs, fix issues, retry sprint
   → Use --continue-on-failure to proceed

❌ "Dependency violation"
   → Sprint 2 depends on incomplete Sprint 3 work
   → Reorder sprints or move dependencies

❌ "Capacity exceeded"
   → Teams overloaded in parallel execution
   → Switch to sequential mode or reduce scope

❌ "Release criteria not met"
   → Missing required features or quality gates
   → Complete remaining work before release
```

## Best Practices

1. **Start with Sequential**: Use sequential mode for first release
2. **Validate Dependencies**: Run dependency-map before execution
3. **Monitor Actively**: Check progress every few hours
4. **Commit Incrementally**: Use --auto-commit for safety
5. **Document Decisions**: Add notes to release issue
6. **Test Between Sprints**: Validate integration points
7. **Keep Stakeholders Informed**: Regular status updates
8. **Plan Rollback**: Have contingency for failures

## Integration with Other Commands

```bash
# Complete release workflow
/release-plan --team Chronicle --version v1.0        # Plan release
/dependency-map --scope release --scope-id v1.0      # Verify dependencies
/release-execute --version v1.0 --mode sequential    # Execute release
/sprint-status --release v1.0                        # Monitor progress

# Parallel execution for experienced teams
/release-execute --version v2.0 --mode parallel --auto-commit
```

## Advanced Features

### Custom Milestone Gates
```python
milestones:
  alpha:
    criteria:
      - "Core API endpoints working"
      - "Database migrations complete"
    validation: run_alpha_tests()
    
  beta:
    criteria:
      - "All features implemented"
      - "UI complete"
    validation: run_beta_tests()
```

### Cross-Team Coordination
```python
teams:
  backend:
    sprints: [1, 2, 4]
    capacity: 100
    
  frontend:
    sprints: [2, 3, 4]
    capacity: 80
    dependencies: ["backend.sprint2"]
```

### Release Rollback
```bash
# If release fails
/release-execute --version v1.0 --rollback
# Reverts all changes, resets issue states
```

---

*Part of the Linear program management suite for comprehensive project orchestration*
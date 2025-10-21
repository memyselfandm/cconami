---
allowed-tools: Task, Bash, TodoWrite, WebFetch
argument-hint: <team-name> [horizon-months] [starting-version] [dry-run]
description: Plan multiple major and minor releases from backlog, distributing epics and features across version milestones
---

# Linear Release Planning Command

Design and create a comprehensive release roadmap with multiple major and minor versions, distributing epics and features across releases while considering dependencies, team capacity, and strategic goals.

## Usage
- `$1` (team-name): (Required) Linear team name to plan releases for
- `$2` (horizon-months): (Optional) Planning horizon in months (default: 6)
- `$3` (starting-version): (Optional) Starting version number (default: v1.0)
- `$4` (dry-run): (Optional) Pass "yes" or "true" to preview release plan without creating issues

## Release Planning Strategy

### Version Numbering
- **Major Releases (X.0)**: Breaking changes, major features, architecture shifts
- **Minor Releases (X.Y)**: New features, significant enhancements, non-breaking changes
- **Patch Releases (X.Y.Z)**: Bug fixes, small improvements, hotfixes

### Release Cadence Options
1. **Quarterly**: Major release every quarter, minors monthly
2. **Monthly**: Minor releases monthly, majors as needed
3. **Continuous**: Releases when features ready, version on impact

### Capacity Planning
- Account for holidays, training, meetings (80% default)
- Buffer for bug fixes and technical debt (20%)
- Consider team velocity from past cycles
- Balance feature work with maintenance

## Instructions

### Step 1: Initialize Planning Context
1. **Launch Program Manager Agent**:
   ```
   Use the program-manager subagent to analyze the backlog and current state
   
   Prompt: "Analyze the backlog for team $TEAM and prepare for release planning
   with a $HORIZON month horizon. Identify all epics without releases, orphan
   features, and unscheduled high-priority work. Group related work and suggest
   release themes."
   ```

2. **Gather Team Context**:
   - Fetch team details and capacity
   - Review recent cycle velocity
   - Identify team specializations
   - Understand current commitments

### Step 2: Analyze Backlog
1. **Fetch Unplanned Work**:
   ```bash
   # List issues without release assignments using linctl
   linctl issue list \
     --team $TEAM \
     --state "Backlog,Todo,Planned" \
     --json
   # Filter for issues without release labels in post-processing
   ```

2. **Categorize by Type**:
   - Separate epics, features, and standalone tasks
   - Identify critical fixes and technical debt
   - Group related functionality
   - Assess effort and complexity

3. **Dependency Analysis**:
   - Map blocking relationships
   - Identify prerequisite work
   - Find cross-team dependencies
   - Determine critical paths

### Step 3: Design Release Structure

1. **Major Release Planning**:
   ```
   For each major version:
   - Theme: Primary goal/capability
   - Epics: 3-5 major epics per release
   - Timeline: 3-4 month duration
   - Milestones: Alpha, Beta, GA dates
   ```

2. **Minor Release Planning**:
   ```
   Between majors:
   - Features: 5-10 features per minor
   - Enhancements: Improvements to existing
   - Fixes: Address known issues
   - Timeline: 4-6 week sprints
   ```

3. **Release Themes**:
   - v1.0: "Foundation" - Core functionality
   - v1.1: "Polish" - UX improvements
   - v1.2: "Scale" - Performance optimization
   - v2.0: "Transform" - Next generation

### Step 4: Create Release Plan

1. **Generate Release Issues**:
   ```bash
   for release in releases:
     linctl issue create \
       --team team_id \
       --title "Release ${release.version}: ${release.theme}" \
       --description "${release_template}" \
       --priority 1 \
       --json
   ```

2. **Assign Epics to Releases**:
   ```bash
   for epic in epics:
     # Update epic with release parent/label using linctl
     linctl issue update ${epic.id} \
       --parent ${release_issue.id}
   ```

3. **Create Release Projects**:
   ```bash
   linctl project create \
     --team team_id \
     --name "${release.version} - ${release.theme}" \
     --description "${project_template}" \
     --json
   ```

### Step 5: Validate and Optimize

1. **Capacity Validation**:
   - Calculate effort per release
   - Compare to team velocity
   - Identify overloaded releases
   - Suggest rebalancing

2. **Dependency Validation**:
   - Ensure dependencies within same/earlier releases
   - No circular dependencies
   - Critical path analysis
   - Risk assessment

3. **Balance Optimization**:
   - Distribute complexity evenly
   - Mix of features and technical work
   - Account for ramp-up time
   - Include buffer for unknowns

### Step 6: Generate Reports

1. **Roadmap Overview**:
   ```markdown
   # Release Roadmap - Team $TEAM
   
   ## Timeline
   - v1.0 (Q1): Foundation - Auth, Core API
   - v1.1 (Q2): Polish - UX, Performance  
   - v1.2 (Q2): Scale - Multi-tenant, Caching
   - v2.0 (Q3): Transform - AI Features
   
   ## Metrics
   - Total Epics: 15
   - Total Features: 67
   - Estimated Effort: 480 days
   - Team Capacity: 520 days
   - Buffer: 8%
   ```

2. **Release Details**:
   ```markdown
   ## Release v1.0 - Foundation
   Target: March 31, 2025
   
   ### Epics
   - Authentication System (25 days)
   - Core API Framework (30 days)
   - Database Schema (15 days)
   
   ### Dependencies
   - None (foundation release)
   
   ### Risks
   - Third-party auth provider delays
   - Database migration complexity
   ```

3. **Dependency Map**:
   ```
   v1.0 Foundation
     └── v1.1 Polish
         ├── v1.2 Scale
         └── v1.3 Integrate
             └── v2.0 Transform
   ```

## Output Format

### Success Response
```
✅ Release Plan Created

📅 Release Schedule:
  v1.0 - Foundation (Mar 2025)
    • 4 epics, 18 features
    • 90 day timeline
    
  v1.1 - Polish (May 2025)
    • 3 epics, 12 features  
    • 45 day timeline
    
  v1.2 - Scale (Jul 2025)
    • 3 epics, 15 features
    • 60 day timeline
    
  v2.0 - Transform (Oct 2025)
    • 5 epics, 22 features
    • 120 day timeline

📊 Capacity Analysis:
  Total Effort: 480 days
  Team Capacity: 520 days (80% allocation)
  Buffer: 40 days (8%)
  Risk Level: Low ✅

🔗 Linear Updates:
  • Created 4 release issues
  • Updated 15 epics with release labels
  • Created 4 release projects
  • Linked 67 features to releases

📈 Next Steps:
  1. Review release plan with stakeholders
  2. Create sprint projects for v1.0
  3. Assign epic owners
  4. Schedule release kickoffs
```

### Dry Run Response
```
🔍 Release Plan Preview (DRY RUN)

Would create:
  • 4 release issues
  • 4 release projects
  • Update 15 epics
  • Update 67 features

Release Distribution:
  v1.0: 18 features (90 days)
  v1.1: 12 features (45 days)
  v1.2: 15 features (60 days)
  v2.0: 22 features (120 days)

No changes made - use without --dry-run to execute
```

## Error Handling

```
❌ "Insufficient capacity"
   → Team capacity: 200 days
   → Required effort: 300 days
   → Reduce scope or extend timeline

❌ "Circular dependencies detected"
   → Epic A depends on B
   → Epic B depends on A
   → Restructure epic relationships

❌ "No epics found"
   → No unplanned epics in backlog
   → Create epics first or review completed

❌ "Invalid version format"  
   → Version must be vX.Y or vX.Y.Z
   → Example: v1.0, v2.1, v1.0.1
```

## Integration with Other Commands

```bash
# Full release planning workflow
/release-plan Chronicle 6                         # Plan releases
/dependency-map Chronicle v1.0                   # Verify dependencies
/sprint-plan [team] [epic] 4                      # Break into sprints
/release-execute v1.0                             # Execute release
```

## Best Practices

1. **Start Conservative**: Plan 80% capacity initially
2. **Theme Releases**: Give each release a clear focus
3. **Balance Types**: Mix features, debt, and fixes
4. **Front-load Risk**: Complex work in early releases
5. **Regular Reviews**: Re-plan quarterly
6. **Clear Boundaries**: Well-defined release scope
7. **Dependency First**: Foundational work early
8. **Buffer Time**: 15-20% buffer per release

---

*Part of the Linear program management suite for comprehensive project orchestration*
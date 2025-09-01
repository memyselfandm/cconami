---
allowed-tools: mcp__linear__*, filesystem:*, Task, Write
argument-hint: --team <team-name> --epic <epic-id> [--skip-prep]
description: (*Run from PLAN mode*) Prepare, analyze, and break down a Linear epic into features and tasks with parallel codebase analysis
---

# Linear Epic Breakdown Command
Prepare, analyze, and break down a Linear epic into a complete hierarchy of features and tasks optimized for AI agent execution. Now includes full epic preparation capabilities.

## Usage
- `--team <name>`: (Required) Linear team name
- `--epic <id>`: (Required) Epic issue ID to prepare and break down  
- `--skip-prep`: (Optional) Skip preparation phase and go directly to breakdown

## Instructions

### Step 0: Epic Structure Preparation

**Note**: This phase incorporates functionality from the deprecated epic-prep command

1. **Check Skip Flag**:
   ```python
   if "--skip-prep" in arguments:
       print("⏭️ Skipping preparation phase, going directly to breakdown...")
       goto step_1_readiness_assessment
   else:
       print("🔧 Starting epic structure preparation...")
   ```

2. **Gather Epic Context** (Same as epic-prep Step 1):
   ```python
   # Fetch Epic Details
   epic = mcp__linear__get_issue(epic_id)
   
   # Get Team Context
   team = mcp__linear__get_team(team_name)
   available_labels = mcp__linear__list_issue_labels(team=team_name)
   issue_statuses = mcp__linear__list_issue_statuses(team=team_name)
   
   # Analyze Current Epic Structure
   child_issues = mcp__linear__list_issues(parentId=epic_id)
   
   # Build hierarchy: Epic → Features → Tasks
   features = [issue for issue in child_issues if has_child_issues(issue)]
   orphan_tasks = [issue for issue in child_issues if not has_child_issues(issue)]
   ```

3. **Epic Completeness Analysis** (From epic-prep Step 2):
   ```python
   # Parse Epic Objectives
   objectives = extract_objectives_from_description(epic.description)
   technical_components = extract_technical_areas(epic.description)
   success_criteria = extract_success_criteria(epic.description)
   
   # Map Existing Coverage
   coverage_gaps = []
   for objective in objectives:
       matching_feature = find_matching_feature(objective, features)
       if not matching_feature:
           coverage_gaps.append(objective)
   
   # Feature Gap Identification
   missing_features = identify_missing_features(coverage_gaps)
   ```

4. **Orphan Feature Discovery** (From epic-prep Step 3):
   ```python
   # Query Potential Orphans
   orphan_candidates = mcp__linear__list_issues(
       team=team_name,
       parentId__null=True,  # No parent
       state="Backlog",
       hasChildren=True  # Has child issues (indicates feature-level)
   )
   
   # Conservative Alignment Analysis
   orphan_matches = []
   for orphan in orphan_candidates:
       score = calculate_alignment_score(orphan, epic)
       if score >= 70:  # High confidence threshold
           orphan_matches.append((orphan, score))
   ```

5. **Structure Fixes** (From epic-prep Steps 4-6):
   ```python
   prep_actions = []
   
   # Create missing features
   for gap in coverage_gaps:
       feature_template = create_feature_template(gap, epic)
       prep_actions.append({
           "type": "create_feature",
           "feature": feature_template,
           "reason": f"Missing coverage for: {gap.description}"
       })
   
   # Match high-confidence orphans
   for orphan, score in orphan_matches:
       prep_actions.append({
           "type": "match_orphan",
           "orphan": orphan,
           "confidence": score,
           "reason": f"High alignment score: {score}%"
       })
   
   # Fix metadata inconsistencies
   for issue in child_issues:
       metadata_fixes = identify_metadata_fixes(issue, epic)
       if metadata_fixes:
           prep_actions.append({
               "type": "fix_metadata",
               "issue": issue,
               "fixes": metadata_fixes
           })
   ```

6. **Execute Preparation Changes**:
   ```python
   print(f"\n🔧 Preparation Analysis Complete")
   print(f"Found {len(prep_actions)} structure improvements needed")
   
   if prep_actions:
       print("\nApplying structural fixes...")
       
       for action in prep_actions:
           if action["type"] == "create_feature":
               new_feature = mcp__linear__create_issue(
                   team=team.id,
                   title=action["feature"]["title"],
                   description=action["feature"]["description"],
                   labels=action["feature"]["labels"],
                   parentId=epic.id,
                   priority=epic.priority
               )
               print(f"✅ Created feature: {new_feature.identifier}")
               
           elif action["type"] == "match_orphan":
               mcp__linear__update_issue(
                   id=action["orphan"].id,
                   parentId=epic.id
               )
               # Add comment explaining match
               mcp__linear__create_comment(
                   parent={"page_id": action["orphan"].id},
                   rich_text=[{
                       "type": "text",
                       "text": {
                           "content": f"Matched to epic {epic.identifier} with {action['confidence']}% confidence by epic-breakdown prep phase."
                       }
                   }]
               )
               print(f"✅ Matched orphan: {action['orphan'].identifier}")
               
           elif action["type"] == "fix_metadata":
               mcp__linear__update_issue(
                   id=action["issue"].id,
                   **action["fixes"]
               )
               print(f"✅ Fixed metadata: {action['issue'].identifier}")
   
   else:
       print("✅ Epic structure already well-prepared")
   
   print("\n📊 Preparation Complete - Proceeding to readiness assessment...")
   ```

### Step 1: Epic Readiness Assessment

1. **Fetch Epic Details**:
   ```python
   # Get epic from Linear
   epic = mcp__linear__get_issue(epic_id)
   
   # Extract and parse epic description
   epic_content = {
       "title": epic.title,
       "description": epic.description,
       "labels": epic.labels,
       "priority": epic.priority,
       "acceptance_criteria": extract_acceptance_criteria(epic.description)
   }
   ```

2. **Readiness Checklist**:
   ```python
   readiness_criteria = {
       "has_problem_statement": check_for_section("Problem Statement", epic.description),
       "has_user_stories": check_for_section("User Stories", epic.description),
       "has_acceptance_criteria": len(acceptance_criteria) > 0,
       "has_success_metrics": check_for_section("Success Metrics", epic.description),
       "has_technical_requirements": check_for_section("Technical", epic.description),
       "has_clear_scope": not contains_vague_terms(epic.description),
       "priority_set": epic.priority in ["P0", "P1", "P2", "P3", "P4"]
   }
   
   missing_elements = [k for k, v in readiness_criteria.items() if not v]
   ```

3. **Readiness Decision**:
   ```markdown
   If not ready, report to user:
   
   ❌ Epic Not Ready for Breakdown
   
   Missing Required Elements:
   - [ ] Problem Statement: Epic needs clear problem definition
   - [ ] User Stories: Add "As a user..." stories with benefits
   - [ ] Acceptance Criteria: Define measurable success criteria
   - [ ] Technical Requirements: Specify technical constraints
   - [ ] Success Metrics: Add quantifiable success metrics
   
   Recommendations:
   1. Update epic description with missing sections
   2. Add specific, measurable acceptance criteria
   3. Define clear technical boundaries
   4. Run command again when complete
   ```

### Step 2: Feature Pre-Planning

1. **Identify High-Level Changes**:
   ```python
   # Parse epic to identify major work areas
   work_areas = []
   
   # Extract from epic description
   if "Feature Breakdown" in epic.description:
       features = extract_features_from_epic()
   
   # Analyze user stories for implied features
   for user_story in user_stories:
       implied_features = derive_features_from_story(user_story)
       work_areas.extend(implied_features)
   
   # Identify technical components mentioned
   technical_areas = extract_technical_areas(epic.description)
   for area in technical_areas:
       work_areas.append({
           "area": area,
           "type": detect_area_type(area),  # frontend/backend/database/etc
           "scope": estimate_scope(area)
       })
   ```

2. **Prepare Analysis Subagents**:
   ```python
   # Create analysis agent prompts
   analysis_prompts = []
   for i, work_area in enumerate(work_areas):
       prompt = f"""
       ROLE: Technical analyst specializing in {work_area['type']}
       
       EPIC CONTEXT:
       {epic.title}
       {epic.description}
       
       ANALYSIS FOCUS: {work_area['area']}
       
       INSTRUCTIONS:
       1. Read relevant codebase documentation in @ai_docs/knowledge/*
       2. Analyze existing code structure for this area
       3. Identify:
          - Current implementation state
          - Required changes and modifications
          - Technical constraints and patterns to follow
          - Potential risks or complexities
          - Suggested implementation approach
       4. Return structured analysis with:
          - Technical context
          - Implementation requirements
          - Recommended feature breakdown
          - Estimated complexity (small/medium/large/xl)
       """
       analysis_prompts.append((f"agent-{i+1}", prompt))
   ```

3. **Launch Parallel Analysis** (CRITICAL: All agents simultaneously):
   ```markdown
   📊 Launching Parallel Codebase Analysis
   Todo: "Analyze all work areas concurrently"
   
   # In a SINGLE response, launch ALL agents:
   Task.invoke(agent_1_analysis_prompt)
   Task.invoke(agent_2_analysis_prompt)
   Task.invoke(agent_3_analysis_prompt)
   Task.invoke(agent_4_analysis_prompt)
   # ... continue for all work areas
   
   ⏳ Waiting for all analyses to complete...
   ```

4. **Collect Analysis Results**:
   ```python
   analysis_results = []
   for agent in analysis_agents:
       result = collect_agent_output(agent)
       analysis_results.append({
           "area": result.work_area,
           "technical_context": result.context,
           "implementation_requirements": result.requirements,
           "suggested_features": result.features,
           "complexity": result.complexity,
           "risks": result.risks
       })
   ```

### Step 3: Feature Planning

1. **Feature Sizing Guidelines**:
   ```markdown
   AI Agent Feature Sizing:
   
   SMALL Feature (1-2 days for AI agent):
   - Single component or endpoint
   - Clear acceptance criteria (3-5 items)
   - No external dependencies
   - 1-3 tasks
   
   MEDIUM Feature (2-3 days for AI agent):
   - Multiple related components
   - 5-8 acceptance criteria
   - Some integration required
   - 3-5 tasks
   
   LARGE Feature (3-5 days for AI agent):
   - Complete subsystem or workflow
   - 8-12 acceptance criteria
   - Multiple integrations
   - 5-8 tasks
   
   If larger than LARGE, split into multiple features!
   ```

2. **Generate Feature List**:
   ```python
   features = []
   for analysis in analysis_results:
       # Split suggested features to right size
       for suggested_feature in analysis.suggested_features:
           if estimate_size(suggested_feature) > "LARGE":
               # Split into smaller features
               split_features = split_feature(suggested_feature)
               features.extend(split_features)
           else:
               features.append(suggested_feature)
       
       # Ensure each feature has:
       feature_template = {
           "title": feature.title,
           "description": feature.description,
           "user_story": generate_user_story(feature),
           "acceptance_criteria": feature.acceptance_criteria,
           "technical_area": analysis.area,
           "complexity": estimate_complexity(feature),
           "parallelizable": can_run_parallel(feature),
           "phase": assign_phase(feature)  # foundation/features/integration
       }
   ```

3. **Generate Tasks for Each Feature**:
   ```python
   all_tasks = []
   for feature in features:
       tasks = []
       
       # Break down feature into implementation tasks (max 5)
       implementation_steps = analyze_implementation_steps(feature)
       
       for step in implementation_steps[:5]:  # Limit to 5 tasks
           task = {
               "title": f"{step.component}: {step.action}",
               "description": step.detailed_description,
               "technical_scope": step.scope,
               "files_to_modify": step.files,
               "testing_approach": step.testing,
               "acceptance_criteria": step.criteria,
               "parent_feature": feature.id,
               "complexity": step.complexity
           }
           tasks.append(task)
       
       # Add testing task if not included
       if not has_testing_task(tasks):
           tasks.append(create_testing_task(feature))
       
       all_tasks.extend(tasks)
   ```

### Step 4: Create Linear Issues

1. **Create Features**:
   ```python
   created_features = {}
   for feature in features:
       # Use feature template format
       linear_feature = mcp__linear__create_issue(
           team=team_id,
           title=feature.title,
           description=format_feature_description(feature),
           labels=[
               "type:feature",
               f"area:{feature.technical_area}",
               f"phase:{feature.phase}",
               f"priority:{epic.priority}",
               f"complexity:{feature.complexity}"
           ],
           parentId=epic.id,
           state="Backlog"
       )
       created_features[feature.id] = linear_feature.id
   ```

2. **Create Tasks**:
   ```python
   created_tasks = {}
   for task in all_tasks:
       linear_task = mcp__linear__create_issue(
           team=team_id,
           title=task.title,
           description=format_task_description(task),
           labels=[
               "type:task",
               f"area:{task.technical_area}",
               f"complexity:{task.complexity}"
           ],
           parentId=created_features[task.parent_feature],
           state="Backlog"
       )
       created_tasks[task.id] = linear_task.id
   ```

3. **Format Templates**:
   ```python
   def format_feature_description(feature):
       return f"""
   ## Feature: {feature.title}
   
   ### Feature Summary
   **Epic**: {epic.title} - {epic.id}
   **User Story**: {feature.user_story}
   **Business Value**: {feature.business_value}
   **Complexity**: {feature.complexity}
   
   ### Functional Requirements
   {feature.description}
   
   ### Technical Requirements
   **Core Implementation**:
   {format_list(feature.technical_requirements)}
   
   **Technical Area**: {feature.technical_area}
   
   ### Acceptance Criteria
   {format_checklist(feature.acceptance_criteria)}
   
   ### Execution Context
   **Execution Phase**: {feature.phase}
   **Can Parallelize With**: {feature.parallel_features}
   **Agent Specialization**: {feature.specialization}
   
   ### Definition of Done
   - [ ] All acceptance criteria met
   - [ ] Tests written and passing
   - [ ] No regressions introduced
   - [ ] Linear status updated to Done
   """
   ```

### Step 5: Dependency Analysis

1. **Identify Dependencies Within Epic**:
   ```python
   dependencies = []
   
   # Check for explicit dependencies from analysis
   for feature in features:
       # Foundation phase blocks everything
       if feature.phase == "foundation":
           for other in features:
               if other.phase == "features" and other.id != feature.id:
                   dependencies.append({
                       "blocker": feature.id,
                       "blocked": other.id
                   })
       
       # Integration phase depends on features
       if feature.phase == "integration":
           for other in features:
               if other.phase == "features":
                   dependencies.append({
                       "blocker": other.id,
                       "blocked": feature.id
                   })
       
       # Check for technical dependencies
       for required in feature.requires:
           blocking_feature = find_feature_providing(required)
           if blocking_feature:
               dependencies.append({
                   "blocker": blocking_feature.id,
                   "blocked": feature.id
               })
   ```

2. **Update Linear Issues with Dependencies**:
   ```python
   for dep in dependencies:
       # Update blocked issue with blocking relationship
       mcp__linear__update_issue(
           id=created_features[dep.blocked],
           blockedByIds=[created_features[dep.blocker]]
       )
   ```

3. **Validate No Circular Dependencies**:
   ```python
   # Build dependency graph and check for cycles
   if has_circular_dependencies(dependencies):
       report_error("Circular dependencies detected!")
       show_dependency_cycle()
   ```

### Step 6: Generate Report

```markdown
## Epic Breakdown Complete: {epic.title}

### 🔧 Preparation Summary
**Structure Fixes Applied**: {len(prep_actions)}
**Features Created During Prep**: {prep_features_count}
**Orphans Matched**: {orphan_matches_count}
**Metadata Corrections**: {metadata_fixes_count}

### 📊 Breakdown Summary  
**Team**: {team.name}
**Epic**: {epic.id} - {epic.title}
**Total Features Created**: {len(features)}
**Total Tasks Created**: {len(tasks)}
**Total Issues**: {len(features) + len(tasks)}

### 🎯 Feature Distribution
**By Phase**:
- Foundation: {foundation_count} features ({foundation_percent}%)
- Features: {features_count} features ({features_percent}%)
- Integration: {integration_count} features ({integration_percent}%)

**By Complexity**:
- Small: {small_count}
- Medium: {medium_count}
- Large: {large_count}
- XL: {xl_count}

**By Technical Area**:
- Frontend: {frontend_count}
- Backend: {backend_count}
- Database: {database_count}
- Infrastructure: {infra_count}
- Testing: {testing_count}

### ⚡ Parallelization Analysis
**Maximum Parallel Execution**: {max_parallel} features
**Independent Work Streams**: {stream_count}
**Critical Path Length**: {critical_path} features
**Parallelization Score**: {parallel_percent}% can run in parallel

### 🔗 Dependencies Identified
**Total Dependencies**: {dep_count}
**Foundation Blockers**: {foundation_blockers}
**Integration Dependencies**: {integration_deps}
**Technical Dependencies**: {technical_deps}

### 📋 Created Features
{for feature in features:}
✅ **{feature.title}** ({feature.id})
   - Complexity: {feature.complexity}
   - Phase: {feature.phase}
   - Tasks: {feature.task_count}
   - Can parallelize with: {feature.parallel_list}

### 🚀 Sprint Planning Recommendations
Based on the breakdown, here are sprint recommendations:

**Sprint 1** (Foundation + Core Features):
- Features: {sprint1_features}
- Estimated Agents: {sprint1_agents}
- Parallelization: {sprint1_parallel}%

**Sprint 2** (Main Features):
- Features: {sprint2_features}
- Estimated Agents: {sprint2_agents}
- Parallelization: {sprint2_parallel}%

**Sprint 3** (Remaining Features + Integration):
- Features: {sprint3_features}
- Estimated Agents: {sprint3_agents}
- Parallelization: {sprint3_parallel}%

### 🔗 Linear Epic
View in Linear: {epic.url}

### ✅ Next Steps
1. Review created features and tasks in Linear
2. Adjust any dependencies if needed  
3. Run `/sprint-plan --team {team.name} --epic {epic.id}` to create first sprint
4. Execute with `/sprint-execute --project "Sprint YYYY-MM-NNN"`

### 🗂️ Command Consolidation Note
This command now includes epic preparation functionality. The separate `/epic-prep` command has been deprecated in favor of this integrated approach.
```

## Error Handling

### Common Issues
1. **Epic Not Ready**: Provide clear guidance on what's missing
2. **Analysis Agent Failures**: Retry failed agents up to 2 times
3. **Circular Dependencies**: Detect and report with visualization  
4. **Feature Too Large**: Auto-split into smaller features
5. **Linear API Limits**: Batch create with delays
6. **Preparation Failures**: Log preparation errors but continue to breakdown
7. **Orphan Matching Conflicts**: Conservative approach - skip ambiguous matches

### Validation Checks
- No feature larger than 8 tasks
- No task without parent feature
- All features have acceptance criteria
- Dependencies form valid DAG
- Parallelization > 60% for features phase

## Usage Example

```bash
$ /epic-breakdown --team Chronicle --epic EPIC-123

🔧 Starting epic structure preparation...
🔍 Gathering epic context and analyzing current structure
✅ Found 4 existing features, 2 orphan tasks

📊 Preparation Analysis Complete
Found 3 structure improvements needed

Applying structural fixes...
✅ Created feature: EPIC-124 (Missing API authentication coverage)
✅ Matched orphan: EPIC-110 (OAuth integration feature)
✅ Fixed metadata: EPIC-112 (Updated priority and labels)

📊 Preparation Complete - Proceeding to readiness assessment...

🔍 Analyzing Epic: User Authentication System
✅ Epic ready for breakdown

📊 Launching 5 Parallel Analysis Agents
- Agent-1: Analyzing database schema changes
- Agent-2: Analyzing JWT implementation  
- Agent-3: Analyzing OAuth providers
- Agent-4: Analyzing frontend components
- Agent-5: Analyzing API endpoints

⏳ Collecting analysis results...
✅ All analyses complete

📝 Planning Features and Tasks
- Identified 12 features across 3 phases
- Generated 43 tasks total
- Maximum parallelization: 8 features

🔨 Creating Linear Issues
- Creating 12 features... ✅
- Creating 43 tasks... ✅
- Setting up dependencies... ✅

📊 Epic Breakdown Complete!
- Preparation: 1 feature created, 1 orphan matched, 1 metadata fix
- Breakdown: 12 features (1 foundation, 9 features, 2 integration)
- 43 tasks total
- 75% can run in parallel
- 3 suggested sprints

View in Linear: https://linear.app/chronicle/issue/EPIC-123
Ready for sprint planning!
```

### Skip Preparation Example
```bash
$ /epic-breakdown --team Chronicle --epic EPIC-123 --skip-prep

⏭️ Skipping preparation phase, going directly to breakdown...

🔍 Analyzing Epic: User Authentication System
✅ Epic ready for breakdown

[... rest of breakdown process ...]
```
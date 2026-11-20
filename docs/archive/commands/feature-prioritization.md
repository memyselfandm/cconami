---
allowed-tools: Task, mcp__linear__get_issue, mcp__linear__list_issues, mcp__linear__update_issue, mcp__linear__get_team, mcp__linear__list_teams, TodoWrite, Read, Write
argument-hint: [feature-set] [--framework=rice|moscow|kano|value-effort] [--source=linear|manual] [--team <name>] [--output=summary|detailed]
description: Comprehensive feature prioritization using multiple frameworks (RICE, MoSCoW, Kano) with Linear integration and data-driven roadmap recommendations
---

# Feature Prioritization Command

Comprehensive multi-framework feature prioritization tool that evaluates features across multiple dimensions to generate data-driven roadmap recommendations. Supports RICE scoring, MoSCoW categorization, Kano analysis, and value-effort matrix with Linear API integration.

## Usage
- `[feature-set]`: Comma-separated feature IDs, epic ID, or project name (optional if using Linear source)
- `--framework <type>`: Prioritization framework: rice, moscow, kano, value-effort, all (default: rice)
- `--source <type>`: Data source: linear, manual (default: linear)
- `--team <name>`: Linear team name (required if feature-set not provided)
- `--output <type>`: Output detail level: summary, detailed (default: detailed)
- `--scope <type>`: Scope for Linear source: epic, project, backlog, all (default: backlog)
- `--scope-id <id>`: ID of specific epic/project to analyze
- `--stakeholder <role>`: Stakeholder perspective: product, engineering, business, customer (affects weighting)
- `--quarters <number>`: Planning horizon in quarters (default: 4)
- `--export <format>`: Export format: markdown, csv, json (optional)

## Framework Specifications

### RICE Framework
**Formula**: (Reach × Impact × Confidence) ÷ Effort

**Scoring Guidelines**:
- **Reach**: People/events affected per quarter
  - 10000+: Enterprise/massive user base
  - 1000-9999: Large user segment
  - 100-999: Medium user segment  
  - 10-99: Small user segment
  - 1-9: Niche use case

- **Impact**: Per-person impact when feature used
  - 3.0: Massive impact (core workflow transformation)
  - 2.0: High impact (significant improvement)
  - 1.0: Medium impact (moderate improvement)
  - 0.5: Low impact (minor improvement)
  - 0.25: Minimal impact (nice-to-have)

- **Confidence**: Team confidence in estimates
  - 100%: High confidence (proven data/research)
  - 80%: Medium confidence (some data/research)
  - 50%: Low confidence (assumptions/opinions)
  - 20%: Very low confidence (speculation)

- **Effort**: Person-months to implement
  - 0.25: 1 week
  - 0.5: 2 weeks
  - 1.0: 1 month
  - 2.0: 2 months
  - 3.0+: 3+ months (consider splitting)

### MoSCoW Framework
- **Must Have**: Critical for release success
- **Should Have**: Important but not critical
- **Could Have**: Nice to have if time permits
- **Won't Have**: Explicitly excluded from scope

### Kano Framework
- **Basic**: Must-have functionality (dissatisfaction if missing)
- **Performance**: Linear satisfaction increase with quality
- **Attractive**: Unexpected delighters (high satisfaction boost)
- **Indifferent**: Users don't care much either way
- **Reverse**: Some users dislike (proceed carefully)

### Value-Effort Matrix
- **Quick Wins**: High value, low effort (do first)
- **Big Bets**: High value, high effort (strategic investments)
- **Fill-ins**: Low value, low effort (if time permits)
- **Time Sinks**: Low value, high effort (avoid)

## Instructions

### Step 1: Initialize Prioritization Session

1. **Determine Analysis Scope**:
   ```bash
   if [[ "$feature_set" =~ ^[A-Z]+-[0-9]+$ ]]; then
     # Single epic or project ID provided
     scope_type="epic"
     scope_id="$feature_set"
   elif [[ "$feature_set" =~ , ]]; then
     # Comma-separated feature IDs
     scope_type="manual"
     feature_ids=(${feature_set//,/ })
   elif [[ -n "$team" ]]; then
     # Team-based analysis
     scope_type="team"
   else
     echo "❌ Error: Specify feature set, team, or epic/project ID"
     exit 1
   fi
   ```

2. **Launch Specialized Agent**:
   ```
   Use the program-manager subagent for comprehensive prioritization analysis.
   
   Context: "Perform feature prioritization analysis using $FRAMEWORK framework 
   for team $TEAM. Evaluate features across reach, impact, confidence, and effort 
   dimensions. Generate actionable roadmap recommendations with risk assessment."
   ```

### Step 2: Gather Feature Data

1. **Linear Source - Fetch Features**:
   ```python
   if source == "linear":
     if scope_type == "epic":
       epic = mcp__linear__get_issue(scope_id)
       features = mcp__linear__list_issues(
         parentId=scope_id,
         label="type:feature",
         includeArchived=false
       )
     elif scope_type == "project":
       features = mcp__linear__list_issues(
         project=scope_id,
         label="type:feature"
       )
     elif scope_type == "team":
       features = mcp__linear__list_issues(
         team=team,
         label="type:feature",
         state="backlog,todo,in_progress"
       )
   ```

2. **Extract Feature Context**:
   ```python
   for feature in features:
     feature_data[feature.id] = {
       "id": feature.id,
       "title": feature.title,
       "description": feature.description,
       "priority": feature.priority,
       "labels": feature.labels,
       "parent_epic": feature.parent.title if feature.parent else None,
       "assignee": feature.assignee.name if feature.assignee else None,
       "comments": get_recent_comments(feature.id),
       "related_issues": feature.relatedIssues,
       "created": feature.createdAt,
       "updated": feature.updatedAt
     }
   ```

3. **Gather Additional Context**:
   ```python
   # Get team context for reach estimation
   team_info = mcp__linear__get_team(team)
   user_metrics = get_user_base_metrics()  # From product analytics
   
   # Get dependency information
   dependencies = analyze_feature_dependencies(features)
   
   # Get technical complexity indicators
   complexity_signals = analyze_technical_complexity(features)
   ```

### Step 3: Multi-Framework Analysis

#### RICE Scoring Process
```python
def calculate_rice_score(feature):
    # Use AI to estimate based on feature context
    analysis_prompt = f"""
    Analyze this feature for RICE scoring:
    
    Feature: {feature.title}
    Description: {feature.description}
    Epic Context: {feature.parent_epic}
    Team: {team}
    User Base: {user_metrics}
    
    Provide RICE estimates:
    1. Reach: How many users/events per quarter?
    2. Impact: What's the per-person impact? (3.0-0.25 scale)
    3. Confidence: How confident are we? (100%-20% scale)
    4. Effort: Implementation time in person-months?
    
    Consider:
    - Feature complexity from description
    - Technical area and integration needs
    - Historical effort for similar features
    - Team capacity and skills
    """
    
    rice_estimates = ai_analyze(analysis_prompt)
    
    reach = rice_estimates.reach
    impact = rice_estimates.impact
    confidence = rice_estimates.confidence / 100
    effort = rice_estimates.effort
    
    rice_score = (reach * impact * confidence) / effort
    
    return {
        "score": rice_score,
        "reach": reach,
        "impact": impact,
        "confidence": confidence * 100,
        "effort": effort,
        "reasoning": rice_estimates.reasoning
    }
```

#### MoSCoW Categorization
```python
def categorize_moscow(feature, release_context):
    analysis_prompt = f"""
    Categorize this feature using MoSCoW method:
    
    Feature: {feature.title}
    Description: {feature.description}
    Release Context: {release_context}
    Priority: {feature.priority}
    Dependencies: {feature.dependencies}
    
    Determine category:
    - Must Have: Critical for release success, blocks other work
    - Should Have: Important but not blocking, high business value
    - Could Have: Nice to have if time permits, low risk to cut
    - Won't Have: Explicitly out of scope for this release
    
    Consider:
    - User impact if missing
    - Business risk if delayed
    - Technical dependencies
    - Regulatory/compliance needs
    """
    
    return ai_analyze(analysis_prompt)
```

#### Kano Model Analysis
```python
def analyze_kano_category(feature, user_research):
    analysis_prompt = f"""
    Classify this feature using Kano model:
    
    Feature: {feature.title}
    Description: {feature.description}
    User Feedback: {user_research}
    
    Classify as:
    - Basic: Expected functionality (dissatisfaction if missing)
    - Performance: Linear satisfaction increase with quality
    - Attractive: Unexpected delight (high satisfaction if present)
    - Indifferent: Users neutral about this feature
    - Reverse: Some users dislike (negative reaction)
    
    Consider:
    - User expectations vs reality
    - Competitive landscape
    - Feature novelty and surprise factor
    - User segment preferences
    """
    
    return ai_analyze(analysis_prompt)
```

#### Value-Effort Matrix
```python
def plot_value_effort(feature):
    # Combine business value signals
    value_score = calculate_business_value(
        user_impact=feature.user_impact,
        revenue_impact=feature.revenue_impact,
        strategic_value=feature.strategic_value,
        risk_mitigation=feature.risk_mitigation
    )
    
    # Technical effort estimation
    effort_score = calculate_effort_score(
        complexity=feature.complexity,
        dependencies=feature.dependencies,
        unknowns=feature.technical_unknowns,
        team_familiarity=feature.team_familiarity
    )
    
    # Classify quadrant
    if value_score >= 7 and effort_score <= 4:
        return "Quick Win"
    elif value_score >= 7 and effort_score > 4:
        return "Big Bet"
    elif value_score < 7 and effort_score <= 4:
        return "Fill-in"
    else:
        return "Time Sink"
```

### Step 4: Dependency and Resource Analysis

1. **Map Feature Dependencies**:
   ```python
   !mcp__linear__list_issues --team $TEAM --include-dependencies
   
   dependency_map = build_dependency_graph(features)
   critical_path = find_critical_path(dependency_map)
   blocking_features = identify_blockers(dependency_map)
   parallel_streams = find_parallel_work(dependency_map)
   ```

2. **Resource Allocation Analysis**:
   ```python
   resource_analysis = {
     "engineering_capacity": estimate_team_capacity(team),
     "skill_requirements": map_features_to_skills(features),
     "resource_conflicts": identify_resource_conflicts(features),
     "external_dependencies": find_external_dependencies(features),
     "risk_factors": assess_execution_risks(features)
   }
   ```

3. **Timeline Estimation**:
   ```python
   timeline = build_feature_timeline(
     features=prioritized_features,
     capacity=resource_analysis.engineering_capacity,
     dependencies=dependency_map,
     quarters=quarters
   )
   ```

### Step 5: Generate Comprehensive Report

#### Executive Summary Section
```markdown
# Feature Prioritization Report

## Executive Summary
**Analysis Date**: {current_date}
**Team**: {team_name}
**Features Analyzed**: {feature_count}
**Framework**: {framework_used}
**Planning Horizon**: {quarters} quarters

### Key Findings
- **Top Priority**: {top_feature} (Score: {score})
- **Quick Wins**: {quick_win_count} features
- **Big Bets**: {big_bet_count} strategic features
- **Resource Bottlenecks**: {bottleneck_areas}
- **Critical Dependencies**: {critical_dependency_count}

### Recommendation
Focus on {recommended_approach} with {primary_features} in Q1.
```

#### Prioritized Feature List
```markdown
## Prioritized Feature List

### Tier 1: Must Do (Q1)
| Feature | Score | Framework | Rationale |
|---------|-------|-----------|-----------|
| {feature_title} | {score} | {Quick Win} | {reasoning} |
| {feature_title} | {score} | {Big Bet} | {reasoning} |

### Tier 2: Should Do (Q2)
| Feature | Score | Framework | Rationale |
|---------|-------|-----------|-----------|

### Tier 3: Could Do (Q3-Q4)
| Feature | Score | Framework | Rationale |
|---------|-------|-----------|-----------|

### Tier 4: Won't Do (Out of Scope)
| Feature | Score | Framework | Rationale |
|---------|-------|-----------|-----------|
```

#### Detailed Analysis by Priority
```markdown
## Detailed Priority Analysis

### High Priority Features

#### {Feature Name} - {Score}
**RICE Breakdown**:
- Reach: {reach} users/quarter
- Impact: {impact}/3.0 (per-person impact)
- Confidence: {confidence}% (based on {data_source})
- Effort: {effort} person-months

**Business Justification**:
- User Value: {user_value_description}
- Business Impact: {business_impact_description}
- Strategic Alignment: {strategic_alignment}

**Implementation Considerations**:
- Technical Complexity: {complexity_level}
- Dependencies: {dependency_list}
- Risk Factors: {risk_assessment}
- Success Metrics: {success_metrics}

**Resource Requirements**:
- Engineering: {engineering_effort}
- Design: {design_effort}
- Product: {product_effort}
- External Dependencies: {external_deps}
```

#### Roadmap Recommendation by Quarter
```markdown
## Roadmap Recommendation

### Q1: Foundation & Quick Wins
**Theme**: {quarter_theme}
**Features** ({feature_count}):
- {feature_1}: {rationale}
- {feature_2}: {rationale}

**Success Metrics**:
- {leading_indicator_1}
- {lagging_indicator_1}

**Resource Allocation**:
- Engineering: {eng_allocation}%
- Design: {design_allocation}%
- Product: {product_allocation}%

### Q2: Strategic Investments
**Theme**: {quarter_theme}
**Features** ({feature_count}):
- {feature_1}: {rationale}
- {feature_2}: {rationale}

**Dependencies from Q1**:
- {dependency_1}
- {dependency_2}

**Risk Mitigation**:
- {risk_factor}: {mitigation_strategy}
```

#### Success Metrics Framework
```markdown
## Success Metrics

### Leading Indicators (Predictive)
| Metric | Q1 Target | Q2 Target | Q3 Target | Q4 Target |
|--------|-----------|-----------|-----------|-----------|
| Feature Development Velocity | {target} | {target} | {target} | {target} |
| User Engagement Rate | {target}% | {target}% | {target}% | {target}% |
| Technical Debt Ratio | {target}% | {target}% | {target}% | {target}% |

### Lagging Indicators (Outcome)
| Metric | Q1 Target | Q2 Target | Q3 Target | Q4 Target |
|--------|-----------|-----------|-----------|-----------|
| User Retention Rate | {target}% | {target}% | {target}% | {target}% |
| Revenue Impact | ${target} | ${target} | ${target} | ${target} |
| Customer Satisfaction | {target}/10 | {target}/10 | {target}/10 | {target}/10 |
```

### Step 6: Interactive Scoring Process

For manual source or when Linear data is insufficient:

```markdown
🎯 Interactive Feature Scoring

📊 Framework: {selected_framework}
📝 Features to evaluate: {feature_count}

### Feature 1: {feature_title}

**RICE Framework Scoring:**

🎯 **Reach**: How many users/events per quarter?
   Examples: 
   - 10,000+ = Major user base impact
   - 1,000 = Significant segment
   - 100 = Focused user group
   - 10 = Niche use case
   
   > Enter reach estimate: ___

💥 **Impact**: Per-person impact when used?
   Scale: 3.0=Massive, 2.0=High, 1.0=Medium, 0.5=Low, 0.25=Minimal
   Examples:
   - 3.0 = Core workflow transformation
   - 2.0 = Significant productivity boost
   - 1.0 = Moderate improvement
   - 0.5 = Minor convenience
   
   > Enter impact score: ___

🎯 **Confidence**: How confident in estimates?
   Scale: 100%=High data, 80%=Some data, 50%=Assumptions, 20%=Speculation
   
   > Enter confidence %: ___

⏱️ **Effort**: Implementation time in person-months?
   Examples:
   - 0.25 = 1 week
   - 0.5 = 2 weeks  
   - 1.0 = 1 month
   - 2.0 = 2 months
   - 3.0+ = Consider splitting
   
   > Enter effort estimate: ___

📊 **RICE Score**: {calculated_score}
```

### Step 7: Generate Actionable Outputs

1. **Update Linear Features** (if source=linear):
   ```python
   for feature in prioritized_features:
     updated_description = f"""
   {original_description}
   
   ## Prioritization Analysis
   **Framework**: {framework}
   **Score**: {feature.score}
   **Priority Tier**: {feature.tier}
   **Recommended Quarter**: {feature.quarter}
   
   ### RICE Breakdown
   - Reach: {feature.reach} users/quarter
   - Impact: {feature.impact}/3.0
   - Confidence: {feature.confidence}%
   - Effort: {feature.effort} person-months
   
   ### Business Justification
   {feature.business_justification}
   
   ### Success Metrics
   {feature.success_metrics}
   """
   
     mcp__linear__update_issue(
       id=feature.id,
       description=updated_description,
       labels=[...existing_labels, f"priority-tier:{feature.tier}"]
     )
   ```

2. **Export Roadmap Data**:
   ```python
   if export_format:
     roadmap_data = {
       "analysis_date": datetime.now(),
       "framework": framework,
       "features": prioritized_features,
       "recommendations": roadmap_recommendations,
       "success_metrics": success_metrics,
       "risk_assessment": risk_analysis
     }
     
     if export_format == "csv":
       export_csv(roadmap_data, f"./feature-prioritization-{team}-{timestamp}.csv")
     elif export_format == "json":
       export_json(roadmap_data, f"./feature-prioritization-{team}-{timestamp}.json")
   ```

### Step 8: Generate Final Report

```markdown
📊 Feature Prioritization Complete - Team {team_name}

## Analysis Summary
- **Features Evaluated**: {feature_count}
- **Framework**: {framework_name}
- **Top Score**: {top_score} ({top_feature})
- **Planning Horizon**: {quarters} quarters

## Priority Distribution
- **Tier 1 (Must Do)**: {tier1_count} features
- **Tier 2 (Should Do)**: {tier2_count} features  
- **Tier 3 (Could Do)**: {tier3_count} features
- **Tier 4 (Won't Do)**: {tier4_count} features

## Quarterly Roadmap
### Q1: {q1_theme}
{q1_features}

### Q2: {q2_theme}
{q2_features}

### Q3-Q4: {future_theme}
{future_features}

## Resource Requirements
- **Total Engineering**: {total_eng_months} person-months
- **Peak Quarter**: Q{peak_quarter} ({peak_resources} people)
- **Skill Dependencies**: {skill_requirements}

## Risk Factors
⚠️ **High Risk**: {high_risk_items}
⚠️ **Medium Risk**: {medium_risk_items}
✅ **Low Risk**: {low_risk_items}

## Next Steps
1. Review prioritization with stakeholders
2. Validate resource allocations
3. Begin Q1 feature planning:
   ```bash
   /sprint-plan --features {q1_feature_ids}
   ```
4. Set up success metric tracking
5. Schedule quarterly priority review

📋 **Exported**: {export_files}
🔗 **Linear Updated**: {updated_features} features enhanced
```

## Multi-Stakeholder Support

### Stakeholder Weighting Adjustments
```python
stakeholder_weights = {
  "product": {
    "user_impact": 40,
    "business_value": 30,
    "technical_feasibility": 20,
    "strategic_alignment": 10
  },
  "engineering": {
    "technical_feasibility": 40,
    "effort_accuracy": 30,
    "technical_debt_impact": 20,
    "user_impact": 10
  },
  "business": {
    "business_value": 50,
    "strategic_alignment": 25,
    "user_impact": 15,
    "technical_feasibility": 10
  },
  "customer": {
    "user_impact": 60,
    "usability": 25,
    "business_value": 10,
    "technical_feasibility": 5
  }
}
```

### Consensus Building
```python
def build_stakeholder_consensus(features, stakeholder_perspectives):
    consensus_analysis = []
    
    for feature in features:
        stakeholder_scores = {}
        
        for stakeholder, perspective in stakeholder_perspectives.items():
            weighted_score = calculate_weighted_score(
                feature, 
                perspective.weights
            )
            stakeholder_scores[stakeholder] = weighted_score
        
        variance = calculate_score_variance(stakeholder_scores.values())
        consensus_level = determine_consensus_level(variance)
        
        consensus_analysis.append({
            "feature": feature,
            "scores": stakeholder_scores,
            "consensus": consensus_level,
            "discussion_needed": variance > threshold
        })
    
    return consensus_analysis
```

## Framework Comparison Output

```markdown
## Multi-Framework Comparison

| Feature | RICE | MoSCoW | Kano | Value-Effort | Consensus |
|---------|------|--------|------|--------------|-----------|
| Auth System | 156 | Must | Basic | Quick Win | ✅ High |
| Advanced Dashboard | 89 | Should | Performance | Big Bet | ⚠️ Medium |
| Social Features | 45 | Could | Attractive | Fill-in | ❌ Low |

### Framework Alignment Analysis
- **High Consensus** (5 features): All frameworks agree on priority
- **Medium Consensus** (3 features): Some framework disagreement
- **Low Consensus** (2 features): Significant framework conflict

### Recommended Approach
Use **RICE scores** as primary ranking with **MoSCoW** for release scope definition.
Kano categories inform user experience strategy.
Value-Effort matrix guides resource allocation timing.
```

## Error Handling & Validation

```bash
# Validate framework selection
if [[ ! "$framework" =~ ^(rice|moscow|kano|value-effort|all)$ ]]; then
  echo "❌ Invalid framework. Use: rice, moscow, kano, value-effort, or all"
  exit 1
fi

# Validate Linear team access
if [[ "$source" == "linear" ]]; then
  team_check=$(mcp__linear__get_team "$team" 2>/dev/null)
  if [[ $? -ne 0 ]]; then
    echo "❌ Cannot access Linear team '$team'"
    echo "Available teams:"
    mcp__linear__list_teams | grep -E "^[A-Z]" | head -5
    exit 1
  fi
fi

# Validate feature set format
if [[ -n "$feature_set" && "$feature_set" =~ [^A-Z0-9,-] ]]; then
  echo "❌ Invalid feature set format. Use: PROJ-123,PROJ-124 or EPIC-456"
  exit 1
fi

# Check for minimum features
if [[ "$feature_count" -lt 3 ]]; then
  echo "⚠️ Warning: Only $feature_count features found"
  echo "Prioritization works best with 5+ features"
  read -p "Continue anyway? [y/N]: " confirm
  [[ "$confirm" != "y" ]] && exit 0
fi
```

## Integration Examples

### With Sprint Planning
```bash
# Prioritize epic features then plan sprints
/feature-prioritization --team Chronicle --scope epic --scope-id EPIC-100
/sprint-plan --team Chronicle --epic EPIC-100 --respect-priority

# Prioritize and immediately execute top features
/feature-prioritization --team Chronicle --framework rice --output summary
/sprint-execute --features "$(echo $TOP_FEATURES | tr ' ' ',')"
```

### With Release Planning
```bash
# Plan multi-release roadmap with prioritization
/feature-prioritization --team Chronicle --framework all --quarters 4
/release-plan --team Chronicle --use-priority-tiers --horizon 4
```

### Ongoing Prioritization Management
```bash
# Monthly priority review
/feature-prioritization --team Chronicle --export csv --output summary

# Update priorities based on new data
/feature-prioritization --team Chronicle --scope project --scope-id current-sprint
```

## Expected Outputs

### Summary Mode
```
📊 Feature Prioritization Summary - Team Chronicle

🏆 Top 5 Features (RICE Framework):
1. Authentication Revamp (Score: 245) - Critical user need
2. API Rate Limiting (Score: 189) - Technical stability  
3. Advanced Search (Score: 156) - User engagement
4. Social Login (Score: 134) - Acquisition driver
5. Export Features (Score: 98) - Enterprise need

📈 Quarterly Distribution:
- Q1: 8 features (3 Quick Wins, 2 Big Bets)
- Q2: 6 features (1 Quick Win, 3 Big Bets, 2 Fill-ins)
- Q3-Q4: 12 features (strategic and nice-to-have)

⚠️ Resource Conflicts: Q2 overallocated (1.3x capacity)
🎯 Recommendation: Move 2 features from Q2 to Q3

📋 Next Steps:
   /sprint-plan --features AUTH-123,API-456,SEARCH-789
```

### Detailed Mode
Generates comprehensive multi-page report with full analysis, framework comparisons, stakeholder perspectives, dependency maps, resource allocation tables, risk assessments, and implementation recommendations.

---

*Advanced feature prioritization tool for data-driven product roadmap planning and resource optimization*
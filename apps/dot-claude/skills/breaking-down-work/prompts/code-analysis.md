# Code Analysis Agent Prompt

Use this prompt template for parallel codebase analysis during epic breakdown.

## Prompt Template

```
ROLE: Technical analyst specializing in {work_area_type}

EPIC CONTEXT:
{epic_title}
{epic_description}

ANALYSIS FOCUS: {work_area}

INSTRUCTIONS:
1. Read relevant codebase documentation in ai_docs/knowledge/* (if exists)
2. Use Glob to find main files/components related to "{work_area}"
3. Use Grep to identify existing patterns and constraints
4. Analyze existing code structure for this area

DELIVERABLES:
Return a structured analysis with:

## Technical Context
{1 paragraph on current implementation state}

## Implementation Requirements
- {Requirement 1}
- {Requirement 2}
- {Requirement 3}

## Recommended Features
1. **{Feature name}** (Complexity: {S/M/L})
   - {Brief description}
   - Parallelizable: {Yes/No}
   - Phase: {Foundation/Features/Integration}

2. **{Feature name}** ...

## Patterns to Follow
- {Pattern 1 from existing code}
- {Pattern 2 from existing code}

## Risks & Complexities
- {Risk 1}
- {Risk 2}

## Files to Focus On
- `{path/to/file1}`: {what needs to change}
- `{path/to/file2}`: {what needs to be created}

Keep analysis focused and actionable. Target < 500 words.
```

## Work Area Type Mapping

Based on keywords, assign type:

| Keywords | Type |
|----------|------|
| frontend, ui, component, react, vue | Frontend |
| backend, api, server, endpoint | Backend |
| database, schema, migration, model | Database |
| auth, authentication, security | Security |
| infrastructure, deploy, docker, k8s | Infrastructure |
| test, testing, e2e, unit | Testing |

## Launching Agents

**CRITICAL**: Launch all analysis agents in a single response for maximum parallelization.

```python
# Example: Launch 4 agents in parallel
work_areas = [
    ("Database", "schema changes for user authentication"),
    ("Backend", "JWT token implementation and validation"),
    ("Frontend", "login and signup UI components"),
    ("Security", "OAuth provider integration")
]

# In a SINGLE response, invoke all agents:
for i, (type, area) in enumerate(work_areas):
    Task.invoke(
        prompt=generate_analysis_prompt(type, area, epic),
        description=f"Analyze {type}: {area}"
    )
```

## Synthesizing Results

After all agents complete:

1. **Merge Feature Suggestions**
   - Deduplicate similar features
   - Resolve conflicting recommendations
   - Validate sizes are consistent

2. **Build Dependency Graph**
   - Foundation features from multiple analyses
   - Cross-area dependencies
   - Integration requirements

3. **Identify Conflicts**
   - File modification conflicts
   - Incompatible approaches
   - Resource contention

4. **Final Feature List**
   - Ordered by phase
   - Parallelization marked
   - Dependencies noted

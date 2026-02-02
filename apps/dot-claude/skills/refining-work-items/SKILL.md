---
name: refining-work-items
description: Refines work items (epics, features, tasks, bugs) into AI-ready specifications. Use when converting rough ideas into structured items, preparing epics for breakdown, enhancing existing items with acceptance criteria, or creating new items from scratch. Supports --type (epic|epic-lite|feature|task|bug), --analyze-codebase for technical context, and --interactive for guided refinement.
---

# Refining Work Items

Transform rough ideas or existing work items into well-structured, AI-agent-ready specifications using proven templates.

## Usage

```
/refining-work-items [item-id] [options]
/refining-work-items --new --type epic --team "TeamName"
```

## Arguments

**Item ID** (optional):
- Existing work item to refine (e.g., `CCC-123`, `PROJ-456`, `#42`)
- Or full URL from PM tool
- If omitted with `--team`, creates new item

**Options:**
- `--type` or `type`: epic | epic-lite | feature | task | bug | chore
- `--analyze-codebase` or `analyze codebase`: Add codebase analysis for technical context
- `--interactive` or `interactive`: Step through sections with guided prompts
- `--validate-only` or `validate only`: Check readiness without making changes
- `--team` followed by name: Target team (required for create mode)
- `--parent` or `epic` followed by ID: Link to parent item
- `--create-subtasks`: Auto-generate child items (features/tasks)

## Examples

```bash
# Refine existing epic with full PRD template
/refining-work-items CCC-123 --type epic

# Quick 1-pager epic refinement
/refining-work-items CCC-123 --type epic-lite

# Refine with codebase analysis
/refining-work-items CCC-123 --type epic --analyze-codebase

# Create new feature for a team
/refining-work-items --new --type feature --team Chronicle

# Refine feature and auto-create subtasks
/refining-work-items PROJ-456 --type feature --create-subtasks

# Interactive bug report refinement
/refining-work-items --new --type bug --team Chronicle --interactive
```

## Workflow

### Step 1: Setup

1. **Detect PM Tool**: Load [pm-context](../pm-context/SKILL.md) to detect project's PM tool
2. **Parse Arguments**: Extract item ID, type, and options from input
3. **Determine Mode**:
   - Item ID provided → **Refine Mode**
   - No ID + team provided → **Create Mode**
   - Neither → Error with guidance

### Step 2: Context Gathering

**For Refine Mode:**
- Fetch item via pm-context `get_item(id)`
- Extract current title, description, status
- Check parent/child relationships
- Identify existing labels and type

**For Create Mode:**
- Prompt for initial idea/description
- Auto-generate title suggestion
- Determine type from keywords or prompt

### Step 3: Type Detection & Template Selection

If type not specified, detect from:
1. Explicit labels (epic, feature, bug, etc.)
2. Parent relationships (child of epic → feature)
3. Keywords in title/description
4. Interactive prompt if ambiguous

Load appropriate template:
| Type | Template |
|------|----------|
| epic | [epic-template.md](epic-template.md) |
| epic-lite | [epic-lite.md](epic-lite.md) |
| feature | [feature-template.md](feature-template.md) |
| task/bug/chore | [task-template.md](task-template.md) |

### Step 4: Readiness Assessment

Check item against template requirements:

**Epic Readiness:**
- [ ] Problem statement defined
- [ ] User stories or requirements
- [ ] Acceptance criteria (measurable)
- [ ] Technical requirements identified
- [ ] Success metrics defined

**Feature Readiness:**
- [ ] Clear, specific title
- [ ] User story or functional requirement
- [ ] 3+ acceptance criteria
- [ ] Complexity estimated
- [ ] Parent epic linked (if applicable)

**Task/Bug Readiness:**
- [ ] Clear title
- [ ] Context/description
- [ ] Definition of done
- [ ] Priority set

Report gaps and offer to fill interactively.

### Step 5: Template Population

**Interactive Mode (`--interactive`):**
Walk through each template section with prompts.

**Auto Mode (default):**
- Extract information from existing content
- Infer missing sections where possible
- Flag sections requiring input

### Step 6: Codebase Analysis (Optional)

When `--analyze-codebase` is specified:

1. Extract technical areas from description
2. Launch parallel analysis agents:
   ```
   For each technical area:
   - Search for existing implementations (Glob)
   - Find patterns and constraints (Grep)
   - Check ai_docs/knowledge/ for context
   - Return brief technical context (1 paragraph)
   ```
3. Synthesize findings into Technical Context section

### Step 7: Output

**Update existing item:**
```
pm-context.update_item(id, {
    title: refined_title,
    description: populated_template,
    labels: [type_label, "refined"]
})
```

**Create new item:**
```
pm-context.create_item({
    type: item_type,
    title: title,
    description: populated_template,
    parent: parent_id,
    labels: [type_label]
})
```

### Step 8: Validation

- [ ] All required template sections populated
- [ ] Acceptance criteria are measurable
- [ ] Technical context sufficient for AI agents
- [ ] Dependencies identified
- [ ] Item linked to parent (if applicable)

## Output Examples

### Epic Refinement
```
🔍 Analyzing work item CCC-123...
✅ Found: "Add user authentication system"
📋 Type: Epic (detected from labels)

📝 Gathering Context:
  ✅ Extracted requirements from description
  ✅ Found 3 related items
  ✅ Identified tech stack: React + FastAPI

🤖 AI-Optimization:
  📦 Estimated 4-6 features across 3 phases
  🔧 Foundation: JWT infrastructure, user schema
  ⚡ Features: Login, signup, OAuth (parallel)
  🔗 Integration: Security testing, docs

✅ Epic refined: CCC-123
🔗 View: [URL]
📊 Ready for /breaking-down-work
```

### Feature Creation
```
🆕 Creating New Feature

📝 What feature do you want to build?
> User can reset their password via email

🏷️ Suggested title: "Password Reset via Email"
🔗 Parent epic: CCC-123 (User Authentication)

📋 Generating feature specification...
  ✅ User story defined
  ✅ 5 acceptance criteria
  ✅ Technical approach outlined
  ✅ Subtasks identified (3)

✅ Feature created: CCC-456
🔗 View: [URL]
```

## Next Steps

After refining:
- **Epic**: Run `/breaking-down-work <id>` to create features/tasks
- **Feature**: Run with `--create-subtasks` or manually break down
- **Task/Bug**: Ready for sprint assignment

## Error Handling

| Error | Solution |
|-------|----------|
| "Item not found" | Verify ID format and access permissions |
| "Insufficient context" | Use `--interactive` mode for guided input |
| "Type ambiguous" | Specify `--type` explicitly |
| "Parent not found" | Verify parent ID exists |

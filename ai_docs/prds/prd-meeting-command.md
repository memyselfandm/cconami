# PRD: `/prd-meeting` Claude Code Slash Command

## Executive Summary
The `/prd-meeting` command enables an interactive PRD writing session with Claude Code. The user provides a feature description as input (or file reference), and Claude Code guides them through a structured PRD creation process. Claude operates as a single agent that switches between different modes: first acting as a PM to draft and collaboratively refine the product sections (executive summary and features), then switching to architect mode to gather technical input and write the technical specifications, and finally switching to PO/SWE modes to automatically generate the feature backlog and task breakdown. The session concludes by referencing the completed PRD file and instructing the user to clear context before implementation.

## Key Features
- **Interactive PRD Creation**: Guided collaborative process for creating comprehensive PRDs
- **Mode Switching**: Single agent seamlessly switches between PM, Architect, PO, and SWE perspectives
- **Smart File Handling**: Detects existing PRDs and offers appropriate continuation options
- **Structured Format**: Enforces consistent PRD structure with all necessary sections
- **Automated Backlog**: Generates feature breakdown and task lists without manual intervention
- **Safe Operations**: Never overwrites files without user confirmation
- **Clear Handoff**: Instructs user to clear context before implementation begins

## PRD Format
PRDs should follow this structure:
```markdown
# PRD: <feature name>

## Executive Summary
<summarize the feature, stating the problem it solves and how it solves the problem for which users>

## Key Features
<a bullet list of features covered by this PRD>

## Technical Specs
### Stack
<technical stack, e.g. python, nodejs, nextjs, databases, etc>

### Architecture
<high-level architecture details>

### Technical Notes
<other technical details>

## Backlog
### Feature: <short feature name>
**Description:** <feature description or user story. this description should guide the developer to reliably and independtly implement the complete feature>
**Tasks:**
<up to 5 descriptive tasks to completely implement the feature>
- [ ] Task 1
- [ ] Task 2
- [ ] Task 3
- [ ] Task n...
**Notes:** 
<the notes section should be left empty>

### Feature: ...
<more features>


```

## Command Workflow

### Phase 1: Initialization
1. User invokes `/prd-meeting <detailed-feature-description | file-reference>`
2. If the input is not a file, Claude Code creates a concise kebab-case filename and initializes a PRD markdown file
3. If the input is a file, Claude Code:
   - Reads and analyzes the existing file
   - Detects which PRD sections already exist
   - Presents analysis to user with options:
     - "Continue from [next incomplete section]"
     - "Review and refine existing sections"
     - "Start fresh with new file (preserves original)"
   - Proceeds based on user's choice

### Phase 2: Product Definition (Collaborative)
1. **PM Mode**: Claude Code acts as a product manager to:
   - Analyze the user's feature description
   - Draft the Executive Summary and Key Features sections
   - Write these sections to the PRD file
2. **Collaboration**: Present the drafted sections to the user and collaborate to refine them
   - Display Executive Summary and Features together
   - Incorporate user feedback
   - Continue until user is satisfied with product definition

### Phase 3: Technical Specification (Collaborative)
1. **Architect Mode**: Claude Code switches to architect mode and:
   - Asks the user for input about technical preferences (stack, architecture considerations)
   - Takes into account the product sections already written
   - Drafts the Technical Specs section (Stack, Architecture, Technical Notes)
   - Writes these sections to the PRD file
2. **Collaboration**: Review technical sections with the user
   - Stack section
   - Architecture section
   - Technical Notes section
   - Incorporate feedback and refine

### Phase 4: Backlog Generation (Automated)
1. **PM/PO Mode**: Claude Code switches to product owner mode to:
   - Analyze the complete PRD (product + technical sections)
   - Generate feature backlog with names and descriptions
   - Organize features by implementation order and dependencies
   - Write features to the Backlog section
2. **SWE Mode**: Claude Code then switches to software engineer mode to:
   - Take each feature from the backlog sequentially
   - Break down each feature into no more than 5 implementation tasks
   - Write tasks as markdown checklists under each feature
   - Ensure tasks are ordered for proper implementation
3. No user collaboration during this phase - fully automated

### Phase 5: Completion
1. Reference the completed PRD file path to the user
2. Instruct the user to review the file
3. Advise the user to clear context before beginning implementation

### Important Notes
- Claude Code should never provide time estimates
- Collaboration only occurs during Phases 2 and 3
- Phase 4 is completely automated without user input
- The process can be interrupted if needed, but aims for completion

## Implementation Details

### Slash Command Structure
The `/prd-meeting` command will be implemented as a single markdown file in `.claude/commands/prd-meeting.md` with:

1. **Frontmatter**:
   - `allowed-tools`: Read, Write, MultiEdit
   - `argument-hint`: <feature-description | @file-reference>
   - `description`: Start an interactive PRD writing session

2. **Command Body**: Detailed instructions for Claude to:
   - Follow the 5-phase workflow sequentially
   - Switch between PM, Architect, PO, and SWE modes as specified
   - Pause for user collaboration at designated points
   - Handle file input cases appropriately
   - Complete all phases in a single conversation thread

### Mode Switching
Claude will receive explicit instructions to adopt different personas:
- **PM Mode**: "Act as a product manager focused on user value and feature clarity"
- **Architect Mode**: "Switch to technical architect mode, considering scalability and maintainability"
- **PO Mode**: "Become a product owner prioritizing features by business value and dependencies"
- **SWE Mode**: "Think like a senior engineer breaking down work into concrete implementation tasks"

### File Safety
- Never overwrite existing files without user confirmation
- When creating new versions, use suffix like `-v2.md`
- Always show what will be modified before making changes
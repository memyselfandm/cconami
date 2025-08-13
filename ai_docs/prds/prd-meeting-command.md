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
The `/prd-meeting` command will be implemented as a single markdown file in `.claude/commands/prd-meeting/prd-meeting.md` with:

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

## Technical Specs
### Stack
- Language: Markdown (for slash command definition)
- Claude Code slash command framework
- File I/O: Read, Write, MultiEdit tools
- No external dependencies

### Architecture
- Single-file slash command implementation
- Stateless execution within conversation context
- Mode switching through prompt instructions
- Sequential phase execution with explicit checkpoints

### Technical Notes
- Command relies on Claude's ability to follow multi-step instructions
- Collaboration points use explicit "pause and wait for user input" prompts
- File operations use Claude Code's built-in tools
- No state persistence between command invocations

## Implementation Plan

### Feature Parallelization Strategy

The features in this PRD can be implemented with the following parallelization approach:

**Group 1 - Initial Setup (Can be implemented simultaneously):**
- Feature 1: Create Basic Slash Command File
- Feature 7: Create Example PRD and Usage Documentation

**Group 2 - Core Workflow Modes (Must be implemented sequentially):**
- Feature 2: Implement PRD Initialization Phase
- Feature 3: Build Product Definition Mode  
- Feature 4: Build Technical Specification Mode
- Feature 5: Implement Automated Backlog Generation

**Group 3 - Safety Features (Can be implemented in parallel with Group 2):**
- Feature 6: Add File Safety and Completion Features

**Implementation Strategy:**
1. **Start with Group 1** - Command structure and documentation can be built simultaneously
2. **Group 2 must be sequential** - Each workflow phase depends on the previous phase's implementation
3. **Group 3 can overlap** - File safety features can be developed in parallel with later Group 2 features
4. **Recommended approach**: Complete Group 1 first, then implement Group 2 sequentially while developing Group 3 features alongside

**Dependencies:**
- Group 2 features have strict sequential dependencies (each phase builds on the previous)
- Group 1 and Group 3 have no dependencies and can be parallelized
- Final integration requires all groups to be complete

## Backlog
### Feature: Create Basic Slash Command File
**Description:** Implement the `/prd-meeting` slash command as a markdown file in the commands directory with proper frontmatter and basic workflow instructions
**Tasks:**
- [x] Create `/apps/dot-claude/commands/prd-meeting.md` file with frontmatter
- [x] Add allowed-tools configuration (Read, Write, MultiEdit)
- [x] Write basic command prompt structure with phase descriptions
- [x] Add comprehensive documentation in command comments
- [x] Test command loads and responds to `/prd-meeting` invocation
**Notes:**
Command file created with complete 5-phase workflow, proper frontmatter, mode switching instructions, collaboration checkpoints, and file safety features. Organized in structured folder: `/apps/dot-claude/commands/prd-meeting/prd-meeting.md` 

### Feature: Implement PRD Initialization Phase
**Description:** Handle user input processing, file creation/detection, and initialization of PRD files with proper naming and structure
**Tasks:**
- [ ] Implement input parsing for feature descriptions vs file references
- [ ] Add kebab-case filename generation from feature descriptions
- [ ] Create file existence checking and analysis logic
- [ ] Implement user choice menu for existing file handling
- [ ] Write tests for various input scenarios and edge cases
**Notes:** 

### Feature: Build Product Definition Mode
**Description:** Implement PM mode functionality to draft executive summary and key features sections with collaborative refinement
**Tasks:**
- [ ] Write PM mode prompt instructions for product-focused thinking
- [ ] Implement executive summary and features drafting logic
- [ ] Add collaboration checkpoint with user feedback loop
- [ ] Create section display and editing functionality
- [ ] Test collaborative flow with various feature types
**Notes:** 

### Feature: Build Technical Specification Mode
**Description:** Implement architect mode to gather technical input and create technical specs sections with user collaboration
**Tasks:**
- [ ] Write architect mode prompt for technical analysis
- [ ] Implement user input gathering for tech preferences
- [ ] Create technical specs section generation (stack, architecture, notes)
- [ ] Add technical review collaboration checkpoint
- [ ] Test technical section generation with different stack choices
**Notes:** 

### Feature: Implement Automated Backlog Generation
**Description:** Create PO and SWE modes for automatic feature backlog and task breakdown generation without user interaction
**Tasks:**
- [ ] Write PO mode prompt for feature prioritization and ordering
- [ ] Implement feature extraction and dependency analysis
- [ ] Create SWE mode prompt for task breakdown
- [ ] Add task generation with testing/documentation inclusion
- [ ] Test backlog generation with complex multi-feature PRDs
**Notes:** 

### Feature: Add File Safety and Completion Features
**Description:** Implement safe file operations, version management, and proper session completion with clear handoff instructions
**Tasks:**
- [ ] Implement file versioning with `-v2` suffix pattern
- [ ] Add confirmation prompts before any file modifications
- [ ] Create completion message with file path reference
- [ ] Add clear context instruction for implementation phase
- [ ] Write comprehensive tests for file safety scenarios
**Notes:** 

### Feature: Create Example PRD and Usage Documentation
**Description:** Develop example PRD outputs and comprehensive usage documentation to help users understand the command
**Tasks:**
- [x] Create example PRD showing all sections properly filled
- [x] Write usage examples for different input types
- [x] Document common workflows and best practices
- [x] Add troubleshooting guide for common issues
- [x] Test documentation with new users for clarity
**Notes:** 
Created comprehensive documentation suite including:
- `prd-meeting-example-output.md`: Complete example PRD for User Authentication System
- `prd-meeting-usage-guide.md`: Detailed usage guide with examples and best practices
- `prd-meeting-troubleshooting.md`: Common issues and solutions guide
- `prd-meeting-quick-reference.md`: Quick reference for common scenarios and syntax
- `prd-meeting-documentation-index.md`: Overview and navigation guide for all documentation
- `COMMANDS_README.md`: Reference table for all commands with links to documentation
All documentation moved to organized folder structure: `/apps/dot-claude/commands/prd-meeting/docs/`
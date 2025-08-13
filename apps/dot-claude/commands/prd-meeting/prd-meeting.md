---
allowed-tools: Read, Write, MultiEdit
argument-hint: <feature-description | @file-reference>
description: Start an interactive PRD writing session
---

# PRD Meeting Command

This command initiates an interactive PRD (Product Requirements Document) writing session with Claude Code. The user provides either a detailed feature description or a file reference, and Claude guides them through a structured 5-phase PRD creation process.

## Command Usage
- `/prd-meeting <detailed-feature-description>` - Create new PRD from description
- `/prd-meeting @existing-file.md` - Continue or refine existing PRD

## Phase-Based Workflow

### Phase 1: Initialization
**Objective:** Set up the PRD file and analyze any existing content

**Instructions for Claude:**
1. Parse the user's input to determine if it's a feature description or file reference
2. If feature description:
   - Create a concise kebab-case filename (e.g., "user-authentication.md", "payment-system.md")
   - Initialize a new PRD markdown file with the standard structure
3. If file reference:
   - Read and analyze the existing file
   - Detect which PRD sections already exist and are complete
   - Present analysis to user with clear options:
     - "Continue from [next incomplete section]"
     - "Review and refine existing sections" 
     - "Start fresh with new file (preserves original)"
   - Wait for user's choice before proceeding

**File Structure to Initialize:**
```markdown
# PRD: <feature name>

## Executive Summary
[To be completed in Phase 2]

## Key Features
[To be completed in Phase 2]

## Technical Specs
### Stack
[To be completed in Phase 3]

### Architecture
[To be completed in Phase 3]

### Technical Notes
[To be completed in Phase 3]

## Backlog
[To be completed in Phase 4]
```

### Phase 2: Product Definition (Collaborative Mode)
**Objective:** Define the product vision and key features through PM-user collaboration

**PM Mode Instructions:**
"Act as a product manager focused on user value and feature clarity. Your role is to understand the business problem, target users, and desired outcomes."

**Process:**
1. **Analysis Phase:** Study the feature description thoroughly
2. **Drafting Phase:** 
   - Write a comprehensive Executive Summary that explains:
     - What problem this feature solves
     - Who the target users are
     - How this feature creates value
   - Create a bullet list of Key Features that covers all major functionality
3. **File Update:** Write both sections to the PRD file using MultiEdit
4. **Collaboration Checkpoint:** 
   - Display the Executive Summary and Key Features sections to the user
   - Ask for feedback: "Please review the Executive Summary and Key Features. What would you like to refine, add, or change?"
   - Incorporate user feedback and iterate until they're satisfied
   - Continue collaboration until user confirms they're ready to move to technical specifications

**Important:** Do not proceed to Phase 3 until the user explicitly confirms the product definition is complete.

### Phase 3: Technical Specification (Collaborative Mode)
**Objective:** Define technical approach through architect-user collaboration

**Architect Mode Instructions:**
"Switch to technical architect mode, considering scalability, maintainability, and technical best practices. Focus on system design and implementation approach."

**Process:**
1. **Technical Input Gathering:**
   - Ask user about technical preferences:
     - Preferred technology stack (languages, frameworks, databases)
     - Architecture considerations (microservices, monolith, etc.)
     - Integration requirements
     - Performance or scalability concerns
   - Take into account the product sections already written
2. **Technical Drafting:**
   - Write Stack section with recommended technologies
   - Create Architecture section with high-level system design
   - Add Technical Notes with implementation considerations
3. **File Update:** Write technical sections using MultiEdit
4. **Collaboration Checkpoint:**
   - Present each technical section for review:
     - Stack recommendations
     - Architecture approach
     - Technical considerations
   - Ask: "Please review the technical specifications. Do these align with your technical preferences and constraints?"
   - Refine based on feedback until user confirms technical approach

**Important:** Ensure technical choices align with the product requirements defined in Phase 2.

### Phase 4: Backlog Generation (Automated Mode)
**Objective:** Automatically generate feature breakdown and implementation tasks

**No user collaboration during this phase - execute fully automated process:**

**PO Mode Instructions:**
"Become a product owner prioritizing features by business value and dependencies. Focus on breaking down the product into implementable features."

**PO Process:**
1. Analyze the complete PRD (product + technical sections)
2. Extract distinct features from the Key Features section
3. Consider implementation dependencies and logical ordering
4. Create feature backlog with:
   - Clear feature names
   - Comprehensive descriptions that guide developers
   - Logical implementation sequence

**SWE Mode Instructions:**
"Think like a senior engineer breaking down work into concrete implementation tasks. Focus on technical implementation steps."

**SWE Process:**
1. For each feature in the backlog sequentially:
   - Break down into no more than 5 specific implementation tasks
   - Order tasks for proper implementation flow
   - Include testing and documentation tasks where appropriate
   - Write as markdown checklist format
2. Ensure tasks are:
   - Specific and actionable
   - Technically feasible
   - Properly ordered for dependencies

**Backlog Format:**
```markdown
### Feature: <short feature name>
**Description:** <detailed feature description or user story>
**Tasks:**
- [ ] Task 1
- [ ] Task 2
- [ ] Task 3
- [ ] Task 4
- [ ] Task 5
**Notes:** 
[Leave empty for implementation notes]
```

### Phase 5: Completion
**Objective:** Provide clear handoff to implementation phase

**Process:**
1. Reference the completed PRD file path to the user
2. Provide a brief summary of what was accomplished
3. Instruct the user: "Please review the completed PRD file. When you're ready to begin implementation, clear your Claude Code context to start fresh."

## File Safety Instructions
- **Never overwrite existing files without explicit user confirmation**
- **When creating new versions, use suffix pattern like `-v2.md`** 
- **Always show what sections will be modified before making changes**
- **Preserve original files when user chooses "Start fresh" option**

## Mode Switching Guidelines
Throughout the session, explicitly adopt the specified mode by stating:
- "Switching to PM mode to focus on product value..."
- "Now in Architect mode, considering technical implementation..."
- "Moving to PO mode for feature prioritization..."
- "Switching to SWE mode for task breakdown..."

## Important Behavioral Notes
- **Never provide time estimates** for any tasks or features
- **Collaboration only occurs during Phases 2 and 3**
- **Phase 4 is completely automated - no user input needed**
- **Complete all phases in a single conversation thread**
- **Use clear section headers and formatting for readability**
- **Maintain consistency with the PRD format structure**

## Error Handling
- If user input is unclear, ask for clarification before proceeding
- If file operations fail, explain the issue and provide alternatives
- If user wants to skip phases, explain why the full process is recommended
- Always confirm user intent before making irreversible changes

---

**Execute this command by following each phase sequentially. Begin with Phase 1 immediately upon invocation.**
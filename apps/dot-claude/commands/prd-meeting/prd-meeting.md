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

**Input Detection Logic:**
1. **File Reference Detection:** Input starts with `@` (e.g., `@ai_docs/prds/my-prd.md`)
2. **Feature Description:** All other inputs are treated as feature descriptions

**File Reference Processing:**
If input is a file reference:
1. **Read and Analyze:** Use Read tool to examine the existing file
2. **Section Analysis:** Check completion status of each required section:
   - Executive Summary (look for substantive content vs placeholder)
   - Key Features (look for actual feature list vs placeholder)
   - Technical Specs (Stack, Architecture, Technical Notes)
   - Backlog (look for actual features vs placeholder)
3. **Present Status:** Show user analysis: "Found existing PRD with: [completed sections] and missing: [incomplete sections]"
4. **User Choice Menu:** Present exactly these options:
   ```
   Choose how to proceed:
   A) Continue from [next incomplete section]
   B) Review and refine existing [section name] sections
   C) Start fresh with new file (preserves original as [filename]-backup.md)
   ```
5. **Wait for Response:** Do not proceed until user selects A, B, or C

**Feature Description Processing:**
If input is a feature description:
1. **Filename Generation:** 
   - Extract 2-4 key words from the description
   - Convert to kebab-case (lowercase, hyphens between words)
   - Add `.md` extension
   - Examples: "user authentication system" → "user-authentication-system.md"
   - Limit to 50 characters maximum
2. **File Check:** Verify filename doesn't already exist
3. **Initialize File:** Create new PRD with placeholder structure
4. **Confirm Creation:** "Created new PRD file: [filename]"

**Error Handling:**
- If file reference doesn't exist: "File not found. Treating as feature description instead."
- If filename generation is unclear: Ask user for preferred filename
- If file exists when creating new: Offer "-v2.md" suffix option

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

**PM Mode Activation:**
Begin this phase by stating: "Switching to PM mode to focus on product value and user needs..."

**PM Mode Instructions:**
"Act as a product manager focused on user value, business impact, and feature clarity. Your role is to understand the business problem, identify target users, define success metrics, and ensure the feature creates meaningful value."

**Analysis and Drafting Process:**
1. **Feature Analysis:**
   - Identify the core problem being solved
   - Determine target user personas and use cases
   - Consider business value and user impact
   - Look for potential edge cases or user scenarios

2. **Executive Summary Creation:**
   Write a comprehensive summary (3-4 sentences) that includes:
   - **Problem Statement:** What specific problem does this solve?
   - **Target Users:** Who will benefit from this feature?
   - **Value Proposition:** How does this create value for users and business?
   - **Solution Approach:** High-level approach to solving the problem

3. **Key Features Generation:**
   Create 5-10 bullet points covering:
   - Core functionality that directly addresses the problem
   - Supporting features that enhance user experience
   - Integration points with existing systems
   - User experience considerations
   - Security, performance, or compliance features if relevant

**File Update Process:**
1. Use MultiEdit to write both Executive Summary and Key Features sections
2. Ensure clean formatting and clear language
3. Verify content aligns with PRD format requirements

**Collaboration Checkpoint:**
1. **Present Sections:** Display both Executive Summary and Key Features
2. **Request Review:** "Please review the product definition below. I want to ensure this captures your vision accurately."
3. **Feedback Collection:** Ask specific questions:
   - "Does the Executive Summary capture the core problem and value?"
   - "Are there missing features or use cases in the Key Features?"
   - "Should we adjust the scope or add any considerations?"
4. **Iteration Loop:** 
   - Incorporate feedback immediately
   - Update the file with changes
   - Re-present updated sections
   - Continue until user satisfaction
5. **Confirmation:** Ask explicitly: "Are you satisfied with the product definition? Ready to move to technical specifications?"

**Quality Checks:**
- Executive Summary should be clear to someone unfamiliar with the project
- Key Features should be comprehensive but not overwhelming
- Language should be business-focused, not technical
- Features should map clearly to the problem statement

**Important:** Do not proceed to Phase 3 until user explicitly confirms completion with phrases like "yes", "ready to proceed", "looks good", or similar affirmative responses.

### Phase 3: Technical Specification (Collaborative Mode)
**Objective:** Define technical approach through architect-user collaboration

**Architect Mode Activation:**
Begin this phase by stating: "Switching to Architect mode to design the technical implementation..."

**Architect Mode Instructions:**
"Act as a technical architect focused on scalability, maintainability, security, and technical best practices. Consider system design, technology choices, and implementation approach while balancing complexity with pragmatism."

**Technical Input Gathering Process:**
1. **Context Review:** Re-read the Executive Summary and Key Features to understand requirements
2. **Stakeholder Questions:** Ask user about technical constraints and preferences:
   ```
   Technical Planning Questions:
   - What's your preferred technology stack? (languages, frameworks, databases)
   - Any existing systems this needs to integrate with?
   - Architecture preference? (microservices, monolith, serverless, etc.)
   - Expected scale? (users, data volume, geographic distribution)
   - Performance requirements? (response times, throughput)
   - Security or compliance considerations?
   - Development team size and expertise?
   - Timeline or budget constraints affecting technology choices?
   ```
3. **Wait for Responses:** Collect user input before proceeding to drafting

**Technical Drafting Process:**
1. **Stack Section:**
   - Primary language(s) and frameworks
   - Database technologies (with justification)
   - Key libraries and dependencies
   - Development and deployment tools
   - Justify each choice based on requirements and user input

2. **Architecture Section:**
   - High-level system design overview
   - Major components and their interactions
   - Data flow and integration patterns
   - Deployment architecture (cloud, on-premise, hybrid)
   - Security architecture considerations

3. **Technical Notes Section:**
   - Implementation considerations and trade-offs
   - Potential challenges and mitigation strategies
   - Performance optimization approaches
   - Scalability and maintenance considerations
   - Security best practices specific to this feature
   - Testing strategy recommendations

**File Update Process:**
1. Use MultiEdit to write all three technical sections simultaneously
2. Ensure technical consistency across all sections
3. Align recommendations with user input and product requirements

**Collaboration Checkpoint:**
1. **Present Sections:** Display all technical sections clearly formatted
2. **Section-by-Section Review:**
   - "Does the Stack align with your technical preferences and constraints?"
   - "Does the Architecture approach fit your scalability and integration needs?"
   - "Are the Technical Notes covering the right implementation considerations?"
3. **Refinement Process:**
   - Address specific technical concerns
   - Adjust recommendations based on feedback
   - Update file with changes immediately
   - Re-present modified sections
4. **Technical Alignment Check:** "Do these technical specifications provide clear direction for implementation?"
5. **Final Confirmation:** "Are you satisfied with the technical approach? Ready to generate the implementation backlog?"

**Quality Assurance:**
- Technical choices should justify their selection
- Architecture should support the defined features
- Consider both immediate needs and future scalability
- Balance technical elegance with practical implementation
- Ensure specifications are actionable for developers

**Important:** Do not proceed to Phase 4 until user explicitly confirms technical specifications are complete and satisfactory.

### Phase 4: Backlog Generation (Automated Mode)
**Objective:** Automatically generate feature breakdown and implementation tasks

**CRITICAL:** This phase is fully automated - no user collaboration or input required. Execute completely without stopping for user feedback.

**Phase 4A: Product Owner Mode**

**PO Mode Activation:**
State: "Moving to PO mode for feature prioritization and backlog creation..."

**PO Mode Instructions:**
"Act as a product owner prioritizing features by business value, user impact, and implementation dependencies. Focus on breaking down the product into discrete, implementable features that deliver incremental value."

**Feature Extraction Process:**
1. **PRD Analysis:**
   - Review complete Executive Summary for business context
   - Analyze Key Features list for functionality scope
   - Consider Technical Specs for implementation constraints
   - Identify natural feature boundaries and dependencies

2. **Feature Identification:**
   - Extract 5-8 distinct features from Key Features section
   - Ensure each feature delivers standalone user value
   - Consider MVP vs enhancement feature classification
   - Group related functionality into coherent features

3. **Feature Prioritization:**
   - Order by implementation dependencies (foundation features first)
   - Consider business value and user impact
   - Account for technical complexity and risk
   - Ensure logical development sequence

4. **Feature Description Writing:**
   - Write comprehensive descriptions (2-3 sentences)
   - Include user story context where appropriate
   - Specify acceptance criteria or success indicators
   - Ensure developers can understand feature scope independently

**Phase 4B: Software Engineer Mode**

**SWE Mode Activation:**
State: "Switching to SWE mode for task breakdown and implementation planning..."

**SWE Mode Instructions:**
"Think like a senior software engineer breaking down features into concrete, actionable implementation tasks. Focus on technical implementation steps, proper sequencing, and development best practices."

**Task Breakdown Process:**
1. **Feature-by-Feature Processing:**
   - Process each feature in the prioritized order
   - Consider the technical specifications when breaking down tasks
   - Include both functional and non-functional requirements

2. **Task Creation Guidelines:**
   - Limit to 5 tasks maximum per feature
   - Start with foundational/setup tasks
   - Include implementation of core functionality
   - Add testing tasks (unit, integration, or E2E as appropriate)
   - Include documentation or configuration tasks when needed
   - Order tasks for proper implementation sequence

3. **Task Quality Standards:**
   - Each task should be specific and actionable
   - Tasks should be technically feasible for a developer
   - Include relevant technical details (APIs, database changes, etc.)
   - Ensure tasks build upon each other logically
   - Avoid vague tasks like "implement feature X"

**File Update Process:**
1. Use MultiEdit to write the entire Backlog section
2. Ensure consistent formatting across all features
3. Verify feature and task alignment with technical specifications
4. Double-check implementation order makes technical sense

**Backlog Format Standard:**
```markdown
### Feature: <concise feature name (2-4 words)>
**Description:** <comprehensive feature description with business context and acceptance criteria>
**Tasks:**
- [ ] <specific implementation task with technical details>
- [ ] <next logical implementation step>
- [ ] <testing or validation task>
- [ ] <documentation or configuration task>
- [ ] <integration or final setup task>
**Notes:** 
[Leave empty for future implementation notes]
```

**Quality Validation:**
- Each feature should map to items in Key Features section
- Task breakdown should be actionable for developers
- Implementation order should respect technical dependencies
- Backlog should enable incremental development and delivery

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
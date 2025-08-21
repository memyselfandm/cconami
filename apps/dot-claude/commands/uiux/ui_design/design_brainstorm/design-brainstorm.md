---
allowed-tools: Task, Read, Write, MultiEdit, Bash(mkdir:*), LS, Glob
argument-hint: <component-path> <screenshot-path> <requirements>
description: Generate multiple UI design variations in parallel using subagents
---

# Design Brainstorm Command

Generate multiple UI design variations for a component or interface using parallel subagents. Each agent creates a unique design approach based on slightly different instructions.

## Command Usage
- `/design-brainstorm <component-path>` - Generate variations for specified component
- `/design-brainstorm <component-path> @screenshots/current-design.png` - Include reference screenshots
- `/design-brainstorm <component-path> "requirements list"` - Add specific requirements

## Execution Process

### Step 1: Context Analysis
1. **Parse Arguments:**
   - Extract component path from $ARGUMENTS
   - Identify any screenshot references (paths starting with @ or in ai_context/screenshots)
   - Extract any specific requirements or improvements requested

2. **Review Current Design:**
   - Read and analyze the current component implementation
   - Review any provided screenshots or design references
   - Understand the existing architecture and patterns

### Step 2: Variant Setup
1. **Create Folder Structure:**
   ```
   <component-path>/
   └── design_variants/
       ├── variant_1/
       ├── variant_2/
       ├── variant_3/
       ├── variant_4/
       ├── variant_5/
       └── variant_6/
   ```

2. **Prepare Variant Instructions:**
   - Generate 6 unique design approaches
   - Each variant should have a different focus or optimization

### Step 3: Parallel Agent Execution

**CRITICAL:** Launch ALL agents SIMULTANEOUSLY using a single message with multiple Task tool invocations.

**Base Agent Prompt Template:**
```
ROLE: Act as a senior UI/UX designer specializing in [VARIANT_FOCUS]

CONTEXT:
- Current component: @<component-path>
- Screenshots: @<screenshot-paths> (if provided)
- Requirements: <user-requirements>

VARIANT: Design Variant #[N] - [VARIANT_THEME]

INSTRUCTIONS:
1. Create a **static** HTML/CSS variation of the component
2. Focus on: [VARIANT_SPECIFIC_FOCUS]
3. Consider: [VARIANT_CONSTRAINTS]
4. Output location: <component-path>/design_variants/variant_[N]/
5. Create a complete, independently viewable design including:
   - index.html with the component markup
   - styles.css with all styling
   - README.md explaining design decisions
6. The design should be fully static (no JavaScript required for initial review)
7. Include comments explaining key design choices

DELIVERABLES:
- Complete static design in the variant folder
- Brief summary of approach and key improvements
- List of design decisions made
```

**Variant Focus Examples:**
1. **Variant 1 - Minimalist:** "Focus on maximum clarity with minimal visual elements"
2. **Variant 2 - Information Dense:** "Optimize for displaying large amounts of data efficiently"
3. **Variant 3 - Accessibility First:** "Prioritize WCAG compliance and universal usability"
4. **Variant 4 - Mobile Optimized:** "Design for touch interfaces and small screens"
5. **Variant 5 - Data Visualization:** "Emphasize visual representation of information"
6. **Variant 6 - Performance:** "Optimize for fast rendering and minimal resource usage"

### Step 4: Design Requirements Processing

If user provides specific requirements in $ARGUMENTS, incorporate them into each variant:

**Common Requirements Template:**
- Layout improvements (header, footer, navigation)
- Component positioning and spacing
- Data visualization elements (charts, graphs, indicators)
- Status indicators and real-time updates
- Responsive design considerations
- Color scheme and typography preferences

### Step 5: Agent Coordination

1. **Launch Protocol:**
   - Create all 6 subagent tasks in a single operation
   - Ensure each agent has unique instructions
   - Monitor parallel execution

2. **Variation Strategies:**
   Customize each agent's approach by varying:
   - Visual hierarchy emphasis
   - Information density
   - Interaction patterns
   - Color and typography choices
   - Layout structures
   - Component organization

### Step 6: Results Compilation

After all agents complete:

1. **Verify Output:**
   - Check each variant folder for completeness
   - Ensure all designs are independently viewable

2. **Create Summary:**
   Generate `design_variants/SUMMARY.md` containing:
   - Overview of all 6 variants
   - Key differences between approaches
   - Quick access links to each variant
   - Recommendations for testing

3. **Report to User:**
   ```
   ✅ Generated 6 design variations for <component>
   
   Variants Created:
   - Variant 1: [Focus description]
   - Variant 2: [Focus description]
   - Variant 3: [Focus description]
   - Variant 4: [Focus description]
   - Variant 5: [Focus description]
   - Variant 6: [Focus description]
   
   View designs at: <component-path>/design_variants/
   Summary available at: design_variants/SUMMARY.md
   
   Ready for your feedback!
   ```

## Important Notes

- **Parallel Execution:** Always launch all agents simultaneously for efficiency
- **Static Designs:** Initial variants should be static HTML/CSS for quick review
- **Independence:** Each variant must be viewable standalone
- **Documentation:** Each variant includes explanation of design decisions
- **Flexibility:** Adapt variant themes based on component type and requirements

## Error Handling

- If component path doesn't exist: Request clarification
- If agents fail: Retry up to 2 times with adjusted instructions
- If screenshots referenced but not found: Proceed with text requirements only
- Always create the design_variants folder if it doesn't exist

---

**Execute this command by parsing arguments, setting up variants, and launching parallel design agents.**
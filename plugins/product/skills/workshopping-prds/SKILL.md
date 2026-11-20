---
name: workshopping-prds
description: Facilitates interactive PRD (Product Requirements Document) workshops with multi-phase workflow. Use when defining new features, products, or initiatives that need structured requirements gathering and documentation. Also ranks candidate features (RICE, MoSCoW, Kano) and writes one-page product overviews.
---

# Workshopping PRDs

Interactive product requirements document creation with structured phases.

## Usage

```
/workshopping-prds [options]
```

## Starting points

- Full interactive session: begin at Phase 1.
- From an existing ticket: read it with `get_item` and seed Phase 1 from its description.
- Template choice: `full`, `lean` or `technical`. Confirm it with the person at the start, along with where the output should go.
- Quick pass: skip the optional sections if the person asks.

## Modes

Besides the PRD workshop, two supporting modes. Load the file only when the person asks for that mode.

- **Feature prioritization** ([modes/feature-prioritization.md](modes/feature-prioritization.md)): rank candidate features with RICE, MoSCoW and Kano, then give a ranked recommendation. Use when the question is what to build first.
- **Product overview** ([modes/product-overview.md](modes/product-overview.md)): a one-page product overview from a discovery conversation. Use for a new product with no written strategy.

## Session Phases

### Phase 1: PM Mode - Problem Discovery

**Objective:** Understand the problem space

```markdown
## Problem Discovery

Let's understand what we're solving.

❓ What problem are we trying to solve?
>

❓ Who experiences this problem?
>

❓ How do they currently deal with it?
>

❓ Why is now the right time to solve this?
>

❓ What happens if we don't solve it?
>
```

**Output:** Problem statement, user personas, opportunity assessment

### Phase 2: Architect Mode - Solution Space

**Objective:** Explore solution approaches

```markdown
## Solution Exploration

Now let's think about solutions.

❓ What are possible approaches to solve this?
>

❓ What's the simplest version that could work?
>

❓ What technical constraints exist?
>

❓ What similar solutions exist in the market?
>

❓ What's our unique angle?
>
```

**Output:** Solution options, technical feasibility, differentiation

### Phase 3: PO Mode - Requirements Definition

**Objective:** Define what we're building

```markdown
## Requirements Definition

Let's get specific about what we're building.

### User Stories

❓ Complete this: "As a [user], I want [capability], so that [benefit]"
> (repeat for 3-5 primary stories)

### Acceptance Criteria

For each user story:
❓ How will we know it's working correctly?
>

### Scope Boundaries

❓ What's explicitly OUT of scope?
>

❓ What's nice-to-have vs must-have?
>
```

**Output:** User stories, acceptance criteria, scope definition

### Phase 4: SWE Mode - Technical Planning

**Objective:** Plan implementation approach

```markdown
## Technical Planning

Now let's think about how to build it.

❓ What are the main technical components?
>

❓ What existing systems does this integrate with?
>

❓ What new infrastructure is needed?
>

❓ What are the biggest technical risks?
>

❓ How would you break this into phases?
>
```

**Output:** Technical architecture, integration points, risk assessment

### Phase 5: Synthesis - Document Generation

Compile all inputs into structured PRD:

```markdown
# PRD: {Product/Feature Name}

## Executive Summary
{Generated from Phase 1}

## Problem Statement
### Current State
{From Phase 1}

### Desired State
{From Phase 2}

### Success Metrics
{Derived from acceptance criteria}

## User Personas
{From Phase 1}

## Solution Overview
{From Phase 2}

## Detailed Requirements

### User Stories
{From Phase 3}

### Acceptance Criteria
{From Phase 3}

### Non-Functional Requirements
{From Phase 4}

## Technical Approach
{From Phase 4}

## Scope
### In Scope
{From Phase 3}

### Out of Scope
{From Phase 3}

## Risks & Mitigations
{From Phase 4}

## Timeline & Phases
{From Phase 4}

## Appendix
{Any additional details}
```

## Templates

### Full Template
All sections, comprehensive documentation.
Best for: Major features, new products, cross-team initiatives.

### Lean Template
Core sections only: Problem, Solution, Requirements, Scope.
Best for: Smaller features, internal tools, quick iterations.

### Technical Template
Focus on architecture, integration, implementation.
Best for: Infrastructure changes, API design, technical debt.

## Output Options

1. **Markdown file** - Save to docs/
2. **Project** - Create a project via pm-context (`create_project`) with the PRD, or its brief, as the description; for an existing project, first read its current description with `get_project`, show it, and ask whether to replace it, append to it, or save the PRD as a file only; then `update_project`. The brief templates are `project-brief.md` (full) and `project-brief-lite.md` (one page) in `refining-work-items`. Then break the work into tickets of one to three units of value
3. **Both** - File + project whose description links the file

## Session Tips

- Answer questions conversationally, not formally
- It's OK to say "I don't know yet"
- Revisit earlier sections if needed
- Ask clarifying questions back
- Use examples to illustrate points

## Example Session

```
🚀 Starting PRD Session

Template: Full
Output: docs/prd-user-notifications.md

━━━ Phase 1: Problem Discovery ━━━

❓ What problem are we trying to solve?
> Users miss important updates because we have no notification system

❓ Who experiences this problem?
> All users, but especially power users who manage multiple projects

...

━━━ Phase 5: Generating PRD ━━━

✅ PRD generated: docs/prd-user-notifications.md

Would you like to:
1. Create a project from this PRD
2. Refine any section
3. Done

>
```

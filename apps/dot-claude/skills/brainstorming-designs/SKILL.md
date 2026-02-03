---
name: brainstorming-designs
description: Facilitates interactive design brainstorming sessions for UI/UX concepts. Use when exploring visual designs, user flows, component architecture, or creative solutions before implementation.
---

# Brainstorming Designs

Interactive design exploration and ideation sessions.

## Usage

```
/brainstorming-designs [topic] [options]
```

## Arguments

**Topic** (optional):
- Design area to explore (e.g., "login flow", "dashboard layout")

**Options:**
- `--type TYPE`: Design type (ui|ux|component|system)
- `--constraints`: Add specific constraints
- `--output PATH`: Save session output
- `--visual`: Generate ASCII mockups

## Examples

```bash
# General brainstorm
/brainstorming-designs "user onboarding"

# Component design
/brainstorming-designs "data table" --type component

# UX flow exploration
/brainstorming-designs "checkout process" --type ux

# With visual mockups
/brainstorming-designs "settings page" --visual
```

## Session Types

### UI Design
Focus on visual elements, layout, styling.

```markdown
## UI Brainstorm: {topic}

### Layout Options
❓ What are the main content areas?
❓ How should they be arranged?
❓ What's the visual hierarchy?

### Visual Style
❓ What mood/feeling should it convey?
❓ Color palette considerations?
❓ Typography approach?

### Responsive Behavior
❓ How does it adapt to mobile?
❓ Breakpoint strategy?
```

### UX Design
Focus on user flows, interactions, experience.

```markdown
## UX Brainstorm: {topic}

### User Goals
❓ What is the user trying to accomplish?
❓ What's their mental model?
❓ What information do they need?

### Flow Mapping
❓ What are the key steps?
❓ What decisions do users make?
❓ Where might they get stuck?

### Interaction Design
❓ How do users navigate?
❓ What feedback do they get?
❓ How do errors surface?
```

### Component Design
Focus on reusable UI components.

```markdown
## Component Brainstorm: {topic}

### API Design
❓ What props does it need?
❓ What variations exist?
❓ How is it controlled?

### State Management
❓ What internal state?
❓ What external state?
❓ Event handling?

### Composition
❓ What sub-components?
❓ Slot/children patterns?
❓ Extension points?
```

### System Design
Focus on design system, patterns, standards.

```markdown
## System Brainstorm: {topic}

### Patterns
❓ What patterns apply?
❓ Consistency with existing system?
❓ New patterns needed?

### Tokens
❓ Colors, spacing, typography?
❓ Animation/motion?
❓ Iconography?

### Documentation
❓ How will it be documented?
❓ Usage guidelines?
❓ Do's and don'ts?
```

## Brainstorming Techniques

### Crazy 8s
Generate 8 quick ideas in 8 minutes:
```
Idea 1: ____
Idea 2: ____
...
Idea 8: ____
```

### How Might We
Reframe problems as opportunities:
```
How might we make {problem} into {opportunity}?
```

### Constraint Removal
What if we removed a constraint?
```
What if we had unlimited screen space?
What if loading was instant?
What if users had perfect knowledge?
```

### Analogy Exploration
What does this remind us of?
```
This is like {analog} because...
We could apply {principle} from {domain}...
```

## ASCII Mockups

When `--visual` is specified, generate text-based mockups:

```
┌────────────────────────────────────┐
│  Logo        Nav    Nav    [User] │
├────────────────────────────────────┤
│                                    │
│  ┌──────────┐  ┌──────────┐       │
│  │  Card 1  │  │  Card 2  │       │
│  │          │  │          │       │
│  └──────────┘  └──────────┘       │
│                                    │
│  ┌──────────────────────────┐     │
│  │                          │     │
│  │      Main Content        │     │
│  │                          │     │
│  └──────────────────────────┘     │
│                                    │
└────────────────────────────────────┘
```

## Session Output

```markdown
## Design Brainstorm: {topic}

### Session Summary
- Type: {type}
- Duration: {duration}
- Ideas generated: {count}

### Key Insights
1. {insight 1}
2. {insight 2}
3. {insight 3}

### Promising Directions
- **Direction A**: {description}
  - Pros: {pros}
  - Cons: {cons}

- **Direction B**: {description}
  - Pros: {pros}
  - Cons: {cons}

### Visual Concepts
{ASCII mockups if generated}

### Next Steps
- [ ] {action 1}
- [ ] {action 2}
- [ ] {action 3}

### Questions to Resolve
- {question 1}
- {question 2}
```

## Integration

After brainstorming:
1. Create design tasks in PM tool
2. Save session for reference
3. Share with team for feedback
4. Iterate on promising directions

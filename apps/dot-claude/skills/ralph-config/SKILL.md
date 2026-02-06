---
name: ralph-config
description: Generate ralph.yml and PROMPT.md configuration files for Ralph Orchestrator workflows from plans, tickets, or ideas. Use when setting up Ralph Orchestrator, creating hat-based workflows, or adapting Linear/Jira/markdown plans into ralph.yml + PROMPT.md files.
argument-hint: [--from <source>] [--preset <name>] [--pattern <pattern>] [--backend <backend>] [--traditional]
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Grep, Glob, Bash, WebFetch, Task, TodoWrite
---

# Ralph Orchestrator Configuration Generator

Generate `ralph.yml` and `PROMPT.md` files for [Ralph Orchestrator](https://github.com/mikeyobrien/ralph-orchestrator) hat-based agent workflows. Adapts plans from Linear, Jira, markdown files, or raw ideas into ready-to-run configurations.

## Parameters

- `--from <source>`: Plan source - Linear ID, Jira ID, file path, URL, or inline description
- `--preset <name>`: Start from a built-in preset (see [reference.md](reference.md) for full list)
- `--pattern <name>`: Coordination pattern (`pipeline`, `contract-first`, `cyclic`, `adversarial`, `hypothesis-driven`, `coordinator-specialist`, `adaptive-entry`)
- `--backend <name>`: Agent backend (`claude`, `kiro`, `gemini`, `codex`, `amp`, `copilot`, `opencode`). Default: `claude`
- `--traditional`: Hatless configuration (simple loop, no hat orchestration)
- `--epic`: Generate epic-level multi-phase execution workflow (PM orchestration, spec-driven development, phase gates)

## Phase 0: Fetch Latest Documentation

**Mandatory.** Ralph Orchestrator changes frequently. Before generating any config:

1. Fetch latest config reference: `https://mikeyobrien.github.io/ralph-orchestrator/guide/configuration/`
2. Fetch hats & events: `https://mikeyobrien.github.io/ralph-orchestrator/concepts/hats-and-events/`
3. If using a preset, fetch it: `https://raw.githubusercontent.com/mikeyobrien/ralph-orchestrator/main/presets/{preset-name}.yml`
4. Compare against this skill's [reference.md](reference.md). **Prefer fetched docs** when they differ.
5. If fetches fail, warn the user and proceed with built-in reference:
   ```
   WARNING: Could not fetch latest Ralph docs. Using built-in reference
   which may be outdated. Verify at: https://mikeyobrien.github.io/ralph-orchestrator/
   ```

## Phase 1: Progressive Source Discovery

Use progressive disclosure. Start simple, only ask deeper questions when genuinely needed.

**Level 1** (always - skip if `--from` provided):
> What are you trying to build or accomplish?

**Level 2** (only if workflow type isn't obvious):
> What type of workflow fits this?
> Feature / Bug fix / Refactor / Research / Docs / Deploy

**Level 3** (only if using hats and pattern isn't clear):
> How complex is the coordination?
> Simple (traditional, no hats) / Standard (2-3 hats, pipeline) / Advanced (4+ hats, use preset)

Do NOT front-load all questions. Extract what you can from the source first.

## Phase 2: Source Adaptation

Extract plan content based on source type:

**Linear ticket** (`--from CHR-123`):
```bash
linctl issue get <ticket-id> --json
# Title → PROMPT.md objective
# Description → requirements and context
# Subtasks → task breakdown
# Labels → infer workflow type
# Comments → additional context
```

**Jira ticket** (`--from PROJ-789`): If no Jira MCP available, ask user to paste content. Extract same fields as Linear.

**Markdown file** (`--from ./plan.md`): Read the file. First heading = objective, content = requirements, task lists = acceptance criteria, code blocks = technical context.

**Inline description** (`--from "Add validation..."`): Use directly. Ask clarifying questions only if too vague for acceptance criteria.

**No source**: Interactive discovery starting from Level 1.

## Phase 3: Generate PROMPT.md

PROMPT.md carries ALL workstream-specific context. Write it for an agent with zero prior context.

Use the template at [templates/prompt-template.md](templates/prompt-template.md).

**Principles:**
- Specific and concrete - vague prompts produce vague results
- Minimum 3 measurable acceptance criteria
- One objective per PROMPT.md
- Include file paths when referencing existing code
- Explicitly state what's out of scope

## Phase 4: Generate ralph.yml

**Key principle: ralph.yml stays generic and reusable.** It defines orchestration mechanics (HOW), not workstream specifics (WHAT). Context lives in PROMPT.md and referenced files.

### Decision Tree

```
Simple one-shot task?  →  Traditional mode (no hats)
                          ↓ no
Built-in preset fits?  →  Use preset, customize guardrails/backend only
                          ↓ no
Standard pattern fits? →  Use coordination pattern as template
                          ↓ no
Build custom hats         (rare - truly unique workflows only)
```

### Design Principles

1. **Start with a preset** - Don't hand-craft hats when a preset works
2. **Fewer hats is better** - 2-hat workflow that works > 6-hat workflow that's fragile
3. **Hat instructions are role-focused** - Describe HOW to work, not WHAT to build
4. **Events are routing signals** - Brief payloads; detailed output goes in files
5. **KISS always** - Simplest config that achieves the goal

For the complete ralph.yml field reference and hat configuration schema, see [reference.md](reference.md).

For full worked examples, see [examples/](examples/).

## Phase 5: Output and Guidance

1. Write `ralph.yml` and `PROMPT.md` to the current directory
2. Show execution instructions:
   ```
   Files created:
     ./ralph.yml
     ./PROMPT.md

   To run:
     ralph run

   To run with a different backend:
     ralph run --backend gemini
   ```
3. If using hats, show the event flow:
   ```
   Workflow: task.start → Builder → build.done → Reviewer → review.approved → LOOP_COMPLETE
   ```
4. Remind user to review:
   - Does PROMPT.md capture the full intent?
   - Are guardrails appropriate for this project?
   - Is `max_iterations` sized right for the task?

---

## Epic-Level Execution (--epic flag)

For epics/initiatives with multiple phases, stories, and dependencies, use the `--epic` flag to generate a full PM-orchestrated workflow.

### When to Use Epic Mode

- Multi-phase projects with phase gates
- Epics with 5+ stories and dependencies
- Work requiring spec-driven development
- Projects needing audit trails in your tracker (Linear, Jira, GitHub)

### Epic Directory Structure

```
project/
├── epic.ralph.yml                    # Ralph config
└── specs/epic-id/
    ├── epic.PROMPT.md               # Epic overview, success criteria
    ├── backlog.md                   # Phase structure, story ordering, dependencies
    ├── env.md                       # Environment setup, test commands (optional)
    └── phase-N/                     # Phase-specific generated artifacts
```

### Epic Templates

- Epic PROMPT: [templates/epic-prompt-template.md](templates/epic-prompt-template.md)
- Backlog structure: [templates/backlog-template.md](templates/backlog-template.md)

### Epic Workflow

The epic workflow adds these hats on top of the standard pattern:

1. **Project Manager** - Orchestrates phases, creates tasks, handles transitions
2. **Spec Writer** - Creates detailed specs from tracker stories
3. **Spec Reviewer** - Reviews specs before implementation
4. **Engineer** - Implements approved specs using TDD
5. **Verifier** - Validates implementations ruthlessly
6. **Phase Tester** - Integration tests for each phase
7. **Completion Tester** - Final epic validation

### Tracker Integration

Epic mode integrates with your project management tool. Adapt commands:

| Tool | Fetch Issue | Comment |
|------|-------------|---------|
| Linear | `linctl issue get KEY --json` | `linctl issue comment KEY "message"` |
| Jira | `jira issue view KEY --plain` | `jira issue comment KEY "message"` |
| GitHub | `gh issue view NUM` | `gh issue comment NUM -b "message"` |

All hats comment on tracker tickets to maintain an audit trail.

### Key Design Patterns

1. **PM as Central Orchestrator** - Only PM can emit LOOP_COMPLETE
2. **Spec-Driven Development** - No implementation without approved spec
3. **Phase Gates** - Each phase has explicit criteria before proceeding
4. **Feedback Loops** - Failed verifications trigger rework cycles
5. **Task Dependencies** - Ralph's task system manages story ordering

See [examples/epic-multiagent-pipeline.md](examples/epic-multiagent-pipeline.md) for a complete worked example.

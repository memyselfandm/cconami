# Example: Feature from Linear Ticket

**Invocation:**
```bash
/ralph-config --from CHR-123 --preset feature
```

## Generated PROMPT.md

```markdown
# Add dark mode toggle to settings page

## Context
Users have requested a dark mode option. The settings page already has a
theme section. This connects to the existing ThemeProvider component.

Ref: https://linear.app/chronicle/issue/CHR-123

## Requirements
- Add a toggle switch to Settings > Appearance
- Persist preference in user profile (API + localStorage fallback)
- Apply theme change immediately without page reload

### Acceptance Criteria
- [ ] Toggle appears in Settings > Appearance section
- [ ] Selecting dark mode applies dark theme immediately
- [ ] Preference persists across sessions
- [ ] Existing light mode continues to work unchanged

## Technical Context
- ThemeProvider at src/providers/ThemeProvider.tsx
- Settings page at src/pages/Settings.tsx
- User preferences API: PATCH /api/users/me/preferences

## Out of Scope
- Custom theme colors (separate ticket)
- System preference detection (follow-up)
```

## Generated ralph.yml

```yaml
event_loop:
  prompt_file: "PROMPT.md"
  completion_promise: "LOOP_COMPLETE"
  max_iterations: 100
  max_runtime_seconds: 14400
  checkpoint_interval: 5

cli:
  backend: "claude"

core:
  specs_dir: "./specs/"

hats:
  builder:
    name: "Builder"
    description: "Implements the feature with quality gates."
    triggers: ["build.task"]
    publishes: ["build.done", "build.blocked"]
    default_publishes: "build.done"
    instructions: |
      ## BUILDER MODE
      Explore codebase → Plan approach → Implement → Verify.
      Follow existing codebase patterns.
      Run tests after changes.

  reviewer:
    name: "Reviewer"
    description: "Reviews implementation for quality. Does NOT modify code."
    triggers: ["review.request"]
    publishes: ["review.approved", "review.changes_requested"]
    default_publishes: "review.approved"
    instructions: |
      ## REVIEWER MODE
      Review the implementation against PROMPT.md requirements.
      Check: correctness, tests, patterns, errors, security.
      Do NOT modify code yourself.
```

**Event flow:** `build.task → Builder → build.done → review.request → Reviewer → review.approved → LOOP_COMPLETE`

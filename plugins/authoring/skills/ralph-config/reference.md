# Ralph Orchestrator Configuration Reference

> Source: https://mikeyobrien.github.io/ralph-orchestrator/
> Always fetch latest docs before generating config - this file may be outdated.

## ralph.yml Complete Field Reference

```yaml
# ============================================================
# Ralph Orchestrator Configuration
# Docs: https://mikeyobrien.github.io/ralph-orchestrator/
# ============================================================

# --- Event Loop ---
event_loop:
  prompt_file: "PROMPT.md"              # Default prompt file
  completion_promise: "LOOP_COMPLETE"    # Output text signaling done
  max_iterations: 100                    # Max orchestration iterations
  max_runtime_seconds: 14400             # 4-hour max runtime (default)
  idle_timeout_secs: 1800                # 30-min idle timeout (default)
  checkpoint_interval: 5                 # Git checkpoint frequency
  starting_event: "task.start"           # First event (hat mode only)

# --- CLI Backend ---
cli:
  backend: "claude"                      # claude|kiro|gemini|codex|amp|copilot|opencode
  prompt_mode: "arg"                     # arg|stdin

# --- Core Behaviors ---
core:
  specs_dir: "./specs/"                  # Specifications directory
  guardrails:                            # Rules injected into every prompt
    - "YAGNI ruthlessly - no speculative features"
    - "KISS always - simplest solution that works"

# --- Memories ---
memories:
  enabled: true
  inject: "auto"                         # auto|manual|none
  budget: 2000                           # Max tokens to inject
  filter:
    types: []                            # Filter by memory type
    tags: []                             # Filter by tags
    recent: 0                            # Days limit (0 = no limit)

# --- Tasks ---
tasks:
  enabled: true

# --- RObot (Human-in-the-Loop) ---
RObot:
  enabled: false
  telegram:
    bot_token: ""                        # Or RALPH_TELEGRAM_BOT_TOKEN env var

# --- Hats (hat-based mode only) ---
hats:
  hat_key:                               # Unique identifier (snake_case)
    name: "Display Name"                 # Required - display name (can include emoji)
    description: "Purpose description"   # Required - Ralph uses this for delegation
    triggers: ["event.a"]               # Required - events that activate this hat
    publishes: ["event.b"]              # Required - events this hat can emit
    instructions: |                      # Required - role-focused prompt
      How to work, not what to build.
    default_publishes: "event.b"         # Optional - default event if hat doesn't specify
    max_activations: 10                  # Optional - activation limit
    backend: "claude"                    # Optional - backend override per hat
```

## Event Pattern Matching

- Exact: `"task.start"` matches only `task.start`
- Prefix glob: `"build.*"` matches `build.done`, `build.failed`
- Suffix glob: `"*.done"` matches `task.done`, `build.done`
- Wildcard: `"*"` matches everything (use sparingly)

Specific patterns take precedence over wildcards. Each trigger pattern must map to exactly one hat.

## Available Presets

| Preset | Hats | Best For |
|--------|------|----------|
| `feature` | Builder → Reviewer | Standard feature development |
| `code-assist` | Planner → Builder → Validator → Committer | TDD from specs or descriptions |
| `spec-driven` | Spec Writer → Critic → Implementer → Verifier | Contract-first development |
| `refactor` | Refactorer → Verifier | Code refactoring |
| `pdd-to-code-assist` | 9 hats, full pipeline | Idea-to-committed-code |
| `bugfix` | Reproducer → Fixer → Verifier → Committer | Systematic bug fixing |
| `debug` | Investigator → Tester → Fixer → Verifier | Root cause analysis |
| `review` | Reviewer → Analyzer | Code review |
| `pr-review` | 4 specialized reviewers → Synthesizer | Multi-perspective PR review |
| `docs` | Writer → Reviewer | Documentation |
| `research` | Researcher → Synthesizer | Exploration (no code changes) |
| `deploy` | Builder → Deployer → Verifier | Release workflow |
| `gap-analysis` | Analyzer → Verifier → Reporter | Spec vs implementation gaps |

Fetch a preset's full YAML:
```
https://raw.githubusercontent.com/mikeyobrien/ralph-orchestrator/main/presets/{preset-name}.yml
```

## Coordination Patterns

### 1. Linear Pipeline (`pipeline`)
Sequential: A → B → C → Done.
Best for workflows with clear sequential phases.

### 2. Contract-First (`contract-first`)
Spec → Review gate → Implement → Verify.
Best for spec-driven work where contracts must be approved before implementation.

### 3. Cyclic Rotation (`cyclic`)
A → B → C → A (round-robin).
Best for complex features benefiting from multiple perspectives.

### 4. Adversarial Review (`adversarial`)
Builder ↔ Attacker.
Best for security-sensitive code, authentication systems.

### 5. Hypothesis-Driven (`hypothesis-driven`)
Observer → Theorist → Experimenter → Fix.
Best for complex bugs where root cause isn't obvious.

### 6. Coordinator-Specialist (`coordinator-specialist`)
Coordinator fans out to multiple specialists.
Best for parallel analysis tasks (audits, reviews).

### 7. Adaptive Entry (`adaptive-entry`)
Bootstrapper detects input type and routes to appropriate workflow.
Best for handling multiple input formats.

## Traditional Mode (No Hats)

For simple, focused tasks that don't need role separation:

```yaml
event_loop:
  prompt_file: "PROMPT.md"
  completion_promise: "LOOP_COMPLETE"
  max_iterations: 50
  max_runtime_seconds: 7200

cli:
  backend: "claude"

core:
  guardrails:
    - "YAGNI ruthlessly - no speculative features"
    - "KISS always - simplest solution that works"
    - "Run tests after changes"
```

## Hat Design Guidelines

1. **Description is critical** - Ralph uses hat descriptions to decide when to delegate
2. **Single responsibility** - Each hat should have one focused purpose
3. **Events are routing signals** - Brief payloads; store output in files
4. **Design for recovery** - Topology should handle unexpected states
5. **Test incrementally** - Start simple, validate flow, then add complexity

## Environment Variables

- `RALPH_CONFIG` - Default config file path
- `RALPH_DIAGNOSTICS` - Enable diagnostics (`1`)
- `NO_COLOR` - Disable color output

## CLI Quick Reference

```bash
ralph init --backend claude              # Initialize with backend
ralph init --preset code-assist          # Initialize from preset
ralph run                                # Run with ralph.yml
ralph run -c custom.yml                  # Run with custom config
ralph run -p "prompt text"               # Run with inline prompt
ralph run --backend gemini               # Override backend
ralph run -c core.specs_dir=./my-specs   # Override config field
ralph plan "description"                 # PDD planning session
ralph doctor                             # Check environment
ralph emit "event.name" "payload"        # Emit event (from within loop)
ralph web                                # Start web dashboard (alpha)
ralph bot onboard --telegram             # Set up Telegram bot
ralph bot status                         # Check bot config
```

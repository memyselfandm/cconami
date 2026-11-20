# breaking-down-work on Claude Code

- Invoke as `/breaking-down-work <project | initiative | key> [options]`.
- Linear calls: see `pm-context/platforms/claude-code.md`. When the source project has
  more than about fifteen tickets, delegate the coverage-check reads to a subagent and
  keep only its three lists.
- Codebase analysis: launch one `Explore` (or `oh-my-claudecode:explore`) subagent per
  area, **all in a single message**, so they run in parallel. Pass each the prompt from
  `prompts/code-analysis.md`.
- Waiting for agreement: when `AskUserQuestion` is available, ask "Create these N
  tickets?" with options to create all, create a subset, or stop.

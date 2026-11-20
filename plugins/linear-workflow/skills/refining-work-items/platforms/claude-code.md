# refining-work-items on Claude Code

- Invoke as `/refining-work-items <key or idea> [options]`.
- Linear calls: see `pm-context/platforms/claude-code.md`.
- `--analyze-codebase`: launch one `Explore` (or `oh-my-claudecode:explore`) subagent
  per technical area, all in a single message so they run in parallel. Ask each for a
  one-paragraph summary and a file list, not file dumps.
- `--interactive`: when the `AskUserQuestion` tool is available, ask one section at a
  time with two to four suggested answers.

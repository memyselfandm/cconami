# reviewing-pull-requests on Claude Code

- **Isolated reviewer.** Start each reviewer with the Agent tool and
  `isolation: "worktree"`, so it gets its own git worktree. Start several in one
  message so they run in parallel. Brief it with the text in the skill; the agent
  sees only that brief.
- **Review engine.** The built-in `code-review` skill. In step 3 of the brief, tell
  the reviewer to invoke it with the arguments `"<n> --comment"`, which posts its
  findings as inline comments on the pull request. Pass no effort level unless the
  owner asked for one; never choose `max` or `ultra` yourself.
- **Reading the verdict.** The agent's final message is the verdict line. Do not
  ask it for the findings.
- **Merging.** The plugin's command guard refuses `gh pr merge --auto`. Watch the
  checks and merge in one chained command, as in the skill.

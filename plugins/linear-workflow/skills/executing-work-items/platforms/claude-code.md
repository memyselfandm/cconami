# executing-work-items on Claude Code

- Invoke as `/executing-work-items <keys...>`. The skill sets
  `disable-model-invocation: true`, so Claude never starts it on its own: it launches
  agents, changes code and changes ticket status.
- Linear calls: see `pm-context/platforms/claude-code.md`.
- Agents: launch one subagent per group (an `executor`-type agent if installed, e.g.
  `oh-my-claudecode:executor`, otherwise `general-purpose`), all of a wave in a single
  message so they run in parallel. Give each `isolation: "worktree"` so parallel agents
  work in separate git worktrees.
- Brief each agent with: the ticket key, title and "Done when"; the branch name; the
  files its group owns; the checks to run; and the rule to report refusals rather than
  work around them.
- Pull requests: `gh pr create --base <default> --head <branch> --title "<KEY> <title>"`.
  Push with an explicit refspec, `git push origin HEAD:refs/heads/<branch>`, so a
  `push.default=upstream` setting cannot send the branch to the default branch.
- Review: `/reviewing-pull-requests <n>`, or an `oh-my-claudecode:code-reviewer`
  subagent in its own worktree.
- Checkpoint: `/checkpointing-sessions`.
- Do not use `gh pr merge --auto` in a repository with no required checks: it merges
  at once, before CI runs.

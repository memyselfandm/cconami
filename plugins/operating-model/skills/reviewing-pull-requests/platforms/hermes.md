# reviewing-pull-requests on Hermes

- **Isolated reviewer.** Delegate the review to a subagent with the brief in the
  skill and nothing else, and give it a fresh clone or worktree of its own, not the
  lead's working directory.
- **Review engine.** Hermes has no built-in pull request review skill. The reviewer
  reads the diff itself (`gh pr diff <n>`), runs the change's tests, and posts its
  findings with `gh pr comment <n> --body-file <file>`. The rest of the brief is
  unchanged.
- **Delegation approvals.** If the profile requires approval for a subagent's tool
  calls, the reviewer's `gh` and test commands go through that approval. Do not turn
  approvals off to speed a review up.
- **Reading the verdict.** Read only the verdict line the subagent returns.

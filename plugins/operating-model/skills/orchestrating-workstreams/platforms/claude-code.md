# orchestrating-workstreams on Claude Code

The persistent loop is the oh-my-claudecode `ralph` skill.

- **Start (step 4).** Invoke `/oh-my-claudecode:ralph` with the workstream as its
  task. Build its PRD from Linear as the skill describes: one story per open issue,
  acceptance criteria from each issue's "Done when".
- **Restart after compaction (step 6).** Invoke `orchestrating-workstreams` again
  with the Skill tool, re-read the brief and checkpoint from Linear, then invoke
  `/oh-my-claudecode:ralph` again.
- **End (step 7).** Run `/oh-my-claudecode:cancel`, both when the project is
  complete and when everything left is waiting on the owner.
- **Delegation.** Subagents are started with the Agent tool. A reviewer gets
  `isolation: "worktree"` (see `reviewing-pull-requests`).
- **Version.** `ralph` was read at oh-my-claudecode 5.5.0. It keeps its PRD per
  session under `.omc/state/`, runs a reviewer pass before completion, and then a
  cleanup pass. If a newer version behaves differently, follow the installed
  version and note the difference on the project.
- **Without oh-my-claudecode.** There is no built-in substitute with the same
  guarantees. Run steps 4 to 7 by hand: keep the story list as a project update,
  and re-read it at every check-in and after every compaction.

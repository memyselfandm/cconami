# Running reporting-workstream-status on Claude Code

## For the agent

- Read Linear through `pm-context/platforms/claude-code.md`. A full run makes many
  calls; delegate the reads to a subagent and keep only the item list.
- Read pull requests with `gh` for each repository in the settings:

  ```sh
  gh pr list -R <owner/repo> --state open \
    --json number,title,headRefName,updatedAt,statusCheckRollup,files
  ```

  `files` gives the changed paths for the collision check; `updatedAt` stands in for the
  last push. Run this once per repository, not once per ticket.
- Where the report goes depends on how it was started:
  - asked in a session: reply with the report text in the session;
  - a scheduled cloud routine (the `schedule` skill): the routine's prompt names the
    destination, for example a Slack or Discord channel through its connector. The
    report never goes into Linear: it writes nothing there.
- Sign a ruling comment with the session's role, e.g. `— <role> session (Claude Code)`,
  on its own line, because the Linear connector posts as the person who authorised it.

## Scheduling

Use a scheduled routine (`/schedule`) or `/loop` for a recurring run. Give it a prompt
like: "Run the reporting-workstream-status skill for <scope>, repositories <list>,
staleness window <n> days. Read only. Post the report to <channel>."

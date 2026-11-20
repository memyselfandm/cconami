# Running reporting-workstream-status on Hermes

Everything agent-specific about this skill lives here, so `SKILL.md` can be copied to
another runner unchanged.

## For the agent

- Read Linear with the Linear MCP tools (see `pm-context/platforms/hermes.md`):
  projects, initiatives, issues, comments, and each issue's attachments for linked pull
  requests.
- If the profile holds no GitHub credential, pull-request checks and pushes cannot be
  read, so every report opens with the "judged from Linear only" line.
- Post the report as the reply to the scheduled run. The job delivers it to the status
  channel.
- A Linear OAuth login acts as the person who authorised it. End a ruling comment with
  a signature line naming the agent and its profile, on its own line, e.g.
  `— <Agent name> (<profile>)`.

## Scheduled job

Create the job in the agent's own cron store, with the skill attached and delivery to
the status channel:

```sh
hermes -p <profile> cron create '<cron expression>' \
  --name workstream-status \
  --skill reporting-workstream-status \
  --deliver <platform>:<channel-or-thread-id> \
  'Run the scheduled workstream status report. Follow the reporting-workstream-status skill and its platforms/hermes.md note. Read only. Reply with the report text and nothing else.'
```

- **Cadence:** the owner's choice; daily before the owner's working day is a good start.
  Cron runs in the container's time zone (often UTC), so convert.
- **Delivery:** one standing thread or channel, so the reports form a history.
- **Approvals:** the job only reads, so a profile that denies approvals for cron jobs
  does not get in its way. A ruling is not part of the cron job.
- Keep the job definition in your repository's notes for the agent, because the cron
  store lives in the agent's data directory and is lost with it.

Check it with `hermes -p <profile> cron list` and `cron runs`.

## Example

The first deployment ran as the CTO agent of a homelab, daily at 16:00 UTC, delivering
to a "Workstream status" thread in the agents' shared Discord channel, with no GitHub
credential, so every report was judged from Linear alone. Its exact job definition lives
in that homelab repository beside its copy of this skill.

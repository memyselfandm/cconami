# operating-model

How agent sessions work with each other and with the owner, when several run in
one repository at once and Linear is the shared record.

## Skills

| Skill | Agents | What it does |
|---|---|---|
| [checkpointing-sessions](skills/checkpointing-sessions/) | all | Save a session's state to Linear before context is lost, and resume from it. |
| [assigning-owner-actions](skills/assigning-owner-actions/) | all | File each ask for the owner as its own labelled Linear issue, and pick up the answer. |
| [reviewing-pull-requests](skills/reviewing-pull-requests/) | all | Review each pull request head in an isolated subagent and read back one verdict line. |
| [orchestrating-workstreams](skills/orchestrating-workstreams/) | Claude Code | Lead one Linear project to done on a persistent loop, delegating all work. |
| [coordinating-sessions](skills/coordinating-sessions/) | all | The multi-session protocol: Linear first, one peer-message shape, reserved items, subagent briefs. |

Each `SKILL.md` is agent-neutral. Tool names live in each skill's
`platforms/claude-code.md` and `platforms/hermes.md`.

## Project settings

The skills read a project's settings from its instructions file (`CLAUDE.md`, or
the file your agent loads, such as `AGENTS.md`) under one heading:

```markdown
## Operating model

- owner: <name>
- owner time zone: <zone>
- owner-action label: owner-action
- owner inbox view: Waiting on Mike
- credential checks: <commands that print a credential's lifetime, never the credential>
- blocking classes: <the only finding kinds that block a merge>
- reserved items: <actions no session decides alone>
- subagent brief lines: <lines added to every subagent brief>
- shared files: <files several workstreams edit>
- sequencing tie-breaker: <who recommends an order, and where>
- merge method: --squash
```

Every setting is optional; each skill lists its own and their defaults. A skill's
`references/example-settings.md` shows how one project fills them in.

## Command guard

Installing the plugin turns on a `PreToolUse` hook on the Bash tool
(`hooks/hooks.json`). It refuses `gh pr merge --auto` and token-printing
`bao`/`vault token lookup`, and a project adds its own rules in
`.claude/guard-rules.json`. See [hooks/README.md](hooks/README.md).

The hook needs `python3` on `PATH`. If it cannot load a rules file it fails open
and says so.

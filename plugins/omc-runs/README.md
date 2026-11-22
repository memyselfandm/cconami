# omc-runs

A Claude Code mod for [oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode)
(OMC). While an OMC mode is active in this session, it shows one row above the
prompt per mode: what is running, how far it has got, how long it has run and
how many agents are working. For example:

```
autopilot · phase 3/5 execution · 14m · 3 agents running
ralph · iteration 7 · reviewer: critic · 22m
team · team-exec · 4 workers (3 busy) · 9m
ultragoal · goal 2/5 · 31m
```

When something is wrong, the same row carries a warning in the warning colour:

```
autopilot · phase 3/5 execution · 3h · stale for 3h; cancel or resume
ralph · iteration 480 · 6h · looping: iteration 480, hard limit 500
ultragoal · executing · 1m · awaiting confirmation
```

Nothing is drawn when no mode is active.

```
/plugin install omc-runs --marketplace memyselfandm/cconami
```

Choose the user scope to have it in every session.

`/omc-runs` prints each active run's row with its plan file, its last phase
change and the cancel command, `/oh-my-claudecode:cancel`.

It covers autopilot, ralph, team and ultragoal. The stale and looping warnings
are omc-watchdog's checks, judged against the limits OMC itself enforces, so
this mod **supersedes omc-watchdog**: install one or the other, not both. Agent
counts come from this session's own subagent and teammate events, not from OMC's
state files. The mod is read only: it never writes or deletes OMC state and never
calls OMC's tools.

| Setting | Default | What it does |
|---|---|---|
| `staleHours` | 2 | Hours without activity after which an active mode carries the stale warning |
| `reinforcementLimit` | 0 | Overrides the `reinforcement_count` at which an active mode is looping; 0 uses OMC's ceilings |

What each row reads, how it finds OMC's state, and an owner check before relying
on it: [../MODS.md](../MODS.md#omc-runs).
Tests: `claude plugin test plugins/omc-runs`, and
`bash plugins/omc-runs/tests/mutation-check.sh`.

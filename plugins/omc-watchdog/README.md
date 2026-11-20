# omc-watchdog

A Claude Code mod for [oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode)
(OMC). It shows a band above the prompt only when an OMC run in this session is
dead or looping, for example:

```
autopilot active but stale for 3h; cancel or resume (phase: execution)
team looping: reinforcement 20/20 (phase: team-exec)
```

When no OMC state exists, or everything is healthy, nothing is drawn.

```
/plugin install omc-watchdog --marketplace memyselfandm/cconami
```

Choose the user scope to have it in every session.

It watches ralph, autopilot, team and ultragoal. A mode is **stale** when it is
marked active but its state has not been touched for more than 2 hours, OMC's
own freshness window. It is **looping** when it is still marked active but has
reached the ceiling OMC's stop hook enforces: a `reinforcement_count` of 20 for
autopilot and team, or `max_reinforcements` (default 50) for ultragoal; for ralph,
an `iteration` at `max_iterations` (default 100). OMC never resets the count
during a run, so a lower count is a long run, not a loop. OMC raises ralph's
`max_iterations` by 10 each time it is reached, so the ralph rule rarely fires.
A run waiting for your confirmation is never shown as looping, only as stale.
The mod is read only: it never
writes or deletes OMC state and never calls OMC's tools. To act on the band, run
`/oh-my-claudecode:cancel` or resume the run.

| Setting | Default | What it does |
|---|---|---|
| `staleHours` | 2 | Hours without activity after which an active mode is stale |
| `reinforcementLimit` | 0 | Overrides the `reinforcement_count` at which an active mode is looping; 0 uses OMC's ceilings |

How it finds the state, what it reads and what it cannot see:
[../MODS.md](../MODS.md#omc-watchdog).
Tests: `claude plugin test plugins/omc-watchdog`, and
`bash plugins/omc-watchdog/tests/mutation-check.sh`.

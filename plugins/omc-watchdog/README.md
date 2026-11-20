# omc-watchdog

A Claude Code mod for [oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode)
(OMC). It shows a band above the prompt only when an OMC run in this session is
dead or looping, for example:

```
autopilot active but stale for 3h; cancel or resume (phase: execution)
ralph looping: reinforcement 7, iteration 9/10
```

When no OMC state exists, or everything is healthy, nothing is drawn.

```
/plugin install omc-watchdog --marketplace memyselfandm/cconami
```

Choose the user scope to have it in every session.

It watches ralph, autopilot, team and ultragoal. A mode is **stale** when it is
marked active but its state has not been touched for more than 2 hours, OMC's
own freshness window. It is **looping** when its `reinforcement_count` reaches 5,
or its `iteration` reaches `max_iterations`. The mod is read only: it never
writes or deletes OMC state and never calls OMC's tools. To act on the band, run
`/oh-my-claudecode:cancel` or resume the run.

| Setting | Default | What it does |
|---|---|---|
| `staleHours` | 2 | Hours without activity after which an active mode is stale |
| `reinforcementLimit` | 5 | The `reinforcement_count` at which an active mode is looping |

How it finds the state, what it reads and what it cannot see:
[../MODS.md](../MODS.md#omc-watchdog).
Tests: `claude plugin test plugins/omc-watchdog`, and
`bash plugins/omc-watchdog/tests/mutation-check.sh`.

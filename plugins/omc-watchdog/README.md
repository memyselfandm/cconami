# omc-watchdog

> **Superseded by [omc-runs](../omc-runs/).** omc-runs draws one row per active
> OMC mode with its progress, and carries these same stale and looping checks in
> that row, so there is one OMC row instead of two. omc-watchdog is frozen: it
> still works, but gets no further changes. Install omc-runs instead, and
> uninstall this one (`claude plugin uninstall omc-watchdog`) so the warnings are
> not drawn twice.

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
reached the reinforcement ceiling OMC's stop hook enforces: a
`reinforcement_count` of 20 for autopilot and team, or `max_reinforcements`
(default 50) for ultragoal. OMC never resets the count during a run, so a lower
count is a long run, not a loop. ralph is looping when its `iteration` is within
10% of OMC's hard limit (450 of 500, or 180 of 200 with `OMC_SECURITY=strict`).
Its `max_iterations` is not a limit: OMC adds 10 each time it is reached and
goes on. A run waiting for your confirmation is not shown as looping during
OMC's two-minute confirmation window, only as stale.
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

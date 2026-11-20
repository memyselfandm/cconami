# token-budget

A Claude Code mod. When a token budget is set, it shows this session's token
spend against it in a band above the prompt, for example
`Budget 412k / 1.0M (41%)`. The band turns to a warning at 90% and to an alert at
100% or more. With no budget set, nothing is drawn.

```
/plugin install token-budget --marketplace memyselfandm/cconami
```

Choose the user scope to have it in every session.

The budget comes from the `budget` setting or, when that is 0, from the
`OMC_RUN_BUDGET_TOKENS` environment variable that oh-my-claudecode's budget guard
reads. The setting wins when both are set. The band is display only: it blocks
nothing.

| Setting | Default | What it does |
|---|---|---|
| `budget` | 0 | The session's budget in tokens, at least 1; 0 uses `OMC_RUN_BUDGET_TOKENS` |

The mod counts input, output, cache-read and cache-write tokens of every model
turn (the main conversation's and each subagent's) and of every compaction.
`/clear` and an in-process `/resume` start the count over. What it counts and
leaves out, and how that differs from OMC's guard:
[../MODS.md](../MODS.md#token-budget).
Tests: `claude plugin test plugins/token-budget`.

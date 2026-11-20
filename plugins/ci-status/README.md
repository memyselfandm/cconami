# ci-status

A Claude Code mod. It shows the GitHub CI state of the current branch's HEAD, and
of the PRs this session opened, in a band above the prompt. The band is hidden
whenever GitHub cannot be read.

```
/plugin install ci-status --marketplace memyselfandm/cconami
```

Choose the user scope to have it in every session. It needs `gh` on the `PATH`,
authenticated for the repository, and holds no credential of its own.

| Setting | Default | What it does |
|---|---|---|
| `pollSeconds` | 30 | How often to read GitHub while a check is pending; at least 5 |
| `idlePollMinutes` | 0 | How often to read while nothing is pending; 0 is never |
| `maxFailingNames` | 3 | How many failing check names the band lists |

Full behaviour: [../MODS.md](../MODS.md#ci-status). Tests:
`claude plugin test plugins/ci-status`.

# owner-inbox

A Claude Code mod. It shows the open Linear issues that carry the ask label
(`owner-action` by default): a band above the prompt, a panel toggled with
`/inbox`, and an "ACTION FOR YOU" card in the chat when an agent files a new one.

```
/plugin install owner-inbox --marketplace memyselfandm/cconami
```

Choose the user scope to have it in every session. It reads Linear through the
session's `claude.ai Linear` connector.

| Setting | Default | What it does |
|---|---|---|
| `label` | `owner-action` | The Linear label that marks an issue as waiting on you |

Full behaviour: [../MODS.md](../MODS.md#owner-inbox). Tests:
`claude plugin test plugins/owner-inbox`.

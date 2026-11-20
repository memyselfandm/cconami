# mcp-health

A Claude Code mod. It shows a band above the prompt while a plugin's MCP server is
not connected, naming the server and the next step. The band is hidden while every
watched server is connected. The mod never starts, changes or delays a server.

```
/plugin install mcp-health --marketplace memyselfandm/cconami
```

Choose the user scope to have it in every session.

| Setting | Default | What it does |
|---|---|---|
| `watch` | empty | Servers to watch, added to the plugin servers found automatically |
| `ignore` | empty | Servers that are never checked or shown |

Full behaviour: [../MODS.md](../MODS.md#mcp-health). Tests:
`claude plugin test plugins/mcp-health`.

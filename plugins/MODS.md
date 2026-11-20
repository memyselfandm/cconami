# Mods

Claude Code mods: small plugins that change what a session shows. Each folder here is
one mod. The repository's `.claude-plugin/marketplace.json` lists them, so they are
installed from this repository by name.

| Mod | What it does |
|---|---|
| `owner-inbox` | Shows the Linear issues waiting on you: a band above the prompt, a panel toggled with `/inbox`, and a marked row in the chat when an agent files a new one |
| `peer-messages` | Draws a message from another session, agent or channel as a bordered card with the sender's name |
| `mcp-health` | Shows a band above the prompt when a plugin's MCP server is not connected, naming the server and the next step |

## Install

At the prompt of a terminal session:

```
/plugin install owner-inbox --marketplace memyselfandm/cconami
/plugin install peer-messages --marketplace memyselfandm/cconami
/plugin install mcp-health --marketplace memyselfandm/cconami
```

Or from a shell:

```
claude plugin install owner-inbox --marketplace memyselfandm/cconami
claude plugin install peer-messages --marketplace memyselfandm/cconami
claude plugin install mcp-health --marketplace memyselfandm/cconami
```

Choose the user scope to have a mod in every session. To pick up a change after the
repository moves on, run `claude plugin update <mod>` and then `/reload-plugins`.

## owner-inbox

The inbox is the set of open Linear issues that carry the label `owner-action`,
whoever they are assigned to. Agents file one issue per thing they need from you.

- **Band.** The count and the first four issue IDs, above the prompt. Absent when
  nothing is waiting.
- **Panel.** Closed until you ask for it. `/inbox`, or the band's Inbox button, opens
  and closes it. It draws the asks that fit and says how many more are in Linear.
- **In the chat.** A tool call that files an issue with the label is drawn as an
  "ACTION FOR YOU" card, with a toast. A reply that names an open ask gets a
  "Waiting on you" line above it.

It reads Linear through the session's Linear connector (`claude.ai Linear`), every two
minutes, so every session shows the same list. A session without that connector shows
an error line in the panel. The label and the connector's name are constants at the
top of `hooks/register.tsx`.

## peer-messages

By default a message from another session is one dim line. This mod draws it as a
card headed "MESSAGE from" and the sender's name, shows the first 14 lines of a long
one, and raises a toast when it arrives. The expanded transcript (ctrl+o) still shows
the row in full. It changes the drawing only; what the model reads is unchanged.

## mcp-health

A plugin's MCP server can fail at startup with one line that scrolls away, and then
every tool it serves is missing. This mod shows a band above the prompt while a
watched server is not connected:

```
MCP server not connected: plugin:oh-my-claudecode:t   [Check now]
/mcp to retry. If it fails again, run the server command by hand to see the error.
```

The band is absent while every watched server is connected.

- **Which servers.** By default, every plugin MCP server. The mod learns their names
  as Claude Code starts them at the beginning of a session, and remembers them for
  later sessions. Servers from settings and claude.ai connectors are watched only if
  you name them.
- **When.** 15 seconds after the session starts, so servers have time to connect,
  then every 60 seconds. **Check now** checks at once, for example after `/mcp`.
- **What counts as down.** A server that failed to connect or waits on sign-in. A
  server you turned off, or one a policy blocks, is not down. A name in the watch
  list that matches no server is shown as `unlisted`.
- **How it checks.** `$.mcp.connect(server)` on each watched server. For a server
  that `/mcp` lists, that call reports the server's state and does not reconnect it.

Two options, set in `/config` or in `settings.json` under
`pluginConfigs.mcp-health.options`. Both take server names as `/mcp` lists them:

| Option | Default | What it does |
|---|---|---|
| `watch` | empty | The servers to watch. Empty watches every plugin server |
| `ignore` | empty | Servers that never raise the band |

A plugin installed in the middle of a session is not watched until the next session
starts, unless you name its server in `watch`.

## Working on a mod

Run a session with the mod loaded from this checkout, so a saved file reloads it:

```
claude --plugin-dir plugins/owner-inbox
```

Check it before committing:

```
claude plugin validate plugins/owner-inbox
claude plugin test plugins/mcp-health
```

`.claude-plugin/types/` inside a mod is written by Claude Code when it loads the mod.
It is generated, and is not committed.

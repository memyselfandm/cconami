# Linear on Hermes

## Reaching Linear

Hermes reaches Linear through an MCP server declared in the profile's `mcp_servers`
config (the Linear remote MCP server, authorised by OAuth). Its tools expose the same
operations as on Claude Code: get, list and save issues, comments, projects, project
updates and initiatives.

- A profile with no `mcp_servers` entry for Linear cannot read or write it. Say so
  instead of guessing at ticket state.
- Linear OAuth cannot be scoped to one team. A grant reads, and can write, the whole
  workspace, so every write is subject to the profile's approval rules.
- The OAuth token acts as the person who authorised it. Sign comments that record a
  decision with the agent's name, so the record shows who wrote them.

## Kanban is not Linear

A Hermes kanban board is local to one agent. Do not use it to hand work to another
agent or to record project state; that goes in Linear, where every session can read it.

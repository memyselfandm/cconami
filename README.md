# cconami

A Claude Code plugin marketplace of skills, subagents, hooks and mods for
agent-driven work: running projects in Linear, shaping product work, authoring
skills and subagents, and coordinating several agent sessions in one repository.
Skills are written once and also render for [Hermes](platforms/README.md).

## Install

Requires Claude Code 2.1.292 or later (the first version with
`plugin install --marketplace`). Install a plugin by name. The marketplace is
added on first use, and a plugin's dependencies are installed with it:

```sh
claude plugin install <plugin> --marketplace memyselfandm/cconami
```

Or at the prompt of a session:

```
/plugin install <plugin> --marketplace memyselfandm/cconami
```

The default scope is `user` (every session); pass `--scope project` to record it
in the current project instead. To add the marketplace without installing
anything, run `claude plugin marketplace add memyselfandm/cconami`; plugins are
then also addressable as `<plugin>@cconami`. To pick up changes, run
`claude plugin update <plugin>`.

## Plugins

| Plugin | Description | Contents |
|---|---|---|
| [`linear-workflow`](plugins/linear-workflow/) | Refine, break down, analyze and execute Linear tickets; reconcile projects and report workstream status | 8 skills, including the `pm-context` tracker layer |
| [`product`](plugins/product/) | Workshop PRDs (with feature prioritisation and product overview modes) and brainstorm designs. Requires `linear-workflow`, installed automatically | 2 skills |
| [`authoring`](plugins/authoring/) | Build skills and subagents, scrape documentation, configure Ralph | 4 skills, 6 agents |
| [`operating-model`](plugins/operating-model/) | How agent sessions work with each other and the owner: checkpoints, owner asks, isolated PR review, workstream leads, peer coordination | 5 skills, 1 hook (command guard) |
| [`owner-inbox`](plugins/owner-inbox/) | The Linear issues waiting on you, in a band above the prompt and a panel toggled with `/inbox` | mod |
| [`peer-messages`](plugins/peer-messages/) | Messages from other sessions, agents and channels drawn as a card in the chat | mod |
| [`ci-status`](plugins/ci-status/) | The GitHub CI state of the current branch and of the PRs this session opened, above the prompt | mod |
| [`mcp-health`](plugins/mcp-health/) | A band above the prompt when a plugin's MCP server is not connected | mod |
| [`token-budget`](plugins/token-budget/) | The session's token spend against a budget, above the prompt, with a warning at 90% | mod |

Each plugin's README lists its skills, agents or settings. Mods are small plugins
that change what a Claude Code session shows; see [plugins/MODS.md](plugins/MODS.md).

## Skills across platforms

Every skill has one agent-neutral `SKILL.md`. Anything specific to one agent
(tool names, CLIs, invocation syntax) goes in `platforms/<platform>.md` beside
it, for example `skills/refining-work-items/platforms/claude-code.md` and
`platforms/hermes.md`. The `SKILL.md` body never names a platform-specific
tool; `scripts/lint-skills.py` enforces that in CI.

- **`targets`** in the frontmatter lists the agents a skill supports, such as
  `[claude-code, hermes]`. Absent means all. Do not use `platforms` for this:
  Hermes reads `platforms` as an operating-system filter.
- **Claude Code** loads the plugin's skills directly.
- **Hermes** gets a rendered copy. `platforms/hermes/install.sh` renders every
  skill under `plugins/*/skills` into a Hermes skills directory, keeping the
  Hermes notes and dropping other platforms' files:

  ```sh
  bash platforms/hermes/install.sh --dry-run /tmp/hermes-skills
  bash platforms/hermes/install.sh <profile>/skills
  ```

Details: [platforms/README.md](platforms/README.md) and the "Cross-Platform
Skills" section of
[format-spec.md](plugins/authoring/skills/building-skills/references/format-spec.md).

## Repository

- [docs/layout.md](docs/layout.md): what lives where, and the plugin boundaries.
- [docs/recommended-external.md](docs/recommended-external.md): external skill
  collections worth installing directly.
- [docs/inventory.md](docs/inventory.md): how the earlier layout was retired.
- [CLAUDE.md](CLAUDE.md): working on this repository.

## Credits

- [IndieDevDan](https://www.youtube.com/@indydevdan), whose ideas inspired this collection.
- [Context Engineering for Multi-Agent LLM Code Assistants](https://arxiv.org/html/2508.08322v1) (Muhammad Haseeb, 2025), the basis of the `context-engineering-subagent` agent.

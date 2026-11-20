# Repository layout

What lives where, and why. For how the earlier layout (`apps/dot-claude/`,
slash commands, external submodules) was retired, see
[inventory.md](inventory.md).

## Top level

| Path | What it is | Why it is there |
|---|---|---|
| `.claude-plugin/marketplace.json` | The marketplace catalog | Claude Code installs plugins from this repository by name (`--marketplace memyselfandm/cconami`) |
| `plugins/` | One directory per plugin | Each plugin installs on its own, so a user takes only what they need |
| `plugins/MODS.md` | Detailed behaviour of the mods | The mods share one development loop; their READMEs stay short |
| `platforms/` | Renderers for agents other than Claude Code | Skills are written once; `platforms/hermes/` turns them into Hermes's layout |
| `scripts/` | The skill lint and the catalog check, with their tests | CI runs them; they hold the cross-platform rule and the catalog in place |
| `tests/fixtures/` | Good and bad skills | Inputs for the lint and renderer tests |
| `.github/workflows/skills.yml` | CI | Validates every plugin, runs the mod tests, the lint, the renderer and the catalog check |
| `docs/` | This file, `inventory.md`, `recommended-external.md` | Repository documentation, not shipped in any plugin |
| `docs/archive/` | Retired material kept for reference | Not shipped, not linted, not linked from skills |

## Inside a plugin

```
plugins/<plugin>/
├── .claude-plugin/plugin.json
├── README.md
├── skills/<skill>/
│   ├── SKILL.md            # agent-neutral
│   ├── platforms/          # claude-code.md, hermes.md
│   └── ...                 # references/, templates/, examples/
├── agents/                 # subagents
├── hooks/                  # hooks.json plus scripts or a hooks module
└── tests/                  # mod tests
```

Only the directories a plugin needs exist. Claude Code finds `skills/`,
`agents/` and `hooks/hooks.json` by convention, so the manifests list none of
them.

## Plugin boundaries

A plugin groups what a user would install together. A skill lives in the
plugin whose job it serves. Where a skill uses one from another plugin (for
example `workshopping-prds` and `building-subagents` call `pm-context` from
`linear-workflow`), its `SKILL.md` names that skill so a user knows to install
both.

| Plugin | Scope | Not in scope |
|---|---|---|
| `linear-workflow` | Working a tracker: refining, breaking down, executing, reconciling and reporting on tickets and projects. `pm-context` is the tracker layer the other skills call | Product discovery (`product`); how sessions coordinate (`operating-model`) |
| `product` | Shaping work before it is ticketed: PRDs, feature prioritisation, product overviews and design brainstorms | Writing tickets, which hands off to `linear-workflow` |
| `authoring` | Building agent tooling: skills, subagents, Ralph configs, scraped docs; the six domain subagents | Anything that runs a workflow on a tracker |
| `operating-model` | How several agent sessions and the owner work together: checkpoints, owner asks, isolated PR review, workstream leads, peer messages, and the Bash command guard hook | Tracker workflow skills; the interface (mods) |
| `owner-inbox`, `peer-messages`, `ci-status`, `mcp-health` | Mods: Claude Code interface changes, one concern each | Skills or agents |

Mods are Claude Code only and have no Hermes rendering. Skills with
`targets` that omit `hermes` (for example `orchestrating-workstreams`) are
also Claude Code only.

## Cross-platform skills

Each skill has one agent-neutral `SKILL.md`; agent specifics live in
`platforms/<platform>.md` beside it. Claude Code loads the plugin directly.
Hermes gets a copy rendered by `platforms/hermes/install.sh`, which validates
every skill first, keeps `platforms/hermes.md` and drops other platforms'
notes. `scripts/lint-skills.py` shares the renderer's frontmatter rules and
rejects platform-specific tool names in a `SKILL.md` body. The rule in full:
[platforms/README.md](../platforms/README.md).

## The catalog

Three things must name the same plugins: the `## Plugins` table in the root
`README.md`, `marketplace.json`, and the directories under `plugins/`.
`scripts/check-catalog.py` checks this in CI, so a plugin cannot be added,
renamed or removed in one place only.

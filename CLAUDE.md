# CLAUDE.md

Orientation for agents working in this repository. It is a Claude Code plugin
marketplace; skills also render for Hermes. What lives where and why:
[docs/layout.md](docs/layout.md).

## Layout

```
.claude-plugin/marketplace.json   # The marketplace: one entry per plugin
plugins/<plugin>/
  .claude-plugin/plugin.json      # Plugin manifest (name, description, version, license, author)
  README.md                       # What it holds and its install line
  skills/<skill>/SKILL.md         # Agent-neutral skill
  skills/<skill>/platforms/*.md   # Per-agent notes (claude-code.md, hermes.md)
  agents/*.md                     # Subagents (authoring only)
  hooks/                          # Hooks (operating-model) or a mod's hooks module
  tests/                          # A mod's tests (*.test.ts, *.test.tsx)
plugins/MODS.md                   # Detailed behaviour of the four mods
platforms/hermes/                 # render.py, install.sh, test-render.sh
scripts/lint-skills.py            # Cross-platform lint (allowlist must stay empty)
scripts/check-catalog.py          # README table vs marketplace.json vs plugins/
tests/fixtures/                   # Fixtures for the lint and the renderer
docs/                             # layout.md, inventory.md, recommended-external.md, archive/
```

`docs/archive/` is reference material that is not shipped. Do not edit it or link
skills to it.

## The cross-platform rule

- A `SKILL.md` body is agent-neutral: it names operations ("list the project's
  open issues"), not tools. Tool names, CLIs and invocation syntax go in
  `platforms/<platform>.md` beside it, linked under `## Platform notes`.
- The agents a skill supports go in `targets` (for example
  `[claude-code, hermes]`; absent means all). Never put agent names in
  `platforms`: Hermes reads it as an OS filter (`linux`, `macos`, `windows`).
- `scripts/lint-skills.py` imports the Hermes renderer's frontmatter rules and
  fails on forbidden names in a body (`linctl`, `mcp__`, `/oh-my-claudecode:`,
  `hermes -p`, `kanban_create`). Fix the skill; do not add allowlist entries.
- Full key table: the "Cross-Platform Skills" section of
  `plugins/authoring/skills/building-skills/references/format-spec.md`.

## Adding things

**A skill.** Create `plugins/<plugin>/skills/<gerund-name>/SKILL.md` with `name`
and `description` frontmatter, plus `platforms/claude-code.md` and
`platforms/hermes.md` when steps differ by agent. Keep `SKILL.md` under 500
lines; move detail into supporting files. Add a row to the plugin's README.
Update the skill count in the root README if it changes.

**A plugin.** Create `plugins/<name>/.claude-plugin/plugin.json` (name,
description, version, license, `author: {"name": "memyselfandm"}`) and a
`README.md` with `/plugin install <name> --marketplace memyselfandm/cconami`.
Add an entry to `.claude-plugin/marketplace.json` with
`"source": "./plugins/<name>"`, and a row to the `## Plugins` table in
`README.md`. `check-catalog.py` fails if any of the three disagree.

**A mod.** As a plugin, plus `hooks/hooks.json` naming the hooks module,
`types/index.d.ts`, and tests under `tests/`. Describe it in `plugins/MODS.md`
and link its README from the table there. Run a session against the checkout
with `claude --plugin-dir plugins/<mod>`. `.claude-plugin/types/` inside a mod is
generated; do not commit it.

## Checks before a PR

Set `UV_CACHE_DIR` to a temp directory if the default cache is not writable.

```sh
uv run --script scripts/lint-skills.py          # 0 errors, 0 warnings
bash scripts/test-lint-skills.sh
bash platforms/hermes/test-render.sh
bash platforms/hermes/install.sh --dry-run "$(mktemp -d)"
bash plugins/operating-model/hooks/test-guard-bash-command.sh
python3 scripts/check-catalog.py
bash scripts/test-check-catalog.sh
claude plugin validate .
for p in plugins/*/; do claude plugin validate "$p"; done
claude plugin test plugins/<mod>                 # each mod with tests
```

CI (`.github/workflows/skills.yml`) runs all of these on every pull request.

## PR flow

- Branch from `origin/main` as `mike/ccc-<n>-<desc>`, created with `--no-track`.
- Push with `git push origin HEAD:refs/heads/<branch>`. Never push to `main`.
- Open the PR against `main` and reference the Linear ticket.
- Wait for CI to pass, then merge explicitly. Never use `gh pr merge --auto`:
  `main` has no required checks, so it merges before CI finishes.

## Linear

Tickets live in the **CCC** team (`CCC-<n>`).

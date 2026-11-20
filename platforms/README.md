# platforms/

Tooling that turns this repo's canonical skills into other agents' formats.

Each skill has one agent-neutral `SKILL.md`. Platform specifics live in
`platforms/<platform>.md` files beside it (for example
`skills/foo/platforms/hermes.md`). The rule and the frontmatter keys are
documented in `plugins/authoring/skills/building-skills/references/format-spec.md`
under "Cross-Platform Skills".

Everything here needs [uv](https://docs.astral.sh/uv/), or `python3` with PyYAML.

## Hermes

`hermes/render.py` renders one skill, or every skill under some roots:

```sh
uv run --script platforms/hermes/render.py <skill-dir> <out-root>
uv run --script platforms/hermes/render.py --all <out-root> [skills-root ...]
```

It writes `<out-root>/<category>/<name>/SKILL.md`:

- The category is `metadata.hermes.category`, default `general`.
- The frontmatter keeps `name`, `description`, `version`, `author` and
  `license`, plus `metadata.hermes.tags` and `metadata.hermes.related_skills`.
  Other `metadata.hermes` keys are dropped with a warning. Claude Code keys
  are dropped.
- `targets` lists the agents a skill supports (absent means all). A list
  without `hermes` is skipped with a message. It is not copied.
- Hermes reads `platforms` as an OS filter, so a source `platforms` and
  `metadata.hermes.os` may hold only `linux`, `macos` or `windows`. The output
  `platforms` comes only from `metadata.hermes.os` (e.g. `[linux]`).
- `name` and the category become path parts and must match
  `^[a-z0-9][a-z0-9-]{0,63}$`. YAML aliases are rejected (an alias is
  written out in full, so a small input could render a huge file). The
  frontmatter, as written and as rendered, is capped at 64 KiB.
- The body is copied byte for byte, line endings included, with one
  exception: a line whose only content is a link to another platform's notes
  file (`platforms/<other>.md`, not `hermes.md`) is dropped, since that file is
  not copied and the link would dangle. A match is a line holding only an
  optional bullet or number, an optional `Label:`, and the link, which may
  carry an `#anchor` or a `"title"`, for example
  `- [platforms/claude-code.md](platforms/claude-code.md)` and
  `- Claude Code: [platforms/claude-code.md](platforms/claude-code.md)`.
  Blockquote lines are kept, the platform name is compared without regard to
  case (so `hermes.md` is kept in any case), and lines inside CommonMark
  fenced code blocks, or indented 4 or more spaces, are never touched. A test renders every
  skill in the repo and checks that each relative link resolves in the output.
  `platforms/hermes.md` and other supporting files are copied; other
  platforms' files are not. Copies get mode 0644, or 0755 when the
  owner-exec bit is set, so no setuid, setgid or world-write bit survives.
  Hidden files, `__pycache__` and `node_modules` are ignored.
- Symlinks inside a skill are skipped with a warning. A symlinked `SKILL.md`,
  a hardlinked file, a special file (FIFO, device, socket) or a file that
  cannot be opened for reading is an error.

Every skill and supporting file is validated before anything is written; the
dry run opens every file, so it fails wherever the real run would. With
`--all`, every skill is built in a temporary sibling directory first, and only
when all builds succeed are they moved into place, so a failure never leaves a
half-written, deleted or mixed (some new, some old) install.

**Existing skills are not replaced by default.** A dry run prints
`would replace: <path>` for each one, including a dangling symlink at that
path; a real run refuses with exit 3 unless `--force` is given.

Put `--` before the paths when any of them may start with `-`
(`render.py --all -- <out-root> <root>`); `install.sh` does this for you.

### Recovering from a leftover `.hermes-dist/<name>.old-*` directory

Temporary builds and replaced copies live in `<out-root>/.hermes-dist/`, a
directory name Hermes reserves for staged copies and never loads skills from
(`EXCLUDED_SKILL_DIRS` in Hermes's `agent/skill_utils.py`). So a leftover never
shows up as a duplicate skill. The directory is removed when a run leaves it
empty.

A replaced skill is first moved to `.hermes-dist/<name>.old-XXXX/<name>`, the
new one is moved into place, and then the old copy is deleted. If that delete
fails (for example, a file in it is open or read-only), the run prints
`warning: could not remove <path> ...` and carries on; the new skill is
already installed. To clean up:

1. Check that `<category>/<name>/SKILL.md` is the new version.
2. Delete the leftover: `rm -rf '<out-root>/.hermes-dist/<name>.old-XXXX'`
   (run `chmod -R u+w` on it first if the delete is refused).

If the move into place itself fails, the run reports an error and restores the
previous copy automatically. If that restore also failed, move it back by hand:
`mv '<out-root>/.hermes-dist/<name>.old-XXXX/<name>' '<out-root>/<category>/<name>'`.

Discovery (`--all`, the lint and `install.sh` share it) searches the roots,
default `apps/dot-claude/skills` and `plugins/*/skills`, and skips hidden
directories, `node_modules`, any `platforms/` or `external/` directory, and
`docs/archive/`.

Exit codes: 0 ok (or skipped), 1 usage error, 2 invalid skill, 3 would
replace an existing skill without `--force`.

`hermes/install.sh` runs `render.py --all` twice: a dry run that validates
everything and prints the plan, then the real run.

```sh
platforms/hermes/install.sh --dry-run /tmp/hermes-skills   # plan only
platforms/hermes/install.sh /tmp/hermes-skills             # default roots
platforms/hermes/install.sh --force /tmp/hermes-skills     # replace existing
platforms/hermes/install.sh <target> plugins/*/skills      # explicit roots
```

The target is required and has no default, so nothing lands in a live Hermes
install by accident. Options go before the target; everything after it is a
skills root, even `--force`.

## Lint

```sh
uv run --script scripts/lint-skills.py            # default roots
uv run --script scripts/lint-skills.py plugins/*/skills
```

It imports `render.py`, so a SKILL.md that lints clean also renders. It fails,
naming file and line, when:

- the frontmatter breaks any rule above (for example agent names in
  `platforms`: "use `targets` for agents");
- the body names a platform-specific tool. The names are the `FORBIDDEN`
  tuple at the top of the script. Files under `platforms/` and the
  frontmatter are not checked for names.

`scripts/lint-skills.allowlist` can list body violations to report as
warnings. An entry that no longer matches is an error, so the file only
shrinks. CCC-127 emptied it. Do not add to it.

## Tests

```sh
bash platforms/hermes/test-render.sh
bash scripts/test-lint-skills.sh
```

Both use fixtures under `tests/fixtures/`, plus some created at test time
(CRLF, missing final newline, FIFO, hardlink and symlink cases), and write only
to a temp directory. CI runs the lint, both tests and an `install.sh --dry-run`
over the repo on every pull request and push to `main`
(`.github/workflows/skills.yml`).

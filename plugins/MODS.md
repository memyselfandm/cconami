# Mods

Claude Code mods: small plugins that change what a session shows. Each folder here is
one mod. The repository's `.claude-plugin/marketplace.json` lists them, so they are
installed from this repository by name.

| Mod | What it does |
|---|---|
| `owner-inbox` | Shows the Linear issues waiting on you: a band above the prompt, a panel toggled with `/inbox`, and a marked row in the chat when an agent files a new one |
| `peer-messages` | Draws a message from another session, agent or channel as a bordered card with the sender's name |
| `ci-status` | Shows the GitHub CI state of the current branch, and of the PRs this session opened, in a band above the prompt |

## Install

At the prompt of a terminal session:

```
/plugin install owner-inbox --marketplace memyselfandm/cconami
/plugin install peer-messages --marketplace memyselfandm/cconami
/plugin install ci-status --marketplace memyselfandm/cconami
```

Or from a shell:

```
claude plugin install owner-inbox --marketplace memyselfandm/cconami
claude plugin install peer-messages --marketplace memyselfandm/cconami
claude plugin install ci-status --marketplace memyselfandm/cconami
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

## ci-status

A band above the prompt with the CI state of the current branch's HEAD commit:
`CI ✓ 5/5`, `CI ● running 3/5` or `CI ✗ 2 failing · lint, test`, followed by `PR #12`
when the branch has an open PR. After it, `opened #14 ✓ 3/3, #15 ● 1/4` lists the
PRs this session opened with `gh pr create`, each with its own CI state, or `merged`
and `closed` once they are.

- **What it reads.** The check runs and commit statuses of HEAD. It finds the
  repository from the branch's upstream remote, or `origin`. It runs
  `gh pr view <branch> --json ...` and uses the PR's checks when the PR's head is
  HEAD; otherwise it reads `commits/<sha>/check-runs` and `commits/<sha>/status`
  through `gh api`. Skipped and neutral checks count as passed.
- **When it reads.** At session start; after a Bash call that runs `git push` or
  `gh pr create`; when a turn ends with HEAD or the working directory moved; and
  every 30 seconds while any check is pending, or for two minutes after a push while
  GitHub registers the new checks. While nothing is pending it does not poll, unless
  a slow poll is configured.
- **Hidden, never an error.** The band shows nothing outside a git repository, with
  no GitHub remote, when `gh` is missing, logged out or offline, when HEAD has no
  checks, and when the commit is not on GitHub. The reason goes to the debug log
  (`claude --debug`), never to the chat.

It needs `gh` on the `PATH`, authenticated for the repository. It holds no credential
of its own.

Settings, under `/config` or `pluginConfigs.ci-status.options` in `settings.json`:

| Option | Default | Meaning |
|---|---|---|
| `pollSeconds` | 30 | How often to read GitHub while a check is pending |
| `idlePollMinutes` | 0 | How often to read while nothing is pending; 0 is never |
| `maxFailingNames` | 3 | How many failing check names the band lists |

Its tests run with `claude plugin test plugins/ci-status`. They drive the parsing
with `gh` output captured from real repositories, and the band with `git` and `gh`
answered by the test.

## Working on a mod

Run a session with the mod loaded from this checkout, so a saved file reloads it:

```
claude --plugin-dir plugins/owner-inbox
```

Check it before committing:

```
claude plugin validate plugins/owner-inbox
```

`.claude-plugin/types/` inside a mod is written by Claude Code when it loads the mod.
It is generated, and is not committed.

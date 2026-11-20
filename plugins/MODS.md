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

- **What it reads.** The check runs (`filter=latest`, every page) and commit
  statuses of HEAD, through `gh api`. Of a check that was re-run, only the latest
  attempt counts. Skipped and neutral checks count as passed. It finds the
  repository from the branch's upstream remote, or `origin`, and the PR with
  `gh pr list --head <upstream branch> --state open`.
- **When it reads.** Every read runs from one five-second timer that the session
  starts; the timer reads GitHub only when a read is due:
  - at session start;
  - after a Bash call that runs `git push` or `gh pr create`;
  - when a turn ends with the branch, HEAD or the working directory moved;
  - every 30 seconds while any check is pending, and for two minutes after a push
    while GitHub registers the new checks;
  - every 3 minutes for 15 minutes after the state last changed, so a late check, a
    re-run started on GitHub or a merged PR still shows;
  - every 3 minutes while HEAD is hidden but the branch has an upstream, so a push
    from another terminal shows.

  Otherwise it does not poll, unless an idle poll is configured.
- **Hidden, never an error.** The band shows nothing outside a git repository, with
  no GitHub remote, when `gh` is missing, logged out or offline, when HEAD has no
  checks, and when the commit is not on GitHub. A failed call is never read as "no
  checks". A PR the session opened is shown only from a read that worked, and none
  are shown while `gh` fails. After three failed reads such a PR is no longer polled.
  The session keeps at most 10, dropping the oldest merged or closed first. The
  reason for anything hidden goes to the debug log (`claude --debug`), never to the
  chat.
- **Out of scope.** A PR from a fork to its parent repository. The mod looks for the
  PR in the repository of the branch's own remote, so a branch pushed to a fork
  shows its checks without the parent's PR number. Only `github.com` remotes are
  recognised.

It needs `gh` on the `PATH`, authenticated for the repository. It holds no credential
of its own.

Settings, under `/config` or `pluginConfigs.ci-status.options` in `settings.json`:

| Option | Default | Meaning |
|---|---|---|
| `pollSeconds` | 30 | How often to read GitHub while a check is pending; at least 5 |
| `idlePollMinutes` | 0 | How often to read while nothing is pending; 0 is never, otherwise at least 1 |
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

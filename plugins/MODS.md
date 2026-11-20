# Mods

Claude Code mods: small plugins that change what a session shows. Each folder here is
one mod. The repository's `.claude-plugin/marketplace.json` lists them, so they are
installed from this repository by name.

| Mod | What it does |
|---|---|
| [`owner-inbox`](owner-inbox/) | Shows the Linear issues waiting on you: a band above the prompt, a panel toggled with `/inbox`, and a marked row in the chat when an agent files a new one |
| [`peer-messages`](peer-messages/) | Draws a message from another session, agent or channel as a bordered card with the sender's name |
| [`ci-status`](ci-status/) | Shows the GitHub CI state of the current branch, and of the PRs this session opened, in a band above the prompt |
| [`mcp-health`](mcp-health/) | Shows a band above the prompt when a plugin's MCP server is not connected, naming the server and the next step |
| [`token-budget`](token-budget/) | Shows the session's token spend against a budget in a band above the prompt, with a warning at 90% and an alert at 100% |

## Install

At the prompt of a terminal session:

```
/plugin install owner-inbox --marketplace memyselfandm/cconami
/plugin install peer-messages --marketplace memyselfandm/cconami
/plugin install ci-status --marketplace memyselfandm/cconami
/plugin install mcp-health --marketplace memyselfandm/cconami
/plugin install token-budget --marketplace memyselfandm/cconami
```

Or from a shell:

```
claude plugin install owner-inbox --marketplace memyselfandm/cconami
claude plugin install peer-messages --marketplace memyselfandm/cconami
claude plugin install ci-status --marketplace memyselfandm/cconami
claude plugin install mcp-health --marketplace memyselfandm/cconami
claude plugin install token-budget --marketplace memyselfandm/cconami
```

Choose the user scope to have a mod in every session. To pick up a change after the
repository moves on, run `claude plugin update <mod>` and then `/reload-plugins`.

## owner-inbox

The inbox is the set of open Linear issues that carry the ask label (`owner-action` unless you change it),
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
an error line in the panel. The connector's name is a constant at the top of
`hooks/register.tsx`.

Setting:

| Setting | Default | What it does |
|---|---|---|
| `label` | `owner-action` | The Linear label that marks an issue as waiting on you. Set it when your project uses another label; the band, the panel and the "ACTION FOR YOU" card all follow it. A blank value counts as the default. |

A mod's settings are asked for when you install it, and a change reloads the mod.

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
  `gh pr list --head <upstream branch> --state open`, skipping forks' PRs from a
  branch of the same name.
- **When it reads.** Every read runs from one five-second timer that the session
  starts; the timer reads GitHub only when a read is due:
  - at session start;
  - after a Bash call that runs `git push` or `gh pr create`;
  - when a turn ends with the branch, HEAD or the working directory moved;
  - every 30 seconds while any check is pending, and for two minutes after a push
    while GitHub registers the new checks;
  - every 3 minutes for 15 minutes after the state last changed, so a late check, a
    re-run started on GitHub or a merged PR still shows;
  - every 3 minutes while GitHub does not have HEAD's commit yet, so a push from
    another terminal shows. A commit GitHub has, with no checks, is not polled
    past the 15 minutes.

  Otherwise it does not poll, unless an idle poll is configured. While `gh` fails
  (offline, logged out) it reads at most every 10 minutes. The 30-second poll reads
  only what is pending; PRs the session opened that have finished are read again on
  the slower reads.
- **Hidden, never an error.** The band shows nothing outside a git repository, with
  no GitHub remote, when `gh` is missing, logged out or offline, when HEAD has no
  checks, and when the commit is not on GitHub. A failed call is never read as "no
  checks". A PR the session opened is shown only from a read that worked, and none
  are shown while `gh` fails. After three failed reads such a PR is no longer polled;
  a push, a new PR or a moved HEAD tries it again.
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

## mcp-health

A plugin's MCP server can fail at startup with one line that scrolls away, and then
every tool it serves is missing. This mod shows a band above the prompt while a
watched server is not connected:

```
MCP server not connected   [Check now]
plugin:oh-my-claudecode:t: not connected
/mcp to retry. If it fails again, run the server command by hand to see the error.
```

The band is absent while every watched server is connected.

**The mod never brings a server in, changes one, or delays one.** It checks only a
server whose start it saw Claude Code request in this session, and only if no other
mod held that start back. Anything else goes unchecked: a name from `watch` that this
session did not see start is listed as "not seen this session", in dim text, and is
never asked about.

- **Which servers.** Every plugin MCP server that Claude Code starts at the beginning
  of the session, found automatically, plus any server named in `watch`. `watch` adds
  to what is found; it never replaces it. Settings servers and claude.ai connectors are
  checked only when named in `watch`, and only once this session has seen them start.
- **When.** 15 seconds after the session starts, so servers have time to connect,
  then every 60 seconds. **Check now** checks at once, for example after `/mcp`. A
  check that is still running is not started again.
- **What counts as down.** A server that failed to connect, on two checks in a row,
  so one that is still starting is not shown. A server waiting on sign-in, or a name
  that matches no server, counts only when named in `watch`; the sign-in case is
  shown as "waiting for sign-in". A server you turned off, or one a policy blocks, is
  never down.
- **No answer.** A server that does not answer within 10 seconds is listed, dimmed, as
  "not answering". That is unknown, not healthy: it neither adds to nor clears its
  failed count, and the check still finishes.
- **When the mod is blind.** If plugin servers started this session but every start
  looked held, nothing can be checked, so the band shows one dim row: "mcp-health
  could not verify any server (all starts looked held)". An empty band then never
  means "all healthy" by default.
- **How it checks.** `$.mcp.connect(server)` on each checked server. For a server
  that `/mcp` lists and no hook holds, that call reports the server's state and does
  not dial it. It would bring in a server another mod is holding, which is why held
  servers are never checked.
- **How it decides "held".** From the structure of the startup request, not from its
  answer: held when a hook beneath answered `deny`, or when the request never reached
  Claude Code's own handler (`next.trace` does not end at the engine's entry).
- **Deferred (`cached`) servers.** The types say a `cached` server "is dialed on first
  use" by `$.mcp.call`, and do not say how `$.mcp.connect` treats one. The safety rule
  covers it: the mod learns names only from the startup requests Claude Code makes for
  servers it is starting, so a server that has not started yet is never checked.

Two options, set in `/config` or in `settings.json` under
`pluginConfigs.mcp-health.options`. Both take server names as `/mcp` lists them, and
surrounding spaces are ignored:

| Option | Default | What it does |
|---|---|---|
| `watch` | empty | Servers to watch, added to the plugin servers found automatically |
| `ignore` | empty | Servers that are never checked or shown |

A server that started before the mod loaded (installed or enabled in the middle of a
session) is not seen, so it is not checked until the next session.

## token-budget

A band above the prompt with the session's token spend against a budget:

```
Budget 412k / 1.0M (41%)
```

It is dim below 90%, in the warning colour from 90%, and bold in the error colour
from 100%. The percentage is rounded down, so it never reads 90% before the warning
or 100% before the alert. With no budget set, nothing is drawn.

- **The budget.** The `budget` setting when it is more than 0, else the
  `OMC_RUN_BUDGET_TOKENS` environment variable, read with `Number` as
  oh-my-claudecode's budget guard reads it (`1000000` and `1e6` are both a
  million). Anything that is not a positive number counts as unset. The budget is
  read when the session starts and whenever the mod reloads, which a change to the
  setting does.
- **Which tokens count.** All four counts the API reports for a request:
  `input_tokens` (uncached input), `output_tokens`, `cache_read_input_tokens` and
  `cache_creation_input_tokens`, added together. These are the same four that OMC's
  guard sums.
- **Where they come from.** The `usage` on each `turn.complete` event. The engine
  raises `turn.complete` for every model turn, the main conversation's and each
  subagent's (`agentId` set), and its `usage` is "its real requests' token counts
  ... summed" for that turn alone, so adding each turn's counts every request once.
  A turn with no `usage` (an interrupt, an API error) adds nothing.
- **When it starts over.** On `/clear`. The count lives in the session's `$.state`,
  so a reload of the mod keeps it. A new process, including `claude --resume`,
  starts again from 0: the mod counts what it saw, not the transcript.

What it does not count, because no `turn.complete` carries it:

- a compaction's summarising request, and other requests outside a turn;
- another mod's `$.model` calls;
- anything spent before the mod loaded in this process.

**Why not `$.session.usage()`.** It has no cumulative token count. Its `context`
is the last response's input side against the context window, which falls after a
compaction, and its `cost` is an estimate in dollars. Neither is a session token
total.

**How it differs from OMC's guard.** OMC's `budget-guard.mjs` sums the same four
counts over the assistant messages in the last 2 MB of the main transcript, at each
Stop. So it leaves out subagents (their transcripts are separate files) and can
undercount a long session, but does count compactions in that tail and a resumed
session's earlier turns. This mod counts subagents and the whole session it saw.
Expect it to read higher than OMC's log on a run that uses subagents.

One setting, under `/config` or `pluginConfigs.token-budget.options`:

| Setting | Default | What it does |
|---|---|---|
| `budget` | 0 | The session's budget in tokens; 0 uses `OMC_RUN_BUDGET_TOKENS` |

Its tests run with `claude plugin test plugins/token-budget`. They drive the
arithmetic, the thresholds and the band through raised `turn.complete` and
`session.end` events, and include a mutation check: altered copies of the logic
(cache tokens dropped, the variable winning over the setting, thresholds moved)
must each fail.

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

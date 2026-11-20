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
| [`guardrail-notice`](guardrail-notice/) | Shows a card in the chat and an entry above the prompt when a hook refuses a tool call, with the hook's message and the safe form it names |
| [`omc-watchdog`](omc-watchdog/) | Shows a band above the prompt when an oh-my-claudecode run in this session is dead (active but stale) or looping, with its mode and phase |

## Install

At the prompt of a terminal session:

```
/plugin install owner-inbox --marketplace memyselfandm/cconami
/plugin install peer-messages --marketplace memyselfandm/cconami
/plugin install ci-status --marketplace memyselfandm/cconami
/plugin install mcp-health --marketplace memyselfandm/cconami
/plugin install token-budget --marketplace memyselfandm/cconami
/plugin install guardrail-notice --marketplace memyselfandm/cconami
/plugin install omc-watchdog --marketplace memyselfandm/cconami
```

Or from a shell:

```
claude plugin install owner-inbox --marketplace memyselfandm/cconami
claude plugin install peer-messages --marketplace memyselfandm/cconami
claude plugin install ci-status --marketplace memyselfandm/cconami
claude plugin install mcp-health --marketplace memyselfandm/cconami
claude plugin install token-budget --marketplace memyselfandm/cconami
claude plugin install guardrail-notice --marketplace memyselfandm/cconami
claude plugin install omc-watchdog --marketplace memyselfandm/cconami
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
from 100%. The percentage and the counts are rounded down, so the band never reads
90% before the warning, 100% before the alert, or `1.0M` before a million. Counts
over a billion show as `1.2B`. With no budget set, or while a survey is showing,
nothing is drawn.

The band is display only. It blocks nothing and tells the model nothing. OMC acts
on `OMC_RUN_BUDGET_TOKENS` only while ralph, autopilot, team or ultragoal is
running, and only under `OMC_BUDGET_ENFORCE=active`.

- **The budget.** The `budget` setting when it is set, else the
  `OMC_RUN_BUDGET_TOKENS` environment variable, read with `Number` as
  oh-my-claudecode's budget guard reads it (`1000000` and `1e6` are both a
  million). A budget must be at least 1. It is worked out each time the band is
  drawn, so a changed setting is never stale. A value that is set but cannot be
  read (`lots`, `-5`, `0.5`) is ignored, and a toast names it once per load.
- **Which tokens count.** All four counts the API reports for a request:
  `input_tokens` (uncached input), `output_tokens`, `cache_read_input_tokens` and
  `cache_creation_input_tokens`, added together. These are the same four that OMC's
  guard sums.
- **Turns.** The `usage` on each `turn.complete` event. The engine raises
  `turn.complete` for every model turn, the main conversation's and each
  subagent's (`agentId` set), and its `usage` is "its real requests' token counts
  ... summed" for that turn alone, so adding each turn counts every request once. A
  turn with no `usage` (an interrupt, an API error) adds nothing. Agents another
  mod spawns, and forked skills, run turns of their own, so they count too.
- **Compactions.** The `usage` on each `session.compact` result: the summarising
  request's own counts, when the engine made one. It adds tokens, not a turn. A
  skipped compaction, or one that reused a summary already computed, adds nothing.
  The types do not say whether a compaction that runs in the middle of a turn is
  also folded into that turn's `turn.complete` usage. If the engine does fold it
  in, that compaction is counted twice.

  **Owner check.** Run a session with `claude --debug` and the mod loaded, and
  let one auto-compaction happen inside a turn. In the debug log, compare that
  turn's `turn.complete` usage with the compaction's `session.compact` usage. If
  the turn's counts include the compaction's, the mod counts it twice, and the
  compaction hook should skip compactions that happen inside a turn.
- **When it starts over.** On `/clear`, and on a `/resume` inside the running
  process: each ends one conversation (`session.end` with `reason` `clear` or
  `resume`) and begins another, so the count begins again at 0. Other endings
  (`prompt_input_exit`, `other`, `logout`) leave it alone. A reload of the mod keeps
  the count, because it lives in the session's `$.state`. A new process, including
  `claude --resume`, starts again from 0: the mod counts what it saw, not the
  transcript.

What it does not count:

- plain `$.model.complete`, `$.model.fork` and `$.model.classify` calls that other
  mods make. No event carries them in full, and hooking them partially risks
  counting a request twice;
- other requests outside a turn or a compaction;
- anything spent before the mod loaded in this process.

A background subagent that finishes after a `/clear` or a `/resume` adds its last
turn to the new count, because the count follows the session and not the agent.

**Why not `$.session.usage()`.** It has no cumulative token count. Its `context`
is the last response's input side against the context window, which falls after a
compaction, and its `cost` is an estimate in dollars. Neither is a session token
total.

**How it differs from OMC's guard.** OMC's `budget-guard.mjs` sums the same four
counts over the assistant messages in the last 2 MB of the main transcript, at each
Stop. So it leaves out subagents (their transcripts are separate files) and can
undercount a long session, but it does count a resumed session's earlier turns.
This mod counts subagents and compactions across the whole session it saw. Expect
it to read higher than OMC's log on a run that uses subagents.

One setting, under `/config` or `pluginConfigs.token-budget.options`:

| Setting | Default | What it does |
|---|---|---|
| `budget` | 0 | The session's budget in tokens, at least 1; 0 uses `OMC_RUN_BUDGET_TOKENS` |

Its tests run with `claude plugin test plugins/token-budget`. They drive the
arithmetic, the thresholds and the band through raised `turn.complete`,
`session.compact`, `session.start` and `session.end` events against the test kit's
own state. They include a mutation check: altered copies of the logic (cache
tokens dropped, the variable winning over the setting, thresholds moved, rounding
up) must each fail.

## guardrail-notice

A hook that refuses a tool call, such as OMC's git guardrail or the
`operating-model` command guard, shows its refusal only in the tool result, where
it scrolls away. Work then waits on you and nobody notices. This mod makes the
refusal visible:

- **Above the prompt.** One line per refusal still waiting, newest first:
  `Blocked: git push (OMC guardrail). Needs you.`, each with a **Dismiss** button.
  Up to three are listed; the rest are counted.
- **In the chat.** A bordered card around the refused call's row (mobile apps draw it
  as a card under the row), with the same line, the hook's message (cut at 400
  characters) and the safe form, when the message names one after `Safe form:`.
  Once the refusal is cleared or dismissed the card stays, marked "Cleared".
- **Toast.** The same line as a toast, unless `toast` is off, and only when no
  refusal of that kind is already waiting.

**It only observes.** It never blocks, changes or delays a tool call. Both of its
call hooks await the rest of the chain and return the very object it resolved to,
so an allow, an ask, an `updatedInput` or an `additionalContext` from the hooks
beneath passes through untouched. All of its own work (naming the refusal,
matching patterns, writing state, clearing) runs on a zero-delay timer after the
hook has returned. If a hook fails, its `.catch` replays the chain's result.

- **How it sees a refusal.** At the `classic.PreToolUse` event. The engine runs that
  chain as [managed settings hooks, hooks modules, the other settings hooks], and a
  plugin's `hooks.json` command hook counts as a settings hook. So the result the
  mod's hook gets back from the chain beneath it is the decision of the settings
  and plugin hooks, and a refusal arrives there as a `deny` with the hook's message.
  The mod reads that field; it does not guess from tool output text. That a command
  hook's exit 2 arrives as that `deny` is read from the engine's types; see the
  owner check below.
- **What it calls the call.** The operation the refusal names, when it names one:
  OMC's `Git guardrail: blocked "<operation>"`, or a command guard rule that opens
  with the command in backticks (`` `gh pr merge --auto` is refused``). So
  `git add -A && git commit -m x && git push` refused by OMC shows `git push`.
  Otherwise a Bash command with one kind shows that kind (its program, plus the
  operation for tools such as `git` and `gh`), and a chain shows the command itself,
  cut at 60 characters. Kinds are read the way a shell splits commands: separators
  inside quotes do not split, the command of `bash -c` / `sh -c` is read inside,
  and the values of `-C`, `-c`, `-R` and `--repo` are skipped. Any other tool shows
  its name.
- **Which hook it names.** The patterns only name the hook; every hook refusal is
  shown either way. Built in: `OMC guardrail` (a message containing
  `Git guardrail: blocked`) and `command guard` (the `operating-model` guard's
  suffix "Do not retry through another tool or wrap the command in a script", or
  its size and time refusals). Anything else is `hook`. Patterns see the first 2000
  characters of the message.
- **When it clears.** Only when exactly the refused call later succeeds: the same
  Bash command (spacing aside), or the same tool with the same input. A harmless
  sibling never clears a refusal: `git branch` does not clear `git branch -D x`,
  `git push origin feature` does not clear `git push --force origin main`, and a
  `Write` to another path does not clear a refused `Write`. Otherwise press Dismiss.
- **A refusal can be missed.** The work on a refusal runs on a zero-delay
  `clock.after` timer. If another mod's `clock.after` hook refuses that timer, or a
  reload of the mod drops it before it fires, that refusal is not shown. The call
  itself is unaffected.
- **What it cannot see.** A refusal by a managed-settings hook ends the chain above
  every mod. A refusal by another mod's `classic.PreToolUse` hook that runs before
  this one is not seen either. A refusal at the permission prompt, by a permission
  rule, or by another mod's `tool.call` hook is not a PreToolUse refusal and is not
  shown.

Settings, under `/config` or `pluginConfigs.guardrail-notice.options` in
`settings.json`:

| Option | Default | Meaning |
|---|---|---|
| `patterns` | empty | Extra patterns that name the hook: `Label=text`, or bare text (named `hook`). The text is a plain case-insensitive substring (`a.b` matches only `a.b`). Start it with `re:` for a regular expression (`Policy=re:^Blocked \w+ policy`). Everything before the first `=` is the label, so text containing `=` needs a label. Checked before the built-in ones. An invalid `re:` expression, or one with a nested quantifier such as `(a+)+`, is skipped and reported once in the transcript. That check is partial: `(a|aa)+`, `((a+))+` and `(.*a){20}` are accepted, and a pathological `re:` pattern of your own can run for a long time on a long message and stall the next tool call's hooks until it ends. Use `re:` sparingly |
| `toast` | on | Raise a toast for a refusal of a kind not already waiting |

Its tests run with `claude plugin test plugins/guardrail-notice`. In them, a hook of
the test's own stands for the settings hooks and refuses with the real messages of
OMC's guardrail and the `operating-model` guard.
`bash plugins/guardrail-notice/tests/mutation-check.sh` breaks one behaviour at a
time and fails if the tests miss any; CI runs it.

Changes:

- **0.2.0.** The `patterns` setting changed meaning: an entry is now a plain
  case-insensitive substring, and a regular expression needs the `re:` prefix
  (`Label=re:...`). An existing entry that relied on regular-expression syntax must
  gain `re:`; a plain entry containing `^ $ \ ( [ | * +` is reported once in the
  transcript at session start with that suggestion. The card entry kept for each
  refused call is capped at the newest 50 (older cards stop showing, except those of
  refusals still waiting), and a refusal recorded while an identical call
  succeeds no longer leaves a stale entry above the prompt.

### Owner check before relying on it

The tests cannot run a real command hook, and an agent cannot run a live session
without writing to your home directory, so one step is unverified: that a command
hook's exit 2 reaches the mod as `deny` on `classic.PreToolUse`. Check it once,
by hand:

1. Make a scratch repository with a commit and a remote it cannot push to:
   `d=$(mktemp -d) && git -C "$d" init -q && git -C "$d" commit -q --allow-empty -m init && git -C "$d" remote add origin https://example.invalid/x.git && cd "$d"`.
2. Start a session there with the mod loaded and the OMC guardrail forced on:
   `OMC_GIT_GUARDRAILS=1 claude --plugin-dir <cconami checkout>/plugins/guardrail-notice`.
3. Start an autopilot run (`/oh-my-claudecode:autopilot push this branch`) or simply
   ask: "run `git push origin HEAD`".
4. Expected: the Bash call is refused, and above the prompt a line reads
   `Blocked: git push (OMC guardrail). Needs you.` with a Dismiss button; under the
   call a bordered card shows `Git guardrail: blocked "git push".` and a toast says
   the same line. If the call is refused and none of these appear, the exit 2 is not
   reaching the mod as `deny`: do not rely on the mod, and report it.
5. Ask for `git status`: nothing new appears. Press Dismiss: the line goes, and the
   card shows "Cleared".

## omc-watchdog

A band above the prompt, shown only when an oh-my-claudecode (OMC) run in this
session is dead or looping:

```
autopilot active but stale for 3h; cancel or resume (phase: execution)
ralph looping: reinforcement 7, iteration 9/10
```

One line per mode in trouble, in the warning colour. With no OMC state, with
every mode healthy or ended, or while a survey is showing, nothing is drawn. OMC's
HUD shows the active mode, but not whether the run behind it is still alive.

- **Which modes.** ralph, autopilot, team and ultragoal: the modes whose stop hook
  keeps a run going.
- **Stale.** The mode is `active: true`, and its latest activity time is more than
  2 hours old (`staleHours`). The activity time is the latest of
  `last_checked_at`, `updated_at` and `started_at`, which is OMC's own
  `isStaleState` rule in `scripts/persistent-mode.mjs`, and also of
  `_meta.updatedAt`, which OMC's `state_write` tool stamps on files (such as
  team's) that carry none of the others. Exactly the threshold is not yet stale,
  as in OMC. An active state with no readable time at all is shown as stale "with
  no activity time recorded". A stale run is reported as stale even when its
  counters are high: a dead run is not looping.
- **Looping.** The mode is active and fresh, and its `reinforcement_count` has
  reached 5 (`reinforcementLimit`), or its `iteration` has reached
  `max_iterations`. Counts stored as strings, as `state_write` stores some, are
  read as numbers.
- **The phase.** `current_phase ?? phase ?? stage`, the order OMC reads it in.
  Left out of the line when none is set.
- **Read only.** The mod reads the state files with `$.fs.read`, and runs `git`
  only to locate them (`rev-parse` and `remote get-url`). It never writes or
  deletes OMC state and never calls OMC's tools. The tests fail if a write or any
  other command happens.
- **When it reads.** At session start, every 60 seconds, after a `/clear` or a
  `/resume` (the session id changes), and at once after a tool call that may
  have changed OMC's state: one of OMC's `state_*` or cancel tools, a call that
  names an OMC mode skill (`oh-my-claudecode:cancel`, `:ralph`, `:autopilot`,
  `:team`, `:ultragoal`), or any call whose input mentions `.omc/state`. That hook
  only observes: it returns the call's result unchanged and reads on a zero-delay
  timer.

### The session id

The mod reads only this session's state. OMC keys session-scoped state by the
Claude Code session id ("When a session ID is present, state is stored in
session scope under `.omc/state/sessions/{sessionId}/`", OMC `docs/HOOKS.md`, Mode
State Management), which its hooks get as `session_id`. A mod gets the same id
from `$.session.id()`, which the engine types document as "the session's id (the
transcript file's name)"; `session.end` names it as "`$.session.id()` until
now". A session id that OMC would refuse in a path (anything but letters, digits,
`-` and `_`) is not used.

For each mode it reads `<root>/state/sessions/<id>/<mode>-state.json`. A file
there that names another session in `session_id` is ignored. If none is usable, it
reads the legacy `<root>/state/<mode>-state.json`, but only when that file's
`session_id` is this session's, as OMC's `readStateFileWithSession` does.

### The state root

Found as OMC 5.8.6's `getOmcRoot()` finds it (`src/lib/worktree-paths.ts`), from
the session's working directory:

1. **`OMC_STATE_DIR`** set: `$OMC_STATE_DIR/<project id>`, or
   `$OMC_STATE_DIR/non-git` with neither a repository nor a workspace marker. The
   project id is `getProjectIdentifier()`'s: with a `.omc-workspace` marker,
   `<id>-<hash of id>` when the marker names an `id`, else
   `<directory name>-<hash of its path>`; otherwise
   `<name of the primary checkout>-<hash of the origin URL, or of that checkout's path>`.
   The hash is the first 16 hex digits of SHA-256. A linked worktree resolves to
   its primary checkout (`git rev-parse --git-common-dir`), so all its worktrees
   share one id.
2. A **`.omc-workspace`** marker in the working directory or a parent, nearest
   first, stopping before the home directory: `<marker directory>/.omc`.
   `OMC_DISABLE_MULTIREPO=1` turns the marker off, as in OMC.
3. The **git top level**'s `.omc`, climbed to the outermost superproject when
   inside a submodule.
4. **Outside a repository**, `$HOME/.omc`. OMC 5.8.6 no longer uses a `.omc` in
   the working directory there ("all cwd variants use the canonical `$HOME/.omc/`
   root", OMC `docs/REFERENCE.md`). Since the mod reads only this session's
   files, that shared root shows nothing from other sessions.

The root is worked out once per working directory and kept until the directory
changes or the session restarts.

### What it does not do

- It does not apply OMC's check that refuses a workspace marker in a sensitive
  location (`~/.ssh`, `~/.config` and similar). A marker there is unlikely, and
  the files read would still be keyed by this session's id.
- It does not scan other session directories for a file whose `session_id`
  names this session, which OMC's reader also tries. OMC writes session state
  under the session's own directory, so that fallback covers only files moved by
  hand.
- It does not watch other modes (ultrapilot, pipeline, swarm, omc-teams), which
  OMC 5.0 retired.

Settings, under `/config` or `pluginConfigs.omc-watchdog.options` in
`settings.json`:

| Setting | Default | What it does |
|---|---|---|
| `staleHours` | 2 | Hours without activity after which an active mode is stale; 0 or less uses 2 |
| `reinforcementLimit` | 5 | The `reinforcement_count` at which an active mode is looping; 0 or less uses 5 |

Its tests run with `claude plugin test plugins/omc-watchdog`. Their state files
are copies of real ones OMC 5.8.6 wrote (autopilot and ralph by its hooks, team by
its `state_write` tool), with prompts, paths and ids replaced. Hooks of the test's
own stand for the session's id and directory, the environment, the files and
`git`, and the project ids are checked against `shasum -a 256`.
`bash plugins/omc-watchdog/tests/mutation-check.sh` breaks one behaviour at a time
and fails if the tests miss any; CI runs it.

### Owner check before relying on it

The tests cannot run a live session, so three things are unverified: that
`$.session.id()` in a live session equals the id OMC's hooks write under, that
`$.fs.read` reads the state root without a prompt (it can lie outside the
project, under `$HOME/.omc` or `OMC_STATE_DIR`), and that the band draws. Check
once, by hand, in a scratch repository:

1. `d=$(mktemp -d) && git -C "$d" init -q && cd "$d"`, then
   `claude --plugin-dir <cconami checkout>/plugins/omc-watchdog`.
2. Start a run: `/oh-my-claudecode:ralph count to three slowly`. Once it has
   started, stop it with Esc. Expect no band: the run is fresh.
3. In another terminal, find the state file:
   `ls "$d"/.omc/state/sessions/*/ralph-state.json`. The directory name should be
   the session id shown by `/status`. If it is not, the mod reads the wrong
   directory: report it.
4. Make it look looping, keeping a backup: in that terminal, run
   `f=$(ls "$d"/.omc/state/sessions/*/ralph-state.json) && cp "$f" "$f.bak"`, then
   `python3 -c 'import json,sys,datetime as d; p=sys.argv[1]; s=json.load(open(p)); s.pop("_meta",None); s.update(active=True, reinforcement_count=7, iteration=9, max_iterations=10, last_checked_at=d.datetime.now(d.timezone.utc).isoformat()); json.dump(s,open(p,"w"))' "$f"`.
   Within a minute the band reads `ralph looping: reinforcement 7, iteration 9/10`.
5. Make it look dead:
   `python3 -c 'import json,sys,datetime as d; p=sys.argv[1]; s=json.load(open(p)); t=(d.datetime.now(d.timezone.utc)-d.timedelta(hours=3)).isoformat(); s.update(last_checked_at=t, started_at=t, updated_at=t); json.dump(s,open(p,"w"))' "$f"`.
   Within a minute the band reads `ralph active but stale for 3h; cancel or resume`.
6. Run `/oh-my-claudecode:cancel`, or `mv "$f.bak" "$f"`. The band goes at the
   next read.

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

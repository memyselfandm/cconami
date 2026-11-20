# Command guard

`guard-bash-command.py` is a `PreToolUse` hook on the Bash tool. Installing the
`operating-model` plugin turns it on: `hooks.json` registers it for every
session and subagent. Hooks load when a session starts, so a session that was
already running does not have it.

Prose rules have not stopped these commands, and subagents and peer sessions do
not read an agent's memory, so the rules are enforced here instead.

**On a refusal, use the safe form or report the refusal.** Do not retry through
another tool, and do not wrap the command in a script.

**Requirement:** `python3` (3.8 or later) on `PATH`. The hook uses only the
standard library. Without `python3` Claude Code reports a hook error and the
command runs unguarded.

## Generic rules

`guard-rules.json` ships only rules that hold in any repository. The script
embeds an identical copy (`EMBEDDED_RULES`), used if the file is missing or
invalid; the tests fail if the two differ.

| Rule id | Refuses | Why | Safe form |
|---|---|---|---|
| `gh-pr-merge-auto` | `gh pr merge --auto`, and enabling auto-merge through `gh api` (`enablePullRequestAutoMerge`) | Where the default branch has no required status checks, `--auto` merges at once, before CI finishes | `gh pr checks <pr> --watch`, then `gh pr merge <pr> --squash` |
| `token-lookup` (locked) | `bao`/`vault token lookup`; `print token`; `read auth/token/lookup-self`; `write` to `auth/token/lookup`, `lookup-self` or `lookup-accessor` (including `write -f`) | They print the token itself | `bao read -field=<name> auth/token/lookup-self`, for a field other than `id`, with the flag **before** the path |

bao and vault use Go's flag parser, which stops at the first positional
argument: in `bao read auth/token/lookup-self -field=ttl` the `-field` is
ignored and the whole token is printed. So only a `-field` placed before the
path counts. Write a flag that takes a value as `-flag=value` before the path;
`-format json` (a value as a separate word) ends the options early, and the
guard then refuses, which is the safe direction.

A repository that does require status checks can turn off `gh-pr-merge-auto`
(see below). `token-lookup` is locked and cannot be turned off.

## Adding a project's own rules

A project adds rules, or turns off a generic one, in
`<project>/.claude/guard-rules.json`. The hook reads it on every call from
`$CLAUDE_PROJECT_DIR`, or from the hook input's `cwd` when that is unset. Its
rules are added to the generic ones; they never replace them.

```json
{
  "version": 1,
  "disable": ["gh-pr-merge-auto"],
  "rules": [
    {
      "id": "coder-templates-push",
      "message": "`coder templates push` is refused: run directly it skips the vendor step. Safe form: `deployments/coder/templates/push.sh [template ...]`.",
      "when": [
        { "command": ["coder"], "words": ["templates", "push"] },
        { "command": ["coder"], "words": ["template", "push"] }
      ],
      "raw": ["\\bcoder\\b[^;&|\\n]*\\btemplates?\\s+push\\b"]
    }
  ]
}
```

That rule is the one the homelab repository adds; the full example is
`tests/example-project-rules.json`.

Turning a rule off has three limits:

- A `locked` rule cannot be turned off. A `disable` entry for it is ignored, with
  a warning on every call until it is removed.
- `disable` is honoured only when the project directory came from
  `$CLAUDE_PROJECT_DIR`. A file found through the `cwd` fallback follows
  whatever directory the session moved to, so it may add rules but not remove
  them.
- Whenever the guard refuses a command while a rule is turned off, it says so:
  `guard-bash-command: note: this project turns off the 'gh-pr-merge-auto' rule.`

### Format

The file is one JSON object:

| Key | Required | Meaning |
|---|---|---|
| `version` | yes | The integer `1`. |
| `rules` | no | A list of rules, below. |
| `disable` | no | Generic rule ids to turn off. Only read from a project file. |
| `$comment` | no | Ignored. |

A rule:

| Key | Required | Meaning |
|---|---|---|
| `id` | yes | Lowercase letters, digits and hyphens. |
| `message` | yes | The refusal. Say why, and name the safe form. |
| `when` | yes | A list of match entries. The rule fires if **any** entry matches. |
| `raw` | no | Python regular expressions, used only when the shell parser fails. Write one per `when` entry so that a parser failure does not open the guard. |
| `locked` | no | `true`: a project cannot turn this rule off. |
| `$comment` | no | Ignored. |

A match entry matches a simple command when **all** of its keys hold:

| Key | Holds when |
|---|---|
| `command` (required) | The command word's basename is one of these (`/usr/bin/gh` counts as `gh`). Any word can be the command word, so `sudo gh …` and `timeout 60 gh …` match too. |
| `words` | These words appear next to each other, in order, after the command word (`["pr", "merge"]`). |
| `flag` | One of these appears after `words` (or after the command word), alone or as `--flag=value`. |
| `arg_contains` | Some argument contains one of these strings. |
| `arg_endswith` | Some argument, trailing `/` removed, ends with one of these. |
| `unless_option` | `{"name": "field", "except": ["id"], "before_positional": true}`: the entry does **not** match when `-field`/`--field` is given after `words` (as `=value` or a separate word) and none of its values is in `except`. With `before_positional`, an option after the first positional word does not count. |

Add refused and allowed cases for every new rule, covering each `when` entry
and each condition. In this plugin that means `test-guard-bash-command.sh`,
whose mutation check removes each piece in turn; in a project, a test of its
own that runs this hook with `CLAUDE_PROJECT_DIR` set to the project.

## What it sees and what it does not

It reads the command line as a shell would, tracking quotes, comments,
here-documents, here-strings and substitutions, and looks at each simple
command, so chained (`&&`, `;`), piped, prefixed (`sudo`, `timeout`,
`ssh host`, `pct exec`) and quoted (`bash -c '...'`, `bash -ce '...'`,
`$(...)`, `bash <<< '...'`, `eval '...' --flag`) forms are refused too.

A banned command that is only text is allowed, so the rules can be written about:
quoted as an argument (`git commit -m`, `grep`, `gh pr comment --body`,
`python3 -c "print(...)"`), across several lines, or inside a here-document or
here-string that is text (a commit message, a file written with `cat` or `tee`).
Two things are still checked because the shell runs them: a `$(...)` or backtick
substitution anywhere, and a here-document, here-string or quoted argument given
to something that executes it (`bash -c`, `ssh host`, `kubectl exec`,
`find -exec`).

It does not see a command that reaches a shell as data: `echo '...' | sh`, a
script written to a file and then executed, an interpreter calling out
(`python3 -c "os.system(...)"`), or the same request made with `curl`. The rule
above covers that case, and the test suite pins the gap so that closing it is a
deliberate change.

## Size limit

A command over 64 KiB or 5,000 words is refused outright, with a message that
says why. Checking a very long command could outlast the hook's 10-second
timeout, and a timed-out hook lets the command through, so a timeout must never
be the way past the guard. Below the limit, the lookups each rule needs are
computed once per simple command, so checking stays linear in its length (a
20,000-word command is refused in well under a second).

## When the guard cannot run a rule

- **Generic rules file missing or invalid:** the embedded copy is used, with a
  warning. The generic rules are never dropped.
- **Project rules file unreadable, not JSON, or without `"version": 1`; a single
  invalid project rule; an unknown or locked id in `disable`:** that item is
  skipped and everything else applies. If nothing is refused the guard exits 1,
  which Claude Code shows to the user without blocking the command, for example
  `guard-bash-command: …/.claude/guard-rules.json: cannot be read as JSON (…),
  so its rules are not enforced`. A refusal still exits 2, with the problem
  appended. This fail-open matches the guard it was ported from, which let a
  malformed hook input through.
- **An unexpected error in the hook:** exit 1 with `internal error (…); the
  command was allowed`.
- **Hook input that is not a Bash call with a string command:** exit 0, silently.
- **The shell parser fails on a command:** the guard does not open. It judges the
  raw text with each rule's `raw` patterns instead.

## Tests

```sh
bash plugins/operating-model/hooks/test-guard-bash-command.sh
```

It runs every case against the generic rules (with an empty project directory,
so a rules file in the repository cannot change the result), the example
project rule, the failure modes, the raw fallbacks, the embedded copy and the
size limit. Then a mutation check removes each `when` entry, each condition in
an entry and each raw pattern of every rule, one at a time, and requires the
cases to fail. CI runs it (`.github/workflows/skills.yml`).

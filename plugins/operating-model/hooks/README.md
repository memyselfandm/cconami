# Command guard

`guard-bash-command.py` is a `PreToolUse` hook on the Bash tool. Installing the
`operating-model` plugin turns it on: `hooks.json` registers it for every
session and subagent. Hooks load when a session starts, so a session that was
already running does not have it.

Prose rules have not stopped these commands, and subagents and peer sessions do
not read an agent's memory, so the rules are enforced here instead.

**On a refusal, use the safe form or report the refusal.** Do not retry through
another tool, and do not wrap the command in a script.

## Generic rules

`guard-rules.json` ships only rules that hold in any repository:

| Rule id | Refuses | Why | Safe form |
|---|---|---|---|
| `gh-pr-merge-auto` | `gh pr merge --auto`, and enabling auto-merge through `gh api` (`enablePullRequestAutoMerge`) | Where the default branch has no required status checks, `--auto` merges at once, before CI finishes | `gh pr checks <pr> --watch`, then `gh pr merge <pr> --squash` |
| `token-lookup` | `bao token lookup` and `vault token lookup`, and `bao`/`vault read auth/token/lookup-self` without `-field=` or with `-field=id` | They print the token itself | `bao read -field=<name> auth/token/lookup-self`, for a field other than `id` |

A repository that does require status checks can turn off `gh-pr-merge-auto`
(see below).

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

### Format

The file is one JSON object:

| Key | Required | Meaning |
|---|---|---|
| `version` | yes | Always `1`. |
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
| `$comment` | no | Ignored. |

A match entry matches a simple command when **all** of its keys hold:

| Key | Holds when |
|---|---|
| `command` (required) | The command word's basename is one of these (`/usr/bin/gh` counts as `gh`). Any word can be the command word, so `sudo gh …` and `timeout 60 gh …` match too. |
| `words` | These words appear next to each other, in order, after the command word (`["pr", "merge"]`). |
| `flag` | One of these appears after `words` (or after the command word), alone or as `--flag=value`. |
| `arg_contains` | Some argument contains one of these strings. |
| `arg_endswith` | Some argument, trailing `/` removed, ends with one of these. |
| `unless_option` | `{"name": "field", "except": ["id"]}`: the entry does **not** match when `-field`/`--field` is given (as `=value` or a separate word) and none of its values is in `except`. |

Add refused and allowed cases for every new rule. In this plugin that means
`test-guard-bash-command.sh`; in a project, a test of its own that runs this
hook with `CLAUDE_PROJECT_DIR` set to the project.

## What it sees and what it does not

It reads the command line as a shell would, tracking quotes, comments,
here-documents and substitutions, and looks at each simple command, so chained
(`&&`, `;`), piped, prefixed (`sudo`, `timeout`, `ssh host`, `pct exec`) and quoted
(`bash -c '...'`, `$(...)`) forms are refused too.

A banned command that is only text is allowed, so the rules can be written about:
quoted as an argument (`git commit -m`, `grep`, `gh pr comment --body`,
`python3 -c "print(...)"`), across several lines, or inside a here-document that
is text (a commit message, a file written with `cat`). Two things are still
checked because the shell runs them: a `$(...)` or backtick substitution anywhere,
and a here-document or quoted argument given to something that executes it
(`bash -c`, `ssh host`, `kubectl exec`, `find -exec`).

It does not see a command that reaches a shell as data: `echo '...' | sh`, a
script written to a file and then executed, an interpreter calling out
(`python3 -c "os.system(...)"`), or the same request made with `curl`. The rule
above covers that case, and the test suite pins the gap so that closing it is a
deliberate change.

## When the guard cannot run a rule

The guard **fails open**, and says so. This matches the guard it was ported
from, which let a malformed hook input through.

- A rules file that is missing, unreadable, not JSON or without `"version": 1`
  is skipped. So is any single invalid rule, and an unknown id in `disable`.
  The guard keeps every rule it could load. If nothing is refused, it exits 1:
  Claude Code lets the command run and shows the user the problem, for example
  `guard-bash-command: …/guard-rules.json: cannot be read as JSON (…), so its
  rules are not enforced`. A refusal still exits 2, with the problem appended.
- An unexpected error in the hook exits 1 with `internal error (…); the command
  was allowed`.
- Hook input that is not a Bash call with a string command exits 0 silently.
- One exception does **not** fail open, as in the original: if the shell parser
  fails on a command, the guard judges the raw text with each rule's `raw`
  patterns instead of allowing it.

## Tests

```sh
bash plugins/operating-model/hooks/test-guard-bash-command.sh
```

It runs every case against the generic rules (with an empty project directory,
so a rules file in the repository cannot change the result), the example
project rule, the failure modes and the raw fallbacks. Then a mutation check
turns each rule off in turn and requires its cases to fail. CI runs it
(`.github/workflows/skills.yml`).

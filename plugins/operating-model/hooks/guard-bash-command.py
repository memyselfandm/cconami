#!/usr/bin/env python3
"""PreToolUse hook for the Bash tool: refuse the commands a rule table bans.

Claude Code runs this before every Bash tool call, in the main session and in
subagents alike, and passes the call as JSON on stdin. Exit status 2 refuses
the call and returns stderr to the agent; exit status 0 lets it through.

The rules are data, not code. They come from two files, read on every call:

- `guard-rules.json` beside this script: the generic rules the plugin ships.
  An identical copy is embedded below (EMBEDDED_RULES) and used if that file
  is missing or invalid.
- `<project>/.claude/guard-rules.json`, if it exists: the project's own rules,
  added to the generic ones, plus an optional `disable` list of generic rule
  ids the project turns off. The project directory is `$CLAUDE_PROJECT_DIR`,
  or the `cwd` field of the hook input when that is unset; a file found
  through `cwd` may add rules but its `disable` list is ignored. A rule
  marked `locked` (the token rule) cannot be turned off.

The file format is documented in README.md beside this script. Each rule names
the safe form, because a refusal that does not say what to do instead invites
a workaround.

The guard reads the command line the way a shell would: it tracks quoting,
comments, here-documents and substitutions, so that text which merely mentions
a banned command (a commit message, a search pattern) is allowed while a
command the shell would run is refused, however it is wrapped.

Failure behaviour:

- A broken generic rules file does not drop the generic rules: the embedded
  copy is used, with a warning.
- A project rules file that is unreadable or malformed, or a single invalid
  project rule, FAILS OPEN: the guard skips what it cannot use, keeps every
  rule it could load, and says what it skipped on stderr (exit 1, which
  Claude Code shows to the user without blocking the call). A refusal still
  exits 2.
- A command longer than MAX_COMMAND_BYTES or MAX_COMMAND_WORDS is refused
  outright, and checking that takes longer than TIME_BUDGET seconds ends in a
  refusal, so that a hook timeout (which lets a command through) is never a
  way past the guard. The raw patterns are written to run in linear time.
- A hook input that is not a Bash tool call with a string command passes
  silently (exit 0), as in the original guard.
- If the shell parser itself fails on a command, the guard does not open: it
  judges the raw text with each rule's `raw` patterns instead.

Known gap, by design: a banned command that reaches a shell as data is not
seen (`echo '<command>' | sh`, a script file written first and executed
second, an interpreter calling out, a variable holding the command, the same
request made with curl). That includes the few text tools that can run a
command of their own: a git alias or `git rebase --exec`, sed's `e`, awk's
`system()`. The written rule covers that case: on a refusal, use
the safe form or report it; do not wrap the command.
"""
import bisect
import json
import os
import re
import signal
import sys
import time
from pathlib import Path

# Commands whose arguments are text, not something a shell will execute.
TEXT_TOOLS = {
    "git", "grep", "egrep", "fgrep", "rg", "ag", "echo", "printf", "cat",
    "sed", "awk", "jq", "yq", "head", "tail", "less", "wc", "tee", "ls",
    "diff", "cd",
}

SHELLS = {"bash", "sh", "zsh", "dash", "ksh", "fish"}

# Commands whose every quoted argument is a command line. (eval, watch, ssh and
# env -S join their arguments instead; see _command_strings.)
RUNS_ARGUMENTS = {"tmux", "parallel"}

SHELL_KEYWORDS = {"if", "then", "else", "elif", "do", "while", "until", "{", "!", "time"}
ASSIGNMENT = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*=")
HEREDOC = re.compile(r"<<(-?)[ \t]*(?:'([^'\n]*)'|\"([^\"\n]*)\"|([^\s;&|()<>'\"`$]+))")
MAX_DEPTH = 6

BUILTIN_RULES = Path(__file__).resolve().parent / "guard-rules.json"
PROJECT_RULES = Path(".claude") / "guard-rules.json"
RULE_ID = re.compile(r"^[a-z0-9][a-z0-9-]{0,63}$")
RULE_KEYS = {"id", "message", "when", "raw", "locked", "$comment"}
WHEN_KEYS = {"command", "words", "flag", "arg_contains", "arg_endswith", "unless_option"}
OPTION_KEYS = {"name", "except", "before_positional", "value_options"}
MAX_RULES_BYTES = 256 * 1024

# Above these sizes a command is refused outright: checking it could outlast
# the hook timeout, and a timed-out hook lets the command through.
MAX_COMMAND_BYTES = 64 * 1024
MAX_COMMAND_WORDS = 5000

# A hard time budget for checking one command, in seconds. Past it the command
# is refused: the hook's own timeout lets a command through, so running out of
# time must end in a refusal, never in that timeout. GUARD_TIME_BUDGET can only
# lower it (the tests use that to force the budget).
TIME_BUDGET = 5.0
OUT_OF_TIME = (
    "This command is refused because the command guard could not finish checking "
    "it within {budget:g} seconds. Safe form: split it into smaller commands, or "
    "put long content in a file with your file-writing tool and run a short "
    "command that reads it."
)
TOO_LONG = (
    "This command is refused because it is too long for the command guard to "
    "check ({size}; the limit is {max_bytes} bytes and {max_words} words). Safe "
    "form: put long content in a file with your file-writing tool, then run a "
    "short command that reads it, or split the command into smaller ones."
)

# The generic rules, as shipped in guard-rules.json. Used only when that file
# is missing or invalid, so a broken plugin file never drops the generic rules.
# test-guard-bash-command.sh checks that the two stay identical.
EMBEDDED_RULES = {
    "version": 1,
    "rules": [
        {
            "id": "gh-pr-merge-auto",
            "message": (
                "`gh pr merge --auto` is refused: in a repository whose default branch "
                "has no required status checks, --auto merges at once, before CI "
                "finishes. Safe form: watch the checks (`gh pr checks <pr> --watch`), "
                "then merge explicitly (`gh pr merge <pr> --squash`). A project that "
                "does require checks can turn this rule off in .claude/guard-rules.json."
            ),
            "when": [
                {"command": ["gh"], "words": ["pr", "merge"], "flag": ["--auto"]},
                {"command": ["gh"], "words": ["api"], "arg_contains": ["enablePullRequestAutoMerge"]},
            ],
            "raw": [
                r"\bgh\b(?:(?!\bgh\b)[^;&|\n])*?\bpr\s+merge\b(?:(?!\bpr\s+merge\b)[^;&|\n])*?--auto\b",
                r"enablePullRequestAutoMerge",
            ],
        },
        {
            "id": "token-lookup",
            "locked": True,
            "message": (
                "This command prints a Vault or OpenBao token itself: `token lookup`, "
                "`print token`, and a `read` or `write` of `auth/token/lookup`, "
                "`lookup-self` or `lookup-accessor` without a `-field=` (other than "
                "`id`) placed before the path. Safe form: read one field, with the flag "
                "before the path, for example `bao read -field=ttl "
                "auth/token/lookup-self` (other fields: policies, display_name, "
                "expire_time)."
            ),
            "when": [
                {"command": ["bao", "vault"], "words": ["token", "lookup"]},
                {"command": ["bao", "vault"], "words": ["print", "token"]},
                {
                    "command": ["bao", "vault"],
                    "words": ["read"],
                    "arg_endswith": ["auth/token/lookup-self"],
                    "unless_option": {
                        "name": "field",
                        "except": ["id"],
                        "before_positional": True,
                        "value_options": ["address", "agent-address", "ca-cert", "ca-path", "client-cert", "client-key", "format", "header", "mfa", "namespace", "ns", "policy-override", "tls-server-name", "wrap-ttl"],
                    },
                },
                {
                    "command": ["bao", "vault"],
                    "words": ["write"],
                    "arg_endswith": [
                        "auth/token/lookup",
                        "auth/token/lookup-self",
                        "auth/token/lookup-accessor",
                    ],
                    "unless_option": {
                        "name": "field",
                        "except": ["id"],
                        "before_positional": True,
                        "value_options": ["address", "agent-address", "ca-cert", "ca-path", "client-cert", "client-key", "format", "header", "mfa", "namespace", "ns", "policy-override", "tls-server-name", "wrap-ttl"],
                    },
                },
            ],
            "raw": [
                r"\b(?:bao|vault)\b(?:(?!\b(?:bao|vault)\b)[^;&|\n])*?\btoken\s+lookup\b",
                r"\b(?:bao|vault)\b(?:(?!\b(?:bao|vault)\b)[^;&|\n])*?\bprint\s+token\b",
                r"\b(?:bao|vault)\b(?:(?!\b(?:bao|vault)\b)[^;&|\n])*?\bread\b(?:(?!\bread\b|--?field[= ](?!id\b)|auth/token/lookup-self)[^;&|\n])*auth/token/lookup-self",
                r"\b(?:bao|vault)\b(?:(?!\b(?:bao|vault)\b)[^;&|\n])*?\bwrite\b(?:(?!\bwrite\b|--?field[= ](?!id\b)|auth/token/lookup)[^;&|\n])*auth/token/lookup(?:-self|-accessor)?\b",
            ],
        },
    ],
}


# --- rules -----------------------------------------------------------------

class Rule:
    """One entry of a rule table. See README.md for the format."""

    def __init__(self, rule_id, message, when, raw, locked=False):
        self.id = rule_id
        self.message = message
        self.when = when
        self.raw = raw
        self.locked = locked


class Words:
    """One simple command's words, with the lookups rules need computed once.

    Matching a rule at every word of a long command would otherwise rescan
    the rest of the command for each word, which grows with the square of
    its length."""

    def __init__(self, tokens):
        self.tokens = tokens
        self.names = [os.path.basename(t) for t in tokens]
        self._cache = {}

    def sequence_after(self, i, words):
        """Index of the first adjacent run of `words` after position i, or -1."""
        key = ("seq", tuple(words))
        starts = self._cache.get(key)
        if starts is None:
            n, t = len(words), self.tokens
            starts = [k for k in range(len(t) - n + 1) if t[k] == words[0] and t[k:k + n] == list(words)]
            self._cache[key] = starts
        k = bisect.bisect_right(starts, i)
        return starts[k] if k < len(starts) else -1

    def last(self, key, predicate):
        """Index of the last word that satisfies `predicate`, or -1."""
        found = self._cache.get(key)
        if found is None:
            found = -1
            for k, t in enumerate(self.tokens):
                if predicate(t):
                    found = k
            self._cache[key] = found
        return found


def _option_values(tokens, start, name, before_positional, value_options=()):
    """Values given to `-name`/`--name` after position `start`, as `-name=v`
    or `-name v`. With `before_positional`, only options before the first
    word that is not an option count: Go's flag parser, used by bao and
    vault, stops at the first positional argument and ignores the rest."""
    flag = re.compile(r"^--?" + re.escape(name) + "=")
    values, k = [], start + 1
    while k < len(tokens):
        t = tokens[k]
        if flag.match(t):
            values.append(t.split("=", 1)[1])
        elif t in ("-" + name, "--" + name):
            if k + 1 < len(tokens):
                values.append(tokens[k + 1])
            k += 1
        elif before_positional and t.lstrip("-") in value_options and t.startswith("-") and "=" not in t:
            k += 1                      # `-format json`: the next word is this flag's value
        elif before_positional and not t.startswith("-"):
            break
        k += 1
    return values


def _when_matches(words, i, when):
    """True if the simple command `words`, read from position `i`, meets
    every condition of one `when` entry."""
    if words.names[i] not in when["command"]:
        return False
    tokens, start = words.tokens, i
    if "words" in when:
        start = words.sequence_after(i, when["words"])
        if start < 0:
            return False
    wid = id(when)
    if "flag" in when:
        flags = when["flag"]
        if words.last((wid, "flag"), lambda t: any(t == f or t.startswith(f + "=") for f in flags)) < start:
            return False
    if "arg_contains" in when:
        subs = when["arg_contains"]
        if words.last((wid, "contains"), lambda t: any(s in t for s in subs)) <= i:
            return False
    if "arg_endswith" in when:
        ends = when["arg_endswith"]
        if words.last((wid, "endswith"), lambda t: any(t.rstrip("/").endswith(s) for s in ends)) <= i:
            return False
    if "unless_option" in when:
        option = when["unless_option"]
        values = _option_values(
            tokens, start, option["name"], option.get("before_positional", False),
            option.get("value_options", ()),
        )
        if values and not set(values) & set(option.get("except", [])):
            return False
    return True


def rule_matches(rule, words, i):
    return any(_when_matches(words, i, when) for when in rule.when)


def _string_list(value, where, allow_empty=False):
    if not isinstance(value, list) or not all(isinstance(v, str) and v for v in value):
        raise ValueError(f"{where} must be a list of non-empty strings")
    if not value and not allow_empty:
        raise ValueError(f"{where} must not be empty")
    return value


def parse_rule(entry):
    """Validate one rule table entry and return a Rule. Raises ValueError."""
    if not isinstance(entry, dict):
        raise ValueError("a rule must be an object")
    rule_id = entry.get("id")
    if not isinstance(rule_id, str) or not RULE_ID.match(rule_id):
        raise ValueError(f"rule id {rule_id!r} must match {RULE_ID.pattern}")
    unknown = set(entry) - RULE_KEYS
    if unknown:
        raise ValueError(f"rule {rule_id}: unknown keys {sorted(unknown)}")
    message = entry.get("message")
    if not isinstance(message, str) or not message.strip():
        raise ValueError(f"rule {rule_id}: 'message' must be a non-empty string")
    locked = entry.get("locked", False)
    if not isinstance(locked, bool):
        raise ValueError(f"rule {rule_id}: 'locked' must be true or false")
    whens = entry.get("when")
    if not isinstance(whens, list) or not whens:
        raise ValueError(f"rule {rule_id}: 'when' must be a non-empty list")
    for k, when in enumerate(whens):
        where = f"rule {rule_id}: when[{k}]"
        if not isinstance(when, dict):
            raise ValueError(f"{where} must be an object")
        unknown = set(when) - WHEN_KEYS
        if unknown:
            raise ValueError(f"{where}: unknown keys {sorted(unknown)}")
        _string_list(when.get("command"), f"{where}.command")
        for key in ("words", "flag", "arg_contains", "arg_endswith"):
            if key in when:
                _string_list(when[key], f"{where}.{key}")
        if "unless_option" in when:
            option = when["unless_option"]
            if not isinstance(option, dict) or set(option) - OPTION_KEYS:
                raise ValueError(f"{where}.unless_option keys must be among {sorted(OPTION_KEYS)}")
            if not isinstance(option.get("name"), str) or not option["name"]:
                raise ValueError(f"{where}.unless_option.name must be a non-empty string")
            _string_list(option.get("except", []), f"{where}.unless_option.except", allow_empty=True)
            if not isinstance(option.get("before_positional", False), bool):
                raise ValueError(f"{where}.unless_option.before_positional must be true or false")
            _string_list(option.get("value_options", []), f"{where}.unless_option.value_options",
                         allow_empty=True)
    raw = []
    for pattern in _string_list(entry.get("raw", []), f"rule {rule_id}: raw", allow_empty=True):
        try:
            raw.append(re.compile(pattern))
        except re.error as exc:
            raise ValueError(f"rule {rule_id}: raw pattern {pattern!r}: {exc}") from None
    return Rule(rule_id, message.strip(), whens, raw, locked)


def read_table(path, problems):
    """Return (table, error) for one rules file: the parsed object, or None
    and a reason. A missing file is (None, None)."""
    try:
        if path.stat().st_size > MAX_RULES_BYTES:
            return None, f"larger than {MAX_RULES_BYTES} bytes"
        table = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return None, None
    except (OSError, ValueError, RecursionError) as exc:
        return None, f"cannot be read as JSON ({exc})"
    if not isinstance(table, dict) or type(table.get("version")) is not int or table["version"] != 1:
        return None, 'want an object with "version": 1'
    unknown = set(table) - {"version", "rules", "disable", "$comment"}
    if unknown:
        problems.append(f"{path}: unknown keys {sorted(unknown)} ignored")
    if not isinstance(table.get("rules", []), list):
        return None, '"rules" must be a list'
    return table, None


def parse_rules(table, path, problems, strict):
    """Rules from a table. With `strict`, any invalid rule is an error
    (raised); otherwise it is skipped with a problem noted."""
    rules = []
    for entry in table.get("rules", []):
        try:
            rules.append(parse_rule(entry))
        except ValueError as exc:
            if strict:
                raise
            problems.append(f"{path}: {exc}; that rule is not enforced")
    return rules


def load_generic(problems):
    """The generic rules from guard-rules.json, or the embedded copy when that
    file is missing or invalid in any way."""
    table, error = read_table(BUILTIN_RULES, problems)
    if table is None:
        error = error or "not found"
    else:
        try:
            return parse_rules(table, BUILTIN_RULES, problems, strict=True)
        except ValueError as exc:
            error = str(exc)
    problems.append(f"{BUILTIN_RULES}: {error}; using the copy built into the guard")
    return parse_rules(EMBEDDED_RULES, "built-in rules", problems, strict=True)


def load_rules(project_dir, problems, notices, from_env=True):
    """The generic rules, minus any the project disables, plus the project's.

    `notices` collects lines to print alongside any refusal, so that a rule a
    project turned off is visible whenever the guard is seen working."""
    builtin = load_generic(problems)
    project, disable = [], []
    if project_dir:
        path = Path(project_dir) / PROJECT_RULES
        table, error = read_table(path, problems)
        if error:
            problems.append(f"{path}: {error}, so its rules are not enforced")
        elif table is not None:
            project = parse_rules(table, path, problems, strict=False)
            disable = table.get("disable", [])
            if not isinstance(disable, list) or not all(isinstance(d, str) for d in disable):
                problems.append(f"{path}: \"disable\" must be a list of rule ids, ignored")
                disable = []
            if disable and not from_env:
                problems.append(
                    f"{path}: \"disable\" ignored, because the project directory came from "
                    "the hook input's cwd, not CLAUDE_PROJECT_DIR"
                )
                disable = []
    by_id = {r.id: r for r in builtin}
    honoured = []
    for rule_id in disable:
        rule = by_id.get(rule_id)
        if rule is None:
            problems.append(f"disable: no generic rule named {rule_id!r}")
        elif rule.locked:
            problems.append(f"disable: {rule_id!r} cannot be turned off; it still applies")
        else:
            honoured.append(rule_id)
            notices.append(f"guard-bash-command: note: this project turns off the {rule_id!r} rule.")
    rules = [r for r in builtin if r.id not in honoured]
    for rule in project:
        if rule.id in by_id:
            problems.append(f"project rule {rule.id!r} has the same id as a generic rule; both apply")
        rules.append(rule)
    return rules


# --- parser ----------------------------------------------------------------

def _command_name(words):
    """The command a simple command runs: its first word after assignments
    and shell keywords. Returns (name, remaining words)."""
    while words and (ASSIGNMENT.match(words[0]) or words[0] in SHELL_KEYWORDS):
        words = words[1:]
    return (os.path.basename(words[0]) if words else ""), words


SSH_OPTIONS_WITH_VALUE = set("bcDEeFIiJLlmOopQRSWw")


def _ssh_remote_command(words):
    """The words after the host in an ssh command line."""
    k = 1
    while k < len(words) and words[k].startswith("-"):
        k += 2 if len(words[k]) == 2 and words[k][1] in SSH_OPTIONS_WITH_VALUE else 1
    return words[k + 1:]


def _runs_stdin(words):
    """True if this simple command executes its standard input as a script."""
    name, words = _command_name(words)
    if not words or name in TEXT_TOOLS:
        return False
    if name == "ssh":
        # With no remote command the remote login shell reads stdin. With
        # one, stdin is that command's input: a script only if it is a shell.
        remote = " ".join(_ssh_remote_command(words)).split()
        return not remote or any(os.path.basename(w) in SHELLS | {"su"} for w in remote)
    if name in ("sudo", "doas") and {"-i", "-s"} & set(words):
        return True
    return any(os.path.basename(w) in SHELLS | {"su", "ssh"} for w in words)


class Parser:
    """Reads a command line the way a shell does, far enough to tell the
    commands it would run from the text it would only pass along.

    `segments` collects every simple command at any nesting depth, each as
    [words, separator that followed it]. A `$(...)` body is parsed in place
    by the same code, so its commands land in the same list. `scripts`
    collects text to be checked as a command line of its own: backtick
    bodies and here-documents fed to something that executes them.
    """

    def __init__(self, text):
        self.t = text
        self.n = len(text)
        self.i = 0
        self.segments = []      # [words, separator after it, nesting level]
        self.scripts = []
        self.level = 0
        self._index = {}        # id(word list) -> position in self.segments
        self.herestrings = []   # (owning word list, here-string text)

    def _substitution(self):
        """Parse a `$(...)` body in place; the `$(` is already passed."""
        self.level += 1
        try:
            self.parse(until_paren=True)
        finally:
            self.level -= 1

    def _backtick(self):
        """Consume a backtick body; the opening backtick is already passed."""
        t, n, start = self.t, self.n, self.i
        while self.i < n and t[self.i] != "`":
            self.i += 2 if t[self.i] == "\\" else 1
        self.scripts.append(t[start:self.i].replace("\\`", "`"))
        self.i = min(self.i + 1, n)

    def _double_quoted(self, word):
        """Consume a double-quoted string; the opening quote is passed."""
        t, n = self.t, self.n
        while self.i < n and t[self.i] != '"':
            c = t[self.i]
            if c == "\\" and self.i + 1 < n:
                word.append(t[self.i + 1])
                self.i += 2
            elif t.startswith("$(", self.i):
                self.i += 2
                self._substitution()
            elif c == "`":
                self.i += 1
                self._backtick()
            else:
                word.append(c)
                self.i += 1
        self.i += 1

    def scan_expansions(self):
        """Treat the whole text as the inside of double quotes: only
        substitutions run. Used for unquoted here-document bodies."""
        t, n = self.t, self.n
        while self.i < n:
            c = t[self.i]
            if c == "\\":
                self.i += 2
            elif t.startswith("$(", self.i):
                self.i += 2
                self._substitution()
            elif c == "`":
                self.i += 1
                self._backtick()
            else:
                self.i += 1

    def _feeds_a_shell(self, owner):
        """True if standard input given to the simple command `owner` is run
        as a script. Input feeds its own command and, if that command is
        piped onward, whatever reads the pipe. Commands inside a
        substitution (a deeper level) are not part of that pipeline."""
        k = self._index.get(id(owner))
        if k is None:
            return False
        words, sep, level = self.segments[k]
        return _runs_stdin(words) or (sep == "|" and any(
            lvl == level and _runs_stdin(w)
            for w, _sep, lvl in self.segments[k + 1:]
        ))

    def resolve_herestrings(self):
        """After parsing: a here-string fed to something that runs its
        standard input (`bash <<< '...'`) is a script."""
        for owner, text in self.herestrings:
            if self._feeds_a_shell(owner):
                self.scripts.append(text)

    def _heredoc_bodies(self, pending):
        """Consume the bodies of the here-documents opened on the line that
        just ended, and decide for each whether it is a script or text."""
        t, n = self.t, self.n
        for terminator, strip_tabs, quoted, owner in pending:
            lines = []
            while self.i < n:
                j = t.find("\n", self.i)
                j = n if j < 0 else j
                line = t[self.i:j].rstrip("\r")
                self.i = min(j + 1, n)
                if (line.lstrip("\t") if strip_tabs else line) == terminator:
                    break
                lines.append(line)
            body = "\n".join(lines)
            if self._feeds_a_shell(owner):
                self.scripts.append(body)
            elif not quoted:
                inner = Parser(body)
                inner.scan_expansions()
                self.segments.extend(inner.segments)
                self.scripts.extend(inner.scripts)

    def parse(self, until_paren=False):
        t, n = self.t, self.n
        seg, word = [], None
        pending = []
        depth = 0
        herestring_next = False

        def end_word():
            nonlocal word, herestring_next
            if word is not None:
                text = "".join(word)
                seg.append(text)
                if herestring_next:
                    self.herestrings.append((seg, text))
                    herestring_next = False
                word = None

        def end_seg(sep):
            nonlocal seg
            end_word()
            if seg:
                self._index[id(seg)] = len(self.segments)
                self.segments.append([seg, sep, self.level])
            seg = []

        while self.i < n:
            c = t[self.i]
            if c == "\\":
                if t.startswith("\\\n", self.i):            # line continuation
                    self.i += 2
                    continue
                word = [] if word is None else word
                word.append(t[self.i + 1:self.i + 2])
                self.i += 2
            elif c == "'":
                j = t.find("'", self.i + 1)
                j = n if j < 0 else j
                word = [] if word is None else word
                word.append(t[self.i + 1:j])
                self.i = j + 1
            elif t.startswith("$'", self.i):                 # ANSI-C quoting
                word = [] if word is None else word
                self.i += 2
                while self.i < n and t[self.i] != "'":
                    if t[self.i] == "\\":
                        self.i += 1
                    word.append(t[self.i:self.i + 1])
                    self.i += 1
                self.i += 1
            elif c == '"':
                word = [] if word is None else word
                self.i += 1
                self._double_quoted(word)
            elif t.startswith("$((", self.i) or (t.startswith("((", self.i) and word is None):
                j = t.find("))", self.i)                     # arithmetic: no commands
                word = [] if word is None else word
                self.i = n if j < 0 else j + 2
            elif t.startswith("$(", self.i):
                word = [] if word is None else word
                self.i += 2
                self._substitution()
            elif c == "`":
                word = [] if word is None else word
                self.i += 1
                self._backtick()
            elif c == "#" and word is None:                  # comment
                j = t.find("\n", self.i)
                self.i = n if j < 0 else j
            elif t.startswith("<<<", self.i):                # here-string
                end_word()
                herestring_next = True                       # the next word is its text
                self.i += 3
            elif t.startswith("<<", self.i):
                match = HEREDOC.match(t, self.i)
                if match:
                    quoted = match.group(4) is None or "\\" in match.group(4)
                    terminator = next(g for g in match.groups()[1:] if g is not None)
                    terminator = terminator.replace("\\", "")
                    pending.append((terminator, bool(match.group(1)), quoted, seg))
                    end_word()
                    self.i = match.end()
                else:
                    self.i += 2
            elif c == "\n":
                end_seg("\n")
                self.i += 1
                if pending:
                    self._heredoc_bodies(pending)
                    pending = []
            elif c in " \t\r":
                end_word()
                self.i += 1
            elif c == "&" and (t[self.i - 1:self.i] in (">", "<") or t.startswith("&>", self.i)):
                word = [] if word is None else word          # 2>&1, &>file
                word.append(c)
                self.i += 1
            elif c == "|":
                double = t.startswith("||", self.i)
                end_seg("||" if double else "|")
                self.i += 2 if double or t.startswith("|&", self.i) else 1
            elif c in ";&":
                end_seg(c)
                self.i += 1
            elif c == "(":
                end_seg("(")
                depth += 1
                self.i += 1
            elif c == ")":
                end_seg(")")
                self.i += 1
                if depth:
                    depth -= 1
                elif until_paren:
                    return
            else:
                word = [] if word is None else word
                word.append(c)
                self.i += 1
        end_seg("")


# --- decision --------------------------------------------------------------

class OutOfTime(Exception):
    """Raised when checking passes the time budget."""


_deadline = None


def _tick():
    """Raise OutOfTime once the budget is spent. The interval timer in main
    interrupts even a long regular-expression search; this check covers a
    platform without SIGALRM."""
    if _deadline is not None and time.monotonic() > _deadline:
        raise OutOfTime()


def check_raw(text, rules):
    """Judge raw text with each rule's `raw` patterns. Used only if the
    parser fails, or past MAX_DEPTH."""
    for rule in rules:
        for pattern in rule.raw:
            _tick()
            if pattern.search(text):
                return rule.message
    return None


# Commands that join their arguments with spaces into one command line and run
# it: `eval a b`, `watch a b` (through `sh -c`).
JOINS_ARGUMENTS = {"eval", "watch"}


def _command_strings(words):
    """The command lines a simple command will run that are not its own words:
    - the arguments of `eval` and `watch`, and the remote command of `ssh`,
      joined with spaces as the shell joins them (`eval 'gh pr merge 7' --auto`);
    - the split string of `env -S` / `--split-string`, with what follows it;
    - every quoted argument of `tmux` and `parallel`;
    - the argument after any option cluster holding `c` once a shell has been
      named (`bash -c`, `bash -ce`, `kubectl exec -- sh -c`).
    """
    found = []
    for k, word in enumerate(words):
        name = os.path.basename(word)
        if name in JOINS_ARGUMENTS and len(words) > k + 1:
            found.append(" ".join(words[k + 1:]))
            break
        if name == "env":
            rest = words[k + 1:]
            for j, arg in enumerate(rest):
                if arg in ("-S", "--split-string") and j + 1 < len(rest):
                    found.append(" ".join(rest[j + 1:]))
                elif arg.startswith("--split-string="):
                    found.append(" ".join([arg.split("=", 1)[1]] + rest[j + 1:]))
                elif arg.startswith("-S") and len(arg) > 2:
                    found.append(" ".join([arg[2:]] + rest[j + 1:]))
                else:
                    continue
                break
            break
    name = os.path.basename(words[0])
    if name == "ssh":
        remote = _ssh_remote_command(words)
        return found + ([" ".join(remote)] if remote else [])
    if name in RUNS_ARGUMENTS:
        return found + [w for w in words[1:] if re.search(r"\s", w)]
    seen_shell = name in SHELLS | {"su", "script", "flock"}
    for k, word in enumerate(words[1:], start=1):
        if seen_shell and re.fullmatch(r"-[A-Za-z]*c[A-Za-z]*", word):
            found.extend(w for w in words[k + 1:k + 3] if w != "--")
        if os.path.basename(word) in SHELLS:
            seen_shell = True
    return found


def check(command, rules, depth=0):
    """Return a refusal message, or None if the command is allowed.

    Every simple command at this level is matched through the parser first;
    only then are the command lines nested inside them (quoted, substituted,
    here-documents) checked, so a slow nested one cannot hide a later banned
    command at this level."""
    _tick()
    if depth > MAX_DEPTH:
        return check_raw(command, rules)
    try:
        parser = Parser(command)
        parser.parse()
        parser.resolve_herestrings()
    except OutOfTime:
        raise
    except Exception:  # noqa: BLE001 - a parser bug must not open the guard
        return check_raw(command, rules)

    commands = {name for rule in rules for when in rule.when for name in when["command"]}
    nested = []
    for words, _sep, _level in parser.segments:
        _tick()
        name, words = _command_name(words)
        if not words or name in TEXT_TOOLS:
            continue
        indexed = Words(words)
        for i, word_name in enumerate(indexed.names):
            if word_name not in commands:
                continue
            for rule in rules:
                if rule_matches(rule, indexed, i):
                    return rule.message
        nested.extend(_command_strings(words))

    for inner in nested + parser.scripts:
        message = check(inner, rules, depth + 1)
        if message:
            return message
    return None


def too_long(command):
    """A refusal message if the command is past the size the guard checks."""
    size = len(command.encode("utf-8", "surrogatepass"))
    words = len(command.split())
    if size > MAX_COMMAND_BYTES or words > MAX_COMMAND_WORDS:
        return TOO_LONG.format(
            size=f"{size} bytes, {words} words",
            max_bytes=MAX_COMMAND_BYTES,
            max_words=MAX_COMMAND_WORDS,
        )
    return None


def _report(lines):
    for line in lines:
        sys.stderr.write(line if line.startswith("guard-bash-command: ") else f"guard-bash-command: {line}")
        sys.stderr.write("\n")


def _budget():
    try:
        requested = float(os.environ.get("GUARD_TIME_BUDGET", TIME_BUDGET))
    except ValueError:
        requested = TIME_BUDGET
    return min(TIME_BUDGET, requested) if requested > 0 else TIME_BUDGET


def _on_alarm(_signum, _frame):
    raise OutOfTime()


def main():
    global _deadline
    try:
        payload = json.load(sys.stdin)
    except (ValueError, RecursionError):
        return 0
    if not isinstance(payload, dict) or payload.get("tool_name") != "Bash":
        return 0
    tool_input = payload.get("tool_input")
    command = tool_input.get("command") if isinstance(tool_input, dict) else None
    if not isinstance(command, str):
        return 0

    message = too_long(command)
    if message:
        sys.stderr.write(message + "\n")
        return 2

    budget = _budget()
    _deadline = time.monotonic() + budget
    timer = hasattr(signal, "setitimer") and hasattr(signal, "SIGALRM")
    if timer:
        signal.signal(signal.SIGALRM, _on_alarm)
        signal.setitimer(signal.ITIMER_REAL, budget)
    try:
        # The project directory, and whether it came from Claude Code itself.
        # The cwd field follows the session's working directory, so a project
        # file found through it may add rules but may not turn any off.
        project_dir = os.environ.get("CLAUDE_PROJECT_DIR")
        from_env = bool(project_dir)
        if not project_dir:
            cwd = payload.get("cwd")
            project_dir = cwd if isinstance(cwd, str) else None

        problems, notices = [], []
        rules = load_rules(project_dir, problems, notices, from_env=from_env)
        try:
            message = check(command, rules)
        except RecursionError:
            message = check_raw(command, rules)
    except OutOfTime:
        sys.stderr.write(OUT_OF_TIME.format(budget=budget) + "\n")
        return 2
    finally:
        if timer:
            signal.setitimer(signal.ITIMER_REAL, 0)

    if message:
        sys.stderr.write(
            message
            + " Do not retry through another tool or wrap the command in a "
            "script: use the safe form, or report the refusal.\n"
        )
        _report(notices + problems)
        return 2
    if problems:
        # Exit 1 is a non-blocking error: the call goes ahead and the user
        # sees why the guard could not apply every rule.
        _report(problems)
        sys.stderr.write("guard-bash-command: the command was allowed.\n")
        return 1
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except OutOfTime:
        sys.stderr.write(OUT_OF_TIME.format(budget=TIME_BUDGET) + "\n")
        sys.exit(2)
    except Exception as exc:  # noqa: BLE001 - fail open, and say so
        sys.stderr.write(
            f"guard-bash-command: internal error ({type(exc).__name__}: {exc}); "
            "the command was allowed (the guard fails open).\n"
        )
        sys.exit(1)

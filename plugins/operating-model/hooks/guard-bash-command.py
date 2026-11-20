#!/usr/bin/env python3
"""PreToolUse hook for the Bash tool: refuse the commands a rule table bans.

Claude Code runs this before every Bash tool call, in the main session and in
subagents alike, and passes the call as JSON on stdin. Exit status 2 refuses
the call and returns stderr to the agent; exit status 0 lets it through.

The rules are data, not code. They come from two files, read on every call:

- `guard-rules.json` beside this script: the generic rules the plugin ships.
- `<project>/.claude/guard-rules.json`, if it exists: the project's own rules,
  added to the generic ones, plus an optional `disable` list of generic rule
  ids the project turns off. The project directory is `$CLAUDE_PROJECT_DIR`,
  or the `cwd` field of the hook input when that is unset.

The file format is documented in README.md beside this script. Each rule names
the safe form, because a refusal that does not say what to do instead invites
a workaround.

The guard reads the command line the way a shell would: it tracks quoting,
comments, here-documents and substitutions, so that text which merely mentions
a banned command (a commit message, a search pattern) is allowed while a
command the shell would run is refused, however it is wrapped.

Failure behaviour:

- A rules file that is missing, unreadable or malformed, or a single invalid
  rule, FAILS OPEN: the guard skips what it cannot use, keeps every rule it
  could load, and says what it skipped on stderr (exit 1, which Claude Code
  shows to the user without blocking the call). A refusal still exits 2.
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
import json
import os
import re
import sys
from pathlib import Path

# Commands whose arguments are text, not something a shell will execute.
TEXT_TOOLS = {
    "git", "grep", "egrep", "fgrep", "rg", "ag", "echo", "printf", "cat",
    "sed", "awk", "jq", "yq", "head", "tail", "less", "wc", "tee", "ls",
    "diff", "cd",
}

SHELLS = {"bash", "sh", "zsh", "dash", "ksh", "fish"}

# Commands whose every quoted argument is a command line.
RUNS_ARGUMENTS = {"eval", "ssh", "watch", "tmux", "parallel"}

SHELL_KEYWORDS = {"if", "then", "else", "elif", "do", "while", "until", "{", "!", "time"}
ASSIGNMENT = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*=")
HEREDOC = re.compile(r"<<(-?)[ \t]*(?:'([^'\n]*)'|\"([^\"\n]*)\"|([^\s;&|()<>'\"`$]+))")
MAX_DEPTH = 6

BUILTIN_RULES = Path(__file__).resolve().parent / "guard-rules.json"
PROJECT_RULES = Path(".claude") / "guard-rules.json"
RULE_ID = re.compile(r"^[a-z0-9][a-z0-9-]{0,63}$")
RULE_KEYS = {"id", "message", "when", "raw", "$comment"}
WHEN_KEYS = {"command", "words", "flag", "arg_contains", "arg_endswith", "unless_option"}
MAX_RULES_BYTES = 256 * 1024


# --- rules -----------------------------------------------------------------

class Rule:
    """One entry of a rule table. See README.md for the format."""

    def __init__(self, rule_id, message, when, raw):
        self.id = rule_id
        self.message = message
        self.when = when
        self.raw = raw


def _follows(tokens, start, *words):
    """Index where `words` appear adjacent, in order, after `start`; else -1."""
    n = len(words)
    for i in range(start + 1, len(tokens) - n + 1):
        if tuple(tokens[i:i + n]) == words:
            return i
    return -1


def _option_values(rest, name):
    """Values given to `-name`/`--name`, as `-name=v` or `-name v`."""
    flag = re.compile(r"^--?" + re.escape(name) + "=")
    values = [t.split("=", 1)[1] for t in rest if flag.match(t)]
    values += [rest[k + 1] for k, t in enumerate(rest[:-1]) if t in ("-" + name, "--" + name)]
    return values


def _when_matches(tokens, i, when):
    """True if the simple command `tokens`, read from position `i`, meets
    every condition of one `when` entry."""
    if os.path.basename(tokens[i]) not in when["command"]:
        return False
    rest = tokens[i + 1:]
    start = i
    if "words" in when:
        start = _follows(tokens, i, *when["words"])
        if start < 0:
            return False
    if "flag" in when and not any(
        t == f or t.startswith(f + "=") for t in tokens[start:] for f in when["flag"]
    ):
        return False
    if "arg_contains" in when and not any(s in t for t in rest for s in when["arg_contains"]):
        return False
    if "arg_endswith" in when and not any(
        t.rstrip("/").endswith(s) for t in rest for s in when["arg_endswith"]
    ):
        return False
    if "unless_option" in when:
        option = when["unless_option"]
        values = _option_values(rest, option["name"])
        if values and not set(values) & set(option.get("except", [])):
            return False
    return True


def rule_matches(rule, tokens, i):
    return any(_when_matches(tokens, i, when) for when in rule.when)


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
            if not isinstance(option, dict) or set(option) - {"name", "except"}:
                raise ValueError(f"{where}.unless_option must be {{name, except}}")
            if not isinstance(option.get("name"), str) or not option["name"]:
                raise ValueError(f"{where}.unless_option.name must be a non-empty string")
            _string_list(option.get("except", []), f"{where}.unless_option.except", allow_empty=True)
    raw = []
    for pattern in _string_list(entry.get("raw", []), f"rule {rule_id}: raw", allow_empty=True):
        try:
            raw.append(re.compile(pattern))
        except re.error as exc:
            raise ValueError(f"rule {rule_id}: raw pattern {pattern!r}: {exc}") from None
    return Rule(rule_id, message.strip(), whens, raw)


def read_table(path, problems, required):
    """Return (rules, disable) from one rules file. Problems are appended to
    `problems` and the file, or the bad rule, is skipped: the guard fails open."""
    try:
        if path.stat().st_size > MAX_RULES_BYTES:
            problems.append(f"{path}: larger than {MAX_RULES_BYTES} bytes, skipped")
            return [], []
        table = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        if required:
            problems.append(f"{path}: not found, so its rules are not enforced")
        return [], []
    except (OSError, ValueError, RecursionError) as exc:
        problems.append(f"{path}: cannot be read as JSON ({exc}), so its rules are not enforced")
        return [], []
    if not isinstance(table, dict) or table.get("version") != 1:
        problems.append(f"{path}: want an object with \"version\": 1, so its rules are not enforced")
        return [], []
    unknown = set(table) - {"version", "rules", "disable", "$comment"}
    if unknown:
        problems.append(f"{path}: unknown keys {sorted(unknown)} ignored")
    rules = []
    entries = table.get("rules", [])
    if not isinstance(entries, list):
        problems.append(f"{path}: \"rules\" must be a list, so its rules are not enforced")
        entries = []
    for entry in entries:
        try:
            rules.append(parse_rule(entry))
        except ValueError as exc:
            problems.append(f"{path}: {exc}; that rule is not enforced")
    disable = table.get("disable", [])
    if not isinstance(disable, list) or not all(isinstance(d, str) for d in disable):
        problems.append(f"{path}: \"disable\" must be a list of rule ids, ignored")
        disable = []
    return rules, disable


def load_rules(project_dir, problems):
    """The generic rules, minus any the project disables, plus the project's."""
    builtin, _ = read_table(BUILTIN_RULES, problems, required=True)
    project, disable = [], []
    if project_dir:
        project, disable = read_table(Path(project_dir) / PROJECT_RULES, problems, required=False)
    known = {r.id for r in builtin}
    for rule_id in disable:
        if rule_id not in known:
            problems.append(f"disable: no generic rule named {rule_id!r}")
    rules = [r for r in builtin if r.id not in disable]
    for rule in project:
        if rule.id in known:
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
            # The here-document feeds its own command and, if that command
            # is piped onward, whatever reads the pipe. Commands inside a
            # substitution (a deeper level) are not part of that pipeline.
            k = self._index.get(id(owner))
            is_script = False
            if k is not None:
                words, sep, level = self.segments[k]
                is_script = _runs_stdin(words) or (sep == "|" and any(
                    lvl == level and _runs_stdin(w)
                    for w, _sep, lvl in self.segments[k + 1:]
                ))
            if is_script:
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

        def end_word():
            nonlocal word
            if word is not None:
                seg.append("".join(word))
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

def check_raw(text, rules):
    """Judge raw text with each rule's `raw` patterns. Used only if the
    parser fails, or past MAX_DEPTH."""
    for rule in rules:
        for pattern in rule.raw:
            if pattern.search(text):
                return rule.message
    return None


def _command_strings(words):
    """The arguments of a simple command that it will run as command lines:
    every quoted argument of `ssh`, `eval` and the like, and the argument
    after `-c` once a shell has been named (`bash -c`, `kubectl exec -- sh -c`).
    """
    name = os.path.basename(words[0])
    if name in RUNS_ARGUMENTS:
        return [w for w in words[1:] if re.search(r"\s", w)]
    found = []
    seen_shell = name in SHELLS | {"su", "script", "flock"}
    for k, word in enumerate(words[1:], start=1):
        if seen_shell and re.fullmatch(r"-[A-Za-z]*c", word):
            found.extend(w for w in words[k + 1:k + 3] if w != "--")
        if os.path.basename(word) in SHELLS:
            seen_shell = True
    return found


def check(command, rules, depth=0):
    """Return a refusal message, or None if the command is allowed."""
    if depth > MAX_DEPTH:
        return check_raw(command, rules)
    try:
        parser = Parser(command)
        parser.parse()
    except Exception:  # noqa: BLE001 - a parser bug must not open the guard
        return check_raw(command, rules)

    for words, _sep, _level in parser.segments:
        name, words = _command_name(words)
        if not words or name in TEXT_TOOLS:
            continue
        for i in range(len(words)):
            for rule in rules:
                if rule_matches(rule, words, i):
                    return rule.message
        for inner in _command_strings(words):
            message = check(inner, rules, depth + 1)
            if message:
                return message

    for script in parser.scripts:
        message = check(script, rules, depth + 1)
        if message:
            return message
    return None


def _report(problems):
    for problem in problems:
        sys.stderr.write(f"guard-bash-command: {problem}\n")


def main():
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
    cwd = payload.get("cwd")
    project_dir = os.environ.get("CLAUDE_PROJECT_DIR") or (cwd if isinstance(cwd, str) else None)

    problems = []
    rules = load_rules(project_dir, problems)
    try:
        message = check(command, rules)
    except RecursionError:
        message = check_raw(command, rules)
    if message:
        sys.stderr.write(
            message
            + " Do not retry through another tool or wrap the command in a "
            "script: use the safe form, or report the refusal.\n"
        )
        _report(problems)
        return 2
    if problems:
        # Exit 1 is a non-blocking error: the call goes ahead and the user
        # sees why the guard could not apply every rule.
        _report(problems)
        sys.stderr.write("guard-bash-command: the command was allowed (the guard fails open).\n")
        return 1
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as exc:  # noqa: BLE001 - fail open, and say so
        sys.stderr.write(
            f"guard-bash-command: internal error ({type(exc).__name__}: {exc}); "
            "the command was allowed (the guard fails open).\n"
        )
        sys.exit(1)

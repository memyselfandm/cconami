#!/usr/bin/env bash
# Tests for lint-skills.py. Copies tests/fixtures/ into a temp directory and
# plants violations there (mutation checks); nothing in the repo is modified.
# Needs uv (or python3 with PyYAML).
#   bash scripts/test-lint-skills.sh
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$HERE/.." && pwd)"
FIX="$REPO/tests/fixtures"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

if command -v uv >/dev/null 2>&1; then
  LINT=(uv run --quiet --script "$HERE/lint-skills.py")
else
  LINT=(python3 "$HERE/lint-skills.py")
fi

fail=0
ok() { echo "ok:   $1"; }
bad() { echo "FAIL: $1"; fail=1; }
# expect NAME WANT_RC PATTERN -- command...
expect() {
  local name="$1" want="$2" pattern="$3" out rc
  shift 4
  out="$("$@" 2>&1)"; rc=$?
  if [[ "$rc" -eq "$want" ]] && grep -Eq -- "$pattern" <<<"$out"; then
    ok "$name"
  else
    bad "$name (rc=$rc, want $want; pattern '$pattern')"
    printf '    %s\n' "$out"
  fi
}
# Run a command; fail unless it finishes within N seconds.
within() {
  local secs="$1"
  shift
  python3 -c '
import subprocess, sys
try:
    subprocess.run(sys.argv[2:], timeout=float(sys.argv[1]), capture_output=True)
except subprocess.TimeoutExpired:
    sys.exit(1)' "$secs" "$@"
}

# Fresh copy of the good fixtures, with an empty allowlist.
reset() {
  rm -rf "$WORK/t"
  mkdir -p "$WORK/t"
  cp -R "$FIX/skills" "$WORK/t/skills"
  : > "$WORK/t/allow"
}
lint() { "${LINT[@]}" --base "$WORK/t" --allowlist "$WORK/t/allow" skills "$@"; }
# add_skill NAME FRONTMATTER-LINES...
add_skill() {
  local dir="$WORK/t/skills/$1"
  shift
  mkdir -p "$dir"
  { echo '---'; printf '%s\n' "$@"; echo '---'; echo 'body'; } > "$dir/SKILL.md"
}
BODY="$WORK/t/skills/plain/SKILL.md"

reset
expect "clean fixtures pass" 0 '4 files, 0 errors' -- lint
expect "the real allowlist parses and matches the repo" 0 '0 errors' -- "${LINT[@]}"

# --- forbidden names in the body ---------------------------------------------
# Mutation: linctl in a SKILL.md body fails, naming the file and line.
reset
echo 'Run linctl issue list to see them.' >> "$BODY"
line="$(wc -l < "$BODY" | tr -d ' ')"
expect "linctl in a body fails with file and line" 1 \
  "error: skills/plain/SKILL.md:$line: body names 'linctl'" -- lint

for pat in 'mcp__claude_ai_Linear__get_issue' '/oh-my-claudecode:ralph' 'hermes -p some-profile' 'kanban_create('; do
  reset
  echo "Call $pat here." >> "$BODY"
  expect "body naming '$pat' fails" 1 'error: skills/plain/SKILL.md:[0-9]+: body names' -- lint
done

reset
printf -- '---\r\nname: crlf\r\ndescription: d\r\n---\r\none\r\nlinctl two\r\n' > "$WORK/t/skills/crlf.md"
mkdir -p "$WORK/t/skills/crlf"
mv "$WORK/t/skills/crlf.md" "$WORK/t/skills/crlf/SKILL.md"
expect "CRLF body hit reports the right line" 1 "error: skills/crlf/SKILL.md:6: body names 'linctl'" -- lint

reset
echo 'linctl issue list --json' >> "$WORK/t/skills/plain/platforms/claude-code.md"
expect "linctl in platforms/claude-code.md passes" 0 '0 errors' -- lint

reset
sed -i.bak 's/^allowed-tools: Read, Grep$/allowed-tools: Read, Bash(linctl:*)/' "$BODY"
rm -f "$BODY.bak"
grep -q '^allowed-tools: Read, Bash(linctl:\*)$' "$BODY" || bad "setup: frontmatter mutation did not apply"
expect "linctl in frontmatter passes" 0 '0 errors' -- lint

# --- allowlist ---------------------------------------------------------------
reset
echo 'Run linctl here.' >> "$BODY"
echo 'skills/plain/SKILL.md linctl' > "$WORK/t/allow"
expect "allowlisted hit warns, exit 0" 0 "warning: skills/plain/SKILL.md:[0-9]+: body names 'linctl'.*allowlisted" -- lint
echo 'Run linctl here too.' >> "$WORK/t/skills/categorized/SKILL.md"
expect "new hit outside the allowlist fails" 1 'error: skills/categorized/SKILL.md:[0-9]+: body names' -- lint

reset
echo 'skills/plain/SKILL.md linctl' > "$WORK/t/allow"
expect "stale allowlist entry is an error" 1 'error: allow:1: stale entry, remove it: skills/plain/SKILL.md linctl' -- lint
echo 'skills/plain/SKILL.md not-a-pattern' > "$WORK/t/allow"
expect "allowlist entry with an unknown pattern is an error" 1 'error: .*allow:1: want' -- lint

# --- frontmatter: the renderer's rules ---------------------------------------
reset
cp -R "$FIX/bad/no-description" "$WORK/t/skills/"
expect "missing description fails" 1 "error: skills/no-description/SKILL.md:1: frontmatter is missing 'description'" -- lint
reset
add_skill no-name 'description: has no name'
expect "missing name fails" 1 "error: skills/no-name/SKILL.md:1: 'name' must match" -- lint
reset
cp -R "$FIX/bad/malformed" "$WORK/t/skills/"
expect "invalid YAML fails at its line" 1 'error: skills/malformed/SKILL.md:4: frontmatter is not valid YAML' -- lint
reset
cp -R "$FIX/bad/no-frontmatter" "$WORK/t/skills/"
expect "missing frontmatter fails" 1 'error: skills/no-frontmatter/SKILL.md:1: file does not start' -- lint
reset
cp -R "$FIX/bad/agent-platforms" "$WORK/t/skills/"
expect "agent names in platforms fail" 1 \
  "error: skills/agent-platforms/SKILL.md:1: 'platforms' must list only linux, macos, windows; use \`targets\` for agents" -- lint
reset
add_skill os-agent 'name: os-agent' 'description: d' 'metadata:' '  hermes:' '    os: [claude-code]'
expect "agent names in metadata.hermes.os fail" 1 "'metadata.hermes.os' must list only linux, macos, windows" -- lint
reset
sed -i.bak 's/^targets: \[claude-code, hermes\]$/targets: [claude-code, hermes]\
platforms: [linux, macos]/' "$WORK/t/skills/categorized/SKILL.md"
rm -f "$WORK/t/skills/categorized/SKILL.md.bak"
grep -q '^platforms: \[linux, macos\]$' "$WORK/t/skills/categorized/SKILL.md" || bad "setup: platforms line not added"
expect "OS names in platforms pass" 0 '0 errors' -- lint
reset
add_skill targets-str 'name: targets-str' 'description: d' 'targets: hermes'
expect "targets as a string fails" 1 "'targets' must be a list of strings" -- lint
reset
add_skill foo 'name: Foo_Bar' 'description: d'
expect "name Foo_Bar fails" 1 "error: skills/foo/SKILL.md:1: 'name' must match" -- lint
reset
mkdir -p "$WORK/t/skills/fence-space"
printf -- '--- \nname: fence-space\ndescription: d\n---\nbody\n' > "$WORK/t/skills/fence-space/SKILL.md"
expect "fence with a trailing space fails" 1 "error: skills/fence-space/SKILL.md:1: file does not start" -- lint
reset
add_skill unknown 'name: unknown' 'description: d' 'metadata:' '  hermes:' '    extra: x'
expect "unknown metadata.hermes key warns, exit 0" 0 "warning: skills/unknown/SKILL.md:1: dropping unknown key metadata.hermes.'extra'" -- lint
reset
cp -R "$FIX/bad/alias-bomb" "$WORK/t/skills/"
expect "alias bomb is rejected" 1 'error: skills/alias-bomb/SKILL.md:[0-9]+: YAML aliases are not allowed' -- lint
if within 5 "${LINT[@]}" --base "$WORK/t" --allowlist "$WORK/t/allow" skills; then
  ok "alias bomb lint finishes in under 5 seconds"
else
  bad "alias bomb lint finishes in under 5 seconds"
fi
# Amplification: one 30 KB string aliased 8000 times, in under 64 KB of input.
reset
mkdir -p "$WORK/t/skills/ampl"
python3 -c 'import sys; open(sys.argv[1], "w").write("---\nname: ampl\ndescription: &s " + "a" * 30000 + "\nmetadata:\n  hermes:\n    tags: [" + ", ".join(["*s"] * 8000) + "]\n---\nbody\n")' "$WORK/t/skills/ampl/SKILL.md"
expect "alias amplification is rejected" 1 'error: skills/ampl/SKILL.md:[0-9]+: YAML aliases are not allowed' -- lint
if within 5 "${LINT[@]}" --base "$WORK/t" --allowlist "$WORK/t/allow" skills; then
  ok "alias amplification lint finishes in under 5 seconds"
else
  bad "alias amplification lint finishes in under 5 seconds"
fi
# Deep nesting is one skill's error; the rest of the run still reports.
reset
mkdir -p "$WORK/t/skills/deep"
python3 -c 'import sys; open(sys.argv[1], "w").write("---\nname: deep\ndescription: d\nx: " + "[" * 20000 + "]" * 20000 + "\n---\nbody\n")' "$WORK/t/skills/deep/SKILL.md"
echo 'Run linctl here.' >> "$BODY"
out="$(lint 2>&1)"; rc=$?
if [[ $rc -eq 1 ]] && grep -q 'error: skills/deep/SKILL.md:1: frontmatter is nested too deeply' <<<"$out" \
   && grep -q "error: skills/plain/SKILL.md:[0-9]*: body names 'linctl'" <<<"$out"; then
  ok "deeply nested YAML is one error and the other skills are still linted"
else
  bad "deeply nested YAML is one error and the other skills are still linted (rc=$rc)"
  printf '    %s\n' "$out" | tail -5
fi

# --- discovery ---------------------------------------------------------------
reset
mkdir -p "$WORK/t/skills/docs/archive/old" "$WORK/t/skills/external/vendor"
cp "$FIX/bad/no-frontmatter/SKILL.md" "$WORK/t/skills/docs/archive/old/"
cp "$FIX/bad/no-frontmatter/SKILL.md" "$WORK/t/skills/external/vendor/"
expect "docs/archive and external are ignored" 0 '4 files, 0 errors' -- lint
reset
mkdir -p "$WORK/t/skills/linked"
ln -s "$FIX/skills/plain/SKILL.md" "$WORK/t/skills/linked/SKILL.md"
expect "a symlinked SKILL.md is an error" 1 'linked/SKILL.md: is a symlink' -- lint

if [[ "$fail" -ne 0 ]]; then
  echo "test-lint-skills: FAILED"
  exit 1
fi
echo "test-lint-skills: all passed"

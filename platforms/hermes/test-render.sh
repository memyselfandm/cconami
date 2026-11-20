#!/usr/bin/env bash
# Tests for render.py and install.sh against tests/fixtures/. Writes only to a
# temp directory. Needs uv (or python3 with PyYAML).
#   bash platforms/hermes/test-render.sh
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$HERE/../.." && pwd)"
FIX="$REPO/tests/fixtures"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

if command -v uv >/dev/null 2>&1; then
  RENDER=(uv run --quiet --script "$HERE/render.py")
  PY=(uv run --quiet --no-project --with 'pyyaml>=6' python -B)
else
  RENDER=(python3 "$HERE/render.py")
  PY=(python3 -B)
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
# check NAME -- command...   (passes when the command exits 0)
check() {
  local name="$1"
  shift 2
  if "$@" >/dev/null 2>&1; then ok "$name"; else bad "$name"; fi
}
frontmatter() { awk 'NR==1{next} /^---$/{exit} {print}' "$1"; }
# Bytes after the closing frontmatter fence, written to stdout unchanged.
after_fence() {
  python3 -c '
import sys
data = open(sys.argv[1], "rb").read()
lines = data.splitlines(keepends=True)
n = next(i for i in range(1, len(lines)) if lines[i].rstrip(b"\r\n") == b"---")
sys.stdout.buffer.write(b"".join(lines[n + 1:]))' "$1"
}
mode() { python3 -c 'import os, sys; print(oct(os.stat(sys.argv[1]).st_mode & 0o7777))' "$1"; }
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
# new_skill DIR FRONTMATTER-LINES...   (writes DIR/SKILL.md with a short body)
new_skill() {
  local dir="$1"
  shift
  mkdir -p "$dir"
  { echo '---'; printf '%s\n' "$@"; echo '---'; echo 'body'; } > "$dir/SKILL.md"
}

OUT="$WORK/out"

# --- category ----------------------------------------------------------------
expect "plain skill renders" 0 'wrote: .*/general/plain-skill/SKILL.md' -- \
  "${RENDER[@]}" "$FIX/skills/plain" "$OUT"
P="$OUT/general/plain-skill"
check "category defaults to general" -- test -f "$P/SKILL.md"
expect "categorized skill renders" 0 'project-management/categorized-skill' -- \
  "${RENDER[@]}" "$FIX/skills/categorized" "$OUT"
C="$OUT/project-management/categorized-skill"
check "metadata.hermes.category sets the directory" -- test -f "$C/SKILL.md"

# --- frontmatter -------------------------------------------------------------
fm_plain="$(frontmatter "$P/SKILL.md")"
for key in argument-hint user-invocable disable-model-invocation allowed-tools; do
  check "Claude-only key '$key' dropped" -- bash -c '! grep -q "^$1:" <<<"$2"' _ "$key" "$fm_plain"
done
check "name kept" -- grep -qx 'name: plain-skill' <<<"$fm_plain"
check "description kept, colon still quoted" -- \
  grep -qx "description: 'Fixture with Claude Code keys only. Use when: testing the renderer.'" <<<"$fm_plain"
check "absent platforms stays absent (Hermes reads absent as every OS)" -- \
  bash -c '! grep -q "^platforms:" <<<"$1"' _ "$fm_plain"

fm_cat="$(frontmatter "$C/SKILL.md")"
want_cat='name: categorized-skill
description: Fixture with the full union frontmatter and a category override.
version: 1.2.0
author: cconami
license: MIT
platforms: [linux, macos]
metadata:
  hermes:
    tags: [linear, planning]
    related_skills: [plain-skill]'
if [[ "$fm_cat" == "$want_cat" ]]; then
  ok "union frontmatter: Hermes keys kept in order, targets dropped, platforms from metadata.hermes.os"
else
  bad "union frontmatter mismatch"
  diff <(echo "$want_cat") <(echo "$fm_cat") | sed 's/^/    /'
fi

U="$WORK/src/unknown-key"
new_skill "$U" 'name: unknown-key' 'description: d' 'metadata:' '  hermes:' '    tags: [a]' '    extra: x'
expect "unknown metadata.hermes key is dropped with a warning" 0 \
  "warning: .*dropping unknown key metadata.hermes.'extra'" -- "${RENDER[@]}" "$U" "$OUT"
check "unknown key absent from output" -- bash -c '! grep -q extra "$1"' _ "$OUT/general/unknown-key/SKILL.md"

# --- body, byte for byte -----------------------------------------------------
CR="$WORK/src/crlf"
mkdir -p "$CR"
printf -- '---\r\nname: crlf-skill\r\ndescription: CRLF line endings.\r\n---\r\n\r\n# CRLF\r\nline two\r\n' > "$CR/SKILL.md"
NN="$WORK/src/no-newline"
mkdir -p "$NN"
printf -- '---\nname: no-newline-skill\ndescription: No final newline.\n---\n# Title\nlast line' > "$NN/SKILL.md"
"${RENDER[@]}" "$CR" "$OUT" >/dev/null 2>&1
"${RENDER[@]}" "$NN" "$OUT" >/dev/null 2>&1
"${RENDER[@]}" "$FIX/skills/dashes" "$OUT" >/dev/null 2>&1
for pair in "$CR:crlf-skill" "$NN:no-newline-skill" "$FIX/skills/dashes:dashes-skill"; do
  src="${pair%%:*}" name="${pair##*:}"
  check "body byte-identical: $name" -- \
    cmp <(after_fence "$src/SKILL.md") <(after_fence "$OUT/general/$name/SKILL.md")
done
# The one exception: lines linking another platform's notes are dropped.
check "body identical to source minus the claude-code link line: plain-skill" -- \
  cmp <(after_fence "$FIX/skills/plain/SKILL.md" | grep -vF 'platforms/claude-code.md') \
      <(after_fence "$P/SKILL.md")
check "bare-list and labelled link styles are dropped" -- bash -c \
  '! grep -q "claude-code" "$1" && grep -q "platforms/hermes.md" "$1"' _ "$P/SKILL.md"
LK="$WORK/src/links"
mkdir -p "$LK"
printf -- '---\r\nname: links-skill\r\ndescription: d\r\n---\r\n## Platform notes\r\n\r\n- [platforms/claude-code.md](platforms/claude-code.md)\r\n- Codex: [x](./platforms/codex.md)\r\n- [platforms/hermes.md](platforms/hermes.md)\r\n```\r\n- [platforms/claude-code.md](platforms/claude-code.md)\r\n```\r\nsee [a](platforms/claude-code.md) inline\r\n- [platforms/claude-code.md](platforms/claude-code.md)' > "$LK/SKILL.md"
"${RENDER[@]}" "$LK" "$OUT" >/dev/null 2>&1
printf -- '## Platform notes\r\n\r\n- [platforms/hermes.md](platforms/hermes.md)\r\n```\r\n- [platforms/claude-code.md](platforms/claude-code.md)\r\n```\r\nsee [a](platforms/claude-code.md) inline\r\n' > "$WORK/links-want"
check "links: CRLF and final-line (no newline) drops, fences and prose kept" -- \
  cmp "$WORK/links-want" <(after_fence "$OUT/general/links-skill/SKILL.md")
check "CRLF body keeps its CR bytes" -- grep -q $'\r' "$OUT/general/crlf-skill/SKILL.md"
check "fence-like lines in the body survive" -- grep -qx 'name: not-frontmatter' "$OUT/general/dashes-skill/SKILL.md"

# --- files -------------------------------------------------------------------
check "platforms/hermes.md copied" -- cmp "$FIX/skills/plain/platforms/hermes.md" "$P/platforms/hermes.md"
check "platforms/claude-code.md not copied" -- test ! -e "$P/platforms/claude-code.md"
check "other platforms' files not copied" -- test ! -e "$P/platforms/codex.md"
check "templates/ copied" -- cmp "$FIX/skills/plain/templates/item.md" "$P/templates/item.md"
check "references/ copied" -- test -f "$C/references/guide.md"

M="$WORK/src/modes"
new_skill "$M" 'name: modes-skill' 'description: d'
mkdir -p "$M/scripts" "$M/node_modules/pkg" "$M/.git"
printf '#!/bin/sh\n' > "$M/scripts/run.sh"
printf 'data\n' > "$M/data.md"
printf 'x\n' > "$M/node_modules/pkg/index.js"
printf 'x\n' > "$M/.git/config"
chmod 4777 "$M/scripts/run.sh"
chmod 0666 "$M/data.md"
"${RENDER[@]}" "$M" "$OUT" >/dev/null 2>&1
MO="$OUT/general/modes-skill"
check "setuid, world-writable executable becomes 0755" -- test "$(mode "$MO/scripts/run.sh")" = 0o755
check "world-writable file becomes 0644" -- test "$(mode "$MO/data.md")" = 0o644
check "SKILL.md is 0644" -- test "$(mode "$MO/SKILL.md")" = 0o644
check "node_modules not copied" -- test ! -e "$MO/node_modules"
check "hidden directories not copied" -- test ! -e "$MO/.git"

# --- targets exclusion -------------------------------------------------------
expect "targets without hermes is skipped with a message" 0 'skip: .*claude-only.*targets excludes hermes' -- \
  "${RENDER[@]}" "$FIX/skills/claude-only" "$OUT"
check "skipped skill wrote nothing" -- test ! -e "$OUT/general/claude-only-skill"

# --- invalid skills ----------------------------------------------------------
B="$WORK/bad"
expect "malformed frontmatter fails" 2 'not valid YAML' -- "${RENDER[@]}" "$FIX/bad/malformed" "$B"
expect "missing description fails" 2 "missing 'description'" -- "${RENDER[@]}" "$FIX/bad/no-description" "$B"
expect "missing frontmatter fails" 2 "does not start with a '---'" -- "${RENDER[@]}" "$FIX/bad/no-frontmatter" "$B"
expect "agent names in platforms fail" 2 'use `targets` for agents' -- "${RENDER[@]}" "$FIX/bad/agent-platforms" "$B"
new_skill "$WORK/src/os-agent" 'name: os-agent' 'description: d' 'metadata:' '  hermes:' '    os: [claude-code]'
expect "agent names in metadata.hermes.os fail" 2 "'metadata.hermes.os' must list only linux, macos, windows" -- \
  "${RENDER[@]}" "$WORK/src/os-agent" "$B"
new_skill "$WORK/src/targets-str" 'name: targets-str' 'description: d' 'targets: hermes'
expect "targets as a string fails" 2 "'targets' must be a list of strings \(got 'hermes'\)" -- \
  "${RENDER[@]}" "$WORK/src/targets-str" "$B"
mkdir -p "$WORK/src/fence-space"
printf -- '--- \nname: fence-space\ndescription: d\n---\nbody\n' > "$WORK/src/fence-space/SKILL.md"
expect "fence with a trailing space fails" 2 "does not start with a '---'" -- \
  "${RENDER[@]}" "$WORK/src/fence-space" "$B"
mkdir -p "$WORK/src/huge"
{ echo '---'; echo 'name: huge'; echo 'description: d'; printf 'pad: "%070000d"\n' 0; echo '---'; } > "$WORK/src/huge/SKILL.md"
expect "frontmatter over 64 KiB fails" 2 'larger than 65536 bytes' -- "${RENDER[@]}" "$WORK/src/huge" "$B"
expect "alias bomb is rejected" 2 'YAML aliases are not allowed' -- "${RENDER[@]}" "$FIX/bad/alias-bomb" "$B"
check "alias bomb finishes in under 5 seconds" -- within 5 "${RENDER[@]}" "$FIX/bad/alias-bomb" "$B"
# Amplification: one 30 KB string, aliased 8000 times, in under 64 KB of input.
# Without the alias ban this renders a ~240 MB SKILL.md.
mkdir -p "$WORK/src/ampl"
python3 -c 'import sys; open(sys.argv[1], "w").write("---\nname: ampl\ndescription: &s " + "a" * 30000 + "\nmetadata:\n  hermes:\n    tags: [" + ", ".join(["*s"] * 8000) + "]\n---\nbody\n")' "$WORK/src/ampl/SKILL.md"
check "setup: amplification input is under 64 KiB" -- test "$(wc -c < "$WORK/src/ampl/SKILL.md")" -lt 65536
expect "alias amplification fails the dry run" 2 'YAML aliases are not allowed' -- \
  "${RENDER[@]}" --dry-run "$WORK/src/ampl" "$B"
check "alias amplification dry run finishes in under 5 seconds" -- within 5 "${RENDER[@]}" --dry-run "$WORK/src/ampl" "$B"
mkdir -p "$WORK/src/deep"
python3 -c 'import sys; open(sys.argv[1], "w").write("---\nname: deep\ndescription: d\nx: " + "[" * 20000 + "]" * 20000 + "\n---\nbody\n")' "$WORK/src/deep/SKILL.md"
expect "deeply nested YAML is a clean error" 2 'frontmatter is nested too deeply' -- "${RENDER[@]}" "$WORK/src/deep" "$B"
new_skill "$WORK/src/tags-dict" 'name: tags-dict' 'description: d' 'metadata:' '  hermes:' '    tags: {a: 1}'
expect "a structured value is named by its type only" 2 "'metadata.hermes.tags' must be a list of strings \(got dict\)" -- \
  "${RENDER[@]}" "$WORK/src/tags-dict" "$B"
expect "rendered frontmatter over 64 KiB fails" 0 'refused' -- "${PY[@]}" -c '
import sys
sys.path.insert(0, sys.argv[1])
import render
real = render.parse_frontmatter
render.parse_frontmatter = lambda t: dict(real(t), description="d" * 70000)
try:
    render.prepare(sys.argv[2])
except render.SkillError as exc:
    print("refused" if "rendered frontmatter is larger" in str(exc) else exc)
' "$HERE" "$FIX/skills/plain"
expect "missing arguments is a usage error" 1 'usage:' -- "${RENDER[@]}" "$FIX/skills/plain"

# --- path safety -------------------------------------------------------------
slug_case() {  # slug_case LABEL KEY VALUE
  local dir="$WORK/slug/$1"
  if [[ "$2" == name ]]; then
    new_skill "$dir" "name: \"$3\"" 'description: d'
  else
    new_skill "$dir" 'name: ok' 'description: d' 'metadata:' '  hermes:' "    category: \"$3\""
  fi
  expect "$2 '$3' is rejected" 2 "'.*$2' must match" -- "${RENDER[@]}" "$dir" "$B"
}
slug_case n1 name '../evil'
slug_case n2 name 'a/b'
slug_case n3 name '/tmp/abs'
slug_case n4 name 'Foo_Bar'
slug_case n5 name "$(printf 'a%.0s' {1..65})"
slug_case c1 category '../evil'
slug_case c2 category 'a/b'
slug_case c3 category '/tmp/abs'
check "invalid skills wrote nothing" -- test ! -e "$B" -a ! -e "$WORK/evil"

# --- links and special files -------------------------------------------------
SL="$WORK/symlink/skill"
mkdir -p "$SL/references" "$WORK/symlink/outside-dir"
cp "$FIX/skills/plain/SKILL.md" "$SL/"
echo secret > "$WORK/symlink/outside.txt"
echo secret > "$WORK/symlink/outside-dir/inner.txt"
echo real > "$SL/references/real.md"
ln -s "$WORK/symlink/outside.txt" "$SL/references/leak.md"
ln -s "$WORK/symlink/outside-dir" "$SL/linked-dir"
expect "symlinks are skipped with a warning" 0 'warning: skipping symlink .*leak.md' -- \
  "${RENDER[@]}" "$SL" "$WORK/sl-out"
S="$WORK/sl-out/general/plain-skill"
check "real file next to a symlink is copied" -- test -f "$S/references/real.md"
check "symlinked file not copied" -- test ! -e "$S/references/leak.md"
check "symlinked directory not copied" -- test ! -e "$S/linked-dir"
check "nothing from outside reached the output" -- bash -c '! grep -rq secret "$1"' _ "$WORK/sl-out"
mkdir -p "$WORK/symlink/md-link"
ln -s "$FIX/skills/plain/SKILL.md" "$WORK/symlink/md-link/SKILL.md"
expect "a symlinked SKILL.md is rejected" 2 'is a symlink' -- "${RENDER[@]}" "$WORK/symlink/md-link" "$B"

HL="$WORK/src/hardlink"
new_skill "$HL" 'name: hardlink-skill' 'description: d'
echo secret > "$WORK/src/hardlink-target.txt"
ln "$WORK/src/hardlink-target.txt" "$HL/linked.md"
expect "a hardlinked file is an error" 2 'linked.md: is a hardlink' -- "${RENDER[@]}" "$HL" "$B"

# A FIFO in an existing skill: pass 1 (dry run) must catch it, and a failing
# run must leave the installed copy untouched.
FF="$WORK/src/fifo"
new_skill "$FF" 'name: fifo-skill' 'description: d'
echo v1 > "$FF/notes.md"
"${RENDER[@]}" "$FF" "$WORK/ff-out" >/dev/null 2>&1
cp -R "$WORK/ff-out" "$WORK/ff-before"
mkfifo "$FF/pipe"
echo v2 > "$FF/notes.md"
expect "a FIFO fails the dry run" 2 'pipe: is not a regular file' -- "${RENDER[@]}" --dry-run "$FF" "$WORK/ff-out"
expect "a FIFO fails the real run" 2 'pipe: is not a regular file' -- "${RENDER[@]}" --force "$FF" "$WORK/ff-out"
check "failed run left the installed skill unchanged" -- diff -r "$WORK/ff-before" "$WORK/ff-out"
# Atomic write on its own: a file that turns into a FIFO after planning.
expect "write_skill failure leaves the existing skill in place" 0 'kept' -- "${PY[@]}" -c '
import os, sys
from pathlib import Path
sys.path.insert(0, sys.argv[1])
import render
src, out = Path(sys.argv[2]), Path(sys.argv[3])
os.remove(src / "pipe")
plan = render.prepare(src)
os.remove(src / "notes.md")
os.mkfifo(src / "notes.md")
try:
    render.write_skill(plan, out / "general" / "fifo-skill")
except render.SkillError:
    print("kept" if (out / "general" / "fifo-skill" / "notes.md").read_text() == "v1\n" else "lost")
' "$HERE" "$FF" "$WORK/ff-out"
check "no temp directories left behind" -- \
  bash -c '! ls -A "$1/general" | grep -q "^\." && ! ls -A "$1/.hermes-dist" 2>/dev/null | grep -q .' _ "$WORK/ff-out"

# --- replace needs --force ---------------------------------------------------
R="$WORK/replace"
"${RENDER[@]}" "$FIX/skills/plain" "$R" >/dev/null 2>&1
expect "dry run reports would replace" 0 'would replace: .*plain-skill/SKILL.md' -- \
  "${RENDER[@]}" --dry-run "$FIX/skills/plain" "$R"
expect "replacing without --force is refused" 3 'refusing to replace without --force' -- \
  "${RENDER[@]}" "$FIX/skills/plain" "$R"
expect "replacing with --force works" 0 'wrote: .*plain-skill' -- \
  "${RENDER[@]}" --force "$FIX/skills/plain" "$R"

# A dangling symlink at the destination counts as something to replace.
DL="$WORK/dangling"
mkdir -p "$DL/general"
ln -s "$WORK/nowhere" "$DL/general/plain-skill"
expect "dangling symlink at dest: dry run reports would replace" 0 'would replace: .*plain-skill' -- \
  "${RENDER[@]}" --dry-run "$FIX/skills/plain" "$DL"
expect "dangling symlink at dest: refused without --force" 3 'refusing to replace' -- \
  "${RENDER[@]}" "$FIX/skills/plain" "$DL"
expect "dangling symlink at dest: replaced with --force" 0 'wrote: .*plain-skill' -- \
  "${RENDER[@]}" --force "$FIX/skills/plain" "$DL"
check "dest is now a real directory" -- test -d "$DL/general/plain-skill" -a ! -L "$DL/general/plain-skill"
check "the symlink target was not created" -- test ! -e "$WORK/nowhere"

# The staging dir must be a real directory: a symlink would put temp builds
# and old copies outside the out-root, and a file used to crash mid-run.
SG="$WORK/staging"
mkdir -p "$SG/link-out" "$SG/elsewhere" "$SG/file-out"
ln -s "$SG/elsewhere" "$SG/link-out/.hermes-dist"
expect "symlinked .hermes-dist fails the dry run" 2 'hermes-dist: must be a real directory owned by you' -- \
  "${RENDER[@]}" --dry-run "$FIX/skills/plain" "$SG/link-out"
expect "symlinked .hermes-dist fails the real run" 2 'hermes-dist: must be a real directory owned by you' -- \
  "${RENDER[@]}" --force "$FIX/skills/plain" "$SG/link-out"
check "nothing written through the symlink" -- test -z "$(ls -A "$SG/elsewhere")"
check "nothing written in the out-root" -- test "$(ls -A "$SG/link-out")" = .hermes-dist
: > "$SG/file-out/.hermes-dist"
out="$("${RENDER[@]}" --force "$FIX/skills/plain" "$SG/file-out" 2>&1)"; rc=$?
if [[ $rc -eq 2 ]] && grep -q 'must be a real directory owned by you' <<<"$out" && ! grep -q Traceback <<<"$out"; then
  ok "a file at .hermes-dist is a clean error (exit 2, no traceback)"
else
  bad "a file at .hermes-dist is a clean error (rc=$rc)"
  printf '    %s\n' "$out" | tail -5
fi
check "no empty general/ left behind" -- test ! -e "$SG/file-out/general"
# The write path checks again on its own (planning is skipped here), in case
# .hermes-dist is swapped for a symlink between planning and writing.
expect "write path rejects a symlinked .hermes-dist" 0 'refused, nothing outside' -- "${PY[@]}" -c '
import os, sys
from pathlib import Path
sys.path.insert(0, sys.argv[1])
import render
plan = render.prepare(sys.argv[2])
out, elsewhere = Path(sys.argv[3]), Path(sys.argv[4])
try:
    render.write_skill(plan, out / "general" / "plain-skill")
    print("written")
except render.SkillError:
    print("refused, nothing outside" if not os.listdir(elsewhere) else "refused, but wrote outside")
' "$HERE" "$FIX/skills/plain" "$SG/link-out" "$SG/elsewhere"

# A failed cleanup of the previous copy warns and does not stop the run.
CL="$WORK/cleanup"
mkdir -p "$CL/src/one" "$CL/src/two"
new_skill "$CL/src/one" 'name: one' 'description: d'
new_skill "$CL/src/two" 'name: two' 'description: d'
"${RENDER[@]}" --all "$CL/out" "$CL/src" >/dev/null 2>&1
expect "cleanup failure warns and the run continues" 0 'could not remove .*/\.hermes-dist/one\.old-.*delete it by hand' -- "${PY[@]}" -c '
import shutil, sys
from pathlib import Path
sys.path.insert(0, sys.argv[1])
import render
real = shutil.rmtree
def failing(path, *a, **k):
    if ".old-" in str(path) and not k.get("ignore_errors"):
        raise OSError(16, "Device or resource busy")
    return real(path, *a, **k)
render.shutil.rmtree = failing
src, out = Path(sys.argv[2]), Path(sys.argv[3])
render.render_skills([src / "one", src / "two"], out, force=True)
print("two written" if (out / "general" / "two" / "SKILL.md").is_file() else "two missing")
' "$HERE" "$CL/src" "$CL/out"

# Unreadable file: the dry run must catch it, and a failed run must not leave
# a mixed install (some skills new, some old).
if [[ "$(id -u)" -eq 0 ]]; then
  ok "unreadable-file tests skipped (running as root)"
else
  UR="$WORK/unreadable"
  new_skill "$UR/src/aaa" 'name: aaa' 'description: d'
  new_skill "$UR/src/zzz" 'name: zzz' 'description: d'
  echo v1 > "$UR/src/aaa/notes.md"
  echo v1 > "$UR/src/zzz/notes.md"
  "${RENDER[@]}" --all "$UR/out" "$UR/src" >/dev/null 2>&1
  echo v2 > "$UR/src/aaa/notes.md"
  chmod 000 "$UR/src/zzz/notes.md"
  expect "unreadable file fails the dry run" 2 'zzz/notes.md: cannot open' -- \
    "${RENDER[@]}" --dry-run --force --all "$UR/out" "$UR/src"
  expect "unreadable file fails the real run" 2 'zzz/notes.md: cannot open' -- \
    "${RENDER[@]}" --force --all "$UR/out" "$UR/src"
  check "no skill was replaced (aaa still v1)" -- grep -qx v1 "$UR/out/general/aaa/notes.md"
  chmod 644 "$UR/src/zzz/notes.md"
  # Build-all-first on its own: zzz turns unreadable after planning, so only
  # the build step can catch it. aaa must not be swapped in.
  expect "a build failure in one skill installs none" 0 'aaa kept, no temp dirs' -- "${PY[@]}" -c '
import os, sys
from pathlib import Path
sys.path.insert(0, sys.argv[1])
import render
src, out = Path(sys.argv[2]), Path(sys.argv[3])
real = render.prepare
def prepare(d):
    plan = real(d)
    if Path(d).name == "zzz":
        os.chmod(Path(d) / "notes.md", 0)
    return plan
render.prepare = prepare
try:
    render.render_skills([src / "aaa", src / "zzz"], out, force=True)
except render.SkillError:
    kept = (out / "general" / "aaa" / "notes.md").read_text() == "v1\n"
    leftovers = [p for p in (out / "general").iterdir() if p.name.startswith(".")]
    if (out / ".hermes-dist").exists():
        leftovers += list((out / ".hermes-dist").iterdir())
    print("aaa kept, no temp dirs" if kept and not leftovers else f"kept={kept} leftovers={leftovers}")
finally:
    os.chmod(src / "zzz" / "notes.md", 0o644)
' "$HERE" "$UR/src" "$UR/out"
fi

# --- --all discovery ---------------------------------------------------------
D="$WORK/disc"
mkdir -p "$D/root/docs/archive" "$D/root/external" "$D/root/one/platforms/inner"
cp -R "$FIX/skills/plain" "$D/root/one/"
cp -R "$FIX/bad/no-frontmatter" "$D/root/docs/archive/old"
cp -R "$FIX/bad/no-frontmatter" "$D/root/external/vendor"
cp "$FIX/bad/no-frontmatter/SKILL.md" "$D/root/one/platforms/inner/SKILL.md"
expect "--all skips platforms/, docs/archive/ and external/" 0 'would write: .*plain-skill' -- \
  "${RENDER[@]}" --dry-run --all "$D/out" "$D/root"
mkdir -p "$D/root/linked"
ln -s "$FIX/skills/categorized/SKILL.md" "$D/root/linked/SKILL.md"
expect "--all rejects a symlinked SKILL.md" 2 'linked/SKILL.md: is a symlink; skills must be real files' -- \
  "${RENDER[@]}" --dry-run --all "$D/out" "$D/root"

# --- install.sh --------------------------------------------------------------
expect "install requires a target" 1 'usage:' -- bash "$HERE/install.sh"
expect "install --dry-run lists, writes nothing" 0 'would write: .*plain-skill' -- \
  bash "$HERE/install.sh" --dry-run "$WORK/dry" "$FIX/skills"
check "dry run left target absent" -- test ! -e "$WORK/dry"
expect "install renders every skill under a root" 0 'categorized-skill' -- \
  bash "$HERE/install.sh" "$WORK/inst" "$FIX/skills"
check "install wrote the portable skills" -- \
  test -f "$WORK/inst/general/plain-skill/SKILL.md" -a -f "$WORK/inst/project-management/categorized-skill/SKILL.md"
check "install skipped the claude-only skill" -- test ! -e "$WORK/inst/general/claude-only-skill"
check "an empty .hermes-dist staging dir is removed" -- test ! -e "$WORK/inst/.hermes-dist"
expect "reinstall dry run reports would replace" 0 'would replace: .*plain-skill' -- \
  bash "$HERE/install.sh" --dry-run "$WORK/inst" "$FIX/skills"
expect "reinstall without --force is refused" 3 'refusing to replace' -- \
  bash "$HERE/install.sh" "$WORK/inst" "$FIX/skills"
expect "reinstall with --force works" 0 'wrote: .*plain-skill' -- \
  bash "$HERE/install.sh" --force "$WORK/inst" "$FIX/skills"
expect "install fails on a bad skill, before writing" 2 'not valid YAML' -- \
  bash "$HERE/install.sh" "$WORK/inst-bad" "$FIX/bad/malformed"
check "failed install wrote nothing" -- test ! -e "$WORK/inst-bad"
expect "install rejects a bad name before writing" 2 'must match' -- \
  bash "$HERE/install.sh" "$WORK/inst-slug" "$WORK/slug/n1"
check "rejected install wrote nothing" -- test ! -e "$WORK/inst-slug"
mkdir -p "$WORK/dup/a" "$WORK/dup/b"
cp "$FIX/skills/plain/SKILL.md" "$WORK/dup/a/"
cp "$FIX/skills/plain/SKILL.md" "$WORK/dup/b/"
expect "install fails when two skills share a name" 2 'two skills render to' -- \
  bash "$HERE/install.sh" "$WORK/inst-dup" "$WORK/dup"
mkdir -p "$WORK/spaced/my skill"
cp "$FIX/skills/plain/SKILL.md" "$WORK/spaced/my skill/"
expect "install handles a space in a skill path" 0 'wrote: .*plain-skill' -- \
  bash "$HERE/install.sh" "$WORK/inst-spaced" "$WORK/spaced"
# Options after the target are roots, never flags.
cp "$WORK/inst/general/plain-skill/SKILL.md" "$WORK/plain-before.md"
echo "local edit" >> "$WORK/inst/general/plain-skill/SKILL.md"
expect "a trailing --force is a root, not a flag" 2 '^  --force: not a directory$' -- \
  bash "$HERE/install.sh" "$WORK/inst" "$FIX/skills" --force
check "the trailing --force replaced nothing" -- grep -q 'local edit' "$WORK/inst/general/plain-skill/SKILL.md"
mkdir -p "$WORK/dash/-skills/plain"
cp "$FIX/skills/plain/SKILL.md" "$WORK/dash/-skills/plain/"
expect "a root starting with - is a path" 0 'wrote: .*plain-skill' -- \
  bash -c 'cd "$1" && bash "$2" out -skills' _ "$WORK/dash" "$HERE/install.sh"

# --- unit cases for the link filter ------------------------------------------
cat > "$WORK/unit.py" <<'PYEOF'
import sys
sys.path.insert(0, sys.argv[1])
from render import drop_foreign_platform_links as drop
L = "[x](platforms/claude-code.md)"
keep = {
    "A: 4-tick fence around a 3-tick one": f"````\n```\n- {L}\n```\n- {L}\n````\n",
    "B: fence indented 4 spaces in a list is indented code": f"- item\n\n    ```\n    - {L}\n    ```\n",
    "indented code block": f"para\n\n    - {L}\n",
    "C: inner ```js is content, not a closer": f"```\n```js\n- {L}\n```\n",
    "tilde fence is not closed by backticks": f"~~~\n```\n- {L}\n~~~\n",
    "shorter closer does not close": f"````\n```\n- {L}\n",
    "closer with trailing text does not close": f"```\n``` x\n- {L}\n```\n",
    "blockquote": f"> Note: {L}\n",
    "hermes in any case": "- [x](platforms/Hermes.md)\n- [x](platforms/HERMES.md)\n",
    "link inside prose": f"see {L} for more\n",
}
drop_ = {
    "D: ```x``` y is inline code, not an opener": (f"```x``` y\n- {L}\n", "```x``` y\n"),
    "numbered items": (f"1. {L}\n2) {L}\n", ""),
    "anchor": ("- [x](platforms/claude-code.md#setup)\n", ""),
    "titles": ("- [x](platforms/claude-code.md \"Claude Code\")\n- [x](platforms/codex.md 't')\n", ""),
    "case-insensitive name": ("- [x](platforms/Claude-Code.md)\n", ""),
    "0-3 spaces of indent": (f"   - {L}\n", ""),
    "label prefix, CRLF": (f"- Claude Code: {L}\r\nend\r\n", "end\r\n"),
    "last line without newline": (f"a\n- {L}", "a\n"),
    "fence closed, link after it": (f"```\n```\n- {L}\n", "```\n```\n"),
}
fail = 0
for name, text in keep.items():
    if drop(text) != text:
        print("FAIL keep:", name)
        fail = 1
for name, (text, want) in drop_.items():
    if drop(text) != want:
        print("FAIL drop:", name, repr(drop(text)))
        fail = 1
sys.exit(fail)
PYEOF
out="$("${PY[@]}" "$WORK/unit.py" "$HERE" 2>&1)"; rc=$?
if [[ "$rc" -eq 0 ]]; then ok "link filter unit cases (fences, indented code, link styles)"; else bad "link filter unit cases"; printf '    %s\n' "$out"; fi

# --- every real skill: each relative link resolves in the output ---------------
ALL="$WORK/all-out"
expect "every repo skill renders" 0 'wrote: ' -- "${RENDER[@]}" --all "$ALL"
cat > "$WORK/linkcheck.py" <<'PYEOF'
import os, re, sys
sys.path.insert(0, sys.argv[2])
import render  # shares the renderer's CommonMark fence tracking
root, bad, n = sys.argv[1], [], 0
link = re.compile(r"(?<!!)\[[^\]\n]*\]\(\s*<?([^)\s>]+)>?(?:\s+(?:\"[^\"]*\"|'[^']*'))?\s*\)")
for here, dirs, files in os.walk(root):
    dirs[:] = [d for d in dirs if not d.startswith(".")]
    for f in files:
        if not f.endswith(".md"):
            continue
        path = os.path.join(here, f)
        text = open(path, encoding="utf-8", newline="").read()
        for i, (line, fenced) in enumerate(render.mark_fences(render.split_lines(text)), 1):
            if fenced or line.startswith("    "):
                continue
            for target in link.findall(line):
                if re.match(r"[a-z][a-z0-9+.-]*:|#", target, re.I):
                    continue
                t = target.split("#")[0]
                if not t:
                    continue
                n += 1
                dest = os.path.normpath(os.path.join(here, t))
                if not os.path.exists(dest):
                    bad.append(f"{os.path.relpath(path, root)}:{i}: {target}")
print(f"{n} relative links checked")
for b in bad:
    print("dangling:", b)
sys.exit(1 if bad or n == 0 else 0)
PYEOF
out="$("${PY[@]}" "$WORK/linkcheck.py" "$ALL" "$HERE" 2>&1)"; rc=$?
if [[ "$rc" -eq 0 ]]; then ok "rendered tree: every relative link resolves ($out)"; else bad "rendered tree has dangling links"; printf '    %s\n' "$out"; fi

if [[ "$fail" -ne 0 ]]; then
  echo "test-render: FAILED"
  exit 1
fi
echo "test-render: all passed"

#!/usr/bin/env bash
# Tests for check-versions.py. Builds a throwaway git repository in a temp
# directory; nothing in this repository is modified.
#   bash scripts/test-check-versions.sh
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CHECK="$HERE/check-versions.py"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

fail=0
ok() { echo "ok:   $1"; }
bad() { echo "FAIL: $1"; fail=1; }
# expect NAME WANT_RC PATTERN
expect() {
  local name="$1" want="$2" pattern="$3" out rc
  out="$(python3 "$CHECK" --base main --repo "$R" 2>&1)"; rc=$?
  if [[ "$rc" -eq "$want" ]] && grep -Eq -- "$pattern" <<<"$out"; then
    ok "$name"
  else
    bad "$name (rc=$rc, want $want; pattern '$pattern')"
    printf '    %s\n' "$out"
  fi
}
g() { git -C "$R" -c user.name=test -c user.email=test@example.invalid "$@" >/dev/null 2>&1; }
manifest() { # manifest PLUGIN VERSION
  mkdir -p "$R/plugins/$1/.claude-plugin"
  printf '{"name": "%s", "version": "%s"}\n' "$1" "$2" >"$R/plugins/$1/.claude-plugin/plugin.json"
}
# new_repo: main with plugins alpha 0.1.0 and beta 0.1.0, then a branch.
new_repo() {
  R="$WORK/$1"
  mkdir -p "$R"
  g init -q -b main
  manifest alpha 0.1.0
  manifest beta 0.1.0
  echo skill >"$R/plugins/alpha/SKILL.md"
  echo doc >"$R/plugins/MODS.md"
  g add -A
  g commit -q -m base
  g checkout -q -b change
}
commit() { g add -A; g commit -q -m change; }

new_repo unchanged
expect "no plugin change passes" 0 '^versions ok: 0 changed'

new_repo bumped
echo more >>"$R/plugins/alpha/SKILL.md"
manifest alpha 0.2.0
commit
expect "a change with a bump passes" 0 '^versions ok: 1 changed'

# Mutation: the same change without the bump.
new_repo not-bumped
echo more >>"$R/plugins/alpha/SKILL.md"
commit
expect "a change without a bump fails" 1 "plugins/alpha changed but its version is still '0.1.0'"

new_repo tests-only
mkdir -p "$R/plugins/beta/tests"
echo t >"$R/plugins/beta/tests/x.test.ts"
commit
expect "a tests-only change passes without a bump" 0 '^versions ok: 0 changed'

new_repo outside
echo more >>"$R/plugins/MODS.md"
commit
expect "a change to plugins/MODS.md needs no bump" 0 '^versions ok: 0 changed'

new_repo new-plugin
manifest gamma 0.1.0
commit
expect "a new plugin passes" 0 '^versions ok'

new_repo main-moved
echo more >>"$R/plugins/alpha/SKILL.md"
manifest alpha 0.2.0
commit
g checkout -q main
echo other >>"$R/plugins/beta/.claude-plugin/plugin.json.note"
commit
g checkout -q change
expect "changes on the base branch are not counted" 0 '^versions ok: 1 changed'

R="$WORK/missing"
expect "a bad base ref exits 2" 2 'git failed'

if [[ "$fail" -ne 0 ]]; then
  echo "check-versions tests FAILED"
  exit 1
fi
echo "check-versions tests passed"

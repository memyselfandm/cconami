#!/usr/bin/env bash
# Tests for check-catalog.py. Copies the catalog sources (README.md,
# marketplace.json and each plugin's plugin.json) into a temp directory and
# plants mismatches there (mutation checks); nothing in the repo is modified.
#   bash scripts/test-check-catalog.sh
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$HERE/.." && pwd)"
CHECK="$HERE/check-catalog.py"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

fail=0
ok() { echo "ok:   $1"; }
bad() { echo "FAIL: $1"; fail=1; }
# expect NAME WANT_RC PATTERN DIR
expect() {
  local name="$1" want="$2" pattern="$3" dir="$4" out rc
  out="$(python3 "$CHECK" --repo "$dir" 2>&1)"; rc=$?
  if [[ "$rc" -eq "$want" ]] && grep -Eq -- "$pattern" <<<"$out"; then
    ok "$name"
  else
    bad "$name (rc=$rc, want $want; pattern '$pattern')"
    printf '    %s\n' "$out"
  fi
}
# fresh NAME: copy the real catalog sources to $WORK/NAME and print the path.
fresh() {
  local dir="$WORK/$1"
  mkdir -p "$dir/.claude-plugin"
  cp "$REPO/README.md" "$dir/README.md"
  cp "$REPO/.claude-plugin/marketplace.json" "$dir/.claude-plugin/"
  cp -R "$REPO/plugins" "$dir/plugins"
  echo "$dir"
}
# edit_json FILE PYTHON: apply a Python statement to the JSON in FILE as `m`.
edit_json() {
  python3 - "$1" "$2" <<'EOF'
import json, sys
path, code = sys.argv[1], sys.argv[2]
m = json.load(open(path))
exec(code)
json.dump(m, open(path, "w"), indent=2)
EOF
}
market() { echo "$1/.claude-plugin/marketplace.json"; }
manifest() { echo "$1/plugins/$2/.claude-plugin/plugin.json"; }

expect "the repo's catalog is consistent" 0 '^catalog ok: [0-9]+ plugins$' "$REPO"

d="$(fresh copy)"
expect "an unmodified copy is consistent" 0 '^catalog ok' "$d"

# Mutation: remove the ci-status row from the README table.
d="$(fresh row-removed)"
grep -v '^| \[`ci-status`\]' "$REPO/README.md" >"$d/README.md"
if cmp -s "$REPO/README.md" "$d/README.md"; then
  bad "row-removed mutation changed nothing (the README row format moved)"
fi
expect "a README row removed fails" 1 'ci-status is in marketplace.json but not in the README table' "$d"

d="$(fresh row-added)"
awk '{print} /^\| \[`product`\]/{print "| [`ghost`](plugins/ghost/) | Not a plugin | mod |"}' "$REPO/README.md" >"$d/README.md"
expect "an extra README row fails" 1 'ghost is in the README table but not in marketplace.json' "$d"

d="$(fresh row-duplicated)"
awk '{print} /^\| \[`product`\]/{print}' "$REPO/README.md" >"$d/README.md"
expect "a duplicated README row fails" 1 'README.md lists product more than once' "$d"

d="$(fresh no-section)"
sed 's/^## Plugins$/## Plugin list/' "$REPO/README.md" >"$d/README.md"
expect "a README without the Plugins section fails" 1 'no "## Plugins" section' "$d"

d="$(fresh entry-removed)"
edit_json "$(market "$d")" 'm["plugins"] = [p for p in m["plugins"] if p["name"] != "mcp-health"]'
expect "a marketplace entry removed fails (README side)" 1 'mcp-health is in the README table but not in marketplace.json' "$d"
expect "a marketplace entry removed fails (directory side)" 1 'plugins/mcp-health is not in marketplace.json' "$d"

d="$(fresh unlisted-dir)"
mkdir -p "$d/plugins/stray/.claude-plugin"
echo '{"name": "stray"}' >"$d/plugins/stray/.claude-plugin/plugin.json"
expect "a plugin directory not in the marketplace fails" 1 'plugins/stray is not in marketplace.json' "$d"

d="$(fresh bad-source)"
edit_json "$(market "$d")" 'm["plugins"][0]["source"] = "./plugins/elsewhere"'
expect "a marketplace source that is not ./plugins/<name> fails" 1 "marketplace source is './plugins/elsewhere'" "$d"

d="$(fresh missing-dir)"
rm -rf "$d/plugins/product"
expect "a marketplace entry without a plugin directory fails" 1 'product: ./plugins/product has no .claude-plugin/plugin.json' "$d"

# Mutation: rename a plugin in its manifest only.
d="$(fresh manifest-renamed)"
edit_json "$(manifest "$d" ci-status)" 'm["name"] = "ci-state"'
expect "a manifest-only rename fails" 1 "plugins/ci-status: plugin.json name is 'ci-state', want 'ci-status'" "$d"

d="$(fresh dep-unknown)"
edit_json "$(manifest "$d" product)" 'm["dependencies"] = ["linear-flow"]'
expect "a dependency not in the marketplace fails" 1 "plugins/product: dependency 'linear-flow' is not in marketplace.json" "$d"

d="$(fresh dep-qualified)"
edit_json "$(manifest "$d" product)" 'm["dependencies"] = [{"name": "nope", "marketplace": "cconami"}]'
expect "a dependency qualified with this marketplace is checked" 1 "dependency 'nope' is not in marketplace.json" "$d"

d="$(fresh dep-external)"
edit_json "$(manifest "$d" product)" 'm["dependencies"] = ["linear-workflow", "other-tool@elsewhere"]'
expect "a dependency on another marketplace is not checked" 0 '^catalog ok' "$d"

d="$(fresh skill-added)"
mkdir -p "$d/plugins/product/skills/extra"
echo '---' >"$d/plugins/product/skills/extra/SKILL.md"
expect "a skill count that no longer matches fails" 1 'product: README says 2 skills, plugins/product has 3' "$d"

d="$(fresh agent-removed)"
rm "$d/plugins/authoring/agents/database-engineer.md"
expect "an agent count that no longer matches fails" 1 'authoring: README says 6 agents, plugins/authoring has 5' "$d"

d="$(fresh mod-gains-skill)"
mkdir -p "$d/plugins/ci-status/skills/x"
echo '---' >"$d/plugins/ci-status/skills/x/SKILL.md"
expect "a skill in a row that states none fails" 1 'ci-status: README says 0 skills, plugins/ci-status has 1' "$d"

d="$(fresh bad-json)"
echo '{' >"$d/.claude-plugin/marketplace.json"
expect "an unreadable marketplace.json exits 2" 2 'cannot read the catalog sources' "$d"

if [[ "$fail" -ne 0 ]]; then
  echo "check-catalog tests FAILED"
  exit 1
fi
echo "check-catalog tests passed"

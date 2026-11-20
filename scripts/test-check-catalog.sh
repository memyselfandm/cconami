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
  local dir="$WORK/$1" p
  mkdir -p "$dir/.claude-plugin" "$dir/plugins"
  cp "$REPO/README.md" "$dir/README.md"
  cp "$REPO/.claude-plugin/marketplace.json" "$dir/.claude-plugin/"
  for p in "$REPO"/plugins/*/.claude-plugin/plugin.json; do
    p="${p%/.claude-plugin/plugin.json}"
    mkdir -p "$dir/plugins/${p##*/}/.claude-plugin"
    cp "$p/.claude-plugin/plugin.json" "$dir/plugins/${p##*/}/.claude-plugin/"
  done
  echo "$dir"
}
# edit_json DIR PYTHON: apply a Python expression to marketplace.json as `m`.
edit_json() {
  python3 - "$1/.claude-plugin/marketplace.json" "$2" <<'EOF'
import json, sys
path, code = sys.argv[1], sys.argv[2]
m = json.load(open(path))
exec(code)
json.dump(m, open(path, "w"), indent=2)
EOF
}

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
edit_json "$d" 'm["plugins"] = [p for p in m["plugins"] if p["name"] != "mcp-health"]'
expect "a marketplace entry removed fails (README side)" 1 'mcp-health is in the README table but not in marketplace.json' "$d"
expect "a marketplace entry removed fails (directory side)" 1 'plugins/mcp-health is not in marketplace.json' "$d"

d="$(fresh unlisted-dir)"
mkdir -p "$d/plugins/stray/.claude-plugin"
echo '{"name": "stray"}' >"$d/plugins/stray/.claude-plugin/plugin.json"
expect "a plugin directory not in the marketplace fails" 1 'plugins/stray is not in marketplace.json' "$d"

d="$(fresh bad-source)"
edit_json "$d" 'm["plugins"][0]["source"] = "./plugins/elsewhere"'
expect "a marketplace source that is not ./plugins/<name> fails" 1 "marketplace source is './plugins/elsewhere'" "$d"

d="$(fresh missing-dir)"
rm -rf "$d/plugins/product"
expect "a marketplace entry without a plugin directory fails" 1 'product: ./plugins/product has no .claude-plugin/plugin.json' "$d"

d="$(fresh bad-json)"
echo '{' >"$d/.claude-plugin/marketplace.json"
expect "an unreadable marketplace.json exits 2" 2 'cannot read the catalog sources' "$d"

if [[ "$fail" -ne 0 ]]; then
  echo "check-catalog tests FAILED"
  exit 1
fi
echo "check-catalog tests passed"

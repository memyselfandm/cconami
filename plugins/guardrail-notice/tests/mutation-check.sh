#!/usr/bin/env bash
# Mutation check for guardrail-notice: each mutant breaks one behaviour the
# tests claim to cover, and `claude plugin test` must fail on every one.
# A mutant that does not change its file is itself a failure, so a stale
# pattern here cannot pass silently.
#
# Usage: bash plugins/guardrail-notice/tests/mutation-check.sh
set -euo pipefail

src="$(cd "$(dirname "$0")/.." && pwd)"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

# file | perl substitution (first match only) | what it breaks
mutants=(
  "hooks/register.tsx|s/typeof result\.deny === 'string'/false/|a refusal is never recorded"
  "hooks/register.tsx|s/    return result\n/    return {}\n/|the PreToolUse hook swallows the refusal"
  "hooks/register.tsx|s/clear\(\\\$, kindOf\(e\.tool, e\)\)/clear(\\\$, 'never')/|a success never clears"
  "hooks/register.tsx|s/options\.toast !== false/true/|the toast setting is ignored"
  "hooks/logic.ts|s#/Git guardrail: blocked/#/Git guardrail: allowed/#|the OMC guardrail is not named"
  "hooks/logic.ts|s/item\.kind !== refusal\.kind/true/|one kind is listed twice"
  "hooks/logic.ts|s/inCode = !inCode/inCode = false/|a period in backticks ends the safe form"
  "hooks/logic.ts|s/item\.toolUseId !== toolUseId/true/|Dismiss does nothing"
)

failed=0
for entry in "${mutants[@]}"; do
  IFS='|' read -r file expr what <<<"$entry"
  rm -rf "$work/mod"
  cp -R "$src" "$work/mod"
  perl -0pi -e "$expr" "$work/mod/$file"
  if cmp -s "$src/$file" "$work/mod/$file"; then
    echo "FAIL (mutant did not apply): $what"
    failed=1
    continue
  fi
  if claude plugin test "$work/mod" >/dev/null 2>&1; then
    echo "FAIL (tests passed, mutant survived): $what"
    failed=1
  else
    echo "ok (killed): $what"
  fi
done

if claude plugin test "$src" >/dev/null 2>&1; then
  echo "ok: unmutated tests pass"
else
  echo "FAIL: unmutated tests fail"
  failed=1
fi
exit "$failed"

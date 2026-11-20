#!/usr/bin/env bash
# Mutation check for guardrail-notice: each mutant breaks one behaviour the
# tests claim to cover, and `claude plugin test` must fail on every one.
# The unmutated tests run first and must pass. A mutant that does not change
# its file is itself a failure, so a stale pattern here cannot pass silently.
# Exits 1 if anything survives. CI runs it (.github/workflows/skills.yml).
#
# Usage: bash plugins/guardrail-notice/tests/mutation-check.sh
set -euo pipefail

src="$(cd "$(dirname "$0")/.." && pwd)"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

if ! claude plugin test "$src" >"$work/baseline.log" 2>&1; then
  cat "$work/baseline.log"
  echo "FAIL: the unmutated tests fail; fix them before checking mutants"
  exit 1
fi
echo "ok: unmutated tests pass"

# file ~ perl substitution (applied with -0, first match only) ~ what it breaks
mutants=(
  "hooks/observe.ts~s/typeof result\.deny === 'string'/false/~a refusal is never recorded"
  "hooks/observe.ts~s/  return result\n/  return result.deny !== undefined ? {} : result\n/~the PreToolUse observer swallows a deny"
  "hooks/observe.ts~s/  return result\n/  return result.allow === true ? {} : result\n/~the PreToolUse observer drops an allow (and its updatedInput and additionalContext)"
  "hooks/observe.ts~s/  return result\n/  return result.ask !== undefined ? {} : result\n/~the PreToolUse observer drops an ask"
  "hooks/observe.ts~s/(onCall[\s\S]*?)  return result\n/\$1  return { ...result }\n/~the tool.call observer returns a copy, not the result"
  "hooks/observe.ts~s/isNew = !isShown\(list, refusal\)/isNew = true/~a second refusal of a shown kind toasts again"
  "hooks/register.tsx~s/options\.toast !== false/true/~the toast setting is ignored"
  "hooks/register.tsx~s/\{ to: 'transcript' \}/{ to: 'debug' }/~a skipped pattern is not reported in the transcript"
  "hooks/logic.ts~s#/Git guardrail: blocked/#/Git guardrail: allowed/#~the OMC guardrail is not named"
  "hooks/logic.ts~s/Git guardrail: blocked \"\(/Git guardrail: allowed \"(/~the operation OMC names is not used"
  "hooks/logic.ts~s/return \`Bash\\\\n\\\$\{normalizeCommand\(input\.command\)\}\`/return \`Bash\\\\n\\\${commandKinds(input.command).join(' ')}\`/~a harmless sibling clears a refusal (kind instead of command)"
  "hooks/logic.ts~s/item\.key !== refusal\.key/true/~one call is listed twice"
  "hooks/logic.ts~s/inCode = !inCode/inCode = false/~a period in backticks ends the safe form"
  "hooks/logic.ts~s/item\.toolUseId !== toolUseId/true/~Dismiss does nothing"
  "hooks/logic.ts~s/\} else if \(c === \"'\" \|\| c === '\"'\) \{/} else if (false) {/~a quoted separator splits the command"
  "hooks/logic.ts~s/NESTED\.test\(body\)/false/~a nested quantifier is accepted"
  "hooks/logic.ts~s/VALUE_OPTIONS\.has\(word\)/false/~the value of -R is read as the operation"
  "hooks/logic.ts~s/SHELLS\.has\(program\)/false/~bash -c is not read inside"
)

failed=0
for entry in "${mutants[@]}"; do
  IFS="~" read -r file expr what <<<"$entry"
  rm -rf "$work/mod"
  cp -R "$src" "$work/mod"
  perl -0pi -e "$expr" "$work/mod/$file" || true
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

exit "$failed"

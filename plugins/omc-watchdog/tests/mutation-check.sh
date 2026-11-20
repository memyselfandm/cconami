#!/usr/bin/env bash
# Mutation check for omc-watchdog: each mutant breaks one behaviour the tests
# claim to cover, and `claude plugin test` must fail on every one.
# The unmutated tests run first and must pass. A mutant that does not change
# its file is itself a failure, so a stale pattern here cannot pass silently.
# Exits 1 if anything survives. CI runs it (.github/workflows/skills.yml).
#
# Usage: bash plugins/omc-watchdog/tests/mutation-check.sh
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
  "hooks/logic.ts~s/if \(ageMs > limits\.staleMs\)/if (ageMs >= limits.staleMs)/~the stale boundary moves (OMC: strictly older)"
  "hooks/logic.ts~s/return \{ \.\.\.base, kind: 'stale', ageMs: null \}/return null/~an active state with no timestamp is not flagged"
  "hooks/logic.ts~s/state\.reinforcement >= limits\.reinforcementLimit/state.reinforcement > limits.reinforcementLimit/~the reinforcement limit is off by one"
  "hooks/logic.ts~s/state\.iteration >= state\.maxIterations/state.iteration > state.maxIterations/~reaching max_iterations is not looping"
  "hooks/logic.ts~s/if \(!state\.isActive\) \{/if (false) {/~an inactive mode is flagged"
  "hooks/logic.ts~s/isActive: s\.active === true/isActive: Boolean(s.active)/~a string active counts as active"
  "hooks/logic.ts~s/s\.current_phase \?\? s\.phase \?\? s\.stage/s.phase ?? s.current_phase ?? s.stage/~the phase key order differs from OMC"
  "hooks/logic.ts~s/, meta\.updatedAt\]/]/~team's _meta.updatedAt is ignored"
  "hooks/logic.ts~s/Math\.max\(\.\.\.times\)/Math.min(...times)/~the oldest timestamp is used, not the latest"
  "hooks/logic.ts~s/if \(typeof value === 'string' && value\.trim\(\) !== ''\) \{/if (false) {/~string counts are not read"
  "hooks/logic.ts~s/const phase = finding\.phase === null \? '' : \` \(phase: \\\$\{finding\.phase\}\)\`/const phase = ''/~the band drops the phase"
  "hooks/logic.ts~s/return hours < 48/return hours < 0/~ages are shown in days too soon"
  "hooks/logic.ts~s/isLegacy \? state\.sessionId === sessionId/isLegacy ? true/~another session's legacy file is shown"
  "hooks/logic.ts~s/state\.sessionId === null \|\| state\.sessionId === sessionId/true/~a session file naming another session is shown"
  "hooks/logic.ts~s/home\.replace\(\/\\\\\/\+\\\$\/, ''\)\) \{\n      break/home.replace(\/\\\\\/+\\\$\/, '')) {\n      void 0/~a marker at home is used"
  "hooks/logic.ts~s/return join\(facts\.stateDir, 'non-git'\)/return join(facts.stateDir, 'nongit')/~OMC_STATE_DIR non-git path is wrong"
  "hooks/logic.ts~s/if \(facts\.workspace !== null\) \{\n    return join/if (false) {\n    return join/~the workspace marker is ignored"
  "hooks/logic.ts~s/return facts\.home === null \? null : join\(facts\.home, '\.omc'\)/return join(facts.cwd, '.omc')/~outside a repository the cwd is read, not HOME"
  "hooks/logic.ts~s/primary = dirname\(common\)/primary = facts.root/~a linked worktree gets its own project id"
  "hooks/logic.ts~s/sha16\(facts\.remoteUrl \|\| primary\)/sha16(primary)/~the remote URL is not hashed"
  "hooks/logic.ts~s/const id = safeName\(facts\.workspaceId\)/const id = safeName(basename(facts.workspace))/~the marker id is ignored"
  "hooks/logic.ts~s/\.slice\(0, 16\)/.slice(0, 15)/~the hash prefix length differs from OMC"
  "hooks/logic.ts~s/\/state\|cancel\/\.test\(tool\)/\/cancel\/.test(tool)/~OMC state tools no longer start a read"
  "hooks/logic.ts~s/\.filter\(\(\[key\]\) => !RESERVED\.has\(key\)\)//~envelope keys count as input"
  "hooks/register.tsx~s/limits = thresholds\(options\)/limits = thresholds({})/~the settings are ignored"
  "hooks/register.tsx~s/if \(touchesOmcState\(e\.tool, e\)\) \{\n      later\(\\\$\)/if (touchesOmcState(e.tool, e)) {\n      void 0/~an OMC state tool call does not read again"
  "hooks/register.tsx~s/\\\$\.clock\.every\(REFRESH_MS/\\\$.clock.every(REFRESH_MS * 1000/~the timed read does not run"
  "hooks/register.tsx~s/if \(e\.props\.hasSurvey \|\| list\.length === 0\)/if (list.length === 0)/~the band covers a survey"
  "hooks/register.tsx~s/const gitTop = workspace === null \? await climb\(\\\$, top\) : top/const gitTop = top/~a submodule is not climbed"
  "hooks/register.tsx~s/!== '1'/!== 'yes'/~OMC_DISABLE_MULTIREPO is ignored"
  "hooks/register.tsx~s/\[paths\.legacy, true\],//~the legacy flat file is never read"
  "hooks/register.tsx~s/const text = await \\\$\.fs\.read\(path\)/await \\\$.fs.write(path, '{}'); const text = await \\\$.fs.read(path)/~the mod writes to OMC state"
  "hooks/register.tsx~s/\['rev-parse', '--show-toplevel'\]/['checkout', '--show-toplevel']/~a git command that changes the checkout runs"
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

#!/usr/bin/env bash
# Mutation check for omc-runs: each mutant breaks one behaviour the tests
# claim to cover, and `claude plugin test` must fail on every one.
# The unmutated tests run first and must pass. A mutant that does not change
# its file is itself a failure, so a stale pattern here cannot pass silently.
# Exits 1 if anything survives. CI runs it (.github/workflows/skills.yml).
#
# Usage: bash plugins/omc-runs/tests/mutation-check.sh
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
  # Progress fields (hooks/progress.ts).
  "hooks/progress.ts~s/\['expansion', 'planning', 'execution'/['planning', 'expansion', 'execution'/~autopilot's phase order differs from OMC's"
  "hooks/progress.ts~s/'execution', 'qa', 'validation'\]/'execution', 'validation']/~autopilot counts four phases, not OMC's five"
  "hooks/progress.ts~s/at === -1 \? \`phase \\\$\{phase\}\` : \`phase \\\$\{at \+ 1\}/at === -1 ? \`phase \\\$\{phase\}\` : \`phase \\\$\{at\}/~autopilot's phases are counted from 0"
  "hooks/progress.ts~s/objectAt\(raw, 'pipelineTracking'\) \?\? objectAt\(raw, 'pipeline'\)/objectAt(raw, 'pipeline')/~a named workflow's pipelineTracking is ignored"
  "hooks/progress.ts~s/index >= 0 && index < stages\.length/index >= 0 \&\& index <= stages.length/~a stage index past the end is used"
  "hooks/progress.ts~s/stage \\\$\{pipeline\.index \+ 1\}/stage \\\$\{pipeline.index\}/~pipeline stages are counted from 0"
  "hooks/progress.ts~s/const critic = textAt\(raw, 'critic_mode'\)/const critic = textAt(raw, 'critic')/~ralph's reviewer is not shown"
  "hooks/progress.ts~s/const iteration = numberOf\(raw\.iteration\)/const iteration = numberOf(raw.max_iterations)/~ralph shows max_iterations, not its iteration"
  "hooks/progress.ts~s/const busy = numberOf\(execution\?\.workers_active\)/const busy = null/~team's busy workers from its state are dropped"
  "hooks/progress.ts~s/if \(total !== null && total > 0\) \{/if (total !== null) {/~a team state recording 0 workers hides agent_count"
  "hooks/progress.ts~s/const count = numberOf\(raw\.agent_count\)/const count = null/~the team skill's agent_count is ignored"
  "hooks/progress.ts~s/goals\.findIndex\(g => g\.id === active\)/-1/~ultragoal's active goal is not found"
  "hooks/progress.ts~s/g => g\.status === 'complete'\)\.length/g => g.status !== 'pending').length/~ultragoal counts in-progress goals as done"
  "hooks/progress.ts~s/ultragoalProgress\(goalsText\) \?\? state\.phase/state.phase/~ultragoal's plan is not read for its goal index"
  "hooks/progress.ts~s/const first: unknown = history\[0\]/const first: unknown = history[1]/~team's phase_history does not give the start time"
  "hooks/progress.ts~s/ \?\? textAt\(objectAt\(raw, 'planning'\), 'plan_path'\)//~autopilot's planning.plan_path is not read"
  "hooks/progress.ts~s/ \?\? textAt\(objectAt\(raw, 'artifacts'\), 'plan_path'\)//~team's artifacts.plan_path is not read"
  "hooks/progress.ts~s/timeOf\(stage\.startedAt\)/null/~a pipeline stage's start is not the last change"
  "hooks/progress.ts~s/if \(phase !== null && durations !== null\) \{/if (false) {/~autopilot's phase_durations are not read"
  "hooks/progress.ts~s/history\[history\.length - 1\]/history[0]/~team's first phase is reported as its last change"
  "hooks/progress.ts~s/stages\.split\(','\)\.pop\(\)/stages.split(',').shift()/~stage_history's first entry is reported as the last change"
  "hooks/progress.ts~s/isAwaitingConfirmation\(state, nowMs\) \? 'awaiting confirmation' : null/null/~awaiting confirmation is not shown"
  "hooks/progress.ts~s/age\(nowMs - started\)/age(started)/~elapsed time is not measured from the start"
  "hooks/progress.ts~s/count === 1 \? '' : 's'/'s'/~one running agent reads as plural"
  "hooks/progress.ts~s/const workers = seen > 0 \?/const workers = false ?/~a team row ignores this session's teammates"
  "hooks/progress.ts~s/tally\.teammates\.filter\(t => t\.isBusy\)\.length/tally.teammates.length/~idle teammates count as busy"
  "hooks/progress.ts~s/if \(run\.mode === 'team'\) \{/if (true) {/~rows of other modes count workers"
  "hooks/progress.ts~s/'  cancel: \/oh-my-claudecode:cancel'/'  cancel: \/cancel'/~the detail names the wrong cancel command"
  "hooks/progress.ts~s/if \(run\.warning !== null\) \{\n    lines\.push/if (false) {\n    lines.push/~the detail drops the warning"
  "hooks/progress.ts~s/if \(!state\.isActive\) \{\n    return null/if (false) {\n    return null/~an inactive mode draws a row"
  # The agent tally (hooks/agents.ts).
  "hooks/agents.ts~s/if \(kind === 'workflow'\) \{\n    return tally/if (false) {\n    return tally/~a workflow agent, never reported, counts as running"
  "hooks/agents.ts~s/tally\.running\.includes\(id\) \? tally :/false ? tally :/~a resumed spawn counts twice"
  "hooks/agents.ts~s/filter\(r => r !== id\)/filter(r => r === id)/~a report removes the wrong agents"
  "hooks/agents.ts~s/t\.id === id \? \{ id, isBusy \} : t/t.id === id ? { id, isBusy: true } : t/~a teammate never goes idle"
  "hooks/agents.ts~s/tally\.running\.filter\(id => live\.has\(id\)\)/tally.running.filter(() => true)/~subagents the engine dropped stay counted"
  "hooks/agents.ts~s/tally\.teammates\.filter\(t => live\.has\(t\.id\)\)/tally.teammates.filter(() => true)/~teammates the engine dropped stay counted"
  # The hooks (hooks/register.tsx).
  "hooks/register.tsx~s/e\.isTeammate === true \? 'teammate'/false ? 'teammate'/~a teammate counts as a running subagent"
  "hooks/register.tsx~s/e\.workflow !== undefined \? 'workflow'/false ? 'workflow'/~a workflow agent counts as a running subagent"
  "hooks/register.tsx~s/    await tallied\(\\\$, t => reported\(t, e\.agentId\)\)\n//~a report does not end a subagent"
  "hooks/register.tsx~s/turned\(t, id, true\)/turned(t, id, false)/~a teammate's turn does not make it busy"
  "hooks/register.tsx~s/turned\(t, id, false\)/turned(t, id, true)/~a teammate's turn ending does not make it idle"
  "hooks/register.tsx~s/\} else \{\n      later\(\\\$\)\n    \}/} else {\n      void 0\n    }/~the main turn ending does not read again"
  "hooks/register.tsx~s/on\('prompt\.submit', async \(\\\$, e, next\) => \{\n    const result = await next\(e\)\n    later\(\\\$\)/on('prompt.submit', async (\\\$, e, next) => {\n    const result = await next(e)\n    void 0/~a submitted prompt does not read again"
  "hooks/register.tsx~s/    await update\(\\\$, agents, \(\) => EMPTY_TALLY\)\n//~a \/clear keeps the old session's agents"
  "hooks/register.tsx~s/  await pruneAgents\(\\\$\)\n//~agents the engine dropped are never pruned"
  "hooks/register.tsx~s/if \(e\.props\.hasSurvey \|\| list\.length === 0\)/if (list.length === 0)/~the row covers a survey"
  "hooks/register.tsx~s/<Text bold color=\"warning\">/<Text bold>/~the warning is not in the warning colour"
  "hooks/register.tsx~s/dimColor=\{run\.warning === null\}/dimColor={false}/~a healthy row is not dim"
  "hooks/register.tsx~s/mode === 'ultragoal' && got\.state\.isActive \?/mode === 'ultragoal' ?/~ultragoal's plan is read while ultragoal is inactive"
  "hooks/register.tsx~s/'No oh-my-claudecode mode is active in this session\.'/''/~the command says nothing when no mode is active"
  "hooks/register.tsx~s/root: resolved\.root, reads: 1 \}/root: resolved.root, reads: 0 }/~the root is worked out every 11 reads, not 10"
  "hooks/register.tsx~s/if \(touchesOmcState\(e\.tool, e\)\) \{\n      later\(\\\$\)/if (touchesOmcState(e.tool, e)) {\n      void 0/~an OMC state tool call does not read again"
  "hooks/register.tsx~s/\\\$\.clock\.every\(REFRESH_MS/\\\$.clock.every(REFRESH_MS * 1000/~the timed read does not run"
  "hooks/register.tsx~s/    ticker\?\.cancel\(\)\n//~each session.start adds another timed read"
  "hooks/register.tsx~s/limits = thresholds\(options\)/limits = thresholds({})/~the settings are ignored"
  "hooks/register.tsx~s/ralphHardLimit\(\(await \\\$\.env\.get\('OMC_SECURITY'\)\) \|\| null\)/ralphHardLimit(null)/~OMC_SECURITY is not read"
  "hooks/register.tsx~s/cached = resolved\.isSure \?/cached = true ?/~a root found while git failed is kept"
  "hooks/register.tsx~s/ \|\| cached\.reads >= RESOLVE_EVERY//~the root is never worked out again"
  "hooks/register.tsx~s/if \(root !== null && isSafeSessionId\(sessionId\)\)/if (root !== null)/~an unsafe session id is used in a path"
  # Finding and reading the state (hooks/locate.ts), as in omc-watchdog.
  "hooks/locate.ts~s/    isSure &&= probe\.isSure\n//~a timed-out superproject probe is kept"
  "hooks/locate.ts~s/ && \(remote\?\.isSure \?\? true\)//~a timed-out remote probe is kept"
  "hooks/locate.ts~s/ && \(common\?\.isSure \?\? true\)//~a timed-out common-dir probe is kept"
  "hooks/locate.ts~s/\|no such remote\//\//~a repository with no remote is not a sure answer"
  "hooks/locate.ts~s/env: \{ LC_ALL: 'C' \}, //~git's messages follow the locale"
  "hooks/locate.ts~s/!== '1'/!== 'yes'/~OMC_DISABLE_MULTIREPO is ignored"
  "hooks/locate.ts~s/anchor === null \? await climb\(\\\$, top\) :/anchor === null ? { root: top, isSure: true } :/~a submodule is not climbed"
  "hooks/locate.ts~s/workspace !== null && !isSensitiveLocation\(workspace, home, tmp\)/workspace !== null/~a workspace marker in a sensitive location is used"
  "hooks/locate.ts~s/for \(const dir of sessionsToScan\(entries, sessionId\)\)/for (const dir of [] as string[])/~other session directories are not scanned"
  "hooks/locate.ts~s/: paths\.global === null \? null : await \\\$\.fs\.read\(paths\.global\)\.catch\(\(\) => null\)/: null/~the global HOME\/.omc\/state file is never read"
  "hooks/locate.ts~s/typeof legacy === 'string' \? legacy :/false ? legacy :/~the global file wins over the root's legacy file"
  "hooks/locate.ts~s/await \\\$\.fs\.read\(paths\.legacy\)\.catch\(\(\) => null\)/null/~the root's legacy flat file is never read"
  "hooks/locate.ts~s/return read !== null && belongsTo\(read\.state, sessionId, isLegacy\) \? read : null/return read/~another session's file is drawn"
  "hooks/locate.ts~s/const read = parseBoth\(await \\\$\.fs\.read\(path\)/await \\\$.fs.write(path, '{}'); const read = parseBoth(await \\\$.fs.read(path)/~the mod writes to OMC state"
  "hooks/locate.ts~s/\['rev-parse', '--show-toplevel'\]/['checkout', '--show-toplevel']/~a git command that changes the checkout runs"
  "hooks/locate.ts~s/join\(root, 'ultragoal', 'goals\.json'\)/join(root, 'ultragoal', 'plan.json')/~ultragoal's plan is read from the wrong file"
  # Judging (hooks/watch.ts), as in omc-watchdog.
  "hooks/watch.ts~s/if \(ageMs > limits\.staleMs\)/if (ageMs >= limits.staleMs)/~the stale boundary moves (OMC: strictly older)"
  "hooks/watch.ts~s/return \{ \.\.\.base, kind: 'stale', ageMs: null \}/return null/~an active state with no timestamp is not flagged"
  "hooks/watch.ts~s/state\.reinforcement >= ceiling/state.reinforcement > ceiling/~the reinforcement ceiling is off by one"
  "hooks/watch.ts~s/export const TEAM_CEILING = 20/export const TEAM_CEILING = 5/~team is flagged below OMC's ceiling of 20"
  "hooks/watch.ts~s/export const AUTOPILOT_CEILING = 20/export const AUTOPILOT_CEILING = 21/~autopilot's ceiling differs from OMC's"
  "hooks/watch.ts~s/: ULTRAGOAL_CEILING\n/: 5\n/~ultragoal's default ceiling differs from OMC's 50"
  "hooks/watch.ts~s/return state\.maxReinforcements !== null && state\.maxReinforcements > 0 \? state\.maxReinforcements : ULTRAGOAL_CEILING/return ULTRAGOAL_CEILING/~ultragoal's max_reinforcements is ignored"
  "hooks/watch.ts~s/if \(override !== null\) \{\n    return override/if (false) {\n    return override/~the reinforcement setting does not override"
  "hooks/watch.ts~s/state\.iteration >= cap/state.iteration > cap/~reaching ralph's looping mark is not looping"
  "hooks/watch.ts~s/Math\.floor\(hardLimit \* RALPH_LOOPING_SHARE\)/100/~ralph is flagged at max_iterations' default, which OMC extends"
  "hooks/watch.ts~s/export const RALPH_HARD_LIMIT = 500/export const RALPH_HARD_LIMIT = 400/~ralph's hard limit differs from OMC's 500"
  "hooks/watch.ts~s/return security === 'strict' \? RALPH_HARD_LIMIT_STRICT : RALPH_HARD_LIMIT/return RALPH_HARD_LIMIT/~strict mode's hard limit of 200 is ignored"
  "hooks/watch.ts~s/if \(isAwaitingConfirmation\(state, nowMs\)\) \{\n    return null/if (false) {\n    return null/~a run awaiting confirmation is flagged as looping"
  "hooks/watch.ts~s/ && waitedMs < AWAITING_CONFIRMATION_TTL_MS//~a confirmation never lapses"
  "hooks/watch.ts~s/return waitedMs >= 0 && /return /~a confirmation time in the future holds the run"
  "hooks/watch.ts~s/awaitingSinceMs: s\.awaiting_confirmation === true \? time\(since\) : null/awaitingSinceMs: time(since)/~a run not awaiting confirmation is held"
  "hooks/watch.ts~s/isActive: s\.active === true \|\| s\.active === 'true'/isActive: s.active === true/~a string \"true\" active is not active"
  "hooks/watch.ts~s/isActive: s\.active === true \|\| s\.active === 'true'/isActive: Boolean(s.active)/~a string \"false\" counts as active"
  "hooks/watch.ts~s/if \(\(name\.startsWith\('\.'\) && name !== '\.omc'\) \|\| /if (/~a dot-directory workspace is used"
  "hooks/watch.ts~s/return roots\.some\(root => root !== '' && isWithin\(root, path\)\)/return false/~a workspace under \/var, \/opt or tmp is used"
  "hooks/watch.ts~s/\.slice\(0, MAX_SESSION_SCAN\)//~the session scan is not capped"
  "hooks/watch.ts~s/s\.current_phase \?\? s\.phase \?\? s\.stage/s.phase ?? s.current_phase ?? s.stage/~the phase key order differs from OMC"
  "hooks/watch.ts~s/, meta\.updatedAt\]/]/~team's _meta.updatedAt is ignored"
  "hooks/watch.ts~s/Math\.max\(\.\.\.times\)/Math.min(...times)/~the oldest timestamp is used, not the latest"
  "hooks/watch.ts~s/if \(typeof value === 'string' && value\.trim\(\) !== ''\) \{/if (false) {/~string counts are not read"
  "hooks/watch.ts~s/return hours < 48/return hours < 0/~ages are shown in days too soon"
  "hooks/watch.ts~s/isLegacy \? state\.sessionId === sessionId/isLegacy ? true/~another session's legacy file is shown"
  "hooks/watch.ts~s/return join\(facts\.stateDir, 'non-git'\)/return join(facts.stateDir, 'nongit')/~OMC_STATE_DIR non-git path is wrong"
  "hooks/watch.ts~s/return facts\.home === null \? null : join\(facts\.home, '\.omc'\)/return join(facts.cwd, '.omc')/~outside a repository the cwd is read, not HOME"
  "hooks/watch.ts~s/primary = dirname\(common\)/primary = facts.root/~a linked worktree gets its own project id"
  "hooks/watch.ts~s/sha16\(facts\.remoteUrl \|\| primary\)/sha16(primary)/~the remote URL is not hashed"
  "hooks/watch.ts~s/const id = safeName\(facts\.workspaceId\)/const id = safeName(basename(facts.workspace))/~the marker id is ignored"
  "hooks/watch.ts~s/\/state\|cancel\/\.test\(tool\)/\/cancel\/.test(tool)/~OMC state tools no longer start a read"
  "hooks/watch.ts~s/'stale: no activity time recorded; cancel or resume'/'stale'/~the no-activity warning loses its advice"
  "hooks/watch.ts~s/return \`looping: \\\$\{parts\.join\(', '\)\}\`/return \`looping\`/~the looping warning drops its counts"
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

echo "${#mutants[@]} mutants"
exit "$failed"

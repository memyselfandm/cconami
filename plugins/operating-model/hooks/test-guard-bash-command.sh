#!/usr/bin/env bash
# Tests for guard-bash-command.py. Each case feeds the hook the JSON that
# Claude Code sends before a Bash tool call and asserts the exit status
# (2 = refused, 0 = allowed) and, for refusals, that the safe form is named.
#
# Usage: test-guard-bash-command.sh [--generic-only | --project-only]
#
# With no option it runs every section, then a mutation check: every `when`
# entry, every condition inside an entry, and every raw pattern of every rule
# is removed in turn, and the matching section must then fail. A piece whose
# removal leaves the cases passing is not tested by them.
#
# Environment, used by the mutation check: GUARD_TEST_HOOK (the hook to run),
# GUARD_TEST_PROJECT (the project directory for the section), and
# GUARD_TEST_FAIL_FAST=1 (stop at the first failing case).
#
# Offline: it runs Python against fixed inputs, writes only to a temp
# directory, and contacts nothing.
set -u

here="$(cd "$(dirname "$0")" && pwd)"
hook="${GUARD_TEST_HOOK:-$here/guard-bash-command.py}"
mode="${1:-all}"
fail=0
count=0
export PYTHONDONTWRITEBYTECODE=1

# One mutant, run by the mutation check: `--mutant <generic|project> <label>
# <dir>`. Prints `caught <label> -> <first failing case>` or `missed <label>`.
if [ "$mode" = --mutant ]; then
  kind="$2" label="$3" dir="$4"
  if [ "$kind" = generic ]; then
    out="$(GUARD_TEST_HOOK="$dir/guard-bash-command.py" GUARD_TEST_FAIL_FAST=1 bash "$0" --generic-only 2>&1)"
  else
    out="$(GUARD_TEST_PROJECT="$dir" GUARD_TEST_FAIL_FAST=1 bash "$0" --project-only 2>&1)"
  fi
  status=$?
  first="$(printf '%s\n' "$out" | grep -m1 '^FAIL' || true)"
  if [ "$status" -ne 0 ] && [ -n "$first" ]; then
    echo "caught $label -> $first"
  else
    echo "missed $label"
  fi
  exit 0
fi

scratch="$(mktemp -d)"
trap 'rm -rf "$scratch"' EXIT
mkdir -p "$scratch/empty-project"

# A project with the example project rules file in place. The fixture is kept
# outside a `.claude/` directory in the repository, which .gitignore excludes.
example_project="$scratch/example-project"
mkdir -p "$example_project/.claude"
cp "$here/tests/example-project-rules.json" "$example_project/.claude/guard-rules.json"

# The project directory the generic cases run against. Empty by default, so a
# rules file in the repository running the tests cannot change the result.
generic_project="${GUARD_TEST_PROJECT:-$scratch/empty-project}"
project="$generic_project"

failed() {
  fail=1
  if [ "${GUARD_TEST_FAIL_FAST:-0}" = 1 ]; then
    echo "guard-bash-command: FAILED" >&2
    exit 1
  fi
}

run_case() {
  local expect="$1" needle="$2" command="$3" payload out status
  count=$((count + 1))
  payload="$(python3 -c 'import json,sys; print(json.dumps({"tool_name":"Bash","tool_input":{"command":sys.argv[1]}}))' "$command")"
  out="$(printf '%s' "$payload" | CLAUDE_PROJECT_DIR="$project" python3 "$hook" 2>&1)"
  status=$?
  if [ "$status" -ne "$expect" ]; then
    echo "FAIL (exit $status, want $expect): $command" >&2
    [ -n "$out" ] && echo "  output: $out" >&2
    failed
    return
  fi
  if [ "$expect" -eq 2 ] && ! printf '%s' "$out" | grep -qF -- "$needle"; then
    echo "FAIL (message lacks '$needle'): $command" >&2
    failed
  fi
}

refused() { run_case 2 "$1" "$2"; }
allowed() { run_case 0 "" "$1"; }

# Raw fallbacks: each listed command must be caught by the raw patterns of the
# named rules alone, and each safe one left alone. Usage:
#   raw_cases <project dir> <rule id> banned:<cmd> ... safe:<cmd> ...
raw_cases() {
  count=$((count + 1))
  python3 - "$hook" "$@" <<'EOF' || failed
import importlib.util, sys
spec = importlib.util.spec_from_file_location("guard", sys.argv[1])
guard = importlib.util.module_from_spec(spec)
spec.loader.exec_module(guard)
project, rule_id, cases = sys.argv[2], sys.argv[3], sys.argv[4:]
rules = [r for r in guard.load_rules(project, [], []) if r.id == rule_id]
bad = 0
if len(rules) != 1:
    print(f"FAIL: raw: no single rule {rule_id!r}", file=sys.stderr)
    sys.exit(1)
for case in cases:
    kind, command = case.split(":", 1)
    hit = guard.check_raw(command, rules) is not None
    if hit != (kind == "banned"):
        print(f"FAIL: raw fallback of {rule_id} {'misses' if kind == 'banned' else 'refuses'}: {command}",
              file=sys.stderr)
        bad = 1
sys.exit(bad)
EOF
}

AUTO='gh pr checks'
LOOKUP='auth/token/lookup-self'
PUSH='push.sh'

if [ "$mode" = all ] || [ "$mode" = --generic-only ]; then
# ===== generic rules (guard-rules.json) ====================================
# The message must say why --auto is harmful.
refused 'no required status checks' 'gh pr merge 1 --auto'

# --- gh pr merge --auto: direct forms
refused "$AUTO" 'gh pr merge --auto'
refused "$AUTO" 'gh pr merge 412 --squash --auto'
refused "$AUTO" 'gh pr merge --auto --squash --delete-branch 412'
refused "$AUTO" 'gh -R owner/repo pr merge 412 --auto'
refused "$AUTO" 'GH_TOKEN=x gh pr merge 412 --auto'
# --- chained, piped and wrapped forms
refused "$AUTO" 'git push origin HEAD:refs/heads/b && gh pr merge 412 --auto --squash'
refused "$AUTO" 'gh pr create --fill; gh pr merge --auto'
refused "$AUTO" 'bash -c "gh pr merge 412 --auto"'
refused "$AUTO" "sh -c 'cd repo && gh pr merge --auto'"
refused "$AUTO" 'timeout 60 gh pr merge 412 --auto'
refused "$AUTO" 'echo y | gh pr merge 412 --auto'
refused "$AUTO" 'for p in 1 2; do gh pr merge $p --auto; done'
refused "$AUTO" 'x=$(gh pr merge 412 --auto)'
refused "$AUTO" 'gh pr merge 412 --auto "unbalanced'
refused "$AUTO" $'gh pr checks 412\ngh pr merge 412 --auto'
refused "$AUTO" $'gh pr merge 412 \\\n  --squash \\\n  --auto'
refused "$AUTO" 'command gh pr merge 412 --auto'
refused "$AUTO" 'echo 412 | xargs gh pr merge --auto'
refused "$AUTO" '{ gh pr merge 412 --auto; }'
refused "$AUTO" "gh api graphql -f query='mutation { enablePullRequestAutoMerge(input:{pullRequestId:\"x\"}) { clientMutationId } }'"
refused "$AUTO" $'bash <<EOF\ngh pr merge 412 --auto\nEOF'
# --- allowed neighbours
allowed $'git commit -m "$(cat <<\'EOF\'\nnever run gh pr merge --auto\n\nCo-Authored-By: x\nEOF\n)"'
allowed $'gh pr create --title t --body "$(cat <<\'EOF\'\nwe ban gh pr merge --auto\nEOF\n)"'
allowed $'git commit -q -F - <<\'EOF\'\nrefuse gh pr merge --auto and bao token lookup\nEOF'
allowed 'gh pr merge 412 --squash'
allowed 'gh pr merge 412 --disable-auto'
allowed 'gh pr checks 412 --watch && gh pr merge 412 --squash'
allowed 'gh pr view 412 --json autoMergeRequest'
allowed 'git commit -m "docs: never run gh pr merge --auto here"'
allowed 'grep -rn "gh pr merge --auto" .claude docs'
allowed 'gh pr comment 412 --body "do not use gh pr merge --auto"'

# --- bao token lookup: direct forms
refused "$LOOKUP" 'bao token lookup'
refused "$LOOKUP" 'bao token lookup -format=json'
refused "$LOOKUP" 'vault token lookup'
refused "$LOOKUP" '/usr/local/bin/bao token lookup'
refused "$LOOKUP" 'BAO_ADDR=https://bao.example:8200 bao token lookup'
# --- chained, piped and wrapped forms
refused "$LOOKUP" 'bao token lookup | jq .data.ttl'
refused "$LOOKUP" 'bao login -method=userpass username=u && bao token lookup'
refused "$LOOKUP" 'ssh root@host "bao token lookup"'
refused "$LOOKUP" 'ssh root@host bao token lookup'
refused "$LOOKUP" 'pct exec 100 -- bao token lookup'
refused "$LOOKUP" 'sudo -E bao token lookup'
refused "$LOOKUP" 'bash -lc "export BAO_ADDR=x; bao token lookup"'
refused "$LOOKUP" 'ttl=$(bao token lookup -format=json)'
refused "$LOOKUP" 'kubectl exec deploy/x -- sh -c "bao token lookup"'
refused "$LOOKUP" $'ssh root@host <<\'EOF\'\nbao token lookup\nEOF'
refused "$LOOKUP" 'bao -address=https://bao.example:8200 token lookup'
refused "$LOOKUP" 'bao read auth/token/lookup-self'
refused "$LOOKUP" 'bao read -format=json auth/token/lookup-self'
refused "$LOOKUP" 'echo "$(bao token lookup)"'
refused "$LOOKUP" 'ttl=`bao token lookup -format=json`'
refused "$LOOKUP" 'git commit -m "ttl was $(bao token lookup)"'
refused "$LOOKUP" 'find . -maxdepth 1 -exec bao token lookup \;'
refused "$LOOKUP" 'echo start; echo "`bao token lookup`"'
allowed $'git commit -m "docs: guard\n\nNever run bao token lookup; it prints the token."'
allowed "python3 -c \"print('bao token lookup')\""
allowed 'tracker-cli comment create ABC-1 --body "do not run gh pr merge 1 --auto"'
allowed 'echo "never run bao token lookup, see $(date)"'
allowed $'cat > notes.md <<\'EOF\'\nbao token lookup prints the token\nEOF'
allowed $'python3 - <<\'EOF\'\nprint("bao token lookup")\nEOF'
allowed 'echo "one <<< two" && bao read -field=ttl auth/token/lookup-self'
# --- allowed neighbours
allowed 'bao read -field=ttl auth/token/lookup-self'
allowed 'bao read -field=policies auth/token/lookup-self'
allowed 'bao token create -orphan -policy=x -ttl=1h'
allowed 'bao kv get -field=K secret/app/x'
allowed 'git commit -m "docs: bao token lookup prints the token"'
allowed 'rg "bao token lookup" docs'

# --- shell syntax the guard must read as a shell does
# Comments: an apostrophe in a comment is not a quote.
refused "$LOOKUP" $'# don\'t print it\nbao token lookup\n# it\'s fine'
refused "$LOOKUP" $'# don\'t print it\nbao read auth/token/lookup-self\n# it\'s fine'
refused "$LOOKUP" $'bao read auth/token/lookup-self  # don\'t'
allowed 'cd deployments  # do not gh pr merge --auto here'
allowed 'ls -la  # never run bao token lookup'
allowed $'# Commit; don\'t push yet\ngit commit -q -F - <<\'EOF\'\nRefuse gh pr merge --auto\nEOF'
# Single quotes make backticks and $( literal.
allowed "gh pr comment 412 --body 'use \`gh pr merge 412 --squash\`, never \`gh pr merge --auto\`'"
allowed "git commit -m 'docs: ban \`bao token lookup\`'"
allowed "git commit -m 'docs: ban \$(bao token lookup)'"
allowed 'git commit -m "docs: ban \`bao token lookup\`"'
refused "$LOOKUP" 'git commit -m "docs: ttl `bao token lookup`"'
# The id field is the token.
refused "$LOOKUP" 'bao read -field=id auth/token/lookup-self'
refused "$LOOKUP" 'bao read --field=id auth/token/lookup-self'
allowed 'bao read -field=expire_time auth/token/lookup-self'
# A here-document piped to a shell is a script.
refused "$LOOKUP" $'cat <<\'EOF\' | ssh root@host bash\nbao token lookup\nEOF'
allowed $'cat <<\'EOF\' | tee notes.md\nbao token lookup prints the token\nEOF'
allowed $'cat <<-EOF > notes.md\n\tgh pr merge --auto is banned\n\tEOF'
# A wrapper is a wrapper only in command position, not as a path.
allowed 'grep -rn "bao token lookup" scripts/ssh'
allowed $'cd deployments/docker && git commit -q -F - <<\'EOF\'\nban bao token lookup\nEOF'
# Text that looks like a here-document inside quotes is not one.
refused "$LOOKUP" $'echo "x <<y"\nbao token lookup'
refused "$LOOKUP" 'echo "$(echo ")"; bao token lookup)"'
refused "$LOOKUP" "script -qc 'bao token lookup' /dev/null"
refused "$LOOKUP" 'if true; then bao token lookup; fi'
refused "$LOOKUP" 'case x in a) bao token lookup;; esac'
allowed 'gh pr merge 412 -R owner/repo --admin --merge'
allowed 'gh pr edit 412 --body "$(cat body.md)"'
allowed 'BAO_TOKEN=$(bao token create -orphan -policy=x -field=token) env'

# Here-strings do not open a here-document, and their substitutions run.
refused "$AUTO" $'grep foo <<<"$out"\ngh pr merge 5 --auto'
refused "$LOOKUP" 'jq . <<<"$(bao read -format=json auth/token/lookup-self)"'
allowed $'grep -c x <<<"$out"\ngh pr merge 5 --squash'
# A pull request body in a here-document inside $( ) is text, whatever
# apostrophes, quotes or parentheses it holds; what follows it is still read.
refused "$AUTO" $'gh pr create --title t --body "$(cat <<\'EOF\'\nit\'s done\nEOF\n)" && gh pr merge 5 --auto'
refused "$AUTO" $'gh pr create --title t --body "$(cat <<\'EOF\'\na 5" display\nEOF\n)"\ngh pr merge 5 --auto'
allowed $'gh pr create --title t --body "$(cat <<\'EOF\'\n1) do not run `gh pr merge --auto`\n2) nor `bao token lookup` :)\nEOF\n)"'
allowed $'git commit -m "$(cat <<\'EOF\'\nguard: it\'s refusing `bao token lookup` (and "friends")\nEOF\n)"'
# An unquoted here-document still expands substitutions.
refused "$LOOKUP" $'git commit -F - <<EOF\nToken: $(bao token lookup)\nEOF'
refused "$LOOKUP" $'cat <<EOF > out.txt\nttl `bao token lookup`\nEOF'
allowed $'git commit -F - <<EOF\nnever run bao token lookup\nEOF'
# A text tool run through a wrapper is still a text tool.
allowed 'git ls-files | xargs grep -n "gh pr merge --auto"'
allowed "find . -name '*.md' -exec grep -l \"bao token lookup\" {} +"
allowed 'kubectl -n x exec deploy/y -- grep -c "bao token lookup" /etc/motd'
# A here-document belongs to its own command.
allowed $'sudo tee /etc/motd <<\'EOF\'\nnever run bao token lookup\nEOF'
allowed $'kubectl apply -f - <<\'EOF\'\n# coder templates push is banned\nkind: ConfigMap\nEOF'
refused "$LOOKUP" $'sudo -u coder bash <<\'EOF\'\nbao token lookup\nEOF'
refused "$LOOKUP" $'kubectl exec -i deploy/x -- sh <<\'EOF\'\nbao token lookup\nEOF'
# Redirections, ANSI-C quotes, odd terminators.
refused "$AUTO" 'gh pr merge 5 2>&1 --auto'
refused "$LOOKUP" "printf \$'it\\'s' ; bao token lookup"
refused "$LOOKUP" $'cat <<END-MSG\nhello\nEND-MSG\nbao token lookup'
refused "$LOOKUP" $'cat <<\'EOF\'\n  EOF\nEOF\nbao token lookup'

# A here-document piped to a shell is a script even when the pipeline holds a
# substitution or a subshell; a substitution's own commands are not the pipe.
refused "$LOOKUP" $'cat <<\'EOF\' | kubectl exec -i "$(kubectl get pod -l app=x -o name)" -- sh\nbao token lookup\nEOF'
refused "$LOOKUP" $'cat <<\'EOF\' | tee "/tmp/$(date +%F).log" | bash\nbao token lookup\nEOF'
refused "$LOOKUP" $'cat <<\'EOF\' | (cd /tmp && bash)\nbao token lookup\nEOF'
allowed $'cat <<\'EOF\' | tee "notes-$(date +%F).md"\nbao token lookup prints the token\nEOF'
refused "$LOOKUP" $'sudo su - <<\'EOF\'\nbao token lookup\nEOF'
refused "$LOOKUP" $'pct exec 100 -- su - coder <<\'EOF\'\nbao token lookup\nEOF'
refused "$LOOKUP" $'sudo -i <<EOF\nbao token lookup\nEOF'
refused "$LOOKUP" $'runuser -u coder -- bash <<EOF\nbao token lookup\nEOF'
# ssh with a remote command: stdin is that command's input.
allowed $'ssh host \'cat > /opt/README.md\' <<\'EOF\'\nnever run bao token lookup\nEOF'
refused "$LOOKUP" $'ssh -p 22 host <<\'EOF\'\nbao token lookup\nEOF'
refused "$LOOKUP" $'ssh host \'sudo bash -s\' <<\'EOF\'\nbao token lookup\nEOF'
# A backslash-quoted terminator.
refused "$AUTO" $'cat <<\\EOF\nnotes\nEOF\ngh pr merge 5 --auto'
allowed $'git commit -F - <<\\EOF\nmentions $(bao token lookup) as text\nEOF'
refused "$LOOKUP" "bash -c -- 'bao token lookup'"
refused "$LOOKUP" "fish -c 'bao token lookup'"
refused "$LOOKUP" $'(( m = 1<<4 ))\nbao token lookup'
allowed 'echo $((1<<4)) && bao read -field=ttl auth/token/lookup-self'


# --- review findings: forms the original guard let through
# bao and vault parse flags only before the first positional argument, so a
# -field after the path is ignored and the whole token is printed.
refused "$LOOKUP" 'bao read auth/token/lookup-self -field=ttl'
refused "$LOOKUP" 'vault read auth/token/lookup-self -field=policies'
refused "$LOOKUP" 'bao read -format=json auth/token/lookup-self -field=ttl'
allowed 'bao read -format=json -field=ttl auth/token/lookup-self'
allowed 'bao read -field ttl auth/token/lookup-self'
# print token, and write against the lookup endpoints.
refused "$LOOKUP" 'bao print token'
refused "$LOOKUP" 'vault print token'
refused "$LOOKUP" 'BAO_ADDR=x bao print token | cat'
refused "$LOOKUP" 'bao write auth/token/lookup token=hvs.example'
refused "$LOOKUP" 'vault write auth/token/lookup-accessor accessor=abc'
refused "$LOOKUP" 'bao write -f auth/token/lookup-self'
refused "$LOOKUP" 'vault write -f auth/token/lookup-self'
refused "$LOOKUP" 'bao write auth/token/lookup-self -field=ttl'
refused "$LOOKUP" 'bao write -field=id auth/token/lookup-self'
allowed 'bao write -field=ttl auth/token/lookup-self'
allowed 'bao write secret/app/x key=value'
allowed 'bao print'
allowed 'bao token capabilities auth/token/lookup-self'
allowed 'bao read secret/app/x'
# A shell option cluster that holds c anywhere still takes a command string.
refused "$AUTO" "bash -ce 'gh pr merge 7 --auto'"
refused "$AUTO" "sh -ec 'gh pr merge 7 --auto'"
refused "$LOOKUP" "bash -lce 'bao token lookup'"
allowed "bash -ce 'gh pr merge 7 --squash'"
# A here-string fed to a shell is a script.
refused "$AUTO" "bash <<< 'gh pr merge 7 --auto'"
refused "$AUTO" 'sh <<< "gh pr merge 7 --auto"'
refused "$LOOKUP" "bash<<<'bao token lookup'"
refused "$AUTO" "cat <<< 'gh pr merge 7 --auto' | bash"
allowed "grep -c merge <<< 'gh pr merge 7 --auto'"
allowed "tee notes.md <<< 'never run gh pr merge --auto'"
# eval and ssh join their arguments into one command line.
refused "$AUTO" "eval 'gh pr merge 7' --auto"
refused "$AUTO" "eval gh pr merge 7 '--auto'"
refused "$LOOKUP" "ssh host 'bao token' lookup"
allowed "eval 'gh pr merge 7' --squash"
# An --auto flag elsewhere is not a merge, and a mention is not an API call.
allowed 'gh pr view 5 --auto'
allowed 'gh pr comment 5 --body "enablePullRequestAutoMerge is banned here"'
allowed 'gh api repos/owner/repo/pulls/5'
# A long command is refused outright rather than checked past the timeout.
refused 'too long for the command guard' "echo $(printf 'a %.0s' $(seq 1 5001))"
refused 'too long for the command guard' "echo $(head -c 70000 /dev/zero | tr '\0' 'x')"
allowed "echo $(printf 'a %.0s' $(seq 1 4990))"


# --- re-review findings
# watch joins its arguments and runs them through sh -c; env -S splits its
# argument into a command.
refused "$AUTO" "watch 'gh pr' merge --auto"
refused "$AUTO" "watch -n 5 'gh pr merge 7 --auto'"
refused "$AUTO" "env -S 'gh pr merge 7 --auto'"
refused "$AUTO" "env --split-string='gh pr merge 7' --auto"
refused "$LOOKUP" "env -S'bao token lookup'"
refused "$LOOKUP" "sudo env -S 'bao token lookup'"
allowed "watch -n 5 'gh pr checks 7'"
allowed "env -S 'gh pr merge 7 --squash'"
allowed 'gh run watch 5'
# Flags that take a value do not end bao's and vault's options early.
allowed 'bao read -format json -field=ttl auth/token/lookup-self'
allowed 'vault read -address https://vault.example:8200 -field=ttl auth/token/lookup-self'
allowed 'bao write -format json -field=ttl auth/token/lookup-self'
refused "$LOOKUP" 'bao read -format json auth/token/lookup-self'
refused "$LOOKUP" 'bao write -format json auth/token/lookup-self'
# eval and ssh are checked as one joined command line, not argument by argument.
allowed "eval echo 'gh pr merge --auto'"
allowed "ssh host echo 'bao token lookup'"
refused "$LOOKUP" 'ssh root@host "bao token lookup"'

# --- raw fallbacks of the generic rules
raw_cases "$project" gh-pr-merge-auto \
  'banned:gh pr merge 5 --squash --auto' \
  "banned:gh api graphql -f query='mutation { enablePullRequestAutoMerge }'" \
  'safe:gh pr merge 5 --squash' \
  'safe:gh api repos/o/r/pulls'
raw_cases "$project" token-lookup \
  'banned:vault token lookup' \
  'banned:bao print token' \
  'banned:bao read auth/token/lookup-self' \
  'banned:bao read auth/token/lookup-self -field=ttl' \
  'banned:bao read -field=id auth/token/lookup-self' \
  'banned:bao read -format json auth/token/lookup-self' \
  'safe:bao read -format json -field=ttl auth/token/lookup-self' \
  'banned:bao write -f auth/token/lookup-self' \
  'banned:vault write auth/token/lookup token=x' \
  'banned:vault write auth/token/lookup-accessor accessor=y' \
  'safe:bao read -field=ttl auth/token/lookup-self' \
  'safe:bao write -field=ttl auth/token/lookup-self' \
  'safe:bao write secret/app/x k=v' \
  'safe:bao token create -orphan'

# --- other tools and malformed input pass through
count=$((count + 5))
for input in \
  '{"tool_name":"Write","tool_input":{"content":"bao token lookup"}}' \
  'not json' \
  '[]' \
  '{"tool_name":"Bash","tool_input":"bao token lookup"}' \
  '{"tool_name":"Bash","tool_input":{"command":["bao"]}}'; do
  printf '%s' "$input" | CLAUDE_PROJECT_DIR="$project" python3 "$hook" \
    || { echo "FAIL: did not pass through: $input" >&2; failed; }
done

# --- recorded gap: a command that reaches a shell as data is not seen.
# This assertion pins the gap, so that closing it is a deliberate change.
allowed 'echo "bao token lookup" | sh'
fi

if [ "$mode" = all ] || [ "$mode" = --project-only ]; then
# ===== a project rule (tests/example-project-rules.json) ===================
# The example is the rule the homelab repository adds.
project="${GUARD_TEST_PROJECT:-$example_project}"
# --- coder templates push
refused "$PUSH" 'coder templates push web'
refused "$PUSH" 'cd deployments/coder/templates/web && coder templates push web -y'
refused "$PUSH" 'coder template push personal-dev --directory .'
refused "$PUSH" 'bash -c "coder templates push web"'
allowed './push.sh web personal-dev'
allowed 'deployments/coder/templates/push.sh'
allowed 'coder templates list'
allowed 'coder templates pull web /tmp/x'
allowed 'gh workflow run coder-templates-push.yml --ref main -f templates=both'

refused "$PUSH" 'coder templates create web --directory .'
refused "$PUSH" 'sudo -u coder coder templates push web'
allowed $'kubectl apply -f - <<\'EOF\'\n# coder templates push is banned\nkind: ConfigMap\nEOF'
refused "$PUSH" 'coder template create web'
# Project rules add to the generic ones; they do not replace them.
refused "$AUTO" 'gh pr merge 1 --auto'
refused "$LOOKUP" 'bao token lookup'
raw_cases "$project" coder-templates-push \
  'banned:coder templates push web' \
  'banned:coder template create web' \
  'safe:coder templates list'
project="$generic_project"
fi

if [ "$mode" = all ]; then
# ===== failure modes and project files =====================================
# Each case: a project directory, a command, the exit status wanted, and a
# phrase the output must contain. An optional fifth argument is the hook, and
# a sixth, "cwd", sends the project as the input's cwd field instead of
# CLAUDE_PROJECT_DIR.
fail_mode() {
  local dir="$1" command="$2" want="$3" needle="$4" payload out status
  count=$((count + 1))
  if [ "${6:-}" = cwd ]; then
    payload="$(python3 -c 'import json,sys; print(json.dumps({"tool_name":"Bash","cwd":sys.argv[2],"tool_input":{"command":sys.argv[1]}}))' "$command" "$dir")"
    out="$(printf '%s' "$payload" | env -u CLAUDE_PROJECT_DIR python3 "${5:-$hook}" 2>&1)"
  else
    payload="$(python3 -c 'import json,sys; print(json.dumps({"tool_name":"Bash","tool_input":{"command":sys.argv[1]}}))' "$command")"
    out="$(printf '%s' "$payload" | CLAUDE_PROJECT_DIR="$dir" python3 "${5:-$hook}" 2>&1)"
  fi
  status=$?
  if [ "$status" -ne "$want" ] || { [ -n "$needle" ] && ! printf '%s' "$out" | grep -qF -- "$needle"; }; then
    echo "FAIL (exit $status, want $want with '$needle'): [$dir] $command" >&2
    echo "  output: $out" >&2
    failed
  fi
}
project_with() {
  mkdir -p "$scratch/$1/.claude"
  printf '%s' "$2" > "$scratch/$1/.claude/guard-rules.json"
  printf '%s' "$scratch/$1"
}

# The cwd field stands in for CLAUDE_PROJECT_DIR when that is unset.
fail_mode "$example_project" 'coder templates push web' 2 "$PUSH" "$hook" cwd

# A broken project file fails open, and does not switch off the generic rules.
bad_json="$(project_with bad-json '{ not json')"
fail_mode "$bad_json" 'ls' 1 'cannot be read as JSON'
fail_mode "$bad_json" 'ls' 1 'the command was allowed'
fail_mode "$bad_json" 'gh pr merge 1 --auto' 2 'gh pr checks'
fail_mode "$bad_json" 'gh pr merge 1 --auto' 2 'cannot be read as JSON'

no_version="$(project_with no-version '{"rules": []}')"
fail_mode "$no_version" 'ls' 1 '"version": 1'
bool_version="$(project_with bool-version '{"version": true, "rules": []}')"
fail_mode "$bool_version" 'ls' 1 '"version": 1'

bad_rule="$(project_with bad-rule '{"version": 1, "rules": [
  {"id": "Bad Id", "message": "x", "when": [{"command": ["x"]}]},
  {"id": "no-when", "message": "x"},
  {"id": "typo", "message": "x", "when": [{"comand": ["x"]}]},
  {"id": "bad-raw", "message": "x", "when": [{"command": ["x"]}], "raw": ["("]},
  {"id": "good", "message": "use the safe form", "when": [{"command": ["rm-everything"]}]}
]}')"
fail_mode "$bad_rule" 'ls' 1 "rule id 'Bad Id'"
fail_mode "$bad_rule" 'ls' 1 "'when' must be a non-empty list"
fail_mode "$bad_rule" 'ls' 1 "unknown keys ['comand']"
fail_mode "$bad_rule" 'ls' 1 'raw pattern'
fail_mode "$bad_rule" 'rm-everything now' 2 'use the safe form'

unknown_disable="$(project_with unknown-disable '{"version": 1, "disable": ["no-such-rule"]}')"
fail_mode "$unknown_disable" 'ls' 1 "no generic rule named 'no-such-rule'"

# The token rule is locked: a disable entry for it is ignored, with a warning.
lock="$(project_with lock '{"version": 1, "disable": ["token-lookup"]}')"
fail_mode "$lock" 'bao token lookup' 2 "$LOOKUP"
fail_mode "$lock" 'ls' 1 "'token-lookup' cannot be turned off"

# Turning off gh-pr-merge-auto works, and every other refusal says so.
no_auto="$(project_with no-auto '{"version": 1, "disable": ["gh-pr-merge-auto"]}')"
fail_mode "$no_auto" 'gh pr merge 1 --auto' 0 ''
fail_mode "$no_auto" 'bao token lookup' 2 "turns off the 'gh-pr-merge-auto' rule"

# A disable list found through the cwd field is not honoured.
fail_mode "$no_auto" 'gh pr merge 1 --auto' 2 'came from the hook input' "$hook" cwd

# A missing, broken or invalid generic file falls back to the embedded rules.
for variant in missing broken invalid; do
  mkdir -p "$scratch/hook-$variant"
  cp "$hook" "$scratch/hook-$variant/guard-bash-command.py"
  case "$variant" in
    broken) printf '{ nope' > "$scratch/hook-$variant/guard-rules.json" ;;
    invalid) printf '{"version": 1, "rules": [{"id": "x"}]}' > "$scratch/hook-$variant/guard-rules.json" ;;
  esac
  fail_mode "$scratch/empty-project" 'gh pr merge 1 --auto' 2 'using the copy built into the guard' \
    "$scratch/hook-$variant/guard-bash-command.py"
  fail_mode "$scratch/empty-project" 'bao print token' 2 "$LOOKUP" \
    "$scratch/hook-$variant/guard-bash-command.py"
done

# The embedded copy and guard-rules.json must hold the same rules.
count=$((count + 1))
python3 - "$hook" "$here/guard-rules.json" <<'EOF' || failed
import importlib.util, json, sys
spec = importlib.util.spec_from_file_location("guard", sys.argv[1])
guard = importlib.util.module_from_spec(spec)
spec.loader.exec_module(guard)
shipped = json.load(open(sys.argv[2]))
shipped.pop("$comment", None)
if shipped != guard.EMBEDDED_RULES:
    print("FAIL: guard-rules.json and EMBEDDED_RULES differ; change both together", file=sys.stderr)
    sys.exit(1)
EOF

# ===== the time budget =======================================================
# A command that sends the original guard's raw patterns into cubic time must be
# refused, fast, through the parsed path.
count=$((count + 1))
python3 - "$hook" <<'EOF' || failed
import json, subprocess, sys, time
command = "eval " * 8 + "bao read " * 800 + "; gh pr merge 7 --auto"
payload = json.dumps({"tool_name": "Bash", "tool_input": {"command": command}})
start = time.monotonic()
done = subprocess.run([sys.executable, sys.argv[1]], input=payload, capture_output=True, text=True, timeout=10)
took = time.monotonic() - start
print(f"guard-bash-command: the crafted eval/bao-read command: exit {done.returncode} in {took:.2f}s")
if done.returncode != 2 or "gh pr checks" not in done.stderr or took > 2:
    print(f"FAIL: crafted command: exit {done.returncode}, {took:.2f}s: {done.stderr[:200]}", file=sys.stderr)
    sys.exit(1)
EOF

# Forcing the budget down makes the guard refuse rather than run past it.
count=$((count + 1))
python3 - "$hook" <<'EOF' || failed
import json, os, subprocess, sys
command = "echo " + "word " * 4000
payload = json.dumps({"tool_name": "Bash", "tool_input": {"command": command}})
env = dict(os.environ, GUARD_TIME_BUDGET="0.000001")
done = subprocess.run([sys.executable, sys.argv[1]], input=payload, capture_output=True, text=True,
                      timeout=10, env=env)
if done.returncode != 2 or "could not finish checking" not in done.stderr:
    print(f"FAIL: forced time budget: exit {done.returncode}: {done.stderr[:200]}", file=sys.stderr)
    sys.exit(1)
EOF
count=$((count + 1))
python3 - "$hook" <<'EOF' || failed
import importlib.util, os, sys
spec = importlib.util.spec_from_file_location("guard", sys.argv[1])
guard = importlib.util.module_from_spec(spec)
spec.loader.exec_module(guard)
os.environ["GUARD_TIME_BUDGET"] = "600"
if guard._budget() != guard.TIME_BUDGET:
    print("FAIL: GUARD_TIME_BUDGET raised the budget", file=sys.stderr)
    sys.exit(1)
EOF

# Every raw pattern runs in linear time: none takes long on 60 KB of the
# repetition that would make a backtracking scan explode.
count=$((count + 1))
python3 - "$hook" "$example_project" <<'EOF' || failed
import importlib.util, sys, time
spec = importlib.util.spec_from_file_location("guard", sys.argv[1])
guard = importlib.util.module_from_spec(spec)
spec.loader.exec_module(guard)
rules = guard.load_rules(sys.argv[2], [], [])
units = ["bao read ", "bao write ", "bao ", "read ", "bao token ", "bao print ", "vault read -field ",
         "gh pr merge ", "gh ", "pr merge ", "coder templates ", "coder ", "auth/token/lookup "]
bad = 0
for unit in units:
    text = unit * (60000 // len(unit))
    start = time.monotonic()
    guard.check_raw(text, rules)
    took = time.monotonic() - start
    if took > 1:
        print(f"FAIL: raw patterns took {took:.2f}s on {unit!r} repeated", file=sys.stderr)
        bad = 1
sys.exit(bad)
EOF

# ===== a long command is refused fast ======================================
count=$((count + 1))
python3 - "$hook" <<'EOF' || failed
import json, subprocess, sys, time
payload = json.dumps({"tool_name": "Bash", "tool_input": {"command": "echo " + "a " * 20000}})
start = time.monotonic()
done = subprocess.run([sys.executable, sys.argv[1]], input=payload, capture_output=True, text=True, timeout=10)
took = time.monotonic() - start
print(f"guard-bash-command: a 20,000-word command: exit {done.returncode} in {took:.2f}s")
if done.returncode != 2 or "too long" not in done.stderr or took > 2:
    print(f"FAIL: 20,000-word command: exit {done.returncode}, {took:.2f}s: {done.stderr[:200]}", file=sys.stderr)
    sys.exit(1)
EOF

# ===== mutation check: remove each piece of each rule in turn ==============
# Generic mutants run the generic section against a copy of the hook with a
# mutated guard-rules.json beside it; project mutants run the project section
# with a mutated project file.
mutants="$scratch/mutants"
python3 - "$here/guard-rules.json" "$here/tests/example-project-rules.json" "$mutants" "$hook" <<'EOF' > "$scratch/mutants.tsv" || failed
import copy, json, os, shutil, sys
generic, project, out, hook = sys.argv[1:5]

def pieces(rule):
    """(label, mutate) for every when entry, condition and raw pattern."""
    for w, when in enumerate(rule["when"]):
        yield f"when[{w}]", lambda r, w=w: r["when"].pop(w)
        for key in ("words", "flag", "arg_contains", "arg_endswith", "unless_option"):
            if key in when:
                yield f"when[{w}].{key}", lambda r, w=w, key=key: r["when"][w].pop(key)
        option = when.get("unless_option", {})
        for key in ("except", "before_positional", "value_options"):
            if key in option:
                yield f"when[{w}].unless_option.{key}", \
                    lambda r, w=w, key=key: r["when"][w]["unless_option"].pop(key)
    for k, _ in enumerate(rule.get("raw", [])):
        yield f"raw[{k}]", lambda r, k=k: r["raw"].pop(k)

n = 0
for kind, path in (("generic", generic), ("project", project)):
    table = json.load(open(path))
    for r, rule in enumerate(table["rules"]):
        for label, mutate in pieces(rule):
            n += 1
            mutant = copy.deepcopy(table)
            mutate(mutant["rules"][r])
            d = os.path.join(out, f"m{n}")
            if kind == "generic":
                os.makedirs(d)
                shutil.copy(hook, os.path.join(d, "guard-bash-command.py"))
                json.dump(mutant, open(os.path.join(d, "guard-rules.json"), "w"))
            else:
                os.makedirs(os.path.join(d, ".claude"))
                json.dump(mutant, open(os.path.join(d, ".claude", "guard-rules.json"), "w"))
            print(f"{kind} {rule['id']}:{label} {d}")
EOF
# Run the mutants in parallel; each prints one result line.
xargs -n 3 -P "${GUARD_TEST_JOBS:-8}" bash "$0" --mutant < "$scratch/mutants.tsv" > "$scratch/mutants.out" 2>&1
sort "$scratch/mutants.out" | sed -n 's/^caught /mutation caught: /p'
total="$(wc -l < "$scratch/mutants.tsv" | tr -d ' ')"
caught="$(grep -c '^caught ' "$scratch/mutants.out" || true)"
count=$((count + total))
if grep -q '^missed ' "$scratch/mutants.out" || [ "$caught" -ne "$total" ]; then
  grep -v '^caught ' "$scratch/mutants.out" | sed 's/^missed /FAIL (mutation): the cases still pass without /' >&2
  failed
fi
echo "guard-bash-command: mutation check caught $caught of $total mutants"
[ "$total" -gt 0 ] || { echo "FAIL (mutation): no mutants were generated" >&2; failed; }
fi

if [ "$fail" -ne 0 ]; then
  echo "guard-bash-command: FAILED" >&2
  exit 1
fi
echo "guard-bash-command: $count cases passed"

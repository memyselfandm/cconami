#!/usr/bin/env bash
# Tests for guard-bash-command.py. Each case feeds the hook the JSON that
# Claude Code sends before a Bash tool call and asserts the exit status
# (2 = refused, 0 = allowed) and, for refusals, that the safe form is named.
#
# Usage: test-guard-bash-command.sh [--generic-only | --project-only]
#
# With no option it runs every section, then a mutation check: each rule is
# turned off in turn (generic rules through a project `disable` list, the
# example project rule by leaving its file out) and the cases must then fail.
# A rule whose cases still pass with the rule off is not tested by them.
#
# Offline: it runs Python against fixed inputs, writes only to a temp
# directory, and contacts nothing.
set -u

here="$(cd "$(dirname "$0")" && pwd)"
hook="$here/guard-bash-command.py"
mode="${1:-all}"
fail=0
count=0

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

run_case() {
  local expect="$1" needle="$2" command="$3" payload out status
  count=$((count + 1))
  payload="$(python3 -c 'import json,sys; print(json.dumps({"tool_name":"Bash","tool_input":{"command":sys.argv[1]}}))' "$command")"
  out="$(printf '%s' "$payload" | CLAUDE_PROJECT_DIR="$project" python3 "$hook" 2>&1)"
  status=$?
  if [ "$status" -ne "$expect" ]; then
    echo "FAIL (exit $status, want $expect): $command" >&2
    [ -n "$out" ] && echo "  output: $out" >&2
    fail=1
    return
  fi
  if [ "$expect" -eq 2 ] && ! printf '%s' "$out" | grep -qF -- "$needle"; then
    echo "FAIL (message lacks '$needle'): $command" >&2
    fail=1
  fi
}

refused() { run_case 2 "$1" "$2"; }
allowed() { run_case 0 "" "$1"; }

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


# --- other tools and malformed input pass through
count=$((count + 5))
for input in \
  '{"tool_name":"Write","tool_input":{"content":"bao token lookup"}}' \
  'not json' \
  '[]' \
  '{"tool_name":"Bash","tool_input":"bao token lookup"}' \
  '{"tool_name":"Bash","tool_input":{"command":["bao"]}}'; do
  printf '%s' "$input" | CLAUDE_PROJECT_DIR="$project" python3 "$hook" \
    || { echo "FAIL: did not pass through: $input" >&2; fail=1; }
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
# Project rules add to the generic ones; they do not replace them.
refused "$AUTO" 'gh pr merge 1 --auto'
refused "$LOOKUP" 'bao token lookup'
project="$generic_project"
fi

if [ "$mode" = all ]; then
# ===== the cwd field stands in for CLAUDE_PROJECT_DIR =======================
count=$((count + 1))
payload="$(python3 -c 'import json,sys; print(json.dumps({"tool_name":"Bash","cwd":sys.argv[1],"tool_input":{"command":"coder templates push web"}}))' "$example_project")"
printf '%s' "$payload" | env -u CLAUDE_PROJECT_DIR python3 "$hook" 2>/dev/null
[ $? -eq 2 ] || { echo "FAIL: project rules not read from the cwd field" >&2; fail=1; }

# ===== failure modes: the guard fails open, and says so =====================
# Each case: a project directory, a command, the exit status wanted, and a
# phrase the output must contain.
fail_mode() {
  local dir="$1" command="$2" want="$3" needle="$4" payload out status
  count=$((count + 1))
  payload="$(python3 -c 'import json,sys; print(json.dumps({"tool_name":"Bash","tool_input":{"command":sys.argv[1]}}))' "$command")"
  out="$(printf '%s' "$payload" | CLAUDE_PROJECT_DIR="$dir" python3 "${5:-$hook}" 2>&1)"
  status=$?
  if [ "$status" -ne "$want" ] || ! printf '%s' "$out" | grep -qF -- "$needle"; then
    echo "FAIL (exit $status, want $want with '$needle'): [$dir] $command" >&2
    echo "  output: $out" >&2
    fail=1
  fi
}
project_with() {
  mkdir -p "$scratch/$1/.claude"
  printf '%s' "$2" > "$scratch/$1/.claude/guard-rules.json"
  printf '%s' "$scratch/$1"
}

bad_json="$(project_with bad-json '{ not json')"
fail_mode "$bad_json" 'ls' 1 'cannot be read as JSON'
fail_mode "$bad_json" 'ls' 1 'fails open'
# A broken project file does not switch off the generic rules.
fail_mode "$bad_json" 'gh pr merge 1 --auto' 2 'gh pr checks'
fail_mode "$bad_json" 'gh pr merge 1 --auto' 2 'cannot be read as JSON'

no_version="$(project_with no-version '{"rules": []}')"
fail_mode "$no_version" 'ls' 1 '"version": 1'

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
# The valid rule in the same file still applies.
fail_mode "$bad_rule" 'rm-everything now' 2 'use the safe form'

unknown_disable="$(project_with unknown-disable '{"version": 1, "disable": ["no-such-rule"]}')"
fail_mode "$unknown_disable" 'ls' 1 "no generic rule named 'no-such-rule'"

# A missing generic rules file: the hook allows everything and says why.
mkdir -p "$scratch/bare-hook"
cp "$hook" "$scratch/bare-hook/guard-bash-command.py"
fail_mode "$scratch/empty-project" 'gh pr merge 1 --auto' 1 'not found, so its rules are not enforced' \
  "$scratch/bare-hook/guard-bash-command.py"

# ===== raw fallbacks: used when the parser fails ===========================
# Every rule's raw patterns must catch a plain form of its command and leave a
# safe form alone.
count=$((count + 1))
PYTHONDONTWRITEBYTECODE=1 python3 - "$hook" "$example_project" <<'EOF' || fail=1
import importlib.util, sys
spec = importlib.util.spec_from_file_location("guard", sys.argv[1])
guard = importlib.util.module_from_spec(spec)
spec.loader.exec_module(guard)
problems = []
rules = {r.id: r for r in guard.load_rules(sys.argv[2], problems)}
assert not problems, problems
cases = {
    "gh-pr-merge-auto": ("gh pr merge 5 --squash --auto", "gh pr merge 5 --squash"),
    "token-lookup": ("vault token lookup", "bao read -field=ttl auth/token/lookup-self"),
    "coder-templates-push": ("coder templates push web", "coder templates list"),
}
bad = 0
assert set(rules) == set(cases), sorted(rules)
for rule_id, (banned, safe) in cases.items():
    rule = [rules[rule_id]]
    if guard.check_raw(banned, rule) is None:
        print(f"FAIL: raw fallback of {rule_id} misses: {banned}", file=sys.stderr); bad = 1
    if guard.check_raw(safe, rule) is not None:
        print(f"FAIL: raw fallback of {rule_id} refuses: {safe}", file=sys.stderr); bad = 1
sys.exit(bad)
EOF

# ===== mutation check: each rule's cases fail with that rule off ===========
mutant() {
  local label="$1" option="$2" dir="$3" out status
  count=$((count + 1))
  out="$(GUARD_TEST_PROJECT="$dir" bash "$0" "$option" 2>&1)"
  status=$?
  if [ "$status" -eq 0 ]; then
    echo "FAIL (mutation): the cases still pass with $label off" >&2
    fail=1
  elif ! printf '%s' "$out" | grep -q 'FAIL (exit 0, want 2)'; then
    echo "FAIL (mutation): with $label off the suite failed for another reason:" >&2
    echo "$out" | head -5 >&2
    fail=1
  fi
}
for rule_id in $(python3 -c 'import json,sys; print(" ".join(r["id"] for r in json.load(open(sys.argv[1]))["rules"]))' "$here/guard-rules.json"); do
  dir="$(project_with "disable-$rule_id" "{\"version\": 1, \"disable\": [\"$rule_id\"]}")"
  mutant "generic rule $rule_id" --generic-only "$dir"
done
# The project section with the project rules file left out.
mkdir -p "$scratch/no-rules"
mutant "project rule coder-templates-push" --project-only "$scratch/no-rules"
fi

if [ "$fail" -ne 0 ]; then
  echo "guard-bash-command: FAILED" >&2
  exit 1
fi
echo "guard-bash-command: $count cases passed"

#!/usr/bin/env bash
# Mutation check for omc-launcher: each mutant breaks one behaviour the tests
# claim to cover, and `claude plugin test` must fail on every one.
# The unmutated tests run first and must pass. A mutant that does not change
# its file is itself a failure, so a stale pattern here cannot pass silently.
# Exits 1 if anything survives.
#
# The mutants are read from a quoted heredoc, so the shell expands nothing in
# them: each line is `file~perl substitution~what it breaks`, the substitution
# applied with -0 (first match only) exactly as written.
#
# Usage: bash plugins/omc-launcher/tests/mutation-check.sh
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

failed=0
count=0
while IFS="~" read -r file expr what; do
  [[ -z "$file" || "$file" == \#* ]] && continue
  count=$((count + 1))
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
done <<'MUTANTS'
# The picker's order.
hooks/logic.ts~s/  'ralph',\n  'team',/  'team',\n  'ralph',/~the main workflows are listed in another order
hooks/logic.ts~s/ \|\| a\.name\.localeCompare\(b\.name\)//~the other skills are not sorted by name
# argument-hint parsing.
hooks/logic.ts~s/emit: `\$\{flag\}=\$\{v\}`/emit: `\${flag} \${v}`/~an enum flag is emitted as `--x v`, not `--x=v`
hooks/logic.ts~s/  if \(required\) \{\n/  if (false) {\n/~a flag that is always present becomes a toggle instead of a fallback
hooks/logic.ts~s/ && !seenPositional\) \{/) {/~a bracketed word after a positional (skill's [args]) becomes a keyword toggle
hooks/logic.ts~s/      fields\.push\(\{ kind: 'text', id, label: text, required: true \}\)\n      seenPositional = true/      fields.push({ kind: 'text', id, label: text, required: true })/~a required positional does not end the keyword part
hooks/logic.ts~s/if \(token\.kind === 'bare'\) \{/if (false) {/~a bare literal outside brackets is read instead of falling back
hooks/logic.ts~s/return \{ fields: parsed, isFallback: false \}/return { fields: parsed, isFallback: true }/~a parsed hint is reported as a fallback
# Command assembly.
hooks/logic.ts~s/return value === 'on' \? field\.emit : null/return field.emit/~a toggle is always on
hooks/logic.ts~s/\?\.emit \?\? null/?.emit ?? field.options[0]?.emit ?? null/~the none choice picks the first option
hooks/logic.ts~s/\? `\$\{left\}:\$\{right\}`/? `\${left} \${right}`/~the N:agent-type pair is not joined with a colon
hooks/logic.ts~s/const v = value\.trim\(\)\n\n      return v === '' \? null : v\n/const v = value\n\n      return v === '' ? null : v\n/~the task text keeps its outer whitespace
hooks/logic.ts~s/fields\.filter\(f => !isPositional\(f\)\)/fields/~the task text is emitted among the flags too
hooks/logic.ts~s/for \(const field of fields\.filter\(isPositional\)\)/for (const field of [] as Field[])/~the task text is dropped
hooks/logic.ts~s/  return parts\.join\(' '\)\n\}\n\n\/\*\* What the review/  return parts.reverse().join(' ')\n}\n\n\/** What the review/~the arguments come out in reverse order
hooks/logic.ts~s/if \(\(left === ''\) !== \(right === ''\)\) \{/if (false) {/~a half-filled pair is not warned about
hooks/logic.ts~s/ && field\.required && emitField/ \&\& emitField/~an optional field left empty is warned about as required
# JSONC.
hooks/logic.ts~s/end \+= text\[end\] === '\\\\' \? 2 : 1/end += 1/~an escaped quote ends a string early
hooks/logic.ts~s/if \(text\[j\] === '\}' \|\| text\[j\] === '\]'\) \{/if (false) {/~a trailing comma breaks the config
hooks/logic.ts~s/i = end === -1 \? text\.length : end \+ 2/i = end === -1 ? text.length : end + 1/~a block comment leaves its slash behind
hooks/logic.ts~s/\$\{flag\.replace\(\/\^--\/, ''\)\}s/\${flag.replace(\/^--\/, '')}/~config choices are read from autopilot.workflow, not autopilot.workflows
hooks/logic.ts~s/if \(!names\.includes\(name\)\) \{/if (true) {/~a profile in both configs is listed twice
# Frontmatter.
hooks/logic.ts~s/const comment = text\.search\(\/\\s#\/\)/const comment = -1/~a plain value keeps its trailing comment
hooks/logic.ts~s/if \(text\[i \+ 1\] === "'"\) \{/if (false) {/~a doubled single quote is not unescaped
# Finding OMC.
hooks/logic.ts~s/Number\.isFinite\(nx\) && Number\.isFinite\(ny\) \? nx - ny : //~versions compare as text (5.10 below 5.8)
hooks/logic.ts~s/ \|\| entry\.projectPath === cwd\)/ || true)/~another project's install is used
hooks/logic.ts~s/compareVersions\(String\(b\.version \?\? '0'\), String\(a\.version \?\? '0'\)\)/compareVersions(String(a.version ?? '0'), String(b.version ?? '0'))/~the lowest installed version is used
hooks/register.tsx~s/if \(path !== null && \(await hasSkills\(\$, path\)\)\) \{/if (path !== null) {/~an install path whose folder is gone is used
hooks/register.tsx~s/const version = highestVersion\(/const version = null \&\& highestVersion(/~the plugin cache is not searched
hooks/register.tsx~s/\(await \$\.env\.get\('CLAUDE_CONFIG_DIR'\)\) \|\| //~CLAUDE_CONFIG_DIR is ignored
hooks/register.tsx~s/if \(\(await findOmc\(\$, cwd\)\) !== null\) \{/if (true) {/~/omc is registered without OMC
hooks/register.tsx~s/text: 'oh-my-claudecode is not installed, so there is nothing to launch\.'/text: 'OMC launcher opened.'/~running /omc without OMC does not say so
hooks/register.tsx~s/join\(cwd, '\.claude', 'omc\.jsonc'\)/join(cwd, 'omc.jsonc')/~the project config path is wrong
hooks/register.tsx~s/join\(home, '\.config', 'claude-omc', 'config\.jsonc'\)/join(home, '.config', 'omc', 'config.jsonc')/~the user config path is wrong
# The wizard.
hooks/register.tsx~s/command: commandName\(skill\.name\), args \}/command: skill.name, args }/~the skill runs without the oh-my-claudecode namespace
hooks/register.tsx~s/command: commandName\(skill\.name\), args \}/command: commandName(skill.name), args: command }/~the arguments repeat the command
hooks/register.tsx~s/\$\.ui\.toast\(`Could not run/void (`Could not run/~a command that cannot run fails silently
hooks/register.tsx~s/  await \$\.ui\.close\(\{ id: PANE \}\)\n/\n/~Run and Cancel leave the pane open
hooks/register.tsx~s/value === NONE \? '' : value/value/~picking none from config emits the none label
hooks/register.tsx~s/const skills = await readSkills\(\$, root\)\n/const skills = await readSkills(\$, root)\n    await \$.fs.write(join(root, 'touched'), '')\n/~the mod writes a file
MUTANTS

echo "$count mutants checked"
exit "$failed"

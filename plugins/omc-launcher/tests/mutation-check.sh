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
hooks/logic.ts~s/      fields\.push\(\{ kind: 'text', id, label: text, required: true, verbatim: false \}\)\n      seenPositional = true/      fields.push({ kind: 'text', id, label: text, required: true, verbatim: false })/~a required positional does not end the keyword part
hooks/logic.ts~s/if \(token\.kind === 'bare'\) \{/if (false) {/~a bare literal outside brackets is read instead of falling back
hooks/logic.ts~s/return \{ fields: parsed, isFallback: false \}/return { fields: parsed, isFallback: true }/~a parsed hint is reported as a fallback
# Command assembly.
hooks/logic.ts~s/return value === 'on' \? field\.emit : null/return field.emit/~a toggle is always on
hooks/logic.ts~s/\?\.emit \?\? null/?.emit ?? field.options[0]?.emit ?? null/~the none choice picks the first option
hooks/logic.ts~s/\? `\$\{left\}:\$\{right\}`/? `\${left} \${right}`/~the N:agent-type pair is not joined with a colon
hooks/logic.ts~s/const v = value\.trim\(\)\n      if \(v === ''\) \{/const v = value\n      if (v === '') {/~the task text keeps its outer whitespace
hooks/logic.ts~s/  return parts\.join\(' '\)\n\}\n\n\/\*\* The values a form/  return parts.reverse().join(' ')\n}\n\n\/** The values a form/~the arguments come out in reverse order
hooks/logic.ts~s/  for \(const field of fields\) \{\n    const part = emitField\(field, values, words\)/  for (const field of [...fields].sort((a, b) => Number(a.kind === 'text') - Number(b.kind === 'text'))) {\n    const part = emitField(field, values, words)/~the task text is moved after the flags instead of keeping the hint's order
hooks/logic.ts~s/if \(\(left === ''\) !== \(right === ''\)\) \{/if (false) {/~a half-filled pair is not warned about
hooks/logic.ts~s/ && field\.required && emitField/ \&\& emitField/~an optional field left empty is warned about as required
hooks/logic.ts~s/const first = field\.kind === 'choice' && field\.required \?/const first = field.kind === 'choice' ?/~an optional choice opens with an option picked
# Quoting the task and guarding values.
hooks/logic.ts~s/ && !words\.includes\(text\)\) \{/) {/~a task that is a keyword goes in bare and turns the keyword on
hooks/logic.ts~s/\[A-Za-z0-9\]\[\\w\.\/#@-\]\*\$\/\.test\(text\)/[^\\s]+\$\/.test(text)/~a task starting with - goes in bare and reads as a flag
hooks/logic.ts~s/text\.replace\(\/\["\\\\\]\/g,/text.replace(\/[\\\\]\/g,/~double quotes in the task are not escaped
hooks/logic.ts~s/text\.replace\(\/\["\\\\\]\/g,/text.replace(\/["]\/g,/~backslashes in the task are not escaped
hooks/logic.ts~s/return field\.verbatim \? v : quoteText\(v, words\)/return quoteText(v, words)/~the fallback free-text field is quoted
hooks/logic.ts~s/return v === '' \|\| \/\\s\/\.test\(v\) \? null/return v === '' ? null/~a value holding spaces splits into several arguments
hooks/logic.ts~s/field\.kind === 'value' && \/\\s\/\.test\(value\)/false/~a value holding spaces is not warned about
hooks/logic.ts~s/field\.kind === 'text' && value\.startsWith\('-'\)/false/~a task starting with - is not warned about
# JSONC.
hooks/logic.ts~s/end \+= text\[end\] === '\\\\' \? 2 : 1/end += 1/~an escaped quote ends a string early
hooks/logic.ts~s/if \(text\[j\] === '\}' \|\| text\[j\] === '\]'\) \{/if (false) {/~a trailing comma breaks the config
hooks/logic.ts~s/return stripTrailingCommas\(stripComments\(/return stripComments(stripTrailingCommas(/~trailing commas are stripped before comments (a comma before a comment breaks)
hooks/logic.ts~s/text\.replace\(\/\^\\uFEFF\/, ''\)\)\)/text))/~a leading BOM breaks the config
hooks/logic.ts~s/      out \+= ' '\n      i = end \+ 2/      i = end + 2/~a block comment no longer separates the tokens around it
hooks/logic.ts~s/\$\{flag\.replace\(\/\^--\/, ''\)\}s/\${flag.replace(\/^--\/, '')}/~config choices are read from autopilot.workflow, not autopilot.workflows
hooks/logic.ts~s/if \(CONFIG_NAME\.test\(name\) && !names\.includes\(name\)\) \{/if (CONFIG_NAME.test(name)) {/~a profile in both configs is listed twice
hooks/logic.ts~s/if \(CONFIG_NAME\.test\(name\) && /if (/~a key OMC would reject is offered as a profile
# Frontmatter.
hooks/logic.ts~s/const comment = text\.search\(\/\\s#\/\)/const comment = -1/~a plain value keeps its trailing comment
hooks/logic.ts~s/if \(text\[i \+ 1\] === "'"\) \{/if (false) {/~a doubled single quote is not unescaped
# Finding OMC.
hooks/logic.ts~s/p !== '' && q !== '' && Number\.isFinite\(np\) && Number\.isFinite\(nq\) \? np - nq : //~versions compare as text (5.10 below 5.8)
hooks/logic.ts~s/return va\.pre === null \? 1 : -1/return va.pre === null ? -1 : 1/~a prerelease ranks above its release
hooks/logic.ts~s/ \|\| isWithin\(cwd, entry\.projectPath\)\)/ || true)/~another project's install is used
hooks/logic.ts~s/\(path === root \|\| path\.startsWith\(`\$\{root\.replace\(\/\\\/\+\$\/, ''\)\}\/`\)\)/(path === root)/~a project install is not used from a subdirectory of its project
hooks/logic.ts~s/\(path === root \|\| path\.startsWith\(`\$\{root\.replace\(\/\\\/\+\$\/, ''\)\}\/`\)\)/(path === root || path.startsWith(root))/~a sibling folder sharing the project's prefix counts as inside it
hooks/logic.ts~s/compareVersions\(String\(b\.version \?\? '0'\), String\(a\.version \?\? '0'\)\)/compareVersions(String(a.version ?? '0'), String(b.version ?? '0'))/~the lowest installed version is used
hooks/register.tsx~s/if \(path !== null && \(await hasSkills\(\$, path\)\)\) \{/if (path !== null) {/~an install path whose folder is gone is used
hooks/register.tsx~s/const version = highestVersion\(/const version = null \&\& highestVersion(/~the plugin cache is not searched
hooks/register.tsx~s/ \|\| \(alias !== '' && names\.includes\(alias\)\)//~a skill listed by its frontmatter name (plan as omc-plan) drops out
hooks/register.tsx~s/names\.includes\(dir\) \|\| //~a skill listed by its folder name drops out
hooks/register.tsx~s/void flip\(\$, field\.id\)/void setValue(\$, field.id, isOn ? '' : 'on')/~a toggle flips from the value it was drawn with
hooks/logic.ts~s/\[A-Za-z0-9\]\[\\w\.\/#@-\]\*\$/[A-Za-z0-9][\\w.\/:#@-]*\$/~a task word with a colon goes in bare and reads as N:agent-type
hooks/register.tsx~s/\(await \$\.env\.get\('CLAUDE_CONFIG_DIR'\)\) \|\| //~CLAUDE_CONFIG_DIR is ignored
hooks/register.tsx~s/if \(\(await findOmc\(\$, e\.cwd\)\) !== null\) \{/if (true) {/~/omc is registered without OMC on disk
hooks/register.tsx~s/if \(\(await findOmc\(\$, e\.cwd\)\) !== null\) \{/if ((await omcCommands(\$)).length > 0) {/~/omc is registered only when OMC's skills are already listed at session start (the CCC-153 bug)
hooks/register.tsx~s/if \(\(await findOmc\(\$, e\.cwd\)\) !== null\) \{/if ((await findOmc(\$, e.cwd)) !== null \&\& (await omcCommands(\$)).length > 0) {/~/omc also needs OMC's skills listed at session start
hooks/register.tsx~s/export const register: Register = on => \{\n/let cached: string[] = []\nexport const register: Register = on => {\n/; s/    return next\(e\)/    cached = await omcCommands(\$)\n    return next(e)/; s/const names = await omcCommands\(\$\)\n/const names = cached\n/~the runnable skills are kept from session start, not read when /omc opens
hooks/register.tsx~s/    if \(names\.length === 0\) \{\n      return \{ text: 'No oh-my-claudecode/    if (false) {\n      return { text: 'No oh-my-claudecode/~an empty command list at open is not reported as no skills available
hooks/register.tsx~s/\.filter\(name => name\.startsWith\(prefix\)\)//~another plugin's commands count as OMC being active
hooks/register.tsx~s/text: 'No oh-my-claudecode skills are available in this session, so there is nothing to launch\.'/text: 'OMC launcher opened.'/~running /omc with no OMC skills listed does not say so
hooks/register.tsx~s/join\(cwd, '\.claude', 'omc\.jsonc'\)/join(cwd, 'omc.jsonc')/~the project config path is wrong
hooks/register.tsx~s/join\(xdg, 'claude-omc', 'config\.jsonc'\)/join(xdg, 'omc', 'config.jsonc')/~the user config path is wrong
hooks/register.tsx~s/\(await \$\.env\.get\('XDG_CONFIG_HOME'\)\) \|\| //~XDG_CONFIG_HOME is ignored
hooks/register.tsx~s/const cwd = await \$\.session\.cwd\(\)/const cwd = '\/work\/project'/~the cwd is not read when /omc runs
hooks/register.tsx~s/entries\.filter\(entry => entry\.kind === 'dir'\)\.map/entries.map/~a file in the plugin cache is taken for an installed version
# The wizard.
hooks/register.tsx~s/    await update\(\$, wizard, \(\) => START\)\n    await \$\.ui\.open/    await \$.ui.open/~running /omc again keeps the last wizard step
hooks/register.tsx~s/  await update\(\$, wizard, \(\) => START\)\n  await \$\.ui\.close/  await \$.ui.close/~Cancel and Run leave the wizard where it was
hooks/register.tsx~s/value=\{options\.some\(option => option\.value === current\) \? current : \(options\[0\]\?\.value \?\? NONE\)\}/value={options[0]?.value ?? NONE}/~a choice always shows its first option, whatever was picked
hooks/register.tsx~s/label=\{warned\.length > 0 \? 'Run anyway' : 'Run'\}/label="Run"/~a command with warnings is not labelled Run anyway
hooks/register.tsx~s/if \(warned\.length > 0 && !\(await read\(\$, wizard\)\)\.isArmed\) \{/if (false) {/~a command with warnings runs on one press
hooks/register.tsx~s/\(x\): Wizard => \(\{ \.\.\.x, step, isArmed: false \}\)/(x): Wizard => ({ ...x, step })/~leaving the review step keeps Run anyway armed
hooks/register.tsx~s/\{w\.isArmed && /{false \&\& /~an armed Run anyway does not say a second press runs it
hooks/register.tsx~s/command: commandName\(skill\.name\), args \}/command: skill.name, args }/~the skill runs without the oh-my-claudecode namespace
hooks/register.tsx~s/command: commandName\(skill\.name\), args \}/command: commandName(skill.name), args: command }/~the arguments repeat the command
hooks/register.tsx~s/\$\.ui\.toast\(`Could not run/void (`Could not run/~a command that cannot run fails silently
hooks/register.tsx~s/  await \$\.ui\.close\(\{ id: PANE \}\)\n/\n/~Run and Cancel leave the pane open
hooks/register.tsx~s/value === NONE \? '' : value/value/~picking none from config emits the none label
hooks/register.tsx~s/const skills = await readSkills\(\$, root, names\)\n/const skills = await readSkills(\$, root, names)\n    await \$.fs.write(join(root, 'touched'), '')\n/~the mod writes a file
MUTANTS

echo "$count mutants checked"
exit "$failed"

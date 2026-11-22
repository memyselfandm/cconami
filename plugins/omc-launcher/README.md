# omc-launcher

A Claude Code mod for [oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode)
(OMC). `/omc` opens a pane that steps through running an OMC workflow, so you do
not have to remember each skill's flags:

1. **Pick a workflow.** Every OMC skill with its one-line description. The main
   workflows come first: autopilot, ralph, team, ralplan, ultragoal,
   deep-interview, autoresearch. The rest follow by name.
2. **Set its options.** One field per part of the skill's `argument-hint`: a
   Select for `--critic=architect|critic|codex`, a toggle for `[--deliberate]`,
   an input for `--workflow <name>`, two inputs for team's `[N:agent-type]`, and
   a text box for the task. Autopilot's `--workflow` also offers the profiles
   under `autopilot.workflows` in `.claude/omc.jsonc` and
   `$XDG_CONFIG_HOME/claude-omc/config.jsonc` (`~/.config` when that is unset).
   OMC runs named workflow profiles only on Linux with `flock`.
3. **Review and run.** The exact command line, for example
   `/oh-my-claudecode:ralph --critic=codex "fix the flaky login test"`, with Run,
   Back and Cancel. The task is quoted so it cannot be read as a flag or
   keyword. Run runs the line through `$.command.run`, as though you had typed
   it. When the review step shows a warning (an empty task, for one), the button
   reads Run anyway and takes two presses.

```
/plugin install omc-launcher --marketplace memyselfandm/cconami
```

Choose the user scope to have it in every session. The mod reads OMC's skill
files and config and runs the command you review. It writes nothing. When the
session has no `oh-my-claudecode:*` commands, `/omc` is not offered.

How it parses hints, which shapes fall back to free text, and the owner smoke
test: [../MODS.md](../MODS.md#omc-launcher).
Tests: `claude plugin test plugins/omc-launcher`, and
`bash plugins/omc-launcher/tests/mutation-check.sh`.

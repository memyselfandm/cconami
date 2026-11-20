# guardrail-notice

A Claude Code mod. When a PreToolUse hook refuses a tool call, it shows a card
under that call in the chat and an entry above the prompt, for example
`Blocked: git push (OMC guardrail). Needs you.` The mod only observes. It never
blocks, changes or delays a tool call.

```
/plugin install guardrail-notice --marketplace memyselfandm/cconami
```

Choose the user scope to have it in every session.

| Setting | Default | What it does |
|---|---|---|
| `patterns` | empty | Extra patterns that name the hook behind a refusal: `Label=text`, or bare text (named `hook`). The text is a plain case-insensitive substring; start it with `re:` for a regular expression (a nested quantifier is rejected, but other pathological expressions are not, so use `re:` sparingly). Text containing `=` needs a label. Checked before the built-in patterns |
| `toast` | on | Also raise a toast when a hook refuses a tool call of a kind not already waiting |

A refusal clears only when exactly the refused call later succeeds, or when you
dismiss it. Before relying on the mod, run the owner check in
[../MODS.md](../MODS.md#owner-check-before-relying-on-it) once.

Full behaviour: [../MODS.md](../MODS.md#guardrail-notice). Tests:
`claude plugin test plugins/guardrail-notice`, plus a mutation check that must
kill every mutant (CI runs it): `bash plugins/guardrail-notice/tests/mutation-check.sh`.

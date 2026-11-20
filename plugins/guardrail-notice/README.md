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
| `patterns` | empty | Extra patterns that name the hook behind a refusal: `Label=regular expression`, or a bare expression (named `hook`). Checked before the built-in patterns |
| `toast` | on | Also raise a toast when a hook refuses a tool call |

Full behaviour: [../MODS.md](../MODS.md#guardrail-notice). Tests:
`claude plugin test plugins/guardrail-notice`, plus a mutation check that must
kill every mutant: `bash plugins/guardrail-notice/tests/mutation-check.sh`.

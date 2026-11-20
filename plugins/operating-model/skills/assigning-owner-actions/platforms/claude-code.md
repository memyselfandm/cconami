# assigning-owner-actions on Claude Code

- **Linear calls.** With the Linear connector:
  - search: `list_issues` with `label: "owner-action"` (or the project's label);
  - create: `save_issue` with `team`, `title`, `description` (the body),
    `assignee`, `labels`, `state`, `project` and `blocks`;
  - check: `list_issues` again, then `list_comments` on any that are Done.
  If the project uses a Linear CLI instead, use its equivalent commands.
- **The inbox.** The `owner-inbox` plugin in this marketplace shows open issues
  with its ask label in a band above the prompt and a panel toggled with
  `/inbox`. It notices a `save_issue` call that carries the label and refreshes.
  Its label is a plugin setting (`owner-action` by default), changed through
  `/config`. Keep it equal to the skill's `owner-action label` setting.
- **Telling the owner.** One line in the conversation, with the issue link.
- **Commands for the owner** end in `2>&1 | tee <path>`, so the output lands in a
  file the owner can attach instead of pasting into chat.

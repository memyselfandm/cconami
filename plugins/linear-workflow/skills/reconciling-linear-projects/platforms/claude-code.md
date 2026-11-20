# reconciling-linear-projects on Claude Code

- Invoke as `/reconciling-linear-projects <project>`.
- Linear calls: see `pm-context/platforms/claude-code.md`. For more than about fifteen
  open tickets, delegate step 1 to a subagent and keep only its table (ticket, status,
  pull requests with state and merge date, verdict evidence).

## Finding pull requests with `gh`

For each repository in the settings:

```sh
# By key, any state
gh pr list -R <owner/repo> --search "<KEY>" --state all \
  --json number,title,state,mergedAt,headRefName

# By branch prefix (lower-case team key), because titles only carry the key
# when the pull request finishes the ticket
gh pr list -R <owner/repo> --state all --limit 200 --json number,state,headRefName \
  --jq '.[] | select(.headRefName | test("^[^/]+/<team-key>-<n>-"))'

# Checks on an open pull request
gh pr checks <n> -R <owner/repo>
```

Batch the branch query once per repository and filter locally; do not run it once per
ticket.

## Owner actions

File them with `/assigning-owner-actions` when the `operating-model` plugin is
installed; otherwise create a ticket labelled `owner-action`.

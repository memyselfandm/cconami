# Example: the homelab repository's settings

This is how one project, the homelab repository, sets this skill up. It is an
example, not a default.

```markdown
## Operating model

- reserved items:
  - **Anything that weakens home or lab security.** Opening a door, lock or garage
    through Home Assistant; exposing a service beyond the private sources Traefik
    admits; widening an OpenBao policy or an SSH principal; turning off an approval
    gate.
  - **Taking down the network or what stands in front of it.** The UniFi gateway
    and switches, AdGuard (CT 104), Traefik (CT 120), and OpenBao (CT 182), which
    seals on restart and needs the owner to unseal it.
  - **Hermes `SOUL.md` edits.** Put the proposed wording on the issue.
  - **Deleting data or a guest**, and anything a pull request cannot undo.
- subagent brief lines:
  - no `ansible`, `tofu apply` or SSH against inventory hosts unless that is the task
- where agents run: a Coder workspace by default. The laptop only when the work
  rebuilds the platform the workspace runs on: an agent must not run on what it is
  rebuilding.
```

Sessions there are named after their Linear issue (`LAB-123`) or project.

# Example: the homelab repository's blocking classes

This is the list one project, the homelab repository, sets. It is an example, not a
default. It names that repository's systems so a reviewer knows what each class
covers there.

```markdown
## Operating model

- blocking classes:
  - **Data loss.** A deleted or overwritten volume, database, backup or secret; a
    migration with no way back.
  - **A broken agent.** A Hermes agent, a Coder workspace or a Claude Code session
    that will fail to start, lose its channel or its credentials, or halt at a boot
    gate.
  - **Wider access.** A broader OpenBao policy, SSH principal, Kubernetes role,
    network path or exposed port than the change says it needs; a secret in the
    diff, a log or a rendered file with wider read access.
  - **An outage of something the owner reserves.** Merging a manifest deploys it. A
    change that would take down DNS, the ingress, OpenBao or the network (see
    "Reserved for the owner" in the root `CLAUDE.md`) blocks.
```

That repository's reviewer brief also forbids `ansible`, `tofu apply`,
`kubectl apply` and SSH against inventory hosts, and suggests `kubectl kustomize`
to render a manifest when reproducing a finding.

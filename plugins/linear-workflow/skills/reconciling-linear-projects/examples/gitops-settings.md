# Example settings: a GitOps homelab

A labelled example, taken from the homelab repository this skill was first written
for. Replace every value with your own project's.

```markdown
## Reconciliation settings
- Repositories: memyselfandm/homelab
- Team key: LAB   (branches look like mike/lab-605-reconcile-skill)
- Live-state check: Flux applies clusters/homelab from main, so a merged manifest is
  deployed. A merged skill or document may still owe a live run; report that line as
  "not verified" unless the run is recorded on the ticket.
```

Why the live-state check matters here: before this rule, tickets were closed on merge
while the change it described had not yet been exercised on the running system, and the
follow-up work was lost when those tickets were folded into others that then closed.

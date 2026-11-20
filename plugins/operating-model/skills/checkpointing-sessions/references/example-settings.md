# Example: the homelab repository's settings

This is how one project, the homelab repository, sets this skill up. It is an
example, not a default.

```markdown
## Operating model

- owner time zone: Pacific (convert UTC before writing a checkpoint)
- credential checks:
  - OpenBao token: `bao read -field=ttl auth/token/lookup-self`
  - SSH certificate from the OpenBao CA: `ssh-keygen -L -f ~/.ssh/lab-certs/<cert>-cert.pub`, the `Valid:` line
```

The OpenBao check reads one field. `bao token lookup` would print the token, and
the plugin's command guard refuses it.

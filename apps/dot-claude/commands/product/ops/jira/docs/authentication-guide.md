# Jira Authentication Guide

Comprehensive guide to authentication setup and management for Jira CLI integration. Covers API tokens, Personal Access Tokens, and security best practices.

## Overview

This guide covers:
- Authentication methods for Cloud vs. Server
- Creating and managing API tokens
- Personal Access Token configuration
- Multiple instance management
- Security best practices
- Token rotation and expiration
- Troubleshooting authentication issues

## Authentication Methods

### Jira Cloud: API Tokens

**Method**: API Token + Email
**Security**: Tokens tied to user account, can be revoked
**Expiration**: No automatic expiration
**Use Case**: Jira Cloud (atlassian.net) instances

### Jira Server/Data Center: Personal Access Tokens

**Method**: Personal Access Token (PAT)
**Security**: Configurable expiration, scope-limited
**Expiration**: Can be configured (30-365 days or never)
**Use Case**: Self-hosted Jira instances

## Jira Cloud: API Token Setup

### Step 1: Create API Token

1. **Navigate to Atlassian Account Security**
   - URL: https://id.atlassian.com/manage-profile/security/api-tokens
   - Log in with your Atlassian account

2. **Create New Token**
   - Click "Create API token"
   - Label: Use descriptive name (e.g., "jira-cli-macbook", "jira-cli-work-laptop")
   - Click "Create"

3. **Copy Token Immediately**
   - Token is shown ONLY ONCE
   - Click "Copy" button
   - Save to password manager or secure note
   - DO NOT close dialog until token is saved

4. **Verify Token Details**
   - Note creation date
   - Remember label for identification
   - Token will appear in your API tokens list

### Step 2: Configure jira-cli with API Token

```bash
# Initialize jira-cli for Cloud
jira init

# Interactive prompts:
? Installation type: Cloud
? Jira site URL: https://your-domain.atlassian.net
? Login email: your-email@example.com
? API token: [paste your copied token]
? Default project: CHR  # optional
? Default board: 1      # optional
```

### Step 3: Verify Cloud Authentication

```bash
# Test authentication
jira me

# Expected output:
# Name: Your Name
# Email: your-email@example.com
# Account ID: 5b10a...

# Test API access
jira project list
jira issue list --json | jq '.issues[0]'
```

### Configuration File (Cloud)

Location: `~/.config/jira-cli/.config.yml`

```yaml
installation: Cloud
server: https://your-domain.atlassian.net
login: your-email@example.com
project:
  key: CHR
  type: scrum
board:
  id: 1
  name: "Chronicle Board"
epic:
  name: Epic
  link: "Epic Link"
```

**Note**: API token is stored securely by jira-cli, not in plain text in the config file.

## Jira Server/Data Center: PAT Setup

### Step 1: Create Personal Access Token

#### For Jira Server 8.14+

1. **Access Your Profile**
   - Log in to Jira Server
   - Click profile icon (top right)
   - Select "Profile"

2. **Navigate to Personal Access Tokens**
   - Click "Personal Access Tokens" (left sidebar)
   - Or navigate to: `https://jira.your-company.com/secure/ViewProfile.jspa`

3. **Create Token**
   - Click "Create token"
   - Token name: "jira-cli" (or descriptive name)
   - Expiration: Choose appropriate period
     - 30 days (high security)
     - 90 days (medium security)
     - 365 days (low security)
     - Never (not recommended for production)
   - Click "Create"

4. **Copy Token**
   - Token shown only once
   - Copy immediately
   - Save securely

#### For Older Jira Server Versions

May require HTTP Basic Auth:
- Username + Password
- Not recommended for automation
- Contact administrator for PAT support

### Step 2: Configure jira-cli with PAT

```bash
# Initialize jira-cli for Server
jira init

# Interactive prompts:
? Installation type: Server
? Jira site URL: https://jira.your-company.com
? Login method: Personal Access Token
? Personal Access Token: [paste your PAT]
? Default project: PROJ  # optional
? Default board: 5       # optional
```

### Step 3: Verify Server Authentication

```bash
# Test authentication
jira me

# Test server access
jira project list
jira board list
jira issue list --json | jq '.issues[0]'
```

### Configuration File (Server)

Location: `~/.config/jira-cli/.config.yml`

```yaml
installation: Server
server: https://jira.your-company.com
login: your-username  # or email
project:
  key: PROJ
  type: scrum
board:
  id: 5
  name: "Project Board"
epic:
  name: Epic
  link: "Epic Link"
```

## Managing Multiple Jira Instances

### Use Case: Multiple Cloud Instances

```bash
# Create separate config files
~/.config/jira-cli/.config-prod.yml      # Production
~/.config/jira-cli/.config-staging.yml   # Staging
~/.config/jira-cli/.config-personal.yml  # Personal

# Switch between configs with environment variable
export JIRA_CONFIG=~/.config/jira-cli/.config-prod.yml
jira me

export JIRA_CONFIG=~/.config/jira-cli/.config-staging.yml
jira me
```

### Use Case: Cloud + Server

```bash
# Cloud config (default)
~/.config/jira-cli/.config.yml

# Server config (alternative)
~/.config/jira-cli/.config-server.yml

# Use server config
export JIRA_CONFIG=~/.config/jira-cli/.config-server.yml
jira issue list
```

### Wrapper Scripts for Multiple Instances

Create convenience scripts:

```bash
# ~/.local/bin/jira-prod
#!/bin/bash
export JIRA_CONFIG=~/.config/jira-cli/.config-prod.yml
jira "$@"

# ~/.local/bin/jira-staging
#!/bin/bash
export JIRA_CONFIG=~/.config/jira-cli/.config-staging.yml
jira "$@"

# Make executable
chmod +x ~/.local/bin/jira-prod
chmod +x ~/.local/bin/jira-staging

# Usage
jira-prod issue list
jira-staging issue create --type=Task --summary="Test"
```

## Security Best Practices

### Protect Tokens

```bash
# Never commit tokens to version control
echo ".config.yml" >> .gitignore
echo ".config-*.yml" >> .gitignore

# Secure config file permissions (user read/write only)
chmod 600 ~/.config/jira-cli/.config.yml

# Verify permissions
ls -la ~/.config/jira-cli/
# Should show: -rw------- (600)
```

### Token Storage

**Recommended Approaches**:
1. **Password Manager** - 1Password, LastPass, Bitwarden
2. **Encrypted Vault** - Hashicorp Vault, AWS Secrets Manager
3. **Operating System Keychain** - macOS Keychain, Windows Credential Manager

**Avoid**:
- Plain text files in home directory
- Shared drives
- Email or chat
- Screenshots
- Documentation

### Token Labeling

Use descriptive, identifiable labels:

**Good Labels**:
- `jira-cli-macbook-pro-2024`
- `jira-cli-work-laptop`
- `ci-cd-pipeline-prod`
- `automation-staging`

**Bad Labels**:
- `token`
- `test`
- `temp`
- `api`

### Token Scope (Server PAT)

When creating PATs, limit scope if possible:
- **Read-only** for reporting scripts
- **Write access** only when needed
- **Admin access** only for administrative scripts

## Token Rotation

### Recommended Rotation Schedule

- **Production environments**: Every 90 days
- **Development environments**: Every 180 days
- **Personal use**: Every 365 days
- **After security incident**: Immediately

### Rotation Process

#### Cloud API Token Rotation

1. **Create New Token**
   - Navigate to API tokens page
   - Create new token with new label: `jira-cli-2024-12`
   - Copy new token

2. **Update Configuration**
   ```bash
   # Re-run init or manually update credentials
   jira init
   # Provide new token when prompted
   ```

3. **Test New Token**
   ```bash
   jira me
   jira project list
   ```

4. **Revoke Old Token**
   - Return to API tokens page
   - Find old token (by label and date)
   - Click "Revoke"
   - Confirm revocation

#### Server PAT Rotation

1. **Create New PAT**
   - Navigate to Personal Access Tokens
   - Create new token with new name
   - Set appropriate expiration
   - Copy token

2. **Update Configuration**
   ```bash
   jira init
   # Provide new PAT
   ```

3. **Verify New PAT**
   ```bash
   jira me
   jira issue list
   ```

4. **Revoke Old PAT**
   - Return to Personal Access Tokens
   - Delete old token

### Automated Rotation Tracking

Create a reminder system:

```bash
# Add to crontab or calendar
# Reminder: Rotate Jira API token (created 2024-03-01, rotate by 2024-06-01)
```

## Troubleshooting Authentication

### Error: "Authentication failed"

**Symptoms**: `jira me` fails with 401 Unauthorized

**Solutions**:

1. **Verify configuration exists**
   ```bash
   cat ~/.config/jira-cli/.config.yml
   ```

2. **Check token is valid**
   - Cloud: Visit API tokens page, verify token exists
   - Server: Verify PAT hasn't expired

3. **Verify server URL**
   ```bash
   # Should NOT include /rest/api or trailing slash
   # Correct: https://your-domain.atlassian.net
   # Wrong: https://your-domain.atlassian.net/
   ```

4. **Re-initialize**
   ```bash
   jira init
   # Provide all credentials again
   ```

### Error: "Invalid credentials"

**Symptoms**: Login fails during initialization

**Solutions**:

1. **Verify email (Cloud)**
   - Must match Atlassian account email exactly
   - Check for typos

2. **Regenerate token**
   - Create new API token or PAT
   - Use fresh credentials

3. **Check account status**
   - Ensure account is not suspended
   - Verify account has Jira access

### Error: "Token expired" (Server)

**Symptoms**: Commands fail with expiration message

**Solutions**:

1. **Check token expiration**
   - Navigate to Personal Access Tokens in Jira
   - Check expiration date

2. **Create new token**
   - Follow PAT creation process
   - Set appropriate expiration

3. **Update configuration**
   ```bash
   jira init
   ```

### Error: "Permission denied"

**Symptoms**: Authentication succeeds but operations fail

**Solutions**:

1. **Verify project permissions**
   - Log into Jira web UI
   - Check project access

2. **Check role assignments**
   - Ensure user has appropriate role
   - Minimum: "Browse" permission

3. **Contact administrator**
   - May need permission updates
   - Check project visibility settings

### Error: "Connection refused"

**Symptoms**: Cannot connect to Jira server

**Solutions**:

1. **Verify server URL**
   ```bash
   curl https://jira.your-company.com
   # Should return HTML page, not error
   ```

2. **Check network access**
   - VPN required?
   - Firewall blocking?
   - Server accessible from your network?

3. **Test with browser**
   - Open Jira URL in browser
   - If fails, network issue not auth issue

### Configuration File Issues

**Config not found**:
```bash
# Create directory if missing
mkdir -p ~/.config/jira-cli

# Re-run initialization
jira init
```

**Corrupted config**:
```bash
# Backup current config
mv ~/.config/jira-cli/.config.yml ~/.config/jira-cli/.config.yml.bak

# Create fresh config
jira init
```

**Permission issues**:
```bash
# Fix permissions
chmod 600 ~/.config/jira-cli/.config.yml
chmod 700 ~/.config/jira-cli
```

## Advanced Authentication

### Environment Variables

Override config with environment variables:

```bash
# Temporarily use different credentials
export JIRA_API_TOKEN="your-token"
export JIRA_SERVER="https://different-server.atlassian.net"
export JIRA_LOGIN="different-email@example.com"

jira me
```

### CI/CD Authentication

For automated environments:

```bash
# Store token as secret in CI/CD system
# GitHub Actions example:
# Settings → Secrets → JIRA_API_TOKEN

# Use in workflow:
- name: Configure Jira CLI
  run: |
    mkdir -p ~/.config/jira-cli
    cat > ~/.config/jira-cli/.config.yml <<EOF
    installation: Cloud
    server: ${{ secrets.JIRA_SERVER }}
    login: ${{ secrets.JIRA_EMAIL }}
    EOF
    # Note: Token handled by jira-cli internally
  env:
    JIRA_API_TOKEN: ${{ secrets.JIRA_API_TOKEN }}
```

### Proxy Configuration

If behind corporate proxy:

```bash
# Set proxy environment variables
export HTTP_PROXY="http://proxy.company.com:8080"
export HTTPS_PROXY="http://proxy.company.com:8080"
export NO_PROXY="localhost,127.0.0.1"

# Test connection
jira me
```

## Credential Revocation

### When to Revoke Tokens

Immediately revoke tokens if:
- Token was exposed (committed to git, shared, etc.)
- Device was lost or stolen
- Employee leaves team/company
- Suspicious activity detected
- Regular rotation schedule

### How to Revoke

#### Cloud API Token
1. Visit https://id.atlassian.com/manage-profile/security/api-tokens
2. Find token by label and date
3. Click "Revoke"
4. Confirm revocation

#### Server PAT
1. Navigate to Personal Access Tokens in Jira profile
2. Find token by name
3. Click "Delete" or "Revoke"
4. Confirm deletion

### After Revocation

1. **Update all systems** using that token
2. **Create new token** if continued access needed
3. **Audit access logs** for suspicious activity
4. **Document incident** if security-related

## Next Steps

- Return to [Setup Guide](./setup-guide.md) for installation
- Review [Command Reference](./command-reference.md) for usage
- Check [Troubleshooting](./troubleshooting.md) for common issues

## Additional Resources

- [Atlassian API Token Documentation](https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/)
- [Jira Server PAT Documentation](https://confluence.atlassian.com/enterprise/using-personal-access-tokens-1026032365.html)
- [jira-cli Configuration](https://github.com/ankitpokhrel/jira-cli/wiki/Configuration)

---

**Security Note**: Treat API tokens and PATs like passwords. Never share, commit to version control, or expose publicly.

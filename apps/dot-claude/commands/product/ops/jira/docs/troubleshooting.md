# Jira Commands Troubleshooting Guide

Comprehensive troubleshooting guide for common issues, errors, and problems with Jira CLI integration and workflow commands.

## Quick Diagnostics

Run these commands to diagnose common issues:

```bash
# Check jira-cli installation
which jira
jira version

# Check jq installation
which jq
jq --version

# Test authentication
jira me

# Test project access
jira project list

# Test JSON output
jira issue list --json | jq '.'
```

## Authentication Issues

### Error: "Authentication failed" or 401 Unauthorized

**Symptoms**:
- `jira me` command fails
- Commands return "401 Unauthorized"
- "Invalid credentials" message

**Solutions**:

1. **Verify configuration exists**:
   ```bash
   cat ~/.config/jira-cli/.config.yml
   ```

2. **Re-initialize jira-cli**:
   ```bash
   jira init
   ```
   Follow prompts and provide fresh credentials

3. **Check token validity (Cloud)**:
   - Visit https://id.atlassian.com/manage-profile/security/api-tokens
   - Verify token exists and hasn't been revoked
   - Create new token if needed

4. **Check PAT expiration (Server)**:
   - Log into Jira Server
   - Navigate to Personal Access Tokens
   - Verify token hasn't expired
   - Create new token if expired

5. **Verify server URL**:
   ```bash
   # Correct (no trailing slash):
   https://your-domain.atlassian.net

   # Wrong (has trailing slash):
   https://your-domain.atlassian.net/
   ```

6. **Check email address (Cloud)**:
   - Must match Atlassian account exactly
   - Case-sensitive
   - No typos

### Error: "Config file not found"

**Symptoms**:
- Commands fail with "no configuration found"
- First-time setup

**Solutions**:

1. **Create config directory**:
   ```bash
   mkdir -p ~/.config/jira-cli
   ```

2. **Run initialization**:
   ```bash
   jira init
   ```

3. **Verify permissions**:
   ```bash
   chmod 700 ~/.config/jira-cli
   chmod 600 ~/.config/jira-cli/.config.yml
   ```

### Error: "Token expired" (Server)

**Symptoms**:
- Authentication worked before, now fails
- "Token is expired" message

**Solutions**:

1. **Check token expiration in Jira**:
   - Profile → Personal Access Tokens
   - Check "Expires" column

2. **Create new token**:
   - Generate new Personal Access Token
   - Set appropriate expiration

3. **Update jira-cli**:
   ```bash
   jira init
   # Provide new token
   ```

## Installation Issues

### Error: "jira command not found"

**Symptoms**:
- `jira` command doesn't execute
- "command not found" error

**Solutions**:

1. **Verify installation**:
   ```bash
   which jira
   ```

2. **Install jira-cli**:
   ```bash
   # macOS
   brew install ankitpokhrel/jira-cli/jira-cli

   # Linux
   sh -c "$(curl -fsSL https://raw.githubusercontent.com/ankitpokhrel/jira-cli/main/install.sh)"
   ```

3. **Check PATH**:
   ```bash
   echo $PATH
   # Ensure /usr/local/bin is in PATH
   ```

4. **Manual installation**:
   ```bash
   # If installed to different location
   sudo mv jira /usr/local/bin/
   chmod +x /usr/local/bin/jira
   ```

### Error: "jq command not found"

**Symptoms**:
- JSON parsing fails
- "jq: command not found"

**Solutions**:

1. **Install jq**:
   ```bash
   # macOS
   brew install jq

   # Debian/Ubuntu
   sudo apt-get install jq

   # RHEL/CentOS/Fedora
   sudo yum install jq  # or dnf install jq
   ```

2. **Verify installation**:
   ```bash
   jq --version
   ```

### Error: "Permission denied" when running jira

**Symptoms**:
- jira binary exists but won't execute
- "Permission denied" error

**Solutions**:

1. **Make binary executable**:
   ```bash
   chmod +x /usr/local/bin/jira
   ```

2. **Check file permissions**:
   ```bash
   ls -la /usr/local/bin/jira
   # Should show: -rwxr-xr-x
   ```

## Issue Operation Errors

### Error: "Issue not found" or 404

**Symptoms**:
- `jira issue view PROJ-123` fails
- "Issue does not exist" message

**Solutions**:

1. **Verify issue key format**:
   ```bash
   # Correct: PROJECT-NUMBER
   CHR-123

   # Wrong:
   chr-123  # lowercase
   CHR123   # missing hyphen
   ```

2. **Check issue exists**:
   - Open Jira in browser
   - Search for issue key
   - Verify issue exists and is accessible

3. **Verify project access**:
   ```bash
   jira project list
   # Ensure project appears in list
   ```

4. **Check permissions**:
   - Log into Jira web UI
   - Verify you have "Browse" permission
   - Contact administrator if needed

### Error: "Invalid transition" or "Cannot move to status"

**Symptoms**:
- `jira issue move` fails
- Status transition not allowed

**Solutions**:

1. **Check available transitions**:
   ```bash
   jira issue view PROJ-123 --json | jq -r '.transitions[].name'
   ```

2. **Use exact status name**:
   ```bash
   # Case-sensitive, use exact wording
   jira issue move PROJ-123 --status "In Progress"
   ```

3. **Check workflow**:
   - Transitions depend on current status
   - Some transitions require specific permissions
   - Verify workflow in Jira settings

### Error: "Field validation failed"

**Symptoms**:
- Issue creation/update fails
- "Field is required" message

**Solutions**:

1. **Check required fields**:
   - Different projects have different required fields
   - Custom fields may be required

2. **Provide missing fields**:
   ```bash
   jira issue create \
     --type Story \
     --summary "..." \
     --priority High \
     --assignee user.name
   ```

3. **Use interactive mode for guidance**:
   ```bash
   /jira-refine-issue project PROJ interactive
   ```

## JSON Parsing Errors

### Error: "Invalid JSON" or "parse error"

**Symptoms**:
- `jq` fails to parse output
- "Invalid JSON" message

**Solutions**:

1. **Verify JSON output**:
   ```bash
   jira issue view PROJ-123 --json | jq '.'
   ```

2. **Update jira-cli**:
   ```bash
   brew upgrade ankitpokhrel/jira-cli/jira-cli
   ```

3. **Check jq syntax**:
   ```bash
   # Correct:
   jq -r '.fields.status.name'

   # Wrong (missing quotes):
   jq -r .fields.status.name
   ```

4. **Handle null values**:
   ```bash
   # Use // for defaults
   jq -r '.fields.assignee.displayName // "Unassigned"'
   ```

### Error: "Cannot index null"

**Symptoms**:
- jq fails with "Cannot index null"
- Field doesn't exist in response

**Solutions**:

1. **Check field exists**:
   ```bash
   jira issue view PROJ-123 --json | jq '.fields | keys'
   ```

2. **Use optional indexing**:
   ```bash
   # Use ? for optional access
   jq -r '.fields.epic?.key'
   ```

3. **Provide defaults**:
   ```bash
   jq -r '.fields.epic.key // "No epic"'
   ```

## Sprint and Board Errors

### Error: "Sprint not found" or "Board not found"

**Symptoms**:
- Sprint operations fail
- "Sprint does not exist" message

**Solutions**:

1. **List available sprints**:
   ```bash
   jira sprint list --json
   jira sprint list --board BOARD_ID --json
   ```

2. **List boards**:
   ```bash
   jira board list --json
   ```

3. **Verify sprint ID**:
   - Sprint IDs are numeric
   - Use correct board ID
   - Sprint must be accessible to user

4. **Check sprint state**:
   ```bash
   jira sprint list --state active --json
   jira sprint list --state future --json
   ```

### Error: "Cannot add issue to closed sprint"

**Symptoms**:
- Adding issue to sprint fails
- Sprint is closed

**Solutions**:

1. **Check sprint state**:
   ```bash
   jira sprint list --json | jq '.sprints[] | select(.id == SPRINT_ID)'
   ```

2. **Use active sprint**:
   ```bash
   jira sprint list --current --json
   ```

3. **Create new sprint** (via Jira web UI)

## Network and Connectivity Issues

### Error: "Connection timeout" or "Connection refused"

**Symptoms**:
- Commands hang or timeout
- "Cannot connect to server"

**Solutions**:

1. **Check server accessibility**:
   ```bash
   curl -I https://your-domain.atlassian.net
   ping your-domain.atlassian.net
   ```

2. **Check VPN/network**:
   - VPN connected?
   - Firewall blocking?
   - Corporate proxy?

3. **Configure proxy** (if needed):
   ```bash
   export HTTP_PROXY="http://proxy.company.com:8080"
   export HTTPS_PROXY="http://proxy.company.com:8080"
   ```

4. **Check DNS resolution**:
   ```bash
   nslookup your-domain.atlassian.net
   ```

### Error: "SSL certificate verification failed"

**Symptoms**:
- HTTPS connection fails
- Certificate error

**Solutions**:

1. **Update CA certificates**:
   ```bash
   # macOS
   brew install ca-certificates

   # Linux
   sudo update-ca-certificates
   ```

2. **Check system time**:
   - Incorrect system time causes SSL errors
   - Sync system clock

3. **Corporate proxy/firewall**:
   - SSL inspection may interfere
   - Contact IT for certificate installation

## Command-Specific Issues

### Error: "Command not recognized" in Claude Code

**Symptoms**:
- `/jira-*` commands not found
- Tab completion doesn't work

**Solutions**:

1. **Verify command files exist**:
   ```bash
   ls -la ~/.claude/commands/product/ops/jira/
   # Or for project-level:
   ls -la .claude/commands/product/ops/jira/
   ```

2. **Reload Claude Code**:
   - Restart Claude Code
   - Reload command index

3. **Check file permissions**:
   ```bash
   chmod 644 ~/.claude/commands/product/ops/jira/*/*.md
   ```

### Error: "Argument parsing failed"

**Symptoms**:
- Command runs but arguments not recognized
- Unexpected behavior

**Solutions**:

1. **Check argument format**:
   ```bash
   # Correct:
   /jira-refine-issue CHR-123 interactive

   # Wrong:
   /jira-refine-issue interactive CHR-123
   ```

2. **Use quotes for multi-word arguments**:
   ```bash
   /jira-project-shuffle "sprint:123" "sprint:124"
   ```

3. **Try interactive mode**:
   ```bash
   /jira-refine-feature project CHR interactive
   ```

## Performance Issues

### Issue: Commands are slow

**Symptoms**:
- Commands take long time to complete
- Frequent timeouts

**Solutions**:

1. **Check network latency**:
   ```bash
   ping your-domain.atlassian.net
   ```

2. **Reduce parallel operations**:
   ```bash
   /jira-sprint-execute 123 --parallel 1
   ```

3. **Use caching** (for jira-cli):
   - Commands cache some responses
   - Clear cache if stale:
   ```bash
   rm -rf ~/.config/jira-cli/cache/
   ```

4. **Check Jira instance performance**:
   - May be Jira server issue
   - Check Jira status page

## Testing and Debugging

### Enable Verbose Output

```bash
# jira-cli verbose mode
jira issue view PROJ-123 -v

# Set environment variable
export JIRA_TEST_VERBOSE="true"
```

### Dry Run Mode

```bash
# Test without making changes
export JIRA_TEST_DRY_RUN="true"
/jira-epic-breakdown CHR-100 --dry-run
```

### Run Integration Tests

```bash
cd apps/dot-claude/commands/product/ops/jira/tests

# Set test environment
export JIRA_TEST_PROJECT="TEST"
export JIRA_TEST_BOARD_ID="123"

# Run tests
./test-jira-cloud.sh
```

## Getting Additional Help

### 1. Check Documentation
- [Setup Guide](./setup-guide.md)
- [Command Reference](./command-reference.md)
- [Authentication Guide](./authentication-guide.md)

### 2. Review Examples
- [Quick Reference](./quick-reference.md)
- [LLM Context Guide](./llm-context-guide.md)

### 3. External Resources
- [jira-cli GitHub Issues](https://github.com/ankitpokhrel/jira-cli/issues)
- [jira-cli Wiki](https://github.com/ankitpokhrel/jira-cli/wiki)
- [Jira Community](https://community.atlassian.com/)

### 4. Create Bug Report

If you've found a bug:
1. Note exact error message
2. Capture steps to reproduce
3. Check if issue already reported
4. Include environment details:
   - jira-cli version
   - jq version
   - Operating system
   - Jira type (Cloud/Server)

---

**Still having issues?** Double-check authentication, installation, and permissions. Most issues stem from these three areas.

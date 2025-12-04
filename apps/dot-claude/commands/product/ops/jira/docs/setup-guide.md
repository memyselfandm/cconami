# Jira Commands Setup Guide

Complete installation and configuration guide for the Jira workflow command suite. Follow these steps to get up and running with Jira CLI integration for Claude Code.

## Overview

This guide covers:
1. Installing jira-cli tool
2. Configuring authentication (Cloud and Server)
3. Verifying installation
4. Initial project setup
5. Testing the integration

**Estimated Time**: 15-30 minutes

## Prerequisites

### Required Software
- **Bash shell** (v4.0+) - Available on macOS, Linux, Windows (WSL/Git Bash)
- **jq** (v1.6+) - JSON parsing utility
- **Git** - For cloning repositories (if needed)

### Jira Access
- Jira Cloud account OR Jira Server/Data Center access
- Appropriate permissions to create and manage issues
- Admin access to create API tokens/Personal Access Tokens

### Claude Code
- Claude Code installed and configured
- Access to custom commands directory

## Step 1: Install jira-cli

Choose your platform and follow the appropriate installation method.

### macOS (Recommended: Homebrew)

```bash
# Install via Homebrew
brew install ankitpokhrel/jira-cli/jira-cli

# Verify installation
jira version
```

**Expected output**: `jira version v1.4.0` (or higher)

### Linux

#### Option A: Installation Script (Recommended)
```bash
# Download and run install script
sh -c "$(curl -fsSL https://raw.githubusercontent.com/ankitpokhrel/jira-cli/main/install.sh)"

# Verify installation
jira version
```

#### Option B: Manual Binary Installation
```bash
# Download latest release
wget https://github.com/ankitpokhrel/jira-cli/releases/latest/download/jira-cli_1.4.0_linux_amd64.tar.gz

# Extract binary
tar -xzf jira-cli_1.4.0_linux_amd64.tar.gz

# Move to system path
sudo mv jira /usr/local/bin/

# Verify installation
jira version
```

### Windows (WSL or Git Bash)

#### Option A: WSL (Windows Subsystem for Linux)
```bash
# Inside WSL terminal, use Linux installation method
sh -c "$(curl -fsSL https://raw.githubusercontent.com/ankitpokhrel/jira-cli/main/install.sh)"

# Verify installation
jira version
```

#### Option B: Manual Binary Download
1. Download Windows binary from [releases page](https://github.com/ankitpokhrel/jira-cli/releases)
2. Extract `jira.exe` to a directory in your PATH
3. Open Git Bash or PowerShell
4. Run `jira version` to verify

### Docker (Alternative)
```bash
# Pull jira-cli Docker image
docker pull ghcr.io/ankitpokhrel/jira-cli:latest

# Create alias for convenience
alias jira='docker run -it --rm ghcr.io/ankitpokhrel/jira-cli:latest'

# Verify installation
jira version
```

## Step 2: Install jq

jq is required for JSON parsing in commands.

### macOS
```bash
brew install jq

# Verify installation
jq --version
```

### Linux (Debian/Ubuntu)
```bash
sudo apt-get update
sudo apt-get install -y jq

# Verify installation
jq --version
```

### Linux (RHEL/CentOS/Fedora)
```bash
sudo yum install -y jq

# Or for newer systems
sudo dnf install -y jq

# Verify installation
jq --version
```

### Windows (WSL)
```bash
# Inside WSL, use Linux method
sudo apt-get install -y jq
```

## Step 3: Configure Authentication

Authentication setup differs for Jira Cloud vs. Server/Data Center.

### Jira Cloud Setup

#### 3.1: Create API Token

1. **Log in to Atlassian account**
   - Visit: https://id.atlassian.com/manage-profile/security/api-tokens

2. **Create API token**
   - Click "Create API token"
   - Label: "jira-cli" (or any descriptive name)
   - Click "Create"
   - **Copy token immediately** (you won't see it again!)

3. **Save token securely**
   ```bash
   # Example: Save to password manager or secure note
   # DO NOT commit to version control
   ```

#### 3.2: Initialize jira-cli (Cloud)

```bash
# Start interactive configuration
jira init

# Answer prompts:
# ? Installation type: Cloud
# ? Jira site URL: https://your-domain.atlassian.net
# ? Login email: your-email@example.com
# ? API token: [paste your API token]

# Optional: Configure default project
# ? Default project key: CHR
# ? Board ID: 1
```

**Configuration saved to**: `~/.config/jira-cli/.config.yml`

#### 3.3: Verify Cloud Authentication

```bash
# Test authentication
jira me

# Expected output: Your Jira user information

# List accessible projects
jira project list

# View current project details
jira project view CHR
```

### Jira Server/Data Center Setup

#### 3.1: Create Personal Access Token (PAT)

1. **Log in to Jira Server**
   - Navigate to your Jira server instance

2. **Access profile settings**
   - Click your profile icon → Profile
   - Navigate to "Personal Access Tokens" or "Security"

3. **Create Personal Access Token**
   - Token name: "jira-cli"
   - Expiration: Set appropriate expiration (or never)
   - Click "Create"
   - **Copy token immediately**

#### 3.2: Initialize jira-cli (Server)

```bash
# Start interactive configuration
jira init

# Answer prompts:
# ? Installation type: Server
# ? Jira site URL: https://jira.your-company.com
# ? Login method: Personal Access Token
# ? Personal Access Token: [paste your PAT]

# Optional: Configure default project
# ? Default project key: PROJ
# ? Board ID: 5
```

**Configuration saved to**: `~/.config/jira-cli/.config.yml`

#### 3.3: Verify Server Authentication

```bash
# Test authentication
jira me

# List accessible projects
jira project list

# View boards
jira board list
```

## Step 4: Project Configuration

Set up your default Jira project for commands.

### Find Your Project Key

```bash
# List all accessible projects
jira project list

# Output shows project keys:
# CHR  - Chronicle
# MAIA - MAIA Suite
# CCC  - CConami
```

### Find Your Board ID

```bash
# List all boards
jira board list

# Output shows board IDs:
# ID: 1, Name: Chronicle Board, Type: scrum
# ID: 2, Name: MAIA Kanban, Type: kanban
```

### Update Configuration (Optional)

Edit `~/.config/jira-cli/.config.yml`:

```yaml
installation: Cloud  # or Server
server: https://your-domain.atlassian.net
login: your-email@example.com
project:
  key: CHR          # Your default project
  type: scrum       # or kanban
board:
  id: 1             # Your default board
  name: "Chronicle Board"
epic:
  name: Epic
  link: "Epic Link"
```

## Step 5: Verify Installation

Run these verification tests to ensure everything is configured correctly.

### Test 1: Authentication
```bash
# Get current user
jira me --json

# Expected: JSON with your user details
```

### Test 2: Project Access
```bash
# List projects with JSON output
jira project list --json

# Expected: JSON array of accessible projects
```

### Test 3: Issue Operations
```bash
# List recent issues
jira issue list --json | jq '.issues[0:5]'

# Expected: JSON array of recent issues
```

### Test 4: Create Test Issue
```bash
# Create a test task
jira issue create \
  --type=Task \
  --summary="Test Issue - jira-cli setup verification" \
  --body="This is a test issue to verify jira-cli setup" \
  --json

# Expected: JSON with created issue details
# Note: Delete this test issue afterward
```

### Test 5: JSON Parsing
```bash
# Test JSON parsing with jq
jira issue list --json | jq -r '.issues[0].key'

# Expected: Issue key like "CHR-123"
```

### Test 6: Epic Operations (if applicable)
```bash
# List epics
jira epic list --json

# Expected: JSON array of epics (may be empty)
```

### Test 7: Sprint Operations (if applicable)
```bash
# List sprints
jira sprint list --json

# Expected: JSON array of sprints
```

## Step 6: Environment Variables (Optional)

Set environment variables for command defaults.

### Bash/Zsh (~/.bashrc or ~/.zshrc)
```bash
# Jira default project
export JIRA_PROJECT="CHR"

# Jira default board
export JIRA_BOARD_ID="1"

# Apply changes
source ~/.bashrc  # or source ~/.zshrc
```

### Fish (~/.config/fish/config.fish)
```fish
# Jira defaults
set -x JIRA_PROJECT "CHR"
set -x JIRA_BOARD_ID "1"
```

## Step 7: Claude Code Integration

Ensure Jira commands are accessible to Claude Code.

### Verify Command Directory
```bash
# Check commands are in place
ls -la ~/.claude/commands/product/ops/jira/

# Or for project-level commands
ls -la .claude/commands/product/ops/jira/
```

### Test Command Discovery
In Claude Code, type `/jira` and press Tab. You should see:
- `/jira-refine-issue`
- `/jira-refine-feature`
- `/jira-refine-epic`
- `/jira-epic-breakdown`
- `/jira-epic-prep`
- `/jira-sprint-plan`
- `/jira-sprint-execute`
- `/jira-sprint-status`
- `/jira-release-plan`
- `/jira-release-execute`
- `/jira-dependency-map`
- `/jira-project-shuffle`

## Troubleshooting Installation

### jira-cli Not Found
```bash
# Verify installation path
which jira

# If not found, ensure it's in PATH
echo $PATH

# For manual install, move binary to PATH
sudo mv jira /usr/local/bin/
```

### Permission Denied
```bash
# Make binary executable
chmod +x /usr/local/bin/jira

# Or for local install
chmod +x ~/bin/jira
```

### jq Not Found
```bash
# Install jq based on your platform
brew install jq        # macOS
apt-get install jq     # Debian/Ubuntu
yum install jq         # RHEL/CentOS
```

### Authentication Fails
```bash
# Verify configuration exists
cat ~/.config/jira-cli/.config.yml

# Re-run initialization
jira init

# Test with verbose output
jira me -v
```

### API Token Invalid (Cloud)
1. Token may have expired - create new one
2. Token wasn't copied correctly - regenerate
3. Check email matches Jira account
4. Verify server URL is correct

### PAT Invalid (Server)
1. Token may have expired - create new one
2. Check token permissions in Jira
3. Verify server URL is accessible
4. Check network/VPN access

### Cannot Access Projects
```bash
# Verify project permissions in Jira web UI
# Ensure user has at least "Browse" permission

# Check project list
jira project list

# If empty, contact Jira administrator
```

## Security Best Practices

### Protect API Tokens
```bash
# Never commit configuration to git
echo ".config.yml" >> .gitignore

# Secure configuration file permissions
chmod 600 ~/.config/jira-cli/.config.yml

# Never share tokens in chat/email
# Never expose tokens in screenshots
```

### Token Rotation
- Rotate API tokens periodically (every 90 days recommended)
- Delete old tokens after creating new ones
- Update jira-cli configuration after rotation

### Multiple Instances
If working with multiple Jira instances:

```bash
# Create separate config files
cp ~/.config/jira-cli/.config.yml ~/.config/jira-cli/.config-prod.yml
cp ~/.config/jira-cli/.config.yml ~/.config/jira-cli/.config-staging.yml

# Switch between configs
export JIRA_CONFIG=~/.config/jira-cli/.config-prod.yml
export JIRA_CONFIG=~/.config/jira-cli/.config-staging.yml
```

## Next Steps

### Learn the Commands
- Review [Command Reference](./command-reference.md) for all available commands
- Check [Quick Reference](./quick-reference.md) for common patterns
- Study [LLM Context Guide](./llm-context-guide.md) for AI integration

### Run Tests
```bash
# Navigate to test directory
cd apps/dot-claude/commands/product/ops/jira/tests

# Set test environment variables
export JIRA_TEST_PROJECT="CHR"
export JIRA_TEST_BOARD_ID="1"

# Run integration tests
./test-jira-cloud.sh
```

### Try Your First Command
```bash
# In Claude Code, try a simple command
/jira-sprint-status

# Or refine an existing issue
/jira-refine-issue PROJ-123
```

## Additional Resources

- [Authentication Guide](./authentication-guide.md) - Detailed auth configuration
- [Command Reference](./command-reference.md) - Complete command documentation
- [Troubleshooting](./troubleshooting.md) - Common issues and solutions
- [jira-cli Documentation](https://github.com/ankitpokhrel/jira-cli/wiki)

## Support

If you encounter issues not covered here:
1. Check [Troubleshooting Guide](./troubleshooting.md)
2. Review [jira-cli GitHub Issues](https://github.com/ankitpokhrel/jira-cli/issues)
3. Verify jira-cli version is 1.4.0 or higher
4. Ensure jq is properly installed
5. Confirm Jira permissions are correct

---

**Setup complete!** You're ready to use the Jira workflow commands with Claude Code.

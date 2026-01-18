# External Skills

Community and official Claude Code skills pulled in as git submodules. These stay linked to their original repos and can be updated at any time.

## Included Skills

### Official / Enterprise

| Skill | Source | Description |
|-------|--------|-------------|
| **anthropics-skills** | [anthropics/skills](https://github.com/anthropics/skills) | Official Anthropic skills: mcp-builder, skill-creator, webapp-testing, document tools (docx, pptx, xlsx, pdf), design tools |
| **trailofbits-skills** | [trailofbits/skills](https://github.com/trailofbits/skills) | Security-focused: static-analysis, property-based-testing, semgrep-rule-creator, building-secure-contracts, variant-analysis |
| **sentry-skills** | [getsentry/skills](https://github.com/getsentry/skills) | Dev workflow: commit, code-review, create-pr, find-bugs, iterate-pr |
| **vercel-skills** | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) | React best practices, web design guidelines, deployment |
| **agent-sop** | [strands-agents/agent-sop](https://github.com/strands-agents/agent-sop) | Standard Operating Procedures with RFC 2119 constraints: prompt-driven development, TDD code-assist, codebase-summary, task-generator, eval workflows |

### Development & Testing

| Skill | Source | Description |
|-------|--------|-------------|
| **aws-skills** | [zxkane/aws-skills](https://github.com/zxkane/aws-skills) | AWS development with infrastructure automation and cloud architecture patterns |
| **ui-skills** | [ibelick/ui-skills](https://github.com/ibelick/ui-skills) | Opinionated constraints for building interfaces |
| **playwright-skill** | [lackeyjb/playwright-skill](https://github.com/lackeyjb/playwright-skill) | Browser automation with Playwright |
| **dev-agent-skills** | [fvadicamo/dev-agent-skills](https://github.com/fvadicamo/dev-agent-skills) | Git workflow: conventional commits, PR creation/merge/review |
| **claude-bootstrap** | [alinaqi/claude-bootstrap](https://github.com/alinaqi/claude-bootstrap) | Security-first project initialization with spec-driven atomic todos |

### Context & Automation

| Skill | Source | Description |
|-------|--------|-------------|
| **context-engineering-skills** | [muratcankoylan/Agent-Skills-for-Context-Engineering](https://github.com/muratcankoylan/Agent-Skills-for-Context-Engineering) | Context fundamentals, degradation patterns, multi-agent patterns, memory systems |
| **n8n-skills** | [czlonkowski/n8n-skills](https://github.com/czlonkowski/n8n-skills) | n8n automation workflow: JavaScript, Python, expressions, node configuration |
| **claude-scientific-skills** | [K-Dense-AI/claude-scientific-skills](https://github.com/K-Dense-AI/claude-scientific-skills) | Scientific research capabilities |

## Usage

### Update All Skills
```bash
./apps/dot-claude/skills/external/update-skills.sh
```

### Update Single Skill
```bash
./apps/dot-claude/skills/external/update-skills.sh trailofbits-skills
```

### Initialize After Clone
```bash
git submodule update --init --recursive apps/dot-claude/skills/external/
```

### Check Status
```bash
git submodule status
```

## Using Skills in Claude Code

Skills from these repos can be:

1. **Copied to your .claude/commands/** - For slash commands you want available
2. **Referenced directly** - Point to files within these submodules from your CLAUDE.md
3. **Used as templates** - Especially `anthropics-skills/template` for creating new skills

### Example: Enable a Sentry skill

```bash
# Symlink the commit skill to your commands
ln -s ../../../apps/dot-claude/skills/external/sentry-skills/plugins/sentry-skills/skills/commit \
      .claude/commands/commit
```

### Example: Reference in CLAUDE.md

```markdown
# Security Guidelines
@apps/dot-claude/skills/external/trailofbits-skills/plugins/building-secure-contracts/building-secure-contracts.md
```

## Adding New Skills

```bash
git submodule add https://github.com/user/skill-repo.git apps/dot-claude/skills/external/skill-name
```

## Removing Skills

```bash
git submodule deinit apps/dot-claude/skills/external/skill-name
git rm apps/dot-claude/skills/external/skill-name
rm -rf .git/modules/apps/dot-claude/skills/external/skill-name
```

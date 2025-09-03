# Subagent Build Quick Reference

## Common Usage Patterns

### Single Agent Creation
```bash
# From natural language description
/subagent-build "Create a GraphQL API specialist"

# From Linear issue
/subagent-build CCC-123

# From markdown specification
/subagent-build @specs/security-scanner.md
```

### Multiple Agent Creation
```bash
# Multiple descriptions
/subagent-build "api agent" "data agent" "ui agent"

# Multiple Linear issues
/subagent-build CCC-123,CCC-124,CCC-125

# Mixed sources
/subagent-build CCC-123 "custom agent" @spec.md
```

### With Configuration
```bash
# Set research depth
/subagent-build "complex agent" --depth deep

# With reference implementation
/subagent-build "agent" --context https://github.com/example/repo

# Additional research sources
/subagent-build "agent" --research https://docs.example.com

# Full configuration
/subagent-build "agent" \
  --context https://reference.com \
  --depth deep \
  --research https://docs.com,https://guides.com
```

### Multi-Agent Configuration
```bash
# Different depths per agent
/subagent-build "agent1" "agent2" "agent3" \
  --depth light,normal,deep

# Selective references (agent2 has none)
/subagent-build "agent1" "agent2" "agent3" \
  --context https://ref1.com,,https://ref3.com

# Mixed configuration
/subagent-build CCC-101 CCC-102 \
  --depth deep,light \
  --context ,https://ref.com
```

## Configuration Options

### Research Depth Levels
| Level | Sources | Time | Use Case |
|-------|---------|------|----------|
| `light` | 2-3 | ~2 min | Simple, well-documented domains |
| `normal` | 5 | ~5 min | Standard production features (default) |
| `deep` | 8-10 | ~10 min | Complex, critical implementations |

### Input Sources
| Source | Format | Example |
|--------|--------|---------|
| Natural Language | Quoted string | `"agent description"` |
| Linear Issue | Issue ID | `CCC-123` |
| Markdown File | @ + path | `@specs/agent.md` |
| Multiple | Space-separated | `"agent1" CCC-123 @spec.md` |

### Arguments
| Argument | Description | Default |
|----------|-------------|---------|
| `--context` | Reference implementation URLs | None |
| `--depth` | Research depth (light/normal/deep) | normal |
| `--research` | Additional research URLs | None |
| `--dry-run` | Preview without execution | false |

## Execution Phases

### Phase 1: Research
- Deploys context-engineering-subagent(s)
- Configurable depth and reference biasing
- Concurrent for multiple agents

### Phase 2: Draft
- Deploys subagent-architect(s)
- Creates initial implementation
- Uses research from Phase 1

### Phase 3: Refine
- Deploys subagent-architect(s) in review mode
- Polishes and validates implementation
- Ensures production readiness

## Output Structure
```
apps/dot-claude/agents/
├── [agent-name]/
│   └── [agent-name].md
└── SUBAGENTS_README.md (updated)
```

## Tips & Best Practices

1. **Use `light` depth** for prototypes and simple agents
2. **Provide reference context** when adapting existing patterns
3. **Batch related agents** for efficiency
4. **Use `--dry-run`** to preview complex builds
5. **Review generated agents** before production use

## Common Commands

```bash
# Quick prototype
/subagent-build "test helper" --depth light

# Production agent from Linear
/subagent-build CCC-123 --depth normal

# Complex agent with reference
/subagent-build "distributed system agent" \
  --context https://github.com/hashicorp/consul \
  --depth deep

# Batch creation with varied config
/subagent-build CCC-201 CCC-202 CCC-203 \
  --depth normal,deep,light

# Preview execution plan
/subagent-build "complex agent" --depth deep --dry-run
```
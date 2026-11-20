# Example: AgentSkills.io Portable Skill

A reference skill showing the cross-agent compatible format.

## Directory Structure

```
csv-analyzing/
├── SKILL.md
├── scripts/
│   └── analyze.py
└── references/
    └── output-formats.md
```

## SKILL.md Content

```yaml
---
name: csv-analyzing
description: Analyze CSV files for data quality, generate summary statistics, and detect anomalies. Use when exploring datasets, validating data imports, or preparing data for analysis.
license: MIT
compatibility: Requires python3 with pandas installed
metadata:
  author: example-org
  version: "1.0"
allowed-tools: Bash(python:*) Read Write
---

# CSV Analysis

Analyze CSV files for quality, statistics, and anomalies.

## Process

1. Read the target CSV file
2. Run the analysis script: `python scripts/analyze.py <filepath>`
3. Review the output for data quality issues
4. Present findings with recommendations

## What the Analysis Covers

- Column types and null percentages
- Basic statistics (mean, median, std dev, min, max)
- Duplicate row detection
- Outlier detection (values beyond 3 standard deviations)
- Date format consistency
- String length anomalies

## Output

Results are printed to stdout in markdown table format. For detailed format options, see [references/output-formats.md](references/output-formats.md).
```

## Key Patterns Demonstrated

- **`name` and `description`**: both required, both present
- **`name`**: lowercase, kebab-case, matches directory, no violations
- **`description`**: under 1024 chars, includes trigger keywords
- **`allowed-tools`**: space-delimited (`Bash(python:*) Read Write`)
- **No Claude Code extensions**: no `$ARGUMENTS`, `context`, `agent`, `hooks`
- **`scripts/` directory**: follows the standard layout
- **`references/` directory**: for detailed docs loaded on demand
- **Concise body**: well under 5000 tokens

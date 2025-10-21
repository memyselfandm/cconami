---
argument-hint: <main-input> [keywords and options]
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
description: Brief description of what this command does
---

# Command Name

Brief explanation of the command's purpose.

## Usage
`/command-name <main-input> [keyword1] [keyword2] [option value]`

## Arguments
Natural language input supporting:
- `<main-input>`: Description of main required input (ID, description, etc.)
- `[keyword1]`: Optional keyword flag (e.g., "force", "dry-run", "lite")
- `[keyword2]`: Another optional keyword
- `[option value]`: Optional parameter with value (e.g., "team Chronicle")

## Workflow

### Step 1: Parse Natural Language Arguments
From `$ARGUMENTS`, extract:
- **Main input**: Look for [pattern, e.g., CCC-XXX ID format, or quoted text]
- **Keywords**: Check for presence of "keyword1", "keyword2", etc.
- **Options**: Extract values after keywords like "team", "type", etc.

Example inputs:
- "main-value keyword1"
- "main-value keyword1 keyword2 team TeamName"
- "main-value option value keyword1"

### Step 2: [Main Logic Step]
Describe what the command does with the parsed arguments.

### Step 3: [Additional Steps]
Continue with implementation steps.

## Examples

### Minimal usage
```bash
/command-name main-value
```

### With keywords
```bash
/command-name main-value keyword1 keyword2
```

### With options
```bash
/command-name main-value keyword1 team MyTeam
```

### Complex example
```bash
/command-name value1,value2,value3 keyword1 option value keyword2
```

## Notes
- Add any important notes, caveats, or tips
- Explain keyword variations if applicable (e.g., "dry-run" and "dry run" both work)
- Mention related commands if applicable

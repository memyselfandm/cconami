---
argument-hint: <param1> <param2> [param3]
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
description: Brief description of what this command does
---

# Command Name

Brief explanation of the command's purpose.

## Usage
`/command-name <param1> <param2> [param3]`

## Arguments
- `<param1>`: Description of first required parameter
- `<param2>`: Description of second required parameter
- `[param3]`: Description of optional third parameter (default: value)

## Workflow

### Step 1: Parse Arguments
Extract positional parameters:
- `$1` - First parameter (param1)
- `$2` - Second parameter (param2)
- `$3` - Third parameter (param3, optional)

Set defaults for optional parameters if not provided.

### Step 2: [Main Logic Step]
Describe what the command does with the parsed arguments.

### Step 3: [Additional Steps]
Continue with implementation steps.

## Examples

### Basic usage
```bash
/command-name value1 value2
```

### With optional parameter
```bash
/command-name value1 value2 value3
```

## Notes
- Add any important notes, caveats, or tips
- Mention related commands if applicable

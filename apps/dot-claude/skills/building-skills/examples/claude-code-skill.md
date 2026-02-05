# Example: Claude Code Skill

A reference skill showing correct structure, frontmatter, and patterns.

## Directory Structure

```
code-reviewing/
├── SKILL.md
└── references/
    └── review-patterns.md
```

## SKILL.md Content

```yaml
---
name: code-reviewing
description: Review code changes for security vulnerabilities, performance issues, and best practice violations. Use when reviewing pull requests, examining diffs, or auditing code quality.
argument-hint: [file-or-pr-reference]
allowed-tools: Read, Grep, Glob, Bash(gh pr *)
disable-model-invocation: true
---

# Code Review

Review code changes systematically for quality, security, and performance.

## Input

`$ARGUMENTS` - a file path, directory, or PR reference to review.

## Process

1. **Identify scope**: Determine what files to review from `$ARGUMENTS`
2. **Read changes**: Load the relevant diffs or files
3. **Security scan**: Check for OWASP Top 10 vulnerabilities
4. **Performance review**: Identify N+1 queries, unnecessary allocations, missing indexes
5. **Best practices**: Check naming, error handling, test coverage
6. **Report findings**: Present categorized results with severity levels

## Output Format

Present findings as:

### Critical
- [file:line] Description of critical issue

### Warning
- [file:line] Description of warning

### Suggestion
- [file:line] Description of improvement

## Additional Resources

- For detailed review patterns by language, see [references/review-patterns.md](references/review-patterns.md)
```

## Key Patterns Demonstrated

- **Frontmatter**: minimal, only fields that matter for this skill
- **Description**: states WHAT (review code) and WHEN (PRs, diffs, auditing)
- **`disable-model-invocation: true`**: user-triggered only (reviewing is intentional)
- **`allowed-tools`**: specific (`Bash(gh pr *)` not `Bash`)
- **`$ARGUMENTS`**: used for input
- **Supporting file**: referenced for progressive disclosure
- **Process steps**: clear, numbered, actionable
- **Output format**: defined so the user knows what to expect

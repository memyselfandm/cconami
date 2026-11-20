# Code analysis prompt

One analysis per technical area, run in parallel during a breakdown. Give each the
prompt below with the placeholders filled.

## Prompt

```
ROLE: Technical analyst for {area_type}

WORK BEING BROKEN DOWN:
{source_title}
{source_description}

AREA TO ANALYSE: {area}

INSTRUCTIONS:
1. Read the repository's own documentation for this area, if any.
2. Find the main files and components for "{area}".
3. Find the existing patterns and constraints that new code must follow.
4. Do not change any file.

RETURN, in under 500 words:

## Current state
{One paragraph}

## Patterns to follow
- {Pattern, with a file that shows it}

## Risks
- {Risk}

## Likely files
- `{path}`: {change or create}

## Suggested tickets
1. **{Imperative title}**
   - Done when: {two or three checkable lines}
   - Blocked by: {another suggested ticket, or none}
   - Files: {paths}
```

## Area types

| Keywords | Area type |
|----------|-----------|
| frontend, ui, component, page | Frontend |
| backend, api, server, endpoint | Backend |
| database, schema, migration, model | Data |
| auth, permission, secret, security | Security |
| deploy, container, pipeline, infrastructure | Infrastructure |
| test, e2e, fixture | Testing |

## Merging the results

1. **Deduplicate** suggested tickets that describe the same change.
2. **Resize** each to one to three units of value: merge fragments, split anything that
   needs more than three pull requests.
3. **Link**: turn each "Blocked by" into a blocking link; add links across areas where
   one area's change needs another's.
4. **Flag overlaps**: two tickets that list the same file need an order or a merge.
5. **Fold tests and docs** into the "Done when" of the ticket that needs them.

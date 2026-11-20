---
name: analyzing-dependencies
description: Maps the blocking links across a project's, an initiative's or a ticket's tickets - what is blocked and by what, the longest chain, circular links, blockers in other projects, and which tickets can start now. Use when ordering a project's work, finding why a ticket is stuck, or choosing what to run in parallel.
argument-hint: "<ticket-key | --project NAME | --initiative NAME> [--depth N] [--format text|mermaid|json] [--blockers-only]"
version: 2.0.0
metadata:
  hermes:
    category: productivity
    tags: [project-management, dependencies]
    related_skills: [pm-context, breaking-down-work, executing-work-items]
---

# Analyzing dependencies

Map the blocking links between tickets and say what can start now. Order in this
model comes only from blocking links (see `linear-workflow`), so this map is the plan.
All reads go through [pm-context](../pm-context/SKILL.md); this skill writes nothing.

## Arguments

**Scope** (one required):
- `ticket-key`: the ticket, its sub-issues, and everything linked to them
- `--project NAME`: every open ticket in the project
- `--initiative NAME`: every open ticket in every project of the initiative

**Options:**
- `--depth N`: How many levels of dependencies to trace (default: all)
- `--format`: Output format (text|mermaid|json)
- `--blockers-only`: Only show blocking relationships

## Examples

```
analyzing-dependencies --project "Sync engine"
analyzing-dependencies ABC-456                 # why is this stuck?
analyzing-dependencies --initiative "Version 2" --format mermaid
```

## Workflow

### Step 1: Gather tickets

```python
if key:
    root = pm_context.get_item(key)
    items = [root] + pm_context.get_children(key)
elif project:
    items = pm_context.list_items({project: project})
elif initiative:
    items = pm_context.list_items({initiative: initiative})

# Fetch linked tickets outside the scope too, so they can be reported as external
scope_keys = {i.key for i in items}
for item in list(items):
    for k in item.blocked_by + item.blocks:
        if k not in {i.key for i in items}:
            items.append(pm_context.get_item(k))
```

### Step 2: Build the graph

Nodes are keyed by ticket key (`ABC-123`), the same identifier `blocks` and
`blocked_by` use. Only **active** blockers make edges: a blocker that is done or
cancelled no longer blocks anything, and is listed separately as a stale link.

```python
INACTIVE = {"done", "cancelled"}

graph = {}
for item in items:
    graph[item.key] = {"item": item, "blocks": [], "blocked_by": [],
                       "external": item.key not in scope_keys}

stale_links = []   # (blocker, blocked) where the blocker is done or cancelled
for item in items:
    for blocker_key in item.blocked_by:
        blocker = graph.get(blocker_key)
        if blocker is None:
            continue                          # broken link: reported in Errors
        if blocker["item"].status_type in INACTIVE:
            stale_links.append((blocker_key, item.key))
            continue
        graph[blocker_key]["blocks"].append(item.key)
        graph[item.key]["blocked_by"].append(blocker_key)
```

### Step 3: Analyse the graph

**Find circular links:**
```python
def find_loops(graph):
    done, loops = set(), []

    def dfs(node, path):
        if node in path:
            loops.append(path[path.index(node):] + [node])
            return
        if node in done:
            return
        path.append(node)
        for blocked in graph[node]["blocks"]:
            dfs(blocked, path)
        path.pop()
        done.add(node)

    for node in graph:
        dfs(node, [])
    return loops
```

**Find the longest chain** (only meaningful once there are no loops):
```python
def find_longest_chain(graph):
    in_degree = {n: len(graph[n]["blocked_by"]) for n in graph}
    queue = [n for n in graph if in_degree[n] == 0]
    dist = {n: 0 for n in graph}
    prev = {n: None for n in graph}      # predecessor on the longest chain

    while queue:
        node = queue.pop(0)
        for blocked in graph[node]["blocks"]:
            if dist[node] + 1 > dist[blocked]:
                dist[blocked] = dist[node] + 1
                prev[blocked] = node
            in_degree[blocked] -= 1
            if in_degree[blocked] == 0:
                queue.append(blocked)

    end = max(dist, key=dist.get)
    chain = []
    while end is not None:               # walk back along prev
        chain.append(end)
        end = prev[end]
    return list(reversed(chain))
```

**Find active blockers and what is ready:**
```python
def find_blockers(graph):
    # Every remaining edge is active by construction (Step 2)
    return [
        {"blocked": graph[n]["item"], "blocker": graph[b]["item"]}
        for n in graph for b in graph[n]["blocked_by"]
    ]

def ready_to_start(graph):
    return [
        graph[n]["item"] for n in graph
        if not graph[n]["blocked_by"]
        and graph[n]["item"].status_type not in INACTIVE
        and not graph[n]["external"]
    ]
```

### Step 4: Generate Report

**Text Format:**
```markdown
## Dependency Analysis: {scope}

### Summary
- Total Items: {count}
- Dependencies: {edge_count}
- Circular: {loop_count}
- Currently Blocked: {blocked_count}

### Longest chain
{item1} → {item2} → {item3} → {item4}
Length: {path_length} items

### Circular Dependencies
⚠️ Circular links: {item1} → {item2} → {item3} → {item1}
   Remove or reverse one link before work starts.

### Active Blockers
{for blocker in blockers:}
🔴 [{blocker.key}] ({blocker.status}) blocks:
   - [{blocked1.key}] {blocked1.title}
   - [{blocked2.key}] {blocked2.title}

### Stale links
{blocker that is done or cancelled -> ticket it still points at; safe to remove}

### Blockers in other projects
{blocker key, its project, its status, and what it blocks here}

### Ready to start
{open tickets whose blockers are all done}

### Overlaps
{pairs of ready tickets likely to touch the same files: run them in order, not in parallel}

### Dependency Tree
{visual tree representation}
```

**Mermaid Format:**
```mermaid
graph TD
    A[ABC-101: Store changes as a log] -->|blocks| B[ABC-102: Replay the log]
    B -->|blocks| C[ABC-103: Conflict rule]
    B -->|blocks| E[ABC-105: Owner action: enable the flag]
    C -->|blocks| E
    D[ABC-104: Sync state in status bar]
    X[XYZ-40: other project]:::external -->|blocks| D
    classDef external stroke-dasharray: 4 4
```

## Output Examples

```
📊 Dependency analysis: project "Sync engine"

Summary:
  Items: 15
  Dependencies: 8
  Circular: 0 ✅
  Blocked: 3

Longest chain (5 tickets):
  ABC-124 → ABC-126 → ABC-130 → ABC-131 → ABC-132

Active Blockers:
  🔴 [ABC-126] Database Schema (In Progress)
     Blocks: ABC-130, ABC-131

  🔴 [ABC-127] API Setup (Todo)
     Blocks: ABC-129

Ready to start:
  ✅ ABC-124 - No dependencies
  ✅ ABC-125 - No dependencies
  ✅ ABC-128 - No dependencies
```

## Error Cases

| Issue | Action |
|-------|--------|
| Circular links | Report the loop; suggest which link to drop |
| Blocker in another project | Report it with its project and status |
| Linked ticket not found | Warn about the broken link |

## Platform notes

- [platforms/claude-code.md](platforms/claude-code.md)
- [platforms/hermes.md](platforms/hermes.md)

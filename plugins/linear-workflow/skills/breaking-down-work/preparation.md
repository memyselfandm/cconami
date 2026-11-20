# Coverage check

Step 1 of a breakdown. Before proposing tickets, find out what the project already
has, so nothing is proposed twice and stray tickets are noticed.

## 1. Collect

```
source   = get_project(name) | get_initiative(name) | get_item(key)
tickets  = list_items({project, include_closed: true})
statuses = list_statuses()
```

For a ticket source, also `get_children(key)` and its blocking links.

## 2. List the goals

From the source's description, take:

- explicit goals (numbered or bulleted lists, "Finished when" or "Done when" lines);
- goals implied by the problem statement;
- technical components it names.

## 3. Match goals to tickets

For each goal, look for a ticket (open or closed) whose title, "Done when" or
description covers it. A closed ticket covers a goal only if its "Done when" was met;
a cancelled one does not.

The result is three lists:

- **covered:** goal and the ticket that covers it;
- **uncovered:** goals with no ticket, which the proposal must address;
- **strays:** open tickets in the project that match no goal.

Match conservatively. If a ticket only probably covers a goal, list it as covered with
a question mark and say so in the proposal; do not silently skip the goal.

## 4. Strays

A stray ticket may belong to another project, or the brief may be missing a goal.
List strays in the proposal and ask. Do not move or close them in a breakdown;
`reconciling-linear-projects` is where tickets are moved and closed.

**One exception:** when the source is an oversized ticket, the breakdown itself may close
that original ticket once every one of its "Done when" lines is carried by a new ticket
(step 5 of the skill). It closes nothing else.

## 5. Output

```markdown
## Coverage

Covered (3): goal -> ABC-101 (done), goal -> ABC-104 (in progress), goal -> ABC-106?
Uncovered (4): goal, goal, goal, goal
Strays (1): ABC-110 "Rename the config key" matches no goal - another project?
```

## When to stop

- **No goals can be found:** the source is not ready. Suggest `refining-work-items`.
- **Every goal is covered:** say so; there is nothing to break down.

# Mode: feature prioritization

Rank a set of candidate features with RICE, MoSCoW and Kano, then give one ranked recommendation.
Use it when the question is "what should we build first", not "what should this feature be".

## 1. Choose the scope

Ask which work to rank. Accept any of:

- a project (its open tickets);
- a list of ticket keys;
- the backlog filtered by label or `status_type`;
- features the person describes by hand, with no tracker at all.

For tracker scopes, read the candidates with `list_items` (filter by project, `status_type` and labels) and
`get_item` for any whose description is thin. Read `get_children` where a ticket groups smaller ones.
Rank tickets at one level only. Mixing a parent with its own children double counts.

If there are fewer than three candidates, say so and stop: there is nothing to rank.

## 2. Gather what the scores need

For each candidate note: the problem it solves, who is affected, rough size of the effort, and
dependencies (read `blocks` and `blocked_by` from `get_item`; `list_items` items carry them too). Ask the person for anything the
tickets do not say. Record unknowns as unknown. Do not invent numbers.

Ask whose view the ranking serves (product, engineering, business, customer). If more than one,
score Impact per stakeholder and show where they diverge, instead of averaging them away.

## 3. Score with each framework

### RICE

Score = (Reach x Impact x Confidence) / Effort.

| Factor | Scale |
|--------|-------|
| Reach | People or events affected per quarter. Use a real count where one exists. If no counts exist, use orders of magnitude (10, 100, 1000) |
| Impact | 3 massive, 2 high, 1 medium, 0.5 low, 0.25 minimal |
| Confidence | 1.0 proven by data, 0.8 some evidence, 0.5 opinion, 0.2 speculation |
| Effort | Person-months. 0.25 is about a week. Above 3, consider splitting the ticket |

State the evidence behind each confidence value. Low-confidence items rank lower on purpose.

### MoSCoW

Sort each candidate into one bucket:

- **Must**: the outcome fails without it.
- **Should**: important, with a workaround.
- **Could**: wanted if cheap.
- **Won't (now)**: explicitly out, with a reason.

Keep Musts to roughly 60% of the effort or less. If everything is a Must, push back and ask what
could slip.

### Kano

Classify by how users react:

- **Basic**: expected. Absence angers users, presence earns no credit.
- **Performance**: more is better, in proportion.
- **Attractive**: unexpected delighters.
- **Indifferent**: users do not care.
- **Reverse**: some users dislike it.

Kano is a judgment from user evidence. If there is none, mark the class "assumed" and say so.

### Optional: value against effort

Where the person wants a picture, place each item as quick win (high value, low effort), big bet,
fill-in or time sink.

## 4. Reconcile

Build one table: candidate, RICE score and rank, MoSCoW bucket, Kano class, blockers. Then:

1. Rank by RICE. Break ties on equal scores by lower effort first.
2. Promote any Must that RICE ranks low, and say why the frameworks disagree.
3. Move up a blocker that unlocks higher-ranked work (from `blocks` and `blocked_by`).
4. Demote Reverse items and low-confidence items pending evidence.
5. Flag disagreements the person should settle. Do not smooth them over.

## 5. Recommend

Produce:

- the ranked list with one line of reasoning per item;
- what to do first, what to defer, what to drop;
- one success metric and one main risk for each of the top five items;
- the three assumptions that would change the order if wrong;
- the evidence to gather next for low-confidence items.

Work in themes and order, not dates. Do not map the result onto sprints, releases or quarters.
The unit of delivery is a project containing tickets of one to three units of value.

## 6. Record the result

Post the table and recommendation where the team will find it:

- `add_update` on the project when the ranking covers one project (set `health` only if the
  person asks);
- `add_comment` on a ticket when it concerns a single item;
- `add_update` on an initiative when it spans several projects.

Offer a file as well (Markdown in the repository docs) or instead.

Do not change ticket priority, labels or project membership unless the person asks. If they ask,
use `update_item`, `add_label` or `assign_to_project`, and report each change.

## Quality checks

- Every score cites a source, or is marked as an estimate.
- Effort units are consistent across items.
- The recommendation names its top three assumptions.
- Nothing was written to the tracker the person did not approve.

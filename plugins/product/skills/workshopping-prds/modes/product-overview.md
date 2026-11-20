# Mode: product overview

Turn a conversational discovery into a one-page product overview.
Use it for a new product or a product with no written strategy. For a single feature, run the PRD
workshop instead.

Ask one question at a time. Follow up on vague answers. Stay on the problem before discussing solutions.

## Choose the shape

Ask which the person wants. Default to standard.

- **Executive**: strategy and market, for leadership.
- **Technical**: architecture and implementation, for engineers.
- **Standard**: both, balanced.

## Phase 1: problem

1. Name the problem and ask for one concrete recent example, how often it happens, and what triggers it.
2. Ask "why does that matter" up to five times to reach the root cause. Stop when answers repeat.
3. Jobs-to-be-done: what job is the user trying to get done, what outcome do they want, and what
   would success look like to them (functional, emotional, social).
4. Quantify: time or money lost, urgency, today's workarounds.
5. Validate: who else has it, and what evidence says it is worth solving.

Capture root causes, jobs, numbers and evidence.

## Phase 2: solution

1. The proposed approach, and how it addresses each root cause found above.
2. Value proposition: gains created, pains removed, why a user would switch.
3. Differentiation: alternatives and competitors, and what is hard to copy.
4. Fit check: for each root cause, which part of the solution answers it. Name any gap.

## Phase 3: business model

Cover the Lean Canvas blocks that matter here:

- customer segments and early adopters;
- channels to reach them;
- revenue model or, for internal products, the value measure;
- cost structure and key resources;
- key metrics, and the unfair advantage.

Add the Business Model Canvas blocks (key partners, key activities, customer relationships) only if
the person wants the fuller view.

## Phase 4: synthesis

Reconcile the three phases. Check that the problem, segment and solution line up, that the metrics
test the riskiest assumption, and list the open questions. Mark every claim as evidence or assumption.

## Phase 5: write the one-pager

Keep it to one page:

```markdown
# {Product}: overview

## Problem
{Root cause, who has it, how much it costs}

## Users and jobs
{Segments and the job each is hiring the product for}

## Solution and value
{Approach, differentiation, why switch}

## Business model
{Segments, channels, revenue or value measure, costs}

## Metrics
{What proves it works}

## Risks and open questions
{Riskiest assumptions, and how to test each}

## Technical outline (technical and standard shapes)
{Main components, integrations, constraints}
```

Executive shape drops the technical outline and expands the business model. Technical shape
expands it and trims the business model to a paragraph.

## Record the result

Offer, do not assume:

- Save the page as a Markdown file in the repository docs.
- `create_project` with the one-pager as the description if the product is a new workstream, or
  `update_project` for an existing one. Before `update_project`, read the current description with `get_project`, show it, and ask whether to replace, append, or save as a file only. For a larger brief, point to the project brief
  template in `refining-work-items`.
- `add_update` on the project or initiative to note that the overview was written and what is open.

## Quality checks

- Root cause is separated from symptoms.
- Each segment has a named job.
- Assumptions are labelled.
- The page fits on one page.

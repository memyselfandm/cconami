# Project brief, lite (one page)

A one-page brief for a new project (a workstream). It goes in the project description.
Use the full [project-brief.md](project-brief.md) for a risky or cross-team project.

## Template

```markdown
# Project: {title}

**Lead**: {person or session} | **Initiative**: {initiative, if any}

---

## 🎯 Problem
{2-3 sentences: What problem does this solve? Why does it matter?}

---

## 💡 Solution
{5 key points describing the approach}

1. {Core capability 1}
2. {Core capability 2}
3. {Core capability 3}
4. {Core capability 4}
5. {Core capability 5}

---

## ✅ Finished when
{3-6 measurable outcomes - when does this workstream close?}

- [ ] {Criterion 1}
- [ ] {Criterion 2}
- [ ] {Criterion 3}
- [ ] {Criterion 4}
- [ ] {Criterion 5}
- [ ] {Criterion 6 - optional}

---

## 🛠 Technical Approach
{1 paragraph: High-level technical approach. What technologies? What patterns?}

{If --analyze-codebase was used, add:}

**Codebase Context:**
{Findings from codebase analysis}

---

## 📦 First tickets
{3-6 tickets, each one to three units of value. Order them with blocking links.}

| Ticket | Blocked by |
|--------|------------|
| {Ticket 1} | - |
| {Ticket 2} | Ticket 1 |
| {Ticket 3} | - |
| {Ticket 4} | Ticket 2, Ticket 3 |

---

## ⚠️ Risks & Dependencies
{Only critical items - skip if none}

**Risks:**
- {Critical risk 1}
- {Critical risk 2}

**Dependencies:**
- {Blocking dependency}

```

## Quick Prompts (Create Mode)

When creating a new project brief, ask these 5 questions:

```
1️⃣ What problem does this solve? (2-3 sentences)
>

2️⃣ How will you solve it? (3-5 bullet points)
>

3️⃣ When is the workstream finished? (3-5 criteria)
>

4️⃣ Technical approach? (1 paragraph or skip)
>

5️⃣ What are the first tickets? (list 3-5 or propose them)
>
```

## Refine Mode Gaps

When refining existing items, only prompt for missing essentials:

```
❓ What problem does this solve? (if not clear from description)
❓ What's the main approach? (if vague)
❓ When is this successful? (if no criteria)
```

## Validation Checklist

A lite brief needs fewer sections but still requires:

- [ ] Problem is clear (2-3 sentences)
- [ ] Solution has concrete points (not vague)
- [ ] "Finished when" is measurable
- [ ] First tickets are identified (3-6)
- [ ] No ticket is bigger than one to three units of value

## When to Use

**Use the lite brief when:**
- Planning time is short
- Scope is relatively clear
- Team is experienced with the domain
- The project is not critical or risky

**Use the full brief when:**
- The project is high-risk or complex
- Cross-team coordination required
- Significant architectural decisions
- New domain for the team
- External stakeholder visibility needed

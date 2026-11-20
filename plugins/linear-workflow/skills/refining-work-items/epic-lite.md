# Epic Lite Template (1-Pager)

Quick epic definition for when you need to move fast. Use the full [epic-template.md](epic-template.md) for comprehensive planning.

## Template

```markdown
# Epic: {title}

**Priority**: {P0|P1|P2|P3|P4} | **Complexity**: {S|M|L|XL} | **Owner**: {assignee}

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

## ✅ Success Criteria
{5-6 measurable outcomes - when is this done?}

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

## 📦 Features
{3-6 features that make up this epic}

| Feature | Complexity | Phase |
|---------|------------|-------|
| {Feature 1} | {S/M/L} | Foundation |
| {Feature 2} | {S/M/L} | Features |
| {Feature 3} | {S/M/L} | Features |
| {Feature 4} | {S/M/L} | Features |
| {Feature 5} | {S/M/L} | Integration |

---

## ⚠️ Risks & Dependencies
{Only critical items - skip if none}

**Risks:**
- {Critical risk 1}
- {Critical risk 2}

**Dependencies:**
- {Blocking dependency}

---

*Refined with /refining-work-items --type epic-lite*
```

## Quick Prompts (Create Mode)

When creating a new epic-lite, ask these 5 questions:

```
1️⃣ What problem does this solve? (2-3 sentences)
>

2️⃣ How will you solve it? (3-5 bullet points)
>

3️⃣ What does success look like? (3-5 criteria)
>

4️⃣ Technical approach? (1 paragraph or skip)
>

5️⃣ What features? (list 3-5 or auto-generate)
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

Lite epics need fewer sections but still require:

- [ ] Problem is clear (2-3 sentences)
- [ ] Solution has concrete points (not vague)
- [ ] Success criteria are measurable
- [ ] Features are identified (3-6)
- [ ] No feature is larger than "Large"

## When to Use

**Use Epic-Lite when:**
- Time is limited (< 30 min for planning)
- Scope is relatively clear
- Team is experienced with the domain
- Not a critical/risky initiative

**Use Full Epic when:**
- High-risk or high-complexity initiative
- Cross-team coordination required
- Significant architectural decisions
- New domain for the team
- External stakeholder visibility needed

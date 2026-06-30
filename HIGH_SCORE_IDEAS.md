# Prioritized Scored Ideas (HIGH_SCORE_IDEAS.md)

## Purpose
This document scores and prioritizes ideas from [IDEAS.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/IDEAS.md) using a standardized evaluation formula to determine what gets promoted to the active [ROADMAP.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/ROADMAP.md).

* **When to read it:** Before adding items to [ROADMAP.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/ROADMAP.md) or deciding upcoming features.
* **What it controls:** Idea prioritization, promotion thresholds, backlog scheduling.
* **What it must not contain:** Unscored raw ideas or code implementations.
* **Which files it depends on:** [IDEAS.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/IDEAS.md)
* **Which files depend on it:** [ROADMAP.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/ROADMAP.md), [LOOP.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/LOOP.md)

---

## The Prioritization Formula

Each idea is scored on a scale of **1 to 10** across several parameters:

$$\text{Final Score} = \frac{(\text{User Value} \times 2) + \text{Strategic Fit} + \text{Revenue Potential} + \text{Security Boost}}{\text{Effort (1-10)}} - \text{Risk Penalty (0-5)}$$

### Scoring Parameters
* **User Value (1-10):** How much does this feature improve UX or checkout speeds?
* **Strategic Fit (1-10):** Does this align with the core product strategy in [PRODUCT.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/PRODUCT.md)?
* **Revenue Potential (1-10):** Potential for subscription increases or transaction fee cuts.
* **Security Boost (1-10):** Fixes compliance issues or hardens credentials.
* **Effort (1-10):** 10 = extremely high development effort; 1 = trivial implementation.
* **Risk Penalty (0-5):** Penalizes items with high implementation risks or potential store policy violations (refer to [RISK_REGISTER.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/RISK_REGISTER.md)).

---

## Minimum Score Threshold & Promotion Rules
* **Minimum Threshold:** An idea must achieve a **Final Score >= 2.0** to be eligible for promotion to the roadmap.
* **Promotion Rule:** When an idea passes this threshold and receives approval, it is moved from `HIGH_SCORE_IDEAS.md` directly into the "Next" section of [ROADMAP.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/ROADMAP.md).

---

## Scored Backlog Table

| Idea ID | Category | Description | User Value | Strategic Fit | Revenue | Security | Effort | Risk | Final Score | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **IDEA-001** | REFACTOR | Silme ve sadeleştirme (Gereksiz GAS wrapper'lar) | 5 | 8 | 1 | 2 | 2 | 1 | **3.0** | Approved |
| **IDEA-002** | DEV | SQLite local database fallback altyapısı | 8 | 9 | 1 | 3 | 3 | 1 | **3.67** | Approved |
| **IDEA-003** | SEC | Centralized Zod middleware validasyon | 8 | 9 | 1 | 9 | 2 | 1 | **4.5** | Approved |

Last updated: TODO
Related files: [IDEAS.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/IDEAS.md), [ROADMAP.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/ROADMAP.md)

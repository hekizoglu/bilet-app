# Claude Agent Constitution (CLAUDE.md)

## Purpose
This document defines the core behavior, constraints, and authority rules for any AI agent operating in this repository. It serves as the primary instructions for task execution.

* **When to read it:** At the start of every session before running commands or making edits.
* **What it controls:** Agent behavior, decision-making, token usage, and tool executions.
* **What it must not contain:** Specific app implementation details or user-level product requirements.
* **Which files it depends on:** [00_CONTEXT_GRAPH.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/00_CONTEXT_GRAPH.md), [manifest.json](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/manifest.json)
* **Which files depend on it:** [LOOP.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/LOOP.md), [AGENTS.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/AGENTS.md)

---

## Constitution & Guidelines

### 1. Minimal Context Loading & Token Optimization
* Always load the minimum files required by checking the Task-to-Context table in [00_CONTEXT_GRAPH.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/00_CONTEXT_GRAPH.md).
* Never read entire directories recursively.
* Prefer using grep searches for locating specific patterns.

### 2. Standard Build, Test, and Lint Commands
* **Backend Dev/Start:** `npm --prefix backend start`
* **Backend Test:** `node backend/test-api.js` or `node backend/test-e2e.js`
* **Frontend Dev:** `npm --prefix frontend run dev`
* **Frontend Build:** `npm --prefix frontend run build`
* **Frontend Lint:** `npm --prefix frontend run lint`

### 3. Change Logging and State Updates
Whenever you complete a task:
* Summarize the changes in [PROJECT_MEMORY.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/PROJECT_MEMORY.md).
* If a bug was encountered and solved, register the solution in [ERRORS.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/ERRORS.md).
* If an architectural decision was made, document it in [DECISIONS.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/DECISIONS.md).
* If a new risk was identified, register it in [RISK_REGISTER.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/RISK_REGISTER.md).

### 4. Handling Uncertainty
* If the user's intent is ambiguous, ask focused, multiple-choice questions. Do not assume or guess.
* Refuse unsafe commands, direct modifications of secrets, or modifications that violate [SECURITY.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/SECURITY.md).

---

## Hierarchy of Authority

In case of conflicting rules or instructions, the hierarchy of authority must be followed:

1. [SECURITY.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/SECURITY.md) (Highest Authority - can block any build/deploy)
2. [PRODUCT.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/PRODUCT.md)
3. [ARCHITECTURE.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/ARCHITECTURE.md)
4. [ROADMAP.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/ROADMAP.md)
5. [QA.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/QA.md)
6. [BUILD_TEST_FIX.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/BUILD_TEST_FIX.md)
7. [REVIEW.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/REVIEW.md)
8. [RELEASE.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/RELEASE.md)
9. [PROJECT_MEMORY.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/PROJECT_MEMORY.md)
10. All other supporting files.

Last updated: TODO
Related files: [00_CONTEXT_GRAPH.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/00_CONTEXT_GRAPH.md), [SECURITY.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/SECURITY.md), [PROJECT_MEMORY.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/PROJECT_MEMORY.md)

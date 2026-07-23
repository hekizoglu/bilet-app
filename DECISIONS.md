# Architecture Decision Records (DECISIONS.md)

## Purpose
This document logs the Architecture Decision Records (ADRs) explaining why key technical and architectural paths were selected.

* **When to read it:** Before refactoring components, proposing database schema changes, or reviewing code changes.
* **What it controls:** Long-term design patterns, API structures, and data models.
* **What it must not contain:** Sprint-level task updates or temporary script details.
* **Which files it depends on:** [ARCHITECTURE.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/ARCHITECTURE.md)
* **Which files depend on it:** [PROJECT_MEMORY.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/PROJECT_MEMORY.md), [LOOP.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/LOOP.md)

---

## ADR Template

```markdown
### [ADR-00X] Title of Decision

* **Status:** [Proposed / Accepted / Superseded / Reverted]
* **Date:** YYYY-MM-DD
* **Owner:** TODO (User/Architect Name)

#### Context
What is the technical problem we are trying to solve? List background and requirements.

#### Options Considered
* **Option A:** Pros & Cons.
* **Option B:** Pros & Cons.

#### Decision & Rationale
Which option did we select and why?

#### Consequences
* What new capabilities do we get?
* What are the trade-offs or technical debt introduced?

#### Reversal Conditions
Under what specific circumstances should this decision be reverted or modified?

#### Related Files
* [Example](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/example.js)
```

---

## Active Decisions

### ADR-001: SQLite local fallback configuration

* **Status:** Accepted
* **Date:** 2026-06-29
* **Owner:** Lead Architect

#### Context
Geliştirici ortamında Docker veya MySQL yerel olarak yüklü olmadığında veritabanı işlemlerinin geliştirilmesini engellememek.

#### Options Considered
* **Option A (Strict MySQL):** Developer must install and configure Docker and MySQL locally. (High setup overhead).
* **Option B (SQLite Fallback):** Swap Prisma provider dynamically or via schemas to run SQLite locally.

#### Decision & Rationale
Accepted Option B. SQLite is zero-configuration and runs in-process, allowing agents to run unit tests and query validation scripts without external database engines.

#### Consequences
* Local builds do not require MySQL or Docker setup.
* Minor differences in field types (e.g., MySQL specific enums) must be handled gracefully in prisma schemas.

### ADR-002: Transition to new Google Apps Script project for online development

* **Status:** Accepted
* **Date:** 2026-06-29
* **Owner:** Lead Architect

#### Context
The user requested to run the ticket application up to a certain stage on Google Apps Script and provided a verified script ID for active online development.

#### Options Considered
* **Option A:** Continue using the old script ID (leads to mismatch of active development environments).
* **Option B:** Re-point `.clasp.json` and deploy our local `legacy_gas` code to the new script ID `1cxXxXy0y5nwr2134lvY5JbP8F1GQMxsqADbP83Hp2rg37AT8pKQKEi8f`.

#### Decision & Rationale
Accepted Option B. It aligns the local codebase with the new online project where active testing, sheets database operations, and triggers are maintained by the user.

#### Consequences
* Local edits must be pushed using `npx clasp push --force`.
* Care must be taken to verify that remote script properties (e.g., SPREADSHEET_ID) are initialized correctly in the new environment via the `setup()` function.

Last updated: 2026-07-23
Related files: [ARCHITECTURE.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/ARCHITECTURE.md), [PROJECT_MEMORY.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/PROJECT_MEMORY.md), [.clasp.json](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/.clasp.json)

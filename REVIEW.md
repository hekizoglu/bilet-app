# Review Gates & Guidelines (REVIEW.md)

## Purpose
This document defines the review process applied to the codebase *after* automated tests have passed. It focuses on qualitative analysis, code health, user experience, and risk mitigation.

* **When to read it:** Before presenting changes for merge, deploying to production, or evaluating release readiness.
* **What it controls:** Review verdicts, code design standards, and deployment approvals.
* **What it must not contain:** Automated validation checklists or raw syntax tests (refer to [QA.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/QA.md)).
* **Which files it depends on:** [QA.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/QA.md), [RISK_REGISTER.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/RISK_REGISTER.md)
* **Which files depend on it:** [RELEASE.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/RELEASE.md), [LOOP.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/LOOP.md)

---

## Review Categories

### 1. Architecture Review
* Does the code respect module boundaries defined in [ARCHITECTURE.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/ARCHITECTURE.md)?
* Are database queries structured to scale?
* Are API endpoints REST-compliant?

### 2. Security Intent Review
* Are credentials handled only through environmental variables?
* Is input parsing securely checked?
* Are session timeouts enforced correctly?

### 3. Product & UX Review
* Does the interface meet the visual excellence requirements in [PRODUCT.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/PRODUCT.md)?
* Is the checkout flow quick and free of friction?

### 4. Token & Maintainability Review
* Does the file structure match codebase patterns?
* Is the code commented and documented properly to help future AI agents optimize context loading?

---

## Review Verdicts

A change must receive one of the following verdicts before integration:

* **`APPROVED`**: Ready to merge. Zero blocking issues identified.
* **`APPROVED_WITH_NOTES`**: Ready to merge, but minor, non-blocking technical debt must be logged in [IDEAS.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/IDEAS.md) or [RISK_REGISTER.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/RISK_REGISTER.md).
* **`CHANGES_REQUIRED`**: Must be modified. Logical bugs, UX flaws, or bad design patterns were found.
* **`BLOCKED`**: Hard stop. Critical security flaws, credentials leaks, or [SECURITY.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/SECURITY.md) violations were discovered.

Last updated: 2026-07-23
Related files: [QA.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/QA.md), [RELEASE.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/RELEASE.md)

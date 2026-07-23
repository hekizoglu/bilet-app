# Risk Register (RISK_REGISTER.md)

## Purpose
This document logs and tracks project-level risks across security, product, operations, legal compliance, and AI behavior.

* **When to read it:** Prior to code review gates, release preparation, or architectural shifts.
* **What it controls:** Mitigation strategies and project safety thresholds.
* **What it must not contain:** Low-level software bugs (refer to [ERRORS.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/ERRORS.md)).
* **Which files it depends on:** [SECURITY.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/SECURITY.md), [PRODUCT.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/PRODUCT.md)
* **Which files depend on it:** [LOOP.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/LOOP.md), [REVIEW.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/REVIEW.md)

---

## Risk Matrix Template

| Risk ID | Category | Description | Probability (1-5) | Impact (1-5) | Mitigation Plan | Owner | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **RSK-00X** | [Security/Product] | Detailed risk description | [1-5] | [1-5] | Action plan to reduce risk likelihood or impact | TODO | [Active/Mitigated/Accepted] |

---

## Active Risk Log

| Risk ID | Category | Description | Probability | Impact | Mitigation Plan | Owner | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **RSK-001** | Technical | Local SQLite database schema mismatch with production MySQL. | 3 | 4 | Build schema validations and write migration integration tests. | Architect | Mitigated |
| **RSK-002** | Security | Double-booking checkout race-conditions under high-load. | 2 | 5 | Implement database-level transactional locks and run concurrent load-testing. | Security Agent | Mitigated |
| **RSK-003** | Legal/Policy | E-mail containing QR codes or user details not compliant with local privacy law (KVKK/GDPR). | 2 | 4 | Anonymize logs, use HTTPS, and mask user-identifiable properties. | Legal/Product | Mitigated |
| **RSK-004** | AI Behavior | AI agents executing incorrect or destructive terminal commands during task loops. | 3 | 4 | Restrict execution sandbox, mandate manual confirmation prompts for database edits. | Primary Agent | Mitigated |

Last updated: 2026-07-23
Related files: [SECURITY.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/SECURITY.md), [REVIEW.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/REVIEW.md)

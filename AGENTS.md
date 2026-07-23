# Multi-Agent Coordination (AGENTS.md)

## Purpose
This document governs the division of labor among multiple AI agents. It ensures specialized focus, restricts file writing privileges, and defines target model recommendations.

* **When to read it:** Before instantiating new subagents or delegating tasks to specific agent roles.
* **What it controls:** Agent capabilities, authorization bounds, and context scopes.
* **What it must not contain:** Specific prompt templates (refer to [PROMPTS.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/PROMPTS.md)).
* **Which files it depends on:** [00_CONTEXT_GRAPH.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/00_CONTEXT_GRAPH.md)
* **Which files depend on it:** [PROMPTS.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/PROMPTS.md), [TOKEN_OPTIMIZATION.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/TOKEN_OPTIMIZATION.md)

---

## Agent Directory & Profiles

### 1. Primary Agent (Coordinator)
* **Responsibility:** Session coordination, subagent instantiation, and task orchestration.
* **Input Files:** [00_CONTEXT_GRAPH.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/00_CONTEXT_GRAPH.md), [PROJECT_MEMORY.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/PROJECT_MEMORY.md), [CLAUDE.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/CLAUDE.md)
* **Output Files:** Updates [PROJECT_MEMORY.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/PROJECT_MEMORY.md).
* **Allowed to Change:** Coordination configs.
* **Not Allowed to Change:** Code logic without subagent delegate confirmation.
* **Model Type:** Large (e.g., Gemini Pro / Claude Opus / GPT-4o).
* **When to call:** Entry point of every user interaction.

### 2. Product Agent
* **Responsibility:** Feature definition, backlog processing, and requirements alignment.
* **Input Files:** [PRODUCT.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/PRODUCT.md), [ROADMAP.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/ROADMAP.md).
* **Output Files:** [PRODUCT.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/PRODUCT.md).
* **Allowed to Change:** [PRODUCT.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/PRODUCT.md), [ROADMAP.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/ROADMAP.md).
* **Not Allowed to Change:** Implementation code or configuration JSON files.
* **Model Type:** Medium (Gemini Flash / GPT-4o-mini).

### 3. Architecture & Code Agent
* **Responsibility:** Module construction, database migrations, and structural designs.
* **Input Files:** [ARCHITECTURE.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/ARCHITECTURE.md), [DECISIONS.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/DECISIONS.md).
* **Output Files:** Application source code, database schemas, [DECISIONS.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/DECISIONS.md).
* **Allowed to Change:** Root source code, database settings.
* **Not Allowed to Change:** [SECURITY.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/SECURITY.md) policies.
* **Model Type:** Large.

### 4. Security Agent
* **Responsibility:** Security auditing, policy enforcement, vulnerability scanning.
* **Input Files:** [SECURITY.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/SECURITY.md), [RISK_REGISTER.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/RISK_REGISTER.md).
* **Output Files:** [RISK_REGISTER.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/RISK_REGISTER.md).
* **Allowed to Change:** [RISK_REGISTER.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/RISK_REGISTER.md), security checks.
* **Not Allowed to Change:** Code logic (only audits it).
* **Model Type:** Large.

### 5. QA & Build-Fix Agent
* **Responsibility:** Running compiler checks, executing unit tests, resolving build exceptions.
* **Input Files:** [BUILD_TEST_FIX.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/BUILD_TEST_FIX.md), [QA.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/QA.md), [ERRORS.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/ERRORS.md).
* **Output Files:** [ERRORS.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/ERRORS.md).
* **Allowed to Change:** Test files, bug fixes, lint parameters.
* **Not Allowed to Change:** Architectural boundaries.
* **Model Type:** Medium.

### 6. Review & Release Agent
* **Responsibility:** Deployment packaging, changelog updates, and version tags.
* **Input Files:** [REVIEW.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/REVIEW.md), [RELEASE.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/RELEASE.md).
* **Output Files:** Release logs, version tags.
* **Allowed to Change:** [RELEASE.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/RELEASE.md) lists.
* **Not Allowed to Change:** Source code.
### 7. Strict Operational Rules (Zero Hallucination & Explicit Confirmation)
* **Zero Hallucination Rule:** NEVER guess, assume, or invent code logic, database schemas, function signatures, or file paths. Always verify against authoritative source code using tools.
* **Mandatory Explicit Confirmation Rule:** NEVER execute code edits, database schema migrations, or major architectural changes without presenting an explicit plan and receiving user approval first.

Last updated: 2026-07-23
Related files: [PROMPTS.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/PROMPTS.md), [TOKEN_OPTIMIZATION.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/TOKEN_OPTIMIZATION.md)

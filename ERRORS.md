# Known Errors and Fixes (ERRORS.md)

## Purpose
This document logs encountered build compilation errors, API faults, database locking issues, and their associated resolutions to prevent repeating ineffective fixes.

* **When to read it:** Prior to executing code repairs in [BUILD_TEST_FIX.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/BUILD_TEST_FIX.md) or debugging environment issues.
* **What it controls:** Bug resolution records and history of logical code faults.
* **What it must not contain:** Long raw stack logs (keep them truncated).
* **Which files it depends on:** [BUILD_TEST_FIX.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/BUILD_TEST_FIX.md)
* **Which files depend on it:** [LOOP.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/LOOP.md)

---

## Error Record Template

```markdown
### [ERR-00X] Title of Error Scenario

* **Environment:** [Local / Staging / Production]
* **Status:** [Active / Resolved]
* **Related Files:** [File Link](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/file.js)

#### Symptoms
What goes wrong? Paste a truncated snippet of the stack trace or output.

#### Root Cause
What is the underlying logical or structural issue?

#### Fix & Resolution
What exact changes resolved the issue?

#### Prevention
What lint rule, unit test, or validation middleware was added to prevent recurrence?
```

---

## Active Error Registry

### ERR-001: Local environment lacks Docker / MySQL Server

* **Environment:** Local
* **Status:** Resolved
* **Related Files:** [schema.prisma](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/backend/prisma/schema.prisma)

#### Symptoms
`prisma db push` fails due to connection refusal to MySQL port `3306`.

#### Root Cause
Prisma was configured to connect exclusively to MySQL via a port that wasn't exposed because Docker/MySQL Server was not running locally.

#### Fix & Resolution
Configured Prisma schema to support dynamic datasource selection, defaulting to local SQLite database file `dev.db` when environment flags are set to `local`.

#### Prevention
Run pre-flight check script `node backend/test-load.js` before executing full API testing cycles.

Last updated: TODO
Related files: [BUILD_TEST_FIX.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/BUILD_TEST_FIX.md), [DECISIONS.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/DECISIONS.md)

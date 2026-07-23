# Release Control (RELEASE.md)

## Purpose
This document controls release types, changelog standards, store submission requirements, rollback plans, and hotfix workflows.

* **When to read it:** Prior to tagging a build, submitting to app stores, or deploying changes to production.
* **What it controls:** Version numbering, deployment steps, rollback criteria.
* **What it must not contain:** Specific build parameters or API test targets.
* **Which files it depends on:** [REVIEW.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/REVIEW.md)
* **Which files depend on it:** [OBSERVABILITY.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/OBSERVABILITY.md), [LOOP.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/LOOP.md)

---

## Release Classifications & Versioning
We follow Semantic Versioning (SemVer): `MAJOR.MINOR.PATCH`.
* **Patch:** Bug fixes and small internal updates.
* **Minor:** Feature additions that are backwards-compatible.
* **Major:** Breaking API modifications or significant architectural updates.

---

## Pre-Release Gate Checklist
Before deployment to production:
- [ ] Code review completed and marked `APPROVED` according to [REVIEW.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/REVIEW.md).
- [ ] All QA tests pass according to [QA.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/QA.md).
- [ ] Database migrations are executed and confirmed safe.
- [ ] Environment variables in production match the required `.env.example` keys.
- [ ] Rollback validation has been dry-run.

---

## Rollback & Hotfix Protocols

### Rollback Strategy
If post-release metrics degrade (e.g., error rate spike > 1% in first 30 mins):
1. **Revert Commit/Image:** Deploy the previously stable tagged Docker image or commit immediately.
2. **Database Schema:** Ensure migrations are backwards-compatible so schema rollback is unnecessary or safe.
3. **Notify Agents:** Log the incident in [ERRORS.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/ERRORS.md).

### Hotfix Workflow
1. Branch from the current production tag (`hotfix/description`).
2. Implement and test the fix locally.
3. Skip minor version increments; deploy as a PATCH release.
4. Merge back to the main development branch.

---

## Release Notes Template

```markdown
# Release [vX.Y.Z] - YYYY-MM-DD

### Added
- Feature description.

### Fixed
- Bug fix description (cross-referenced with [ERRORS.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/ERRORS.md)).

### Migration Steps
- Database schema migrations or environment variable configurations.
```

Last updated: 2026-07-23
Related files: [REVIEW.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/REVIEW.md), [OBSERVABILITY.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/OBSERVABILITY.md)

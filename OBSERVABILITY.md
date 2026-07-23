# Observability and Production Monitoring (OBSERVABILITY.md)

## Purpose
This document specifies the logging rules, telemetry requirements, crash reporting, incident response protocols, and monitoring tools used to track production system health.

* **When to read it:** Before implementing logger modules, adding telemetry traces, or investigating active production incidents.
* **What it controls:** Telemetry levels, logging standards, alerts, and post-release validation metrics.
* **What it must not contain:** Specific database credentials or server keys.
* **Which files it depends on:** [RELEASE.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/RELEASE.md)
* **Which files depend on it:** [ERRORS.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/ERRORS.md)

---

## Observability Standards

### Logging Principles
* Use structured logging format (JSON output) in production for parsing.
* Log levels:
  * **DEBUG:** Verbose debugging data (disabled in production).
  * **INFO:** Normal transaction flows, server boot, connections.
  * **WARN:** Non-fatal anomalies (e.g., failed checkouts due to client error, socket reconnects).
  * **ERROR:** System errors, unhandled exceptions, database connection drops.

### Telemetry Restrictions (What NOT to collect)
* Do not log customer passwords, credit card numbers, JWT tokens, or full addresses.
* Mask IP addresses and customer emails in log aggregation systems to ensure privacy compliance.

---

## Metrics That Matter
1. **Response Time:** API endpoint latency (Target: 95% of queries under 200ms).
2. **Checkout Error Rate:** Percent of failed reservation requests (Target: <0.5%).
3. **Active Connection Count:** Tracking active WebSockets on Socket.io.
4. **Memory & CPU Load:** Server resource usage metrics.

---

## Incident Response Flow
1. **Alert Triggered:** Spike in error rates or latency notifies door operators/admin.
2. **Triage:** Architect/release manager determines severity (Critical/High/Medium).
3. **Mitigation:** Revert deployment if necessary (see [RELEASE.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/RELEASE.md)), or apply hotfix.
4. **Post-Mortem:** Record findings, root cause, and preventative actions in [ERRORS.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/ERRORS.md).

Last updated: 2026-07-23
Related files: [RELEASE.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/RELEASE.md), [ERRORS.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/ERRORS.md)

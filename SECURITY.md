# Security and Policy Control (SECURITY.md)

## Purpose
This document establishes the security guidelines, access controls, secrets management rules, and regulatory/store policies required to protect user data and ensure secure deployments.

* **When to read it:** Before touching deployment pipelines, adding environment variables, implementing auth routines, or executing release actions.
* **What it controls:** Encryption parameters, authentication middleware rules, environment configuration, and access logging.
* **What it must not contain:** Actual plaintext passwords, private keys, API secrets, or active connection strings.
* **Which files it depends on:** [00_CONTEXT_GRAPH.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/00_CONTEXT_GRAPH.md)
* **Which files depend on it:** All files (Has absolute veto authority on code modification and releases).

---

## Security & Privacy Principles

### Core Principles
1. **Least Privilege:** Services, database accounts, and team members only get the minimal access scope needed.
2. **Defense in Depth:** Multiple layers of security check authentication, validation, rate limits, and network access.
3. **Data Masking:** Mask sensitive user details (such as email components, phone numbers, and bank details/IBANs) in admin logs.

### Secrets Management
* **No hardcoded secrets:** Never place credentials, JWT secrets, passwords, or API keys directly in source code.
* **Use Environment Variables:** Load all secrets via `.env` (which must be added to `.gitignore`).
* **Config Verification:** Provide a `.env.example` file displaying necessary variable names.

---

## Authentication & Authorization Rules

### Admin Endpoints
* All `/api/admin/*` endpoints must pass through the `auth` middleware.
* JWT tokens must have a strict expiration window (max 24 hours).
* Validate token signatures on every request using a cryptographically strong signing key.

### Ticket Validation & Checkout
* The checkout route must enforce rate limiting (max 5 requests per minute per IP) to prevent ticketing bots.
* Ticket QR codes must consist of a secure UUIDv4 token coupled with a message authentication code (HMAC) to prevent forgery.

---

## Security Review Checklist & Blocker Policies

### Blocker Rules (Must stop development if triggered)
* [ ] Plaintext password or token committed to Git history.
* [ ] Database credentials allowed from wild-card (`%`) public IP hosts.
* [ ] Lack of Zod validation schemas on customer checkout endpoints.

### Security Review Checklist
- [ ] Are all API inputs parsed and validated using Zod schemas?
- [ ] Is CORS configured to allow only trusted origin domains?
- [ ] Are security headers (Helmet) fully configured on the Express instance?
- [ ] Have all temporary debugging logs showing raw request bodies been removed?

Last updated: TODO
Related files: [RISK_REGISTER.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/RISK_REGISTER.md), [CLAUDE.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/CLAUDE.md)

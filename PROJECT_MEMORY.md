# Project Memory (PROJECT_MEMORY.md)

> [!WARNING]
> Do NOT turn this document into a long diary. Keep it concise, structured, and updated at the end of every task execution.

## Purpose
This document stores the short-term state, current milestone, and active development variables. It serves as the primary memory buffer for newly spawned AI agents.

* **When to read it:** At the beginning of every session or task.
* **What it controls:** Active priorities, current milestones, and short-term decisions.
* **What it must not contain:** Long historical logs, full changelogs, or source code.
* **Which files it depends on:** [ROADMAP.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamasi/ROADMAP.md)
* **Which files depend on it:** [CLAUDE.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamasi/CLAUDE.md), [LOOP.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamasi/LOOP.md)

---

## Current Project Summary
Developing a ticket reservation system that supports a modern Node.js + Next.js + Prisma stack, with local SQLite validation and production-targeted PostgreSQL deployment.

### Active Stack
* **Frontend:** Next.js App Router, Tailwind CSS, React Konva
* **Backend:** Node.js, Express, Socket.io, Prisma ORM
* **Database:** SQLite for local verification, PostgreSQL for production target

### Current Milestone
* **Milestone:** FAZ 19-25 - Production Readiness & Deployment Hardening (in progress).

---

## Active Memory Block

### Recent Important Decisions
* Production runtime is now standardized around standalone Next output; `frontend` starts via `.next/standalone/server.js`.
* PM2 configuration now covers both backend and frontend processes instead of only the backend.
* Deploy workflow now runs health checks after `pm2 reload` before reloading Nginx.
* Docker Compose now exposes health checks for backend `/api/health` and frontend `/`.
* Backend runtime logging was normalized onto Winston; remaining runtime `console.*` calls were replaced in active app code.
* A real refund notification defect was fixed in `backend/routes/reservations.js`: Telegram refund jobs now use `taskQueue.addJob(...)` instead of a non-existent `taskQueue.add(...)`.
* The hall designer multi-select migration is complete enough for production build again; box selection, duplicate, delete, and selection state now align.
* Segment-level `error.tsx` boundaries were added for major App Router sections (`admin`, `event`, `payment`, `profile`, `telegram`, `login`).

### Active Priorities
1. Complete external-only production tasks on the target VPS: PostgreSQL migration, PM2 startup/save, Nginx validation, SSL, cron backup, and live CI/CD verification.
2. Run live launch verification flows and performance/security checks that require the real domain and real server state.

### Do-Not-Change List
* Do not replace JWT authentication middleware with insecure alternatives.

Last updated: 2026-07-07
Related files: [ROADMAP.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet-app-new/bilet-app/ROADMAP.md), [DECISIONS.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet-app-new/bilet-app/DECISIONS.md)

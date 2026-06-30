# Technical Architecture Control (ARCHITECTURE.md)

## Purpose
This document establishes the technical structure, stack constraints, modular boundaries, and architectural patterns required to keep the system clean, fast, and scalable.

* **When to read it:** Before adding new modules, integrating third-party dependencies, or altering core data flows.
* **What it controls:** Tech stack, system layers, database interactions, and API design.
* **What it must not contain:** Specific business logic variables, release timelines, or raw feature text.
* **Which files it depends on:** [00_CONTEXT_GRAPH.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/00_CONTEXT_GRAPH.md)
* **Which files depend on it:** [DECISIONS.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/DECISIONS.md), [LOOP.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/LOOP.md)

---

## Technical Stack & Modular Architecture

### Stack Definition
* **Frontend:** Next.js (App Router), React, React Konva (Interactive seat rendering).
* **Backend:** Node.js (Express), SQLite (via Prisma ORM) for local-first testing, MySQL for production.
* **Real-time Synchronization:** Socket.io (real-time seat state sync).
* **Legacy Compatibility:** Google Apps Script + Google Sheets database (located in `legacy_gas`).

### Module Boundaries
```
┌─────────────────────────────────────────────────────────────┐
│                       Frontend (Next.js)                    │
│    - /admin (Events, Halls, Designer via React Konva)       │
│    - /event/[id] (Seat selection, client checkout form)     │
└──────────────┬──────────────────────────────▲───────────────┘
               │ HTTP Requests                │ Socket.io (Realtime)
┌──────────────▼──────────────────────────────┴───────────────┐
│                      Backend (Node.js API)                  │
│    - Rota Middleware (JWT Auth, Rate Limiting, Validation)  │
│    - Services (Events, Halls, Reservations)                 │
│    - Prisma ORM Data Layer                                  │
└──────────────┬──────────────────────────────▲───────────────┘
               │ DB Queries                   │ Models
┌──────────────▼──────────────────────────────┴───────────────┐
│                      Data Store (MySQL/SQLite)              │
│    - Tables: Settings, Events, Halls, Reservations, Logs    │
└─────────────────────────────────────────────────────────────┘
```

---

## Architecture Principles

### Data Flow
* **Unidirectional flow:** UI triggers API actions -> Service Layer queries DB -> State returned to Client.
* All data writes must occur inside database transactions to prevent double-booking of seats.

### API Principles
* RESTful JSON endpoints.
* Strict schema validation for all API inputs using Zod.
* Authentication via JWT tokens for admin routes.

### Real-Time State Sync
* Seat lock events must be transient (stored in Redis or in-memory array with short TTL) before final checkout is logged to DB.

### Scalability & Error Handling
* Graceful degradation: If Socket.io falls back, client polling must be used automatically.
* Centralized error middleware returning standardized error structures: `{ error: true, message: string }`.

---

## Security-Sensitive Architecture Zones
* **Admin Login Route (`/api/auth/login`):** Absolute logging of successful and failed attempts.
* **Reservation Checkout (`/api/reservations/checkout`):** Race-condition checked via transactional DB locks.

## Architecture Anti-Patterns (Do Not Do)
* Do not bypass Prisma ORM with raw SQL queries unless indexing performance demands it.
* Do not store business logic inside Next.js components; delegate all calculations to custom hooks or utility modules.

Last updated: TODO
Related files: [DECISIONS.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/DECISIONS.md), [PRODUCT.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/PRODUCT.md)

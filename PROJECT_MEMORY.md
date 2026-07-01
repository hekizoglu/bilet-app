# Project Memory (PROJECT_MEMORY.md)

> [!WARNING]
> Do NOT turn this document into a long diary. Keep it concise, structured, and updated at the end of every task execution.

## Purpose
This document stores the short-term state, current milestone, and active development variables. It serves as the primary memory buffer for newly spawned AI agents.

* **When to read it:** At the beginning of every session or task.
* **What it controls:** Active priorities, current milestones, and short-term decisions.
* **What it must not contain:** Long historical logs, full changelogs, or source code.
* **Which files it depends on:** [ROADMAP.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/ROADMAP.md)
* **Which files depend on it:** [CLAUDE.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/CLAUDE.md), [LOOP.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/LOOP.md)

---

## Current Project Summary
Developing a hybrid ticket reservation system that supports modern Node.js + Next.js + MySQL stack, with an active Google Apps Script compatibility layer for legacy ticket booking databases.

### Active Stack
* **Frontend:** Next.js (App Router, Tailwind CSS, React Konva)
* **Backend:** Node.js (Express, Socket.io, Prisma ORM)
* **Database:** MySQL (Production) / SQLite (Local-first testing)
* **Legacy:** Google Apps Script / Google Sheets (`legacy_gas`)

### Active Online URLs
* **Google Spreadsheet:** [Bilet Rezervasyon Sistemi](https://docs.google.com/spreadsheets/d/11FpozbeWGgKtgReeYnT1KwHnyLHrZyzPVQHscmhBSsQ/edit) (ID: `11FpozbeWGgKtgReeYnT1KwHnyLHrZyzPVQHscmhBSsQ`)
* **Google Apps Script Web App:** [Exec URL](https://script.google.com/macros/s/AKfycbxhCRkVhZUOYGY1p3pXCkESoGeV2HZm_ibgHRRgm-TUAPLuSPEkaf5dkfR4uHxnWCq09A/exec) (Deployment ID: `AKfycbxhCRkVhZUOYGY1p3pXCkESoGeV2HZm_ibgHRRgm-TUAPLuSPEkaf5dkfR4uHxnWCq09A`)

### Current Milestone
* **Milestone:** FAZ 13.8 - Ürün & UX İyileştirmeleri (Ödeme Akışı Sadeleştirme, Arama/Filtreleme UX, Mobil Seating Layout) - Completed.

---

## Active Memory Block

### Recent Important Decisions
* SQLite provider configured for local database verification to bypass local Docker/MySQL dependencies.
* Switched clasp targeting to the new online script ID (`1cxXxXy0y5nwr2134lvY5JbP8F1GQMxsqADbP83Hp2rg37AT8pKQKEi8f`) for active online development.
* Transitioned the cardless payment communication channel from WhatsApp to Telegram across the entire stack.
* Implemented the global venues (`isGlobal`) indicator and a cloning API route to allow duplicating layouts without modifying originals.
* Integrated Telegram Bot notifications (`telegramBotToken` & `telegramChatId`) for cardless reservations.
* Refactored admin panel layout for 100% mobile responsiveness (bottom tab bar, sticky header, scrollable tables).
* Switched static admin metrics to dynamic database aggregations (`/api/admin/stats`).
* Upgraded layout designer (`Designer.html`) toolbar with pre-creation options (Label, Chair count, Size in meters, Unnumbered checkbox, Color) and auto-increment label sequence tracking.
* Enabled Stage (Sahne) dimension editing in meters and added support for customizable obstacle/deco elements (Pillars, exits, buffets) with real-time sidebar input sync on manual drag-resizing.
* Integrated dynamic e-ticket QR Code modal popups inside `/profile` customer tickets portal.
* Built automated Bank Webhook API endpoint (`POST /api/payments/bank-webhook`) matching payment descriptions with regex and capturing transaction details with SMTP failure isolation.
* Developed Ticket Refund (İade) System with full/partial refund options, cancellation email triggers, real-time socket updates to release seats, and a responsive admin modal dialog.
* Added Financial Reports Dashboard (`GET /api/admin/reports`) with KPI cards (Paid/Pending/Refunded), payment method bar charts, IBAN breakdown list, and monthly analytics table.
* Implemented Phase 13.7 security hardening: `maskIban()` for IBAN display masking, `express-rate-limit` (5 attempts/15 min) on payment verification endpoint, and duplicate transactionId fraud detection (HTTP 409) on bank webhook.
* Implemented simulated credit card payment flow with auto-redirect for paid events and auto-approval for free events (with nodemailer triggers).
* Improved customer seating UI by grouping canvas seats into coordinate-based horizontal scrollable strips/rows.
* Overhauled admin events search/filter options, fixed search result check bug (`events.length` -> `filteredEvents.length`), and introduced clear actions with aesthetic empty state dashboards.
* Built zero-dependency custom Circuit Breaker and Exponential Backoff Retry utility (`backend/utils/circuitBreaker.js`) protecting SMTP email triggers and Telegram bot messages.
* Integrated Zod input validation schemas for all payment routes (IBAN verification, bank webhook processing, credit card simulation).

### Active Priorities
1. Test production deployment (Cloud Run / Railway).
2. Monitor behavior analytics for drop-off reductions in payment and search steps.

### Do-Not-Change List
* Do not remove the `legacy_gas` folder or its connection properties.
* Do not replace JWT authentication middleware with insecure alternatives.

Last updated: 2026-07-01
Related files: [ROADMAP.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet-app-new/bilet-app/ROADMAP.md), [DECISIONS.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet-app-new/bilet-app/DECISIONS.md)

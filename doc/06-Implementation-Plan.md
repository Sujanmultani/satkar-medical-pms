# IMPLEMENTATION PLAN — Satkar Medical Pharmacy Management System

## RULES FOR AI
- Build ONE phase at a time. Stop at the end of each phase and report back.
- Do NOT scaffold future phases. Do NOT touch completed/approved code from a prior phase.
- After each phase, list files created/changed and how to test.
- If a requirement is ambiguous, ASK. Do not assume.
- `.env` is never included in build output or committed — only `.env.example`.

---

## PHASE 0 — Skeleton *(covered inside Phase 1 below for this project)*

## RESTART NOTICE (July 2026)
Full restart — both **frontend and backend** are being rebuilt from scratch. The previous codebase is discarded. However, the *design specifications* already validated in the docs are kept as the source of truth: `02-TRD.md` (stack, constraints), `05-Backend-Schema.md` (models, relationships, API contract — this was correct and does not need re-architecting, only re-implementing), and the new `04-UIUX-Design-v2.md` (logo-based palette, component libraries). This restart is about clean re-implementation with the new UI direction from day one, not a redesign of the data model or API shape.

## PHASE 1 — Foundation (Full Restart)
**Goal**: Fresh MERN skeleton, built once, correctly, with the new design system wired in from the start — no retrofitting.
**Build**:
1.1 Fresh `client/` and `server/` folder structure (per `02-TRD.md` conventions)
1.2 Mongoose models: User, Item, Batch, Invoice, Bill — exactly per `05-Backend-Schema.md`, no changes to field structure
1.3 Express server + MongoDB connection, JWT auth (register — self-limiting, login, protect middleware)
1.4 Fresh React + Vite + Tailwind scaffold. Install & configure: shadcn/ui (init + base components), react-bits (via shadcn CLI per-component), lucide-react, Magic UI (selected components only)
1.5 Add the Satkar Medical logo asset to `client/src/assets/` and build the reusable `LogoWatermark` background component (opacity/scale configurable per screen, per `04-UIUX-Design-v2.md`)
1.6 Tailwind config with the v2 logo-derived palette, typography, shadow tokens
1.7 Zustand auth store, Login page built with the new hero/watermark treatment, protected `/dashboard` route
**Depends on**: nothing
**Done when**: Admin can register once, log in through the new UI, and land on a Dashboard shell styled with the v2 design system and visible logo watermark, using shadcn/ui + react-bits components.
**Do NOT build yet**: OCR, billing, expiry logic, Magic UI accents beyond 1 trial component.

## PHASE 2 — Stock Management (Full Restart)
**Goal**: Medical Stock + Provision Store, backend and UI both rebuilt together this time, using the new design system.
**Build**:
2.1 Item CRUD API + search by name/composition (per `05-Backend-Schema.md`)
2.2 Batch CRUD API
2.3 `itemService.js` / `batchService.js` on the frontend
2.4 `StockTable` using shadcn/ui `Table` + react-bits hover/row-animation, `storeType` prop pattern (one component, reused for both stores — do not duplicate)
2.5 Add/Edit modals using shadcn/ui `Dialog` + `Form`
2.6 Sidebar with logo-bleed background treatment, shadcn/ui `NavLink`-style active states — rendered only when authenticated (not on Login)
2.7 Dashboard stat cards using react-bits animated counters; one Magic UI glow accent on the primary stat card only
**Depends on**: Phase 1
**Done when**: Admin can add/edit/delete items and batches in both stores through the new UI, visually matching `04-UIUX-Design-v2.md`, with no leftover default/generic theme styling anywhere, and a production build (`vite build`) passes clean.
**Do NOT build yet**: OCR, billing/GST, expiry-alert automation, composition "alternatives" search UI.

## PHASE 3 — Invoice Scanner (OCR)
**Goal**: Real OCR-based invoice-to-stock flow.
**Build**:
3.1 Google Vision API integration (`/api/invoices/scan`)
3.2 Parsing layer: raw OCR text -> structured fields (item, batch, expiry, qty, rate, MRP, GST, composition)
3.3 Editable confirmation table UI (pre-filled, human-verifiable before save)
3.4 `/api/invoices/confirm` — creates/updates Items + Batches from confirmed data
**Depends on**: Phase 2 (Item/Batch models and APIs must exist)
**Done when**: A real invoice image can be uploaded, OCR-extracted, edited, and confirmed into stock correctly.
**Do NOT build yet**: Billing, expiry cron jobs, composition search UI.

## PHASE 4 — Expiry Management
**Goal**: Automated expiry tracking and alerts.
**Build**:
4.1 Daily cron: flag batches within 3 months of expiry -> `expiring_soon`
4.2 Daily cron: flag batches past expiry -> `expired`
4.3 Dashboard widgets: expiring-soon count/list, expired count/list
4.4 Expiry Alerts screen with two tabs + manual delete for expired batches
**Depends on**: Phase 2
**Done when**: Expiring and expired batches appear correctly on the dashboard and alerts screen without manual checking.
**Do NOT build yet**: Billing, composition search, WhatsApp/SMS.

## PHASE 5 — Composition Search & Alternatives
**Goal**: Search by salt/content, find alternative medicines.
**Build**:
5.1 `GET /api/items/search?composition=` endpoint
5.2 `GET /api/items/:id/alternatives` — same composition, different item
5.3 Search UI on Stock List + a dedicated Composition Search screen
**Depends on**: Phase 2
**Done when**: Typing a composition returns all matches; typing a medicine name surfaces its same-salt alternatives.
**Do NOT build yet**: Billing, WhatsApp/SMS.

## PHASE 6 — Billing & GST
**Goal**: Full sale-billing flow.
**Build**:
6.1 Bill creation API — customizable `billDate`, GST% per item, auto totals
6.2 Billing UI — add items from stock, GST breakdown summary
6.3 Print layout (browser print, GST-compliant format: GSTIN, HSN, breakdown)
6.4 Bill History screen
6.5 Decrement `Batch.qty` on bill save
**Depends on**: Phase 2 (and ideally Phase 3, so stock reflects real invoice data)
**Done when**: A bill can be created with a custom date, correct GST calculation, printed, and appears in Bill History.
**Do NOT build yet**: WhatsApp/SMS sharing (Phase 6.5, separate — provider decision pending).

## PHASE 6.5 — Bill Sharing (Deferred)
**Goal**: WhatsApp/SMS delivery of bills.
**Build**: Gateway integration (provider TBD — Gupshup/Interakt/Twilio), `/api/bills/:id/share`.
**Depends on**: Phase 6, client decision on gateway/provider and budget.
**Done when**: A bill can be sent to the customer's phone via WhatsApp or SMS.

## PHASE 7 — PWA & Deployment
**Goal**: Installable, remotely accessible app.
**Build**:
7.1 PWA manifest + service worker (vite-plugin-pwa)
7.2 Deploy frontend to Vercel, backend to Render (Starter plan), DB on Atlas
7.3 Env var configuration, CORS lock-down to production frontend domain
7.4 Custom domain (if client provides one)
**Depends on**: All prior phases functionally complete
**Done when**: App is installable on PC and mobile, reachable via a public URL, all features work in production.

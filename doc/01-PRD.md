# PRD — Satkar Medical Pharmacy Management System

## 1. One-line pitch
Satkar Medical PMS helps pharmacy owners digitize stock, invoicing, and billing so they can stop losing money to expired medicine and manual billing errors.

## 2. The problem
Satkar Medical currently manages stock via manual registers and paper invoices. There is no systematic way to track medicine expiry, leading to inventory loss. Billing is manual, making GST-compliant invoicing slow and error-prone. The owner also separately runs a Provision (general store) with the same manual-tracking problems.

## 3. Target user
- **Who they are**: Pharmacy owner/admin (single user, Phase 1) running a medical store + attached provision store, in Ahmedabad, India.
- **What they use today**: Paper stock registers, handwritten/manual bills, no expiry tracking system.
- **What frustrates them**: Expired stock discovered too late, slow manual billing, no easy way to find alternative medicines by composition, GST calculation done manually.

## 4. Core features (v1 must-have)
1. **Invoice Scan (OCR)** — scan purchase invoices to auto-populate stock with item, batch, expiry, composition, GST — this is the flagship time-saving feature.
2. **Expiry Tracking** — 3-month-prior alerts + dashboard + expired-item list — directly solves the inventory-loss problem.
3. **Billing & GST** — generate GST-compliant bills with customizable date, print, and WhatsApp/SMS sharing.
4. **Composition Search** — search by salt/content to find matching medicines and alternatives.
5. **Provision Store Module** — same stock+billing capability, separate section, single login.

## 5. OUT OF SCOPE for v1
- NOT building: multi-staff/role-based logins, multi-branch inventory sync, native iOS/Android apps (PWA instead), accounting-software integration, real-time chat/support features, customer-facing ordering portal, loyalty/rewards programs.

## 6. User stories
- As the admin, I want to scan a purchase invoice, so that stock updates automatically without manual entry.
- As the admin, I want to see medicines expiring in the next 3 months, so that I can sell or return them before they expire.
- As the admin, I want to generate a GST bill in under a minute, so that customer checkout is fast.
- As the admin, I want to search a medicine's composition, so that I can suggest alternatives when a brand is out of stock.
- As the admin, I want to manage my provision store in the same app, so that I don't need separate software.
- As the admin, I want to access the app from my phone or PC from anywhere, so that I'm not tied to one machine.

## 7. Success criteria
- A purchase invoice can be scanned and confirmed into stock in under 2 minutes.
- Expiring-soon and expired medicines are visible on the dashboard with zero manual checking.
- A bill can be generated, GST-calculated, and shared via WhatsApp in under 1 minute.
- The app is installable as a PWA on both a PC and a mobile phone and is reachable remotely.

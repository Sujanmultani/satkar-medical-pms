# APP FLOW — Satkar Medical Pharmacy Management System

## Part A — Screen Inventory

| Screen | Purpose | Access | Key actions |
|---|---|---|---|
| Login | Admin authentication | Public | Log in |
| Dashboard | Stock/sales/expiry overview | Auth | View stats, jump to alerts |
| Medical Stock List | View/manage medicine inventory | Auth | Search, add, edit, delete item/batch |
| Provision Store List | View/manage general-store inventory | Auth | Search, add, edit, delete item/batch |
| Invoice Scan | Upload & process purchase invoice | Auth | Upload, review OCR data, confirm to stock |
| Expiry Alerts | Expiring-soon + expired list | Auth | View, manually delete expired |
| Composition Search | Search by salt/content or medicine name | Auth | Search, view alternatives |
| Billing / New Bill | Generate a sale bill | Auth | Add items, set date/GST, print, share |
| Bill History | Past bills list | Auth | Search, view, reprint, reshare |
| Settings | Admin profile, GST defaults | Auth | Update profile, change password |

## Part B — Flow Paths

```
## Flow 1: Login
Login -> [submit valid credentials] -> Dashboard
       -> [invalid credentials] -> inline error, no lockout in v1 (single admin)

## Flow 2: Invoice Scan -> Stock
Dashboard -> [Invoice Scan] -> Upload screen
          -> [image uploaded] -> Processing (loading state, OCR call)
          -> [OCR success] -> Editable confirmation table (item, batch, expiry, composition, GST pre-filled)
          -> [admin edits + confirms] -> Save to Stock -> Success toast -> Stock List (updated)
          -> [OCR fails / low confidence] -> Error state: "Could not read invoice clearly, enter manually" -> blank editable form

## Flow 3: Expiry Management
Dashboard -> [Expiry widget] -> Expiry Alerts screen
          -> tabs: "Expiring Soon (3mo)" | "Already Expired"
          -> [Already Expired tab] -> [Delete item] -> confirm dialog -> removed from stock

## Flow 4: Composition Search
Stock List / Dashboard -> [Search bar] -> type composition OR medicine name
          -> [composition typed] -> list of all matching medicines
          -> [medicine name typed] -> that medicine + "Alternatives" section (same composition, different brand)

## Flow 5: Billing
Dashboard -> [New Bill] -> Billing screen
          -> add customer name/phone (optional) -> set bill date (defaults today, editable)
          -> add items from stock (searchable) -> select GST% (auto-suggested from item, editable)
          -> [Generate Bill] -> Bill summary screen
          -> [Print] -> browser print dialog
          -> [Share via WhatsApp/SMS] -> Phase 6.5, stubbed as "Coming Soon" until gateway is integrated

## Flow 6: Provision Store
Sidebar -> [Provision Store] -> same UI pattern as Medical Stock List, filtered by storeType='provision'
          -> all CRUD actions identical to Medical Stock flow

## Global rules
- Any screen accessed without a valid token -> redirect to Login (save intended destination)
- Every list screen (Stock, Bills, Expiry) has an EMPTY state with a relevant CTA (e.g. "No items yet — Add your first item" / "Scan your first invoice")
- Every async action (OCR scan, save, delete) has four states: loading / success / error / empty
- Token expiry mid-session -> redirect to Login with "Session expired" message
```

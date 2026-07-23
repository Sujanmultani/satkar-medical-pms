# BACKEND SCHEMA — Satkar Medical Pharmacy Management System
(MongoDB / Mongoose — document shapes shown in pseudo-table form for clarity)

## Part A — Collections and Fields

```
## COLLECTION: users
_id           ObjectId PK
name          String, required
email         String, required, unique, lowercase
passwordHash  String, required           -- bcrypt, never plaintext, never returned in any response
role          String enum['admin'], default 'admin'
createdAt     Date, default now

## COLLECTION: items
_id           ObjectId PK
storeType     String enum['medical','provision'], required
name          String, required, indexed (text)
composition   String, indexed (text)      -- salt/content, searchable
category      String
unit          String                      -- strip, bottle, piece, kg, L
hsnCode       String
createdAt/updatedAt   Date (timestamps)

## COLLECTION: batches
_id           ObjectId PK
itemId        ObjectId FK -> items._id, required, ON DELETE cascade (app-level cleanup)
batchNo       String, required
mfgDate       Date
expiryDate    Date, required, indexed
qty           Number, required, min 0
purchaseRate  Number, min 0
mrp           Number, min 0
gstPercent    Number, min 0
status        String enum['active','expiring_soon','expired'], default 'active'
createdAt/updatedAt   Date (timestamps)

## COLLECTION: invoices
_id              ObjectId PK
supplierName     String
invoiceNo        String
invoiceDate      Date
scannedImageUrl  String
items            Array<{ batchId: ObjectId, extractedData: Object }>
gstBreakdown     Object
totalAmount      Number
status           String enum['scanned','confirmed'], default 'scanned'
createdAt/updatedAt   Date (timestamps)

## COLLECTION: bills
_id           ObjectId PK
billNo        String, unique
billDate      Date, required               -- customizable, not forced to system date
customerName  String
customerPhone String
items         Array<{ itemId: ObjectId, batchId: ObjectId, qty: Number, rate: Number, gst: Number }>
gstBreakdown  Object
totalAmount   Number
paymentMode   String
shareStatus   Object { whatsapp: Boolean, sms: Boolean, printed: Boolean }
createdAt/updatedAt   Date (timestamps)

## INDEXES
items:   text index on { name, composition }; index on { storeType }
batches: index on { itemId }; index on { expiryDate }; index on { status }
bills:   index on { billDate }; unique index on { billNo }
```

## Part B — Relationships, in plain English
- One **Item** has many **Batches**. Deleting an Item deletes its Batches (handled at application/controller level, not a native Mongo cascade).
- A **Batch** cannot exist without an **Item** — always created via an itemId reference.
- One **Invoice** (a purchase) results in one or more **Batches** being created after confirmation.
- One **Bill** (a sale) references existing **Items**/**Batches** and decrements their `qty` on save.
- **storeType** on Item is the single field separating Medical Store data from Provision Store data — both live in the same `items`/`batches` collections, filtered by this field. No separate collections.
- Single-admin model in v1: no per-user data scoping needed yet (all data belongs to the one admin). This will need revisiting if multi-staff roles are added later.

## Part C — API Contract

| Method | Endpoint | Auth | Returns |
|---|---|---|---|
| POST | /api/auth/register | No (self-limiting: blocks if admin exists) | 201 {user, token} |
| POST | /api/auth/login | No | 200 {user, token} / 401 |
| GET | /api/items?storeType=&search= | Yes | 200 {data[]} |
| POST | /api/items | Yes | 201 {item} / 400 |
| PUT | /api/items/:id | Yes | 200 {item} / 404 |
| DELETE | /api/items/:id | Yes | 204 / 404 |
| GET | /api/batches?itemId= | Yes | 200 {data[]} |
| POST | /api/batches | Yes | 201 {batch} / 400 |
| PUT | /api/batches/:id | Yes | 200 {batch} / 404 |
| DELETE | /api/batches/:id | Yes | 204 / 404 |
| POST | /api/invoices/scan | Yes | 200 {extractedData} — OCR result, not yet saved |
| POST | /api/invoices/confirm | Yes | 201 {invoice, createdBatches[]} |
| GET | /api/bills | Yes | 200 {data[]} |
| POST | /api/bills | Yes | 201 {bill} |
| POST | /api/bills/:id/share | Yes | 200 {shareStatus} — Phase 6.5 |
| GET | /api/dashboard/summary | Yes | 200 {totalItems, todaySales, expiringSoon, expired} |

### Global API rules
- Every error returns: `{ error: { code, message } }` — same shape, always.
- Every list endpoint is paginated. Default limit 20, max 100.
- Every write validates input before touching the DB.
- `passwordHash` is never returned in any response, under any circumstance.
- 401 = not logged in. 403 = logged in, not allowed (not used in v1 single-admin model, reserved for future roles).

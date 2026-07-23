# TRD — Satkar Medical Pharmacy Management System

## Stack (LOCKED — do not substitute)
```
Frontend : React 18 (Vite), Tailwind CSS, Zustand (state), React Router, Recharts (dashboard charts), Framer Motion (transitions)
Backend  : Node.js 20 LTS, Express 4
Database : MongoDB 7 (Atlas, free tier), Mongoose ODM (no migration tool — schema-first via Mongoose models)
Auth     : JWT (7-day expiry), single ADMIN role in v1
Hosting  : Frontend -> Vercel (free tier) | Backend -> Render (Starter, $7/mo) | DB -> MongoDB Atlas (free tier, 512MB)
```

## Third-party services
| Service | Purpose | Free tier limit |
|---|---|---|
| Google Vision API (Document Text Detection) | OCR for invoice scanning | 1,000 units/month free, then $1.50/1000 |
| MongoDB Atlas | Database hosting | 512 MB storage free |
| WhatsApp Business API / SMS Gateway (provider TBD — Gupshup/Interakt/Twilio) | Bill sharing | Deferred to Phase 6.5 — cost/provider pending client decision |

## Constraints (HARD RULES)
- **Budget**: Prefer free tiers wherever viable; backend requires Render Starter ($7/mo) to avoid cold-start sleep — this is the one paid exception, non-negotiable for production use.
- **Skill**: No Docker, no Kubernetes. Deployment must be push-to-deploy (Git-based) on Vercel/Render.
- **Performance**: Dashboard and stock list must load under 3s on average mobile 4G. OCR confirmation step must remain editable — never auto-save unverified OCR data directly to stock.
- **Compliance**: Indian pharmacy — GST-compliant bill format required (GSTIN, HSN code, GST breakdown by rate).
- **Data integrity**: OCR-extracted data always passes through a human-editable confirmation step before touching the `Batch`/`Item` collections.
- **DO NOT USE**: GraphQL, microservices architecture, Redux (Zustand only), Kubernetes, Docker, any DB other than MongoDB, Cloudflare Workers (MongoDB native driver incompatibility — confirmed).

## Conventions
- **Naming**: camelCase for JS variables/functions, PascalCase for React components, camelCase for MongoDB fields.
- **Folders**: `client/src/{components,pages,store,services}`, `server/{models,controllers,routes,middleware,config,utils}`.
- **API shape**: REST, versionless for now (`/api/...`), resource-based routes (`/api/items`, `/api/batches`, `/api/bills`).
- **Error format**: `{ error: { code, message } }` — consistent across every endpoint.
- **Auth**: `Authorization: Bearer <token>` header on all protected routes, verified via `authMiddleware.protect`.

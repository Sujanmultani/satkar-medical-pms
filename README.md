# Satkar Medical — Pharmacy Management System (Phase 1)

Full restart build for Satkar Medical Pharmacy & Provision Store, implementing Phase 1 Foundation per the project PRD, TRD, Schema, and UI/UX v2 specifications.

---

## 🎨 Design System (v2 Logo Derived)

- **Primary Teal**: `#0B4C52` (Cross, wordmark, main brand headers, sidebar background)
- **Secondary Cyan**: `#17878E` (Caring hand, active navigation, secondary buttons)
- **Accent Green**: `#5CA627` (Leaf, success indicators, badges)
- **Background**: `#FAF7F2` (Warm off-white)
- **Typography**: `Space Grotesk` (Headings), `Inter` (Body text), `IBM Plex Mono` (Data/Numbers)
- **Component Strategy**: `shadcn/ui` (Base controls) + `react-bits` (Teal Aurora Hero Background) + `lucide-react` (Icons) + `LogoWatermark` (Living background texture).

---

## 📁 Project Structure

```
satkar/
├── client/                      # Vite + React Frontend
│   ├── src/
│   │   ├── assets/
│   │   │   └── satkar-logo.jpeg # Satkar Medical logo asset
│   │   ├── components/
│   │   │   ├── react-bits/
│   │   │   │   └── AuroraBackground.jsx # Animated wave background
│   │   │   ├── ui/             # shadcn/ui components (Button, Input, Label, Card)
│   │   │   ├── LogoWatermark.jsx # Reusable logo watermark component
│   │   │   └── Sidebar.jsx     # Deep teal sidebar with logo bleed
│   │   ├── pages/
│   │   │   ├── Login.jsx       # Auth login + initial admin registration
│   │   │   └── Dashboard.jsx   # Authenticated shell dashboard
│   │   ├── store/
│   │   │   └── authStore.js    # Zustand authentication state store
│   │   ├── services/
│   │   │   └── api.js          # Axios client with JWT interceptor
│   │   ├── lib/
│   │   │   └── utils.js        # shadcn cn() helper
│   │   ├── App.jsx             # React Router setup & protected routes
│   │   └── main.jsx
│   ├── tailwind.config.js      # Custom brand palette & typography tokens
│   ├── components.json         # shadcn UI configuration
│   └── package.json
│
├── server/                      # Node.js + Express + MongoDB Backend
│   ├── config/
│   │   └── db.js               # Mongoose connection
│   ├── controllers/
│   │   └── authController.js   # JWT Auth & self-limiting Admin registration
│   ├── middleware/
│   │   ├── authMiddleware.js   # Bearer JWT verification
│   │   └── errorMiddleware.js  # Global API error formatter { error: { code, message } }
│   ├── models/                 # Mongoose Schemas (User, Item, Batch, Invoice, Bill)
│   ├── routes/
│   │   └── authRoutes.js       # Authentication endpoints
│   ├── server.js               # Express application entry point
│   ├── .env.example
│   └── package.json
│
├── copy_assets.js               # Automated asset synchronizer
└── README.md
```

---

## 🚀 Quick Start Guide

### 1. Backend Setup (`server/`)
```bash
cd server
npm install
# Ensure MongoDB is running locally or set MONGO_URI in .env
npm run dev
```
Backend runs on `http://localhost:5000`.

### 2. Frontend Setup (`client/`)
```bash
cd client
npm install
npm run dev
```
Frontend runs on `http://localhost:5173`.

---

## 🔐 Authentication Endpoints

- `POST /api/auth/register` — Self-limiting: allows initial admin creation. Blocks subsequent calls with `400 ADMIN_EXISTS`.
- `POST /api/auth/login` — Authenticates admin, returns 7-day JWT token.
- `GET /api/auth/me` — Protected route, returns active admin user context.

# Phase 2 Report — Full-Stack Architecture Foundation

**Date:** 2026-09-20  
**Project:** Smart Care System (SCS30)  
**Goal:** Split into `/frontend` + `/backend` without breaking the existing mock-driven UI.

---

## 1. Final folder structure

```text
Smart-Care-System/
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/          # StaffLayout, FamilyLayout, PatientDetails, ui/
│   │   ├── contexts/            # AuthContext, PatientContext (unchanged behavior)
│   │   ├── data/                # mockData.ts
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── pages/               # All role pages + Login/Register
│   │   ├── services/            # NEW API client layer (not wired to UI yet)
│   │   │   ├── api.ts
│   │   │   ├── authService.ts
│   │   │   ├── healthService.ts
│   │   │   ├── patientService.ts
│   │   │   └── index.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── .env.example
│   ├── package.json
│   ├── vite.config.ts           # port 5173
│   ├── tailwind.config.ts
│   ├── tsconfig*.json
│   ├── vitest.config.ts
│   └── eslint.config.js
│
├── backend/
│   ├── src/
│   │   ├── config/              # env.ts, database.ts (Mongo optional)
│   │   ├── controllers/
│   │   ├── middleware/          # errorHandler, auth stub
│   │   ├── models/              # Patient, User placeholders
│   │   ├── routes/              # /api/* modules
│   │   ├── services/
│   │   ├── sockets/             # Socket.io init + emitCareEvent
│   │   ├── utils/
│   │   └── server.ts
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
├── FINAL_REDESIGN_PLAN.md
├── MVP_AUDIT.md
├── PHASE_2_REPORT.md
├── README.md
└── .gitignore
```

There is **one** frontend and **one** backend — the original Vite app was moved (not copied).

---

## 2. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

- URL: `http://localhost:5173`
- Stack unchanged: React, Vite, TS, Tailwind, shadcn, React Router, Recharts
- **PatientContext / AuthContext / mockData still power the UI**
- App works **without** the backend running
- New: `src/services/*` for incremental API migration later
- Env: `VITE_API_URL=http://localhost:5000` (see `.env.example`)

Dev server port updated from `8080` → `5173` to match `CLIENT_URL`.

---

## 3. Backend setup

```bash
cd backend
npm install
npm run dev
```

- URL: `http://localhost:5000`
- Stack: Node.js, Express, TypeScript, Socket.io, CORS, dotenv
- MongoDB **not required** (`MONGODB_URI` empty → stub mode)
- Architecture: `route → controller → service → model` (placeholders in place)

---

## 4. APIs created

| Method | Path | Status |
|--------|------|--------|
| GET | `/api/health` | Live JSON health check |
| GET | `/api/auth` | Placeholder |
| GET | `/api/patients` | Placeholder |
| GET | `/api/doctors` | Placeholder |
| GET | `/api/nurses` | Placeholder |
| GET | `/api/lab` | Placeholder |
| GET | `/api/pharmacy` | Placeholder |
| GET | `/api/billing` | Placeholder |
| GET | `/api/family` | Placeholder |
| GET | `/api/admin` | Placeholder |

Verified:

```json
GET /api/health → { "status": "ok", "service": "scs30-backend", "timestamp": "..." }
```

---

## 5. Socket.io setup

- Initialized in `backend/src/sockets/index.ts` on the HTTP server
- CORS origin from `CLIENT_URL`
- Client rooms prepared:
  - `join:patient` → `patient:{ID}`
  - `join:role` → `role:{role}`
- Helper: `emitCareEvent(event, payload, room?)` for future:
  - patient updates, lab results, pharmacy, notifications, family, admin live

No frontend socket client wired yet (by design).

---

## 6. Environment variables

**Frontend** (`frontend/.env.example`):

```env
VITE_API_URL=http://localhost:5000
```

**Backend** (`backend/.env.example`):

```env
PORT=5000
MONGODB_URI=
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

Local `.env` files created for development; `.gitignore` excludes secrets and keeps `*.example`.

---

## 7. Existing functionality verified

| Check | Result |
|-------|--------|
| Frontend TypeScript (`tsc -b`) | Pass |
| Frontend build (`vite build`) | Pass |
| Frontend tests (Vitest) | Pass |
| Frontend lint | Fail (pre-existing shadcn / tailwind kit noise — not from restructure) |
| Frontend dev server | Pass — `http://localhost:5173` returns 200 |
| Backend typecheck | Pass |
| Backend build | Pass |
| Backend `GET /api/health` | Pass |
| Backend placeholder routes | Pass (`/api/patients`, `/api/auth`) |
| PatientContext / mock flows preserved | Yes — no UI logic replaced with API calls |
| CORS configured for frontend origin | Yes |

Role workflows (login, registration, doctor, nurse, lab, pharmacy, billing, family, admin) remain in the same React pages/contexts; restructuring did not alter their handlers. Automated browser click-through was not run; compile + server smoke tests confirm the app boots after the move.

---

## 8. Anything that could not be verified

- Full manual click-through of every role page in a browser session after the move (recommended once before Phase 3)
- Socket.io client connect from the frontend (not implemented yet)
- MongoDB connection (intentionally unused)
- End-to-end API persistence of patients (placeholders only)

---

## 9. Recommended next implementation phase (Phase 3)

1. Implement real **Patient** REST endpoints backed by in-memory store or MongoDB  
2. Migrate **one flow at a time** (start with `addPatient` / list patients) from PatientContext → `patientService` API, with offline fallback  
3. Add Socket.io emits on mutations; optional light frontend subscription  
4. Then proceed to **UI redesign (Phase 1 tokens → shells)** from `FINAL_REDESIGN_PLAN.md`  
5. CareGuard last, as a derived insight layer over shared patient state/API

---

## Critical constraint upheld

> The application continues to work even if the backend is not running.

Mock PatientContext remains the runtime source of truth until an explicit migration phase.

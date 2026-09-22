# Smart Care System (SCS30)

Connected hospital care through **one unified patient record**.  
**CareGuard** is the workflow & safety intelligence USP — it surfaces what needs attention next and keeps humans in control.

## Repository

```text
Smart-Care-System/
├── frontend/          # React + Vite + TypeScript + Tailwind
├── backend/           # Express + TypeScript + Socket.io
├── README.md
├── DEMO_CREDENTIALS.md
├── FINAL_DEMO_RUNBOOK.md
├── FINAL_PRESENTATION_CHECKLIST.md
├── package.json
├── vercel.json
└── .gitignore
```

## Prerequisites

- Node.js 18+ (Node 20 LTS recommended)
- npm
- Firebase project (Email/Password enabled; optional Google)
- MongoDB URI optional (empty = in-memory staff store for local/demo)

---

## Architecture

```text
Browser (Vite SPA)
  ├── PatientContext          — shared clinical patient record (demo persistence)
  ├── CareGuardContext        — workflow attention signals (local + API sync)
  └── AuthContext             — Firebase ID token → backend session → role

Backend (Express)
  ├── /api/auth/*             — Firebase token verify + StaffUser roles
  ├── /api/careguard/*        — CareGuard signals / sync
  ├── Socket.io               — live CareGuard events
  └── StaffUser store         — MongoDB if MONGODB_URI set, else in-memory
```

| Concern | Source of truth |
|---------|-----------------|
| Identity (who) | Firebase Authentication |
| Hospital role (what) | Smart Care `StaffUser.role` (backend only) |
| Clinical demo data | Frontend `PatientContext` |
| CareGuard signals | Rules engine + optional backend sync |

The frontend must never assign itself a privileged role.

---

## Authentication

**Primary staff login:** email + password (Firebase).  
**Optional:** Continue with Google (registered staff only).  
**Family:** Patient ID only (not a staff role).

Flow:

```text
Staff email/password (or Google)
  → Firebase ID token
  → POST /api/auth/session
  → Backend verifies token
  → StaffUser lookup (UID / email / bootstrap Admin)
  → Authoritative role → workspace
```

**First Admin:** set `BOOTSTRAP_ADMIN_EMAIL` on the backend (existing Firebase Admin email).  
**All other staff:** Admin → Staff Management → Add Staff (creates Firebase Auth user + StaffUser).

Passwords are never stored in MongoDB or application source.

See [DEMO_CREDENTIALS.md](./DEMO_CREDENTIALS.md).

### Roles

| Role | Typical workspace |
|------|-------------------|
| `admin` | `/admin`, Staff Management `/admin/staff` |
| `reception` | `/reception` |
| `doctor` | `/doctor` |
| `nurse` | `/nurse` |
| `lab` | `/lab` |
| `pharmacy` | `/pharmacy` |
| `billing` | `/billing` |
| Family | `/family/:patientId` |

Account statuses: `ACTIVE`, `INVITED`, `SUSPENDED` (Suspend/Activate; Delete removes Auth + StaffUser).

---

## CareGuard

CareGuard watches the shared patient journey and raises **attention signals** (e.g. lab result awaiting review, overdue steps). Humans review and resolve — the system does not auto-act clinically.

- Dashboard: `/careguard`
- Works offline via local engine; with backend up, syncs over API + Socket.io

---

## Local development

```bash
# Terminal 1 — API + Socket.io
cd backend
npm install
cp .env.example .env   # Windows: copy .env.example .env
# Fill Firebase Admin + BOOTSTRAP_ADMIN_EMAIL (see below)
npm run dev

# Terminal 2 — UI
cd frontend
npm install
cp .env.example .env
# Fill VITE_FIREBASE_* and VITE_API_URL
npm run dev
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend | http://localhost:5000 |
| Health | http://localhost:5000/api/health |

Clinical UI works offline (PatientContext + local CareGuard). Backend adds auth, staff management, CareGuard API sync, and Socket.io.

---

## Environment variables

**Never commit `.env` files.** Use `frontend/.env.example` and `backend/.env.example`.

### Frontend (`frontend/.env`)

| Variable | Purpose |
|----------|---------|
| `VITE_API_URL` | Backend base URL (no trailing slash). Empty/`/` for same-origin deploy. |
| `VITE_DEMO_MODE` | `true` for deterministic demo patients |
| `VITE_FIREBASE_API_KEY` | Firebase web client |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase web client |
| `VITE_FIREBASE_PROJECT_ID` | Firebase web client |
| `VITE_FIREBASE_APP_ID` | Firebase web client |
| `VITE_CAREGUARD_*` | Optional thresholds (minutes) |

Do **not** put Admin SDK keys, MongoDB URIs, or bootstrap passwords in `VITE_*`.

### Backend (`backend/.env`)

| Variable | Purpose |
|----------|---------|
| `PORT` / `HOST` | Listen address (default `5000` / `0.0.0.0`) |
| `CLIENT_URL` | Frontend origin for CORS + Socket.io |
| `NODE_ENV` | `development` / `production` |
| `MONGODB_URI` | Optional; empty = in-memory staff store |
| `FIREBASE_PROJECT_ID` | Firebase Admin |
| `FIREBASE_CLIENT_EMAIL` | Firebase Admin service account |
| `FIREBASE_PRIVATE_KEY` | Firebase Admin (escaped `\n` newlines) |
| `BOOTSTRAP_ADMIN_EMAIL` | Existing Admin email to map/create first Admin |
| `BOOTSTRAP_ADMIN_PASSWORD` | Optional; only if you intentionally set/create Firebase password |
| `BOOTSTRAP_ADMIN_NAME` | Optional display name |
| `CAREGUARD_*` | Optional thresholds |

---

## Firebase setup

1. Create a Firebase project; enable **Email/Password** (and Google if desired).  
2. Register a **Web app**; copy config into `VITE_FIREBASE_*`.  
3. Create a **service account**; put project id, client email, and private key in backend env.  
4. Create the Admin user in Firebase Auth (or let bootstrap create it when password env is set).  
5. Set `BOOTSTRAP_ADMIN_EMAIL` to that Admin email.  
6. Create remaining staff only via **Admin → Staff Management**.

---

## MongoDB setup

- **Optional for hackathon/local demo.** Leave `MONGODB_URI` empty to use the in-memory StaffUser store (cleared on backend restart).  
- For durable staff across restarts/instances, set a MongoDB Atlas (or other) connection string on the backend only.

---

## Production / deployment overview

### Build

```bash
cd frontend && npm install && npm run build   # → frontend/dist
cd backend  && npm install && npm run build   # → backend/dist
cd backend  && npm start                     # node dist/server.js
```

### Vercel Services (monorepo)

Root `vercel.json` defines **frontend** (Vite) and **backend** (Express) services, with rewrites:

- `/api/*` and `/socket.io/*` → backend  
- everything else → frontend SPA  

Configure env vars per service in the Vercel dashboard (Firebase Admin and `BOOTSTRAP_*` on backend only; `VITE_*` on frontend at **build** time).

Set backend `CLIENT_URL` to the deployed frontend origin. For same-origin API via rewrites, frontend may use empty/`/` `VITE_API_URL` depending on your build settings.

**Note:** Socket.io and in-memory CareGuard state assume a long-lived Node process; multi-instance serverless may need sticky sessions or externalized state for production realtime.

Health: `GET {API}/api/health` → `{ "status": "ok", "service": "Smart Care System" }`.

---

## Demo access & rehearsal

- Credentials / staff setup: [DEMO_CREDENTIALS.md](./DEMO_CREDENTIALS.md)  
- 5-minute flow: [FINAL_DEMO_RUNBOOK.md](./FINAL_DEMO_RUNBOOK.md)  
- Stage checklist: [FINAL_PRESENTATION_CHECKLIST.md](./FINAL_PRESENTATION_CHECKLIST.md)

Canonical live demo patient: **Arjun Verma** (Reception Fill).  
Admin → **Reset Demo Data** to restore clinical seed.

Closing line:

> Smart Care System connects the entire hospital through one patient record, while CareGuard helps the team identify what needs attention next.

---

## Scripts

| Package | Command | Purpose |
|---------|---------|---------|
| frontend | `npm run dev` | Vite |
| frontend | `npm run build` | Production build |
| frontend | `npm run preview` | Serve `dist` |
| frontend | `npm run lint` | ESLint |
| frontend | `npm test` | Vitest |
| backend | `npm run dev` | API + Socket.io |
| backend | `npm run build` | Compile |
| backend | `npm run typecheck` | Type check |
| backend | `npm start` | Run `dist/server.js` |

## Product map

| Area | Path |
|------|------|
| Landing | `/` |
| Login | `/login` |
| Reception | `/reception` |
| Doctor | `/doctor` |
| Lab | `/lab` |
| Pharmacy | `/pharmacy` |
| Nurse | `/nurse` |
| Billing | `/billing` |
| CareGuard | `/careguard` |
| Admin | `/admin` |
| Staff Management | `/admin/staff` |
| Family | `/family/:patientId` |

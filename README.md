# Smart Care System (SCS30)

Connected hospital care through **one unified patient record**.  
**CareGuard** is the workflow & safety intelligence USP — it surfaces what needs attention next and keeps humans in control.

## Repository

```text
Smart-Care-System/
├── frontend/          # React + Vite + TypeScript + Tailwind
├── backend/           # Express + TypeScript + Socket.io
├── DEMO_CREDENTIALS.md
├── FINAL_DEMO_RUNBOOK.md
├── FINAL_PRESENTATION_CHECKLIST.md
├── FINAL_RELEASE_REPORT.md
└── README.md
```

## Prerequisites

- Node.js 18+
- npm

---

## Local development

```bash
# Terminal 1 — API + Socket.io
cd backend
npm install
cp .env.example .env   # Windows: copy .env.example .env
npm run dev

# Terminal 2 — UI
cd frontend
npm install
cp .env.example .env
npm run dev
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend | http://localhost:5000 |
| Health | http://localhost:5000/api/health |

The UI works **offline** (PatientContext + local CareGuard). With the backend running you also get CareGuard API sync and Socket.io live events.

---

## Environment variables

### Frontend (`frontend/.env` — from `.env.example`)

| Variable | Purpose |
|----------|---------|
| `VITE_API_URL` | Backend base URL (no trailing slash) |
| `VITE_DEMO_MODE` | `true` for deterministic demo |
| `VITE_CAREGUARD_LAB_DELAY_MINUTES` | Optional lab delay threshold |
| `VITE_CAREGUARD_TREATMENT_GRACE_MINUTES` | Optional overdue grace |

### Backend (`backend/.env` — from `.env.example`)

| Variable | Purpose |
|----------|---------|
| `PORT` | API port (default `5000`) |
| `CLIENT_URL` | Frontend origin for CORS + Socket.io |
| `MONGODB_URI` | Optional; leave empty for demo |
| `NODE_ENV` | `development` / `production` |
| `CAREGUARD_LAB_DELAY_MINUTES` | Optional |
| `CAREGUARD_TREATMENT_GRACE_MINUTES` | Optional |

**Never commit `.env` files.** Templates only: `*.env.example`.

---

## Production

### Build

```bash
# Frontend
cd frontend
npm install
npm run build
# Output: frontend/dist
# Preview locally: npm run preview

# Backend
cd backend
npm install
npm run build
# Output: backend/dist
npm start   # node dist/server.js
```

### Runtime relationship

1. Set `CLIENT_URL` on the backend to the deployed frontend origin.  
2. Set `VITE_API_URL` at **frontend build time** to the deployed API URL.  
3. Health check: `GET {API}/api/health` → `{ "status": "ok", "service": "Smart Care System" }`.  
4. SPA hosts: use `frontend/public/_redirects` (Netlify) or `frontend/vercel.json` for client-side route fallback.

MongoDB is **not required** for the NexaHack demo.

---

## Demo access

See **[DEMO_CREDENTIALS.md](./DEMO_CREDENTIALS.md)**.

- Staff: Login → select role (no password in DEMO MODE)  
- Family: Patient ID from Reception  
- Canonical live patient: **Arjun Verma** (Fill button on Reception)  
- Admin → **Reset Demo Data**

## 5-minute demo

See **[FINAL_DEMO_RUNBOOK.md](./FINAL_DEMO_RUNBOOK.md)** and **[FINAL_PRESENTATION_CHECKLIST.md](./FINAL_PRESENTATION_CHECKLIST.md)**.

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
| Family | `/family/:patientId` |

## Freeze note

After the NexaHack final lock: **do not add features** unless a critical demo-breaking bug appears. Prefer reliability over new functionality.

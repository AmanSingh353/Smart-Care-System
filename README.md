# Smart Care System (SCS30)

Connected hospital care through **one unified patient record**.  
**CareGuard** is the workflow & safety intelligence USP — it surfaces what needs attention next and keeps humans in control.

## Repository

```text
Smart-Care-System/
├── frontend/          # React + Vite + TypeScript + Tailwind
├── backend/           # Express + TypeScript + Socket.io
├── FINAL_DEMO_RUNBOOK.md
├── FINAL_READINESS_REPORT.md
└── README.md
```

## Prerequisites

- Node.js 18+
- npm

## Quick start (demo)

```bash
# Terminal 1 — API + Socket.io
cd backend
npm install
npm run dev

# Terminal 2 — UI
cd frontend
npm install
npm run dev
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend | http://localhost:5000 |
| Health | http://localhost:5000/api/health |

The UI works **offline** (PatientContext + local CareGuard). With the backend running you also get CareGuard API sync and Socket.io live events.

## Environment variables

### Frontend (`frontend/.env`)

```env
VITE_API_URL=http://localhost:5000
VITE_DEMO_MODE=true
```

See `frontend/.env.example`.

### Backend (`backend/.env`)

```env
PORT=5000
CLIENT_URL=http://localhost:5173
MONGODB_URI=
```

MongoDB is **not required** for the demo. See `backend/.env.example`.

## Demo credentials

| Role | How to enter |
|------|----------------|
| Admin / Doctor / Nurse / Lab / Pharmacy / Billing / Reception | Login → **Hospital Staff** → select role (no password) |
| Family | Login → **Family** → Patient ID (from Reception registration) |

### Canonical 5-minute patient

1. Login as **Reception**  
2. Click **Fill canonical demo patient** → **Arjun Verma**  
3. Register → note the new `SCS-####` ID  
4. Follow `FINAL_DEMO_RUNBOOK.md`

Supporting CareGuard scenarios (seed): `SCS-1001` … `SCS-1007` (lab review, pharmacy, overdue task, allergy review, critical lab, discharge block).

## Reset demo data

1. Login as **Admin**  
2. Use the **DEMO MODE** banner → **Reset demo data**  
   (or CareGuard page / Admin summary)  

This restores **fictional** patients, workflows, and CareGuard signals only. It does **not** delete a production database.

## 5-minute demo flow

See **[FINAL_DEMO_RUNBOOK.md](./FINAL_DEMO_RUNBOOK.md)** for the exact judge script:

Registration → Doctor → Lab → **CareGuard** → Review → Pharmacy → Family → Admin

Closing line:

> Smart Care System connects the entire hospital through one patient record, while CareGuard helps the team identify what needs attention next.

## Scripts

| Package | Command | Purpose |
|---------|---------|---------|
| frontend | `npm run dev` | Vite |
| frontend | `npm run build` | Production build |
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

## Notes

- Do not commit secrets — use `.env.example` templates.  
- Core demo does **not** depend on external AI APIs.  
- CareGuard outputs are **review signals**, not diagnoses or autonomous orders.  
- Readiness details: `FINAL_READINESS_REPORT.md`

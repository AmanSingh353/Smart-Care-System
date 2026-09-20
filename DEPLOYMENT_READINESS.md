# Deployment Readiness — Smart Care System

**Status:** Prepared for deployment — **not deployed yet**  
**Frontend target:** Vercel (React + Vite)  
**Backend target:** Render (Node.js + Express + Socket.io)  
**Database (planned):** MongoDB via `MONGODB_URI`  
**Auth (planned):** Firebase Authentication (Admin SDK backend-only)

Do **not** implement Vercel Services in this phase. Do **not** commit real secrets.

---

## Exact package commands

### Frontend (`frontend/package.json`)

| Setting | Value |
|---------|--------|
| **Install command** | `npm install` |
| **Build command** | `npm run build` |
| **Output directory** | `dist` |
| **Dev command** | `npm run dev` |
| **Preview** | `npm run preview` |

Root of Vite app: `frontend/` (standalone).

### Backend (`backend/package.json`)

| Setting | Value |
|---------|--------|
| **Install command** | `npm install` |
| **Build command** | `npm run build` (`tsc -p tsconfig.json`) |
| **Start command** | `npm start` (`node dist/server.js`) |
| **Required Node version** | `>=18.0.0` (`engines` in package.json) |
| **Recommended** | Node **20 LTS** on Render |

Root of Express app: `backend/` (standalone).

---

## 1. Frontend deployment settings (Vercel)

| Vercel field | Value |
|--------------|--------|
| Framework Preset | Vite |
| Root Directory | `frontend` |
| Install Command | `npm install` |
| Build Command | `npm run build` |
| Output Directory | `dist` |

**SPA routing:** already configured via:

- `frontend/vercel.json` — rewrite all routes to `/index.html`
- `frontend/public/_redirects` — Netlify-style fallback (harmless on Vercel)

**Environment variables (Vercel → Project → Settings → Environment Variables):**

```env
VITE_API_URL=https://YOUR-BACKEND-URL
VITE_DEMO_MODE=true
```

Optional:

```env
VITE_CAREGUARD_LAB_DELAY_MINUTES=15
VITE_CAREGUARD_TREATMENT_GRACE_MINUTES=0
```

**Critical:** `VITE_API_URL` is baked in at **build time**. Rebuild after changing it.

**Do not set on Vercel:**

- `MONGODB_URI`
- `FIREBASE_PRIVATE_KEY` / Admin credentials
- any backend secrets

---

## 2. Backend deployment settings (Render)

| Render field | Value |
|--------------|--------|
| Service type | Web Service |
| Root Directory | `backend` |
| Runtime | Node |
| Build Command | `npm install && npm run build` |
| Start Command | `npm start` |
| Instance | Free / Starter (as available) |

**Health check path:** `/api/health`

**Environment variables (Render → Environment):**

```env
PORT=10000
HOST=0.0.0.0
NODE_ENV=production
CLIENT_URL=https://YOUR-FRONTEND-URL
MONGODB_URI=
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

Notes:

- Render injects `PORT` automatically; `10000` is an example — prefer Render’s value.
- `CLIENT_URL` must match the **exact** Vercel origin (scheme + host, no trailing slash).
- `HOST=0.0.0.0` is the default in code when unset — required for cloud binding.

---

## 3. Required environment variables

### Frontend (public / `VITE_*` only)

| Variable | Required | Purpose |
|----------|----------|---------|
| `VITE_API_URL` | **Yes (prod)** | Backend base URL for REST + Socket.io |
| `VITE_DEMO_MODE` | Optional | Demo seed behavior |
| `VITE_CAREGUARD_*` | Optional | Thresholds |

### Backend (private)

| Variable | Required | Purpose |
|----------|----------|---------|
| `PORT` | Auto on Render | Listen port |
| `HOST` | Recommended | Bind `0.0.0.0` |
| `CLIENT_URL` | **Yes (prod)** | CORS + Socket.io origin |
| `MONGODB_URI` | When using MongoDB | Database connection |
| `NODE_ENV` | Recommended | `production` |
| `FIREBASE_PROJECT_ID` | When wiring Firebase | Admin SDK |
| `FIREBASE_CLIENT_EMAIL` | When wiring Firebase | Admin SDK |
| `FIREBASE_PRIVATE_KEY` | When wiring Firebase | Admin SDK (escaped `\n`) |

Templates: `frontend/.env.example`, `backend/.env.example`.

---

## 4. API URL configuration

- Frontend HTTP client: `frontend/src/services/api.ts`  
  - Uses `import.meta.env.VITE_API_URL`  
  - Local fallback only: `http://localhost:5000` (dev convenience)
- CareGuard sync / reset use `api.baseUrl` (same source).

**Production checklist:** set `VITE_API_URL` to the Render HTTPS URL **without** a trailing slash.

---

## 5. Socket.io configuration

| Side | Behavior |
|------|----------|
| Client | `io(api.baseUrl)` in `frontend/src/services/socket.ts` — same as `VITE_API_URL` |
| Server | CORS `origin: env.clientUrl` in `backend/src/sockets/index.ts` |
| Express CORS | Same `CLIENT_URL` in `backend/src/server.ts` |

**Production checklist:**

1. `VITE_API_URL` = Render URL  
2. `CLIENT_URL` = Vercel URL  
3. Prefer WebSocket-capable Render plan; polling transport is already enabled as fallback  

---

## 6. MongoDB configuration

- Env key: `MONGODB_URI`  
- Current code: `backend/src/config/database.ts` — if URI empty, app runs in **stub / no-DB mode** (safe for demo).  
- Connection via mongoose is **not fully wired yet** — setting `MONGODB_URI` alone does not persist PatientContext demo data.

**Blocking for “full MongoDB production”:** patient data still lives primarily in the frontend PatientContext for the hackathon demo. Migrating persistence to MongoDB is a separate implementation phase.

---

## 7. Firebase configuration

- **Not implemented** in application code yet (AuthContext is demo role-select).  
- Backend env placeholders reserved: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`.  
- These must remain **backend-only**. Never add them as `VITE_*`.  
- Frontend Firebase client SDK (if added later) would use only public web config (`apiKey`, `authDomain`, etc.) — not Admin private keys.

---

## 8. Production startup commands

### Local verify

```bash
# Backend
cd backend
npm install
npm run build
npm start
# → listens on HOST:PORT (default 0.0.0.0:5000)
# → GET /api/health

# Frontend
cd frontend
npm install
npm run build
npm run preview
```

### Cloud (after env vars set)

1. Deploy backend on Render → note URL.  
2. Set Vercel `VITE_API_URL` to that URL → deploy frontend.  
3. Set Render `CLIENT_URL` to Vercel URL → restart backend.  
4. Confirm `GET https://YOUR-BACKEND-URL/api/health`.

---

## 9. Anything preventing deployment / full production

| Item | Severity | Notes |
|------|----------|--------|
| Patient data is frontend-local (PatientContext) | **High** for multi-user prod | Demo works; MongoDB not yet the live store |
| Firebase Auth not wired | **High** for real auth | Demo uses role-select login |
| MongoDB connect stub only | Medium | URI accepted but mongoose not connected |
| Free Render cold starts | Medium | First request may be slow; Socket.io may reconnect |
| `VITE_API_URL` must be set at build | Medium | Easy to miss on Vercel |
| CORS single origin | Low | Preview URLs need matching `CLIENT_URL` or deploy updates |
| No automatic CI/CD in repo | Low | Manual Vercel/Render dashboards OK |

**Not blockers for deploying the current demo architecture** (Vercel FE + Render BE with env vars): builds work, health works, CORS/Socket.io use env, SPA rewrites exist, server binds `0.0.0.0`.

---

## Inspection summary

| Check | Result |
|-------|--------|
| Frontend standalone Vite | Yes (`frontend/`) |
| Frontend `npm run build` | Confirmed working |
| API via `VITE_API_URL` | Yes |
| Socket.io via same base URL | Yes (`api.baseUrl`) |
| No backend secrets in frontend | Yes |
| Backend standalone Express | Yes (`backend/`) |
| Backend `npm run build` / `npm start` | Confirmed |
| `PORT` + `0.0.0.0` | Yes |
| CORS / Socket.io `CLIENT_URL` | Yes |
| `MONGODB_URI` | Env ready; connect stub |
| Firebase Admin | Env placeholders only |
| `GET /api/health` | Yes |

---

## Next (explicitly out of scope here)

1. Create Vercel + Render projects and set env vars.  
2. Wire MongoDB persistence.  
3. Wire Firebase Authentication.  
4. Do **not** enable Vercel Services until requested.

# Vercel Deployment Fix — Smart Care System

**Status:** Configuration fixed for Vercel Services (builds verified locally)  
**Architecture:** Unchanged — Vite frontend + Express/Socket.io backend as two Services in one project  
**Not using:** Render, global Vite, or `npx` workarounds  

| Check | Result |
|-------|--------|
| FRONTEND BUILD | **PASS** (`frontend`: `npm install` + `npm run build`) |
| BACKEND BUILD | **PASS** (`backend`: `npm install` + `npm run build`) |
| VERCEL CONFIG | **READY** (root `vercel.json` Services config present; set Framework = **Services** in dashboard before redeploy) |

---

## A. Exact cause of the current failure

1. Vercel treated the **repo root** as a single app and ran the root script:

   ```bash
   npm run build
   → npm run build --prefix frontend && npm run build --prefix backend
   ```

2. That invoked `frontend`’s `vite build` **without** a prior install scoped to `frontend/` (root `package.json` has **no** dependencies and **no** `package-lock.json`).

3. `vite` lives only in `frontend/node_modules` (declared in `frontend/package.json` → `devDependencies`). It was never on PATH → `sh: line 1: vite: command not found` (exit 127).

4. **Vercel Services was not active** for the build:
   - There was **no** `vercel.json` at the **repository root**.
   - A Services draft lived only under `frontend/vercel.json`, so the monorepo was not built as independent `frontend/` + `backend/` services.
   - Project Framework must also be set to **Services** in the Vercel dashboard (config alone is insufficient if Framework ≠ Services).

**Not the cause:** Missing Vite from `frontend/package.json` (it is present as `vite@^5.4.19`). Do not install Vite globally.

---

## B. Files that need modification

| File | Action |
|------|--------|
| `vercel.json` (repo root) | **Created** — Services + public rewrites |
| `package.json` (repo root) | **Updated** — removed root `build` that Vercel was running |
| `frontend/vercel.json` | **Deleted** — conflicted / wrong location for monorepo Services |

No application source changes in this fix pass.

---

## C. Exact changes required

### 1. Root `vercel.json` (new)

Defines two services with **per-service** `installCommand` / `buildCommand`, plus public rewrites to `backend` (`/api`, `/socket.io`) and `frontend` (catch-all).

### 2. Root `package.json`

- **Removed** `"build": "npm run build --prefix frontend && npm run build --prefix backend"`.
- **Kept** local convenience as `"build:all"` so developers can still build both locally without Vercel picking up a root `build`.

### 3. Remove `frontend/vercel.json`

Services configuration belongs at the **project root** when Root Directory is the monorepo.

### 4. Vercel project settings (dashboard — must do manually)

- Framework: **Services**
- Root Directory: **repository root** (empty / `.`), not `frontend`
- Do **not** set a project-level Override Build Command to `npm run build`

---

## D. Final `vercel.json`

Path: **repository root** `vercel.json`

```json
{
  "services": {
    "frontend": {
      "root": "frontend/",
      "framework": "vite",
      "installCommand": "npm install",
      "buildCommand": "npm run build",
      "outputDirectory": "dist",
      "rewrites": [
        { "source": "/(.*)", "destination": "/index.html" }
      ]
    },
    "backend": {
      "root": "backend/",
      "framework": "express",
      "installCommand": "npm install",
      "buildCommand": "npm run build"
    }
  },
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": { "service": "backend" }
    },
    {
      "source": "/socket.io/(.*)",
      "destination": { "service": "backend" }
    },
    {
      "source": "/(.*)",
      "destination": { "service": "frontend" }
    }
  ]
}
```

**Backend entrypoint rationale:** `backend/src/server.ts` uses `http.createServer` + Express + `server.listen(env.port, env.host)`. That matches Vercel’s Express/Node server detection (`src/server.ts` + listen). `framework: "express"` is correct; no Python-style `entrypoint: "main:app"` is required. `buildCommand` runs `tsc` so types compile; Vercel still resolves the Express server from `src/server.ts` / compiled output under the service root.

---

## E. Frontend build configuration

| Setting | Value |
|---------|--------|
| Service root | `frontend/` |
| Framework | `vite` |
| Install | `npm install` (uses `frontend/package-lock.json`) |
| Build | `npm run build` → `vite build` |
| Output | `dist` |
| SPA | Service-scoped rewrite → `/index.html` |
| Vite package | `frontend/package.json` → `devDependencies.vite` |

---

## F. Backend build configuration

| Setting | Value |
|---------|--------|
| Service root | `backend/` |
| Framework | `express` |
| Install | `npm install` (uses `backend/package-lock.json`) |
| Build | `npm run build` → `tsc -p tsconfig.json` |
| Start / runtime | Express server via `src/server.ts` listen pattern (`main`: `dist/server.js` for local `npm start`) |
| Dependencies | `express`, `cors`, `dotenv`, `socket.io` in `backend/package.json` |

---

## G. Required environment variables

### Frontend service (build-time)

| Variable | Notes |
|----------|--------|
| `VITE_API_URL` | Public deployment origin (same host as the Services deployment), no trailing slash — until relative URL support is added in app code |
| `VITE_DEMO_MODE` | Optional |

Do **not** put MongoDB or Firebase Admin secrets on the frontend.

### Backend service (runtime)

| Variable | Notes |
|----------|--------|
| `CLIENT_URL` | Same public Vercel origin (CORS + Socket.io) |
| `PORT` | Injected by platform; code already reads `process.env.PORT` |
| `HOST` | Optional; defaults to `0.0.0.0` |
| `MONGODB_URI` | Optional; empty = stub / no-DB mode |
| `FIREBASE_PROJECT_ID` | Optional; unused until Admin is wired |
| `FIREBASE_CLIENT_EMAIL` | Optional; backend-only |
| `FIREBASE_PRIVATE_KEY` | Optional; backend-only; escaped `\n` |

---

## H. Socket.io considerations

- Server attaches Socket.io to the same HTTP server as Express (`backend/src/sockets/index.ts`).
- Default Engine.IO path is `/socket.io` — **rewritten to the backend service** in root `vercel.json`.
- Client currently allows `websocket` + `polling` (`frontend/src/services/socket.ts`). Vercel’s documented Socket.IO pattern prefers **`transports: ["websocket"]` only** — recommend as a follow-up app tweak if realtime fails after deploy.
- Connections are pinned to one Fluid instance and close at function max duration; in-memory rooms are not shared across instances.
- **No Socket.io application code changed in this fix** (config-only).

---

## I. MongoDB considerations

- `backend/src/config/database.ts` is a stub: empty `MONGODB_URI` skips connect; URI set only logs.
- Safe for current demo on Fluid compute.
- When wiring for real: use a cached singleton connection across invocations; move CareGuard Maps to durable storage for multi-instance correctness.

---

## J. Firebase Admin considerations

- Credentials remain env-only on the backend (`env.ts`); **not** initialized in code yet.
- Keep Admin keys off `VITE_*` / frontend service env.
- Demo auth continues via role headers / Bearer JSON middleware.

---

## K. Exact Vercel deployment steps

1. Commit and push: root `vercel.json`, updated root `package.json`, deletion of `frontend/vercel.json`.
2. In Vercel → Project → **Settings → General / Build & Deployment**:
   - Framework Preset: **Services**
   - Root Directory: **`.`** (monorepo root) — not `frontend`
   - Clear any Override Install/Build Command at project level
3. Set env vars (§G) for Production (and Preview if needed).
4. Redeploy (Deployments → Redeploy, or push a new commit).
5. Confirm build logs show **separate** installs/builds for `frontend` and `backend` (not root `npm run build` with `--prefix`).
6. Smoke-test: `GET https://<deployment>/api/health` and open the SPA on `/`.

Local verification (already used for this report):

```bash
cd frontend && npm install && npm run build
cd backend  && npm install && npm run build
```

---

## Package lockfiles

| Path | Present |
|------|---------|
| `frontend/package-lock.json` | Yes |
| `backend/package-lock.json` | Yes |
| Root `package-lock.json` | No (root has no dependencies — OK) |

Package manager: **npm** (lockfiles present per service).

---

## Compatibility summary (unchanged architecture)

| Topic | Assessment |
|-------|------------|
| Express + `server.listen` | Compatible with Vercel Express / Fluid |
| Long-running process assumption | Runs as Fluid function, not a forever VM; OK for HTTP |
| Socket.io | Routable via rewrite; realtime semantics need websocket-only + awareness of instance memory |
| MongoDB | Stub OK |
| Firebase Admin | Env placeholders OK; backend-only |
| CORS | `CLIENT_URL` must match deployment origin |

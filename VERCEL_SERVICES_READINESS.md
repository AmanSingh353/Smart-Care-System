# Vercel Services Readiness — Smart Care System

**Date:** 2026-09-20  
**Scope:** Inspect only — **no code changes implemented in this pass**  
**Target:** Deploy **both** `frontend/` and `backend/` as **Vercel Services** in one Vercel project (not Render, not frontend-only).

---

## Executive answers (A–I)

| # | Question | Verdict |
|---|----------|---------|
| **A** | Can the current frontend deploy as a Vercel Service? | **Mostly yes**, after project-level Services config. Vite SPA is compatible. |
| **B** | Can the current backend deploy as a Vercel Service? | **Not as-is for a complete realtime system.** Express HTTP can work on Fluid compute; Socket.io + in-memory CareGuard need changes. |
| **C** | Does Socket.io require changes? | **Yes — required before reliable production realtime.** |
| **D** | Does MongoDB require changes? | **Not for current stub deploy.** Required later for durable multi-instance state. |
| **E** | Does Firebase Admin require changes? | **Not for current demo auth.** Env placeholders exist; SDK is not initialized. |
| **F** | What `vercel.json` does this project need? | **Valid root `vercel.json` with `services` + public rewrites** (see §F). Current file is wrong location + invalid JSON. |
| **G** | Env vars per service? | See §G. |
| **H** | Service Binding for FE↔BE? | **No for this Vite SPA.** Use **public rewrites** to `/api` (and Socket.io). Bindings are server-to-server only. |
| **I** | Code changes before deploy? | **Yes** — listed in §I. Do not deploy until those are done if you need CareGuard realtime + same-origin API. |

**Overall:** The monorepo shape (`frontend/` + `backend/`) fits Vercel Services, but the repo is **not deployment-ready today** for the *complete* system (HTTP + Socket.io + shared CareGuard memory) without the changes in §I.

---

## Inspection notes (from this codebase)

### Frontend (`frontend/`)

| Item | Current state |
|------|----------------|
| Stack | React 18 + Vite (`frontend/vite.config.ts`), `BrowserRouter` in `frontend/src/App.tsx` |
| Build | `npm run build` → `dist/` |
| API client | `frontend/src/services/api.ts`: `VITE_API_URL \|\| "http://localhost:5000"` |
| Socket client | `frontend/src/services/socket.ts`: `io(api.baseUrl, { transports: ["websocket", "polling"], ... })` |
| API paths | Absolute base + paths like `/api/health`, `/api/careguard/...` |
| Existing config | `frontend/vercel.json` — **invalid**: two JSON root objects concatenated (SPA rewrite object + Services draft). Not usable. |
| SPA fallback | Also `frontend/public/_redirects` (Netlify-style). Under Services, SPA fallback must live on the **frontend service** rewrites. |

### Backend (`backend/`)

| Item | Current state |
|------|----------------|
| Entrypoint | `backend/src/server.ts` — creates `http.Server`, mounts Express, calls `server.listen(env.port, env.host)` |
| PORT / HOST | `backend/src/config/env.ts`: `PORT` (default 5000), `HOST` (default `0.0.0.0`) |
| CORS | Express + Socket.io both use `env.clientUrl` (`CLIENT_URL`) |
| Routes | `app.use("/api", apiRoutes)` — full paths `/api/health`, `/api/careguard/...` |
| Socket.io | `backend/src/sockets/index.ts` attached to the same HTTP server; default Engine.IO path `/socket.io` |
| MongoDB | `backend/src/config/database.ts` — stub; logs only; **no mongoose**; empty URI = no-DB mode |
| Firebase Admin | Env fields only in `env.ts`; **no Admin SDK import/init** |
| Long-lived process | Yes: continuous `listen` + module-level Socket.io + in-memory maps |
| In-memory state | CareGuard `Map`s (`CareGuardEngine`, `careGuardController.patientStore`), `auditService` array, Socket.io rooms |

### Traditional server assumption

`server.ts` is written as a **long-lived Node process** (bootstrap → listen forever). That pattern is **accepted by Vercel** for Express/Node servers (`server.listen` is detected; the listen port is not public). Under Services, the backend still runs as a **Vercel Function on Fluid compute**, not a always-on VM:

- Instances scale; memory is **not** shared across instances.
- WebSocket connections pin to one instance, then close at **max duration**.
- Module-level Maps / Socket.io rooms **do not** survive cold starts or multi-instance fan-out.

---

## A. Frontend as a Vercel Service

**Verdict: Yes, with configuration moves.**

Compatible today:

- Standalone Vite app under `frontend/`
- Static output `dist/`
- No backend secrets in `VITE_*` templates

Blockers / gaps before a correct Services deploy:

1. **Project framework** must be set to **Services**, and `vercel.json` must live at the **repo root** (not only under `frontend/`).
2. **SPA routing**: after traffic is rewritten into the frontend service, client routes (`/doctor`, `/admin`, etc.) need a service-scoped rewrite to `/index.html` (because `BrowserRouter` is used).
3. **`VITE_API_URL` same-origin problem**: for one deployment URL, empty `VITE_API_URL` should mean “same origin”, but current code treats falsy as `http://localhost:5000`:

```5:5:frontend/src/services/api.ts
const API_URL = (import.meta.env.VITE_API_URL as string | undefined) || "http://localhost:5000";
```

That will break production unless `VITE_API_URL` is set to the public deployment origin (or code is changed to allow `""` / relative URLs).

---

## B. Backend as a Vercel Service

**Verdict: HTTP API — possible with config; “complete” backend — not ready.**

Compatible / mostly compatible:

- Express + `src/server.ts` + `server.listen(...)` matches Vercel’s Node/Express detection model.
- Routes already mounted under `/api/...`, which matches typical Services public rewrite `/api/(.*)` → backend (service still sees `/api/...`).
- `GET /api/health` works against the Express router.
- No filesystem persistence required for the current demo API.

Not ready / high risk:

1. **Socket.io default path `/socket.io`** is **outside** `/api/*`. With only an `/api` rewrite, Engine.IO handshake traffic hits the **frontend** service and fails.
2. Client allows **polling**; Vercel’s Socket.IO guidance requires **`transports: ['websocket']` only** (long-polling is not the supported model).
3. CareGuard + audit + Socket rooms are **process memory** — incorrect under multi-instance Fluid compute.
4. Backend `package.json` builds to `dist/` (`tsc`); Services should either run TypeScript `src/server.ts` via Vercel’s TS support **or** explicitly `buildCommand` + entrypoint to `dist/server.js`. Today neither is declared for Services.
5. `frontend/vercel.json` Services draft is **invalid JSON** and not at repo root.

---

## C. Socket.io — changes required?

**Yes.**

Current wiring:

- Server: `initSocket(httpServer)` on the same server as Express (`backend/src/sockets/index.ts`).
- Client: `io(api.baseUrl, { transports: ["websocket", "polling"], ... })` (`frontend/src/services/socket.ts`).
- CareGuard emits through in-memory `getIO()` (`careGuardService.ts`).

Required for Vercel WebSocket / Services model:

| Change | Why |
|--------|-----|
| Route Socket.io to the backend service | Default path `/socket.io` is not covered by `/api/(.*)` rewrite |
| Prefer Socket.io `path` under `/api/...` **or** add a top-level rewrite for `/socket.io/(.*)` | Public ingress must reach the Express/Socket server |
| Client: `transports: ["websocket"]` only | Per Vercel Socket.IO docs |
| Expect disconnects at function max duration; keep/improve reconnect + re-`join:role` / `join:patient` | Already partially present; duration limits still apply |
| Do not rely on in-memory rooms for cross-instance delivery | Fluid compute can place clients on different instances |

Optional later: Redis adapter / external pub-sub if multi-user realtime must be correct across instances.

**Demo caveat:** Much patient UX is still frontend `PatientContext`. CareGuard sync/realtime is the main backend Socket.io consumer — that path is what breaks first on Vercel without the above.

---

## D. MongoDB — changes required?

**For deploying the current stub: No.**

`connectDatabase()` returns immediately when `MONGODB_URI` is empty and only logs when set — **no real connection**.

When you later enable MongoDB on Vercel Services:

- Add a real driver (`mongoose` or native) and connect.
- Use a **cached/singleton connection** across invocations (Fluid / serverless pattern).
- Move CareGuard signals / audit / patient snapshots out of module-level `Map`s into Mongo (or another shared store) if they must survive multi-instance.

Leaving `MONGODB_URI` empty keeps today’s demo behavior (in-memory / stub).

---

## E. Firebase Admin — changes required?

**For deploying the current demo: No.**

- Backend reads `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` in `env.ts` but never initializes Admin SDK.
- Auth remains demo header/Bearer role parsing in `backend/src/middleware/auth.ts`.
- Frontend has no Firebase client SDK wired for production auth.

When wiring later: initialize Admin **once** (lazy singleton) on the backend service only; never put private key in `VITE_*`.

---

## F. Exact `vercel.json` this project needs

### What’s wrong today

1. Only file: `frontend/vercel.json`.
2. Contents are **two concatenated JSON documents** (invalid).
3. Services config belongs at **repository root** when the Vercel project root is the monorepo.
4. Destination shape in the draft uses `"type": "service"`; current Vercel Services docs use:

```json
"destination": { "service": "backend" }
```

5. Project setting **Framework = Services** is required in the Vercel dashboard (config alone is not enough).

### Recommended root `vercel.json` (for this repo — not applied yet)

Place at: `Smart Care System/vercel.json` (repo root).

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
        { "source": "/((?!assets/).*)", "destination": "/index.html" }
      ]
    },
    "backend": {
      "root": "backend/",
      "framework": "express",
      "installCommand": "npm install",
      "buildCommand": "npm run build",
      "functions": {
        "src/server.ts": {
          "maxDuration": 300
        }
      }
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

Notes on this draft:

- Top-level `/api/(.*)` matches Express mounts (`/api/health`, `/api/careguard/...`).
- Top-level `/socket.io/(.*)` is required **unless** Socket.io `path` is moved under `/api/...` in code.
- Frontend service rewrite preserves SPA deep links for `BrowserRouter`.
- `functions.maxDuration` should be confirmed against your Vercel plan limits; raise if Socket.io sessions should last longer.
- After implementing Socket.io under `/api/socket.io`, the `/socket.io` rewrite can be removed.
- Remove or replace the broken `frontend/vercel.json` so it does not confuse tooling (root file owns Services mode).

Alternative Socket.io approach (also not implemented): set server + client `path: "/api/socket.io"` and rely solely on the `/api/(.*)` rewrite.

---

## G. Environment variables per service

### Frontend service (build-time `VITE_*`)

| Variable | Required | Notes |
|----------|----------|--------|
| `VITE_API_URL` | **Yes until code allows relative** | Prefer **same deployment origin**, e.g. `https://YOUR-PROJECT.vercel.app` (no trailing slash). Relative/`""` needs a code fix first. |
| `VITE_DEMO_MODE` | Optional | Demo seed behavior |
| `VITE_CAREGUARD_LAB_DELAY_MINUTES` | Optional | |
| `VITE_CAREGUARD_TREATMENT_GRACE_MINUTES` | Optional | |

**Never** on frontend: `MONGODB_URI`, `FIREBASE_PRIVATE_KEY`, Admin email/key, any service-account JSON.

### Backend service (runtime)

| Variable | Required | Notes |
|----------|----------|--------|
| `PORT` | Usually auto | Listen uses `process.env.PORT`; Vercel injects internally |
| `HOST` | Optional | Default `0.0.0.0` in code |
| `NODE_ENV` | Recommended | `production` |
| `CLIENT_URL` | **Yes if CORS stays strict** | Must match the public Vercel URL (scheme + host). Same-origin browser calls still benefit from correct Socket.io CORS origin. |
| `MONGODB_URI` | Optional now | Empty = stub mode |
| `FIREBASE_PROJECT_ID` | Optional now | Unused until Admin wired |
| `FIREBASE_CLIENT_EMAIL` | Optional now | Unused until Admin wired |
| `FIREBASE_PRIVATE_KEY` | Optional now | Escaped `\n`; backend-only |

Templates already exist: `frontend/.env.example`, `backend/.env.example` (written for the earlier Render split; values still apply, but `CLIENT_URL` / `VITE_API_URL` become the **same** Vercel deployment origin under Services).

---

## H. Should FE/BE use a Vercel Service Binding?

**No — not for this architecture.**

Reasons specific to this codebase:

1. The frontend is a **static Vite SPA**. Browser code calls the API via `fetch` / `socket.io-client` using `VITE_API_URL` / `api.baseUrl`.
2. Bindings inject URLs into **server-side** runtime of the *caller* service. They do **not** expose a URL to the browser bundle, and they do **not** resolve at Vite build time.
3. Correct pattern here: **public top-level rewrites** so the browser talks to `/api/...` (and Socket.io) on the **same deployment hostname**.
4. Binding would only matter if a **server-side** frontend (SSR/BFF) called the Express service privately. This app does not do that today.

Optional later: if you add a server-side BFF, declare a binding on that caller (`format: "url"`, `env: "BACKEND_URL"`). Still keep `/api` public if the browser must call Express directly.

---

## I. Code / config changes required before deployment

Do **not** implement in this pass — checklist only:

### Must-do for a working Services deploy

1. **Add valid root `vercel.json`** with `services` + public rewrites (see §F).
2. **Set Vercel project framework to Services.**
3. **Fix or remove invalid `frontend/vercel.json`.**
4. **Fix API base URL handling** so production can use same-origin / empty `VITE_API_URL` without falling back to `localhost:5000` (`frontend/src/services/api.ts` and any direct `api.baseUrl` URL builders).
5. **Socket.io routing**: either rewrite `/socket.io` to backend **or** move path under `/api/...` on server + client.
6. **Socket.io client**: `transports: ["websocket"]` only for Vercel.
7. **CORS / `CLIENT_URL`**: set to the real Vercel deployment origin (preview URLs need matching values or relaxed multi-origin logic).
8. **Confirm backend entry on Vercel**: `src/server.ts` listen detection vs `dist/server.js` after `npm run build` — pick one explicit path and document it in the backend service config.

### Strongly recommended for “complete” CareGuard realtime

9. Treat in-memory CareGuard/audit/socket rooms as **single-instance demo only**, or move shared state to Mongo/Redis before relying on multi-user production.
10. Raise / verify `maxDuration` for the backend function if Socket sessions should last longer.
11. Re-test: `GET /api/health`, CareGuard sync, acknowledge/resolve, socket `careguard:signal-*` events across two browser sessions.

### Not required to deploy the current demo stubs

12. MongoDB driver wiring.
13. Firebase Admin initialization.
14. Moving backend to Render (explicitly out of scope).

---

## Risk summary

| Risk | Severity | Impact on “complete system” on Vercel Services |
|------|----------|-----------------------------------------------|
| Invalid / misplaced `vercel.json` | **Blocker** | Services mode will not build/route correctly |
| Socket.io path not rewritten to backend | **Blocker** | Realtime fails; CareGuard live updates fail |
| Socket.io polling transport | **High** | Handshake/upgrade failures on Vercel |
| `VITE_API_URL` → localhost fallback | **Blocker** (if unset) | Browser calls local machine instead of Vercel |
| In-memory CareGuard / audit / rooms | **High** (multi-instance) | Lost signals, missed emits between users |
| Mongo / Firebase not wired | **Low** for demo | Expected; demo auth + PatientContext still work |
| Long-lived server assumptions | **Medium** | Works as Fluid function, but not as a permanent process |

---

## Bottom line

- **Frontend Service:** viable Vite SPA — needs root Services config + SPA rewrite + API URL fix.  
- **Backend Service:** Express HTTP can run on Vercel Services; **Socket.io and in-memory CareGuard are the main gaps** for a complete deploy.  
- **Communication:** public **rewrites**, not Service Bindings, for this Vite client.  
- **Next step (when you ask):** implement §I changes, then deploy one Vercel project with Framework = Services — still no Render.

*No application functionality was modified while producing this document.*

# Final Presentation Checklist — Smart Care System

## Before stage

### Hardware / environment
- [ ] Laptop charged
- [ ] Charger packed
- [ ] Correct screen resolution set
- [ ] Browser zoom at **100%**
- [ ] Unnecessary browser extensions closed
- [ ] Notifications / Do Not Disturb on
- [ ] Internet verified if using Firebase Auth / remote deploy (local clinical demo can work offline)

### Application
- [ ] Backend running (`cd backend && npm run dev`)
- [ ] Frontend running (`cd frontend && npm run dev`)
- [ ] `GET http://localhost:5000/api/health` returns `status: ok`
- [ ] Environment variables verified (`.env` from `.env.example` — no secrets in git)
- [ ] Firebase web + Admin env configured
- [ ] `BOOTSTRAP_ADMIN_EMAIL` set; Admin login verified
- [ ] Demo staff created via Staff Management (if role switching live)
- [ ] Family login path verified
- [ ] **Reset Demo Data** tested once
- [ ] Canonical patient flow rehearsed (**Arjun Verma**)
- [ ] CareGuard lab-review signal tested end-to-end
- [ ] Allergy CareGuard scenario (SCS-1005) optional backup ready

### Deployment (if presenting from hosted URL)
- [ ] Frontend build succeeds
- [ ] Backend build/start succeeds
- [ ] `CLIENT_URL` matches frontend origin
- [ ] `VITE_API_URL` (or same-origin rewrites) points at live API
- [ ] Firebase Auth authorized domains include production host
- [ ] Health endpoint OK on production API
- [ ] Admin login + one staff role smoke-tested on production

### Browser / device
- [ ] Tab 1: Landing `/`
- [ ] Tab 2: Login ready
- [ ] Prefer **one browser** — switch roles via Login (or two windows max)
- [ ] DevTools **closed**
- [ ] Correct device/projector output selected

### Backup
- [ ] Project ZIP / clone available offline
- [ ] Local `frontend` + `backend` runnable without relying on a single remote host
- [ ] Terminal open in project root (optional)
- [ ] Known-good Admin credentials available privately (not in git)

---

## During demo

- [ ] Follow **one patient** (Arjun Verma → note Patient ID)
- [ ] Do not refresh unnecessarily
- [ ] Do not open DevTools
- [ ] Explain one idea at a time
- [ ] Spend the most time on **CareGuard**
- [ ] Don’t click randomly / don’t explore extra menus mid-pitch
- [ ] If stuck: Admin → **Reset Demo Data** → restart from Registration

---

## Backup plan

- [ ] Local frontend build: `cd frontend && npm run build && npm run preview`
- [ ] Local backend: `cd backend && npm run dev`
- [ ] Demo reset available
- [ ] Backup ZIP on USB / Desktop
- [ ] Supporting CareGuard patients SCS-1002 / SCS-1005 if live registration fails

---

## Closing line (memorize)

> Smart Care System doesn’t just store hospital information.  
> It connects the patient’s entire care journey, and CareGuard helps the team know what needs attention next.

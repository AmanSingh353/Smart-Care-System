# Final Presentation Checklist — Smart Care System

## Before stage

### Hardware / environment
- [ ] Laptop charged
- [ ] Charger packed
- [ ] Correct screen resolution set
- [ ] Browser zoom at **100%**
- [ ] Unnecessary browser extensions closed
- [ ] Notifications / Do Not Disturb on
- [ ] Internet verified **only if** deploying remotely (local demo works offline)

### Application
- [ ] Backend running (`cd backend && npm run dev`)
- [ ] Frontend running (`cd frontend && npm run dev`)
- [ ] `GET http://localhost:5000/api/health` returns `status: ok`
- [ ] Environment variables verified (`.env` from `.env.example`)
- [ ] Staff login (Admin) verified
- [ ] Family login path verified
- [ ] **Reset Demo Data** tested once
- [ ] Canonical patient flow rehearsed (**Arjun Verma**)
- [ ] CareGuard lab-review signal tested end-to-end
- [ ] Allergy CareGuard scenario (SCS-1005) optional backup ready

### Browser tabs prepared
- [ ] Tab 1: Landing `/`
- [ ] Tab 2: Login ready
- [ ] Prefer **one browser** — switch roles via Login (or two windows max)
- [ ] DevTools **closed**

### Backup
- [ ] `Smart-Care-System-FINAL-BACKUP.zip` available offline
- [ ] Local `frontend` + `backend` runnable without internet
- [ ] Terminal open in project root (optional)

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

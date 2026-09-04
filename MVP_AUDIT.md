# SCS30 MVP Audit

**Date:** 2026-09-03  
**Project:** Smart Care System (30-Second Smart Care System)  
**Stack:** Vite + React 18 + TypeScript + Tailwind CSS + shadcn/ui + React Router + React Context (`PatientContext`)

---

## 1. Current Architecture

```
src/
├── App.tsx                 # Routes + PatientProvider + QueryClient
├── main.tsx
├── index.css               # Healthcare-themed CSS variables
├── assets/hospital-logo.png
├── contexts/
│   └── PatientContext.tsx  # Central shared patient state (GOOD foundation)
├── data/
│   └── mockData.ts         # Patient types + 3 demo patients
├── components/
│   ├── StaffLayout.tsx     # Shared staff sidebar (all roles)
│   ├── FamilyLayout.tsx    # Family header/nav
│   ├── NavLink.tsx         # Unused in routes
│   └── ui/                 # Full shadcn kit (many unused)
└── pages/
    ├── LoginPage.tsx       # Role picker (demo auth)
    ├── ReceptionPage.tsx
    ├── DoctorPanel.tsx
    ├── NursePage.tsx
    ├── PharmacyPage.tsx
    ├── BillingPage.tsx
    ├── FamilyDashboard.tsx
    ├── AdminDashboard.tsx
    ├── Index.tsx           # UNUSED placeholder (not routed)
    └── NotFound.tsx
```

### State management

- **Primary:** `PatientContext` — in-memory `patients[]` with mutators.
- **TanStack Query:** wired in `App.tsx` but unused by pages.
- **No Redux / Zustand** — do not introduce one; extend Context.

### Auth / roles

- Frontend-only role selection on `LoginPage`.
- No `AuthContext`; role is not stored after navigate.
- `StaffLayout` shows **all** department links to every staff user (weak role separation).
- Username/password and family OTP are UI-only (ignored).

### Routes

| Path | Page | Role intent |
|------|------|-------------|
| `/` | LoginPage | Entry |
| `/reception` | ReceptionPage | Reception |
| `/doctor` | DoctorPanel | Doctor |
| `/nurse` | NursePage | Nurse |
| `/pharmacy` | PharmacyPage | Pharmacy |
| `/billing` | BillingPage | Billing |
| `/admin` | AdminDashboard | Admin |
| `/family/:patientId` | FamilyDashboard | Family |
| `*` | NotFound | — |

---

## 2. Existing Features (What Already Works)

| Feature | Status | Notes |
|---------|--------|-------|
| Role-based login navigation | Partial | Routes work; no role lock after login |
| 30-second registration | Works | Creates ID, adds to shared state |
| Unique patient ID (`P100x`) | Works | `generatePatientId()` |
| Doctor patient list | Works | Filters `status === "Active"` |
| Add diagnosis | Works | Updates shared state |
| Prescribe medicines | Works | Updates pharmacy + billing + notifications |
| Request tests | Partial | Stored as bare strings; no status/result |
| Pharmacy pending/ready | Works | `dispensed` flag via shared state |
| Nurse mark dose given | Works | Schedule + family notifications |
| Billing invoice view | Works | From `billItems`; mark paid |
| Family live view | Partial | Diagnosis, meds, tests (names only), bill, requests, notifications |
| Family service requests | Partial | Submit works; no staff review |
| Admin patient counts/table | Partial | Totals only; missing ops metrics |
| Demo patients (3) | Partial | Not enough lifecycle variety |
| In-app toasts (sonner) | Works | On many mutations |
| Shared-state E2E skeleton | Works | Registration → doctor → pharmacy → nurse → billing → family is already connected |

**Verdict:** The core shared-state pipeline exists and is the strongest asset. The MVP is ~60% wired; gaps are model completeness, lab workflow, role isolation, and dashboard depth.

---

## 3. Missing MVP Features

### Patient model gaps (`mockData.ts`)

Required for MVP but missing or incomplete:

| Field | Current |
|-------|---------|
| emergency contact | Missing |
| admission date | Only `registeredAt` |
| room/bed | Optional `ward` string only |
| assigned doctor | Missing |
| allergies | Missing |
| symptoms | Missing |
| medicines | Present |
| tests with status/result | **Strings only** — no pending/completed/result |
| treatment status | Missing (only Active/Discharged) |
| nurse updates | Missing |
| billing items | Present |
| payment status | Present (`billStatus`) |
| notifications | Present |
| family requests | Present |
| patient status | Too coarse |

### Workflow gaps

1. **Lab/test workflow** — no pending → result → visible on family/admin.
2. **Treatment status** — doctor/nurse cannot set Under Treatment / Awaiting Test / etc.
3. **Nurse notes / patient status updates** — nurse UI is medicine-schedule only.
4. **Room/doctor assignment at registration** — not collected.
5. **Consultation / room charges** — registration adds fee only; no auto room charge; consultation pricing is inconsistent.
6. **Admin ops metrics** — pending tests/meds, unpaid bills, revenue, recent activity.
7. **Role-scoped UI** — staff can jump across all departments via sidebar.
8. **Notification completeness** — diagnosis save, dispense, test results, registration toast/notify inconsistencies.
9. **Dedicated lab role/page** — optional; can be a doctor/admin/nurse action or simple Lab tab — currently nonexistent.

### Out of MVP scope (do not build)

- IoT, multi-hospital networking, production NECE emergency exchange
- Real auth/backend/DB
- Production payment gateway

---

## 4. Broken / Incomplete / Risky Items

| Issue | Severity | Detail |
|-------|----------|--------|
| Tests are plain strings | High | Cannot track pending/result; family/admin cannot show status |
| StaffLayout ignores role | High | Breaks “role-based experience” demo claim |
| No Auth/role persistence | Medium | Refresh loses role; deep links open any page |
| Random bill prices | Medium | `Math.random()` in `addMedicine` / `addTest` — unstable demos |
| `Index.tsx` unused | Low | Dead placeholder; not routed |
| Unused `Navigate` import in App | Low | Cleanup |
| Pharmacy unused `useState` | Low | Lint noise |
| Family OTP ignored | Low | Acceptable for demo if documented |
| Family requests never resolved | Medium | Stuck as Pending forever |
| Diagnosis has no notification | Low | Family may miss updates |
| Dispense has no notification | Low | Incomplete alert story |
| New patients lack ward/doctor | Medium | Nurse/family show incomplete context |
| Demo data variety | Medium | Need patients in distinct pipeline stages |
| Huge unused shadcn surface | Low | Keep; do not delete wholesale |
| `@tanstack/react-query` unused | Low | Leave wired; unused is fine |

---

## 5. Recommended Implementation Order

Aligned with product Step 11:

1. **Expand `Patient` model + demo data** (`mockData.ts`)
2. **Extend `PatientContext` actions** (tests with status, nurse notes, treatment status, assign room/doctor, deterministic billing, richer notifications)
3. **Role awareness** — lightweight `AuthContext` or sessionStorage role + role-scoped `StaffLayout` nav
4. **Reception** — emergency contact, room/bed, doctor; keep 30-second form
5. **Doctor** — treatment status, richer record view (allergies/symptoms/history)
6. **Nurse** — notes, status updates, keep medicine tasks
7. **Pharmacy** — minor polish + notifications on dispense
8. **Lab/test status** — update UI (doctor or small lab section on nurse/admin)
9. **Billing sync** — fixed price table; room/consultation charges
10. **Family dashboard** — treatment status, doctor, test results, payment badge
11. **Admin dashboard** — pending meds/tests, unpaid, revenue, recent activity
12. **UI polish** — empty states, badges, consistency
13. **Acceptance walkthrough** — Patient A end-to-end

### Files to change first

1. `src/data/mockData.ts` — model + demo patients  
2. `src/contexts/PatientContext.tsx` — shared mutators  
3. `src/components/StaffLayout.tsx` (+ thin auth helper) — role separation  
4. `src/pages/ReceptionPage.tsx`  
5. `src/pages/DoctorPanel.tsx`  
6. `src/pages/NursePage.tsx`  
7. `src/pages/PharmacyPage.tsx`  
8. `src/pages/BillingPage.tsx` / Family / Admin  

---

## 6. Architectural Risks

| Risk | Mitigation |
|------|------------|
| Expanding Patient type will touch every page | Do model + context first; update pages incrementally |
| In-memory state resets on refresh | Acceptable for MVP demo; document it |
| StaffLayout cross-nav breaks role story | Scope nav by role early |
| Over-building lab as separate LIS | Keep test objects on patient; simple status updates only |
| Temptation to add Redux | Reject — Context already powers all pages |
| Rewriting UI kit / landing | Preserve shadcn + current healthcare theme |

---

## 7. Acceptance Gap Summary

Demo path **Registration → Doctor → Pharmacy → Test → Nurse → Billing → Family → Admin** is structurally possible today, but fails full acceptance because:

- Tests have no status/result lifecycle  
- Treatment/nurse updates incomplete  
- Admin metrics incomplete  
- Role UI not isolated  
- Patient model missing admission/clinical fields  

Closing those gaps on the **existing** Context architecture is sufficient for a judge-demo MVP.

---

## 8. Implementation progress (post-audit)

Completed in this pass:

- Expanded `Patient` model + 5 demo patients across lifecycle states
- Extended `PatientContext` (diagnosis, meds, tests w/ status, nurse updates, billing, notifications)
- Added `AuthContext` + role-scoped `StaffLayout`
- Wired Reception, Doctor, Nurse, Pharmacy, **Lab**, Billing, Family, Admin to shared state
- Deterministic price catalog (no random bill amounts)
- Lab route `/lab` for test status → results flow

Remaining polish (optional): empty-state consistency pass, persist demo state across refresh, staff resolution UI for family requests beyond admin.

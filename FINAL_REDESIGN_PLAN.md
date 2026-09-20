# SCS30 Final Redesign Plan (NexaHack)

**Date:** 2026-09-20  
**Status:** Baseline audit complete · UI redesign & CareGuard **not** implemented yet  
**Stack to preserve:** Vite + React 18 + TypeScript + Tailwind + shadcn/ui + React Router + `PatientContext` / `AuthContext`

---

## SECTION 1 — CURRENT ARCHITECTURE

### Overview

Smart Care System (SCS30) is a **frontend-only hospital coordination MVP**. All clinical and billing data lives in a single in-memory React Context. Role selection is demo authentication stored in `sessionStorage`. There is no backend, Redux, or external DB.

### Runtime tree

```
App.tsx
├── QueryClientProvider        (wired; pages do not use React Query yet)
├── TooltipProvider
├── AuthProvider               (role + family patientId)
└── PatientProvider            (patients[] + mutators)
    └── BrowserRouter
        ├── /                  LoginPage
        ├── /register          RegisterPage (self-service registration)
        ├── /reception         ReceptionPage
        ├── /doctor            DoctorPanel
        ├── /nurse             NursePage
        ├── /lab               LabPage
        ├── /pharmacy          PharmacyPage
        ├── /billing           BillingPage
        ├── /admin             AdminDashboard
        ├── /family/:patientId FamilyDashboard
        └── *                  NotFound
```

### Data layer

| Layer | Location | Role |
|-------|----------|------|
| Types + seed data | `src/data/mockData.ts` | `Patient`, medicines, tests, billing, statuses, prices, `initialPatients` |
| Shared state | `src/contexts/PatientContext.tsx` | CRUD/mutators; notifications; billing side-effects |
| Auth | `src/contexts/AuthContext.tsx` | Staff role / family session; `ROLE_NAV` |
| Unified record UI | `src/components/PatientDetails.tsx` | Read-only patient snapshot (Doctor, Billing) |
| Staff chrome | `src/components/StaffLayout.tsx` | Sidebar + role gate (`allowedRoles`) |
| Family chrome | `src/components/FamilyLayout.tsx` | Header + section anchors |

### Patient identity & status

- IDs: `SCS-1001`, `SCS-1002`, … via `generatePatientId()`
- Lifecycle statuses (shared):  
  `Registered` → `Admitted` → `Under Treatment` → `Awaiting Test` → `Ready for Discharge` → `Discharged`
- Payment: `Unpaid` | `Paid` on `billStatus`
- Tests: `Pending` | `In Progress` | `Completed` with optional `result`

### Shared state flow (source of truth)

```
addPatient (Reception / Register)
  → patients[] in PatientContext
  → Doctor: diagnosis, medicines, tests, status
  → Lab: updateTestStatus (+ results → notifications)
  → Pharmacy: dispenseMedicine
  → Nurse: markMedicineGiven, addNursingUpdate, status
  → Billing: billItems auto-appended by clinical actions; updatePaymentStatus
  → Family: same patient by ID (treatment, tests, bill, alerts, requests)
  → Admin: aggregates derived from patients[]
```

**Critical rule for redesign:** Visual shells may change; **do not replace or fork `PatientContext` / `mockData` patient objects per page.**

### Critical fixes applied in this audit

1. **Unresolved merge conflicts** in `App.tsx` and `LoginPage.tsx` (blocked compile) — resolved by keeping Auth + Lab + `/register`.
2. **`RegisterPage`** called `addPatient` with obsolete `{ mobile }` shape — aligned to `RegisterPatientInput` (`phone`, defaults for room/doctor).

---

## SECTION 2 — CURRENT USER FLOWS

### Reception (`/reception`)

1. Staff logs in as Reception (or Admin).
2. Fills minimal form: identity, phone, emergency contact, visit type, room/bed, doctor, optional symptoms/allergies.
3. `addPatient` creates `SCS-####`, bill line items (registration, consultation, room), status `Admitted`/`Registered`, notifications.
4. Success screen shows ID + elapsed “30-second” timing; patient appears in recent list and all other roles’ queues.

### Self-register (`/register`)

1. From login, “New Patient Registration”.
2. Minimal public form → `addPatient` with defaults (no room; default doctor).
3. Shows Patient ID for later family/staff use.
4. Does **not** require staff auth (uses `PatientProvider` only).

### Doctor (`/doctor`)

1. Lists active (non-discharged) patients from context.
2. Opens unified record via `PatientDetails` + edit forms.
3. Can: save diagnosis/symptoms/allergies, set treatment status, prescribe medicine (→ pharmacy + bill + notify), request test (→ lab + bill + notify).

### Lab (`/lab`)

1. Sees open tests across patients.
2. Start processing / complete with result text.
3. `updateTestStatus` updates patient record; family/admin see results; may clear `Awaiting Test`.

### Pharmacy (`/pharmacy`)

1. Pending vs ready tabs from `medicines[].dispensed`.
2. “Mark Packed” → `dispenseMedicine` → notification for family/nurse visibility.

### Nurse (`/nurse`)

1. Per-patient medicine schedule; overdue hints; mark dose given.
2. Post nursing update; change treatment status (same status enum).
3. Updates feed doctor/family via `nurseUpdates` + notifications.

### Billing (`/billing`)

1. Search patients; compact `PatientDetails` + invoice table from `billItems`.
2. Categories: consultation / medicine / test / room / other.
3. Mark paid → `updatePaymentStatus`; if status was `Ready for Discharge`, becomes `Discharged`.

### Family (`/family/:patientId`)

1. Login with Patient ID (demo: `SCS-1001` …).
2. Sees overview, treatment, medicines/tests status, nursing updates, live bill, requests, notifications.
3. Can submit family requests (admin can approve/reject).
4. No staff-only controls.

### Admin (`/admin`)

1. Metrics from live state: totals, pending tests/meds, unpaid/paid, revenue.
2. Patient table + recent activity (from notifications) + family request resolution.

### Login / roles

- Staff: role select → `loginStaff` → role-scoped sidebar.
- Family: patient ID → `loginFamily`.
- Admin may navigate all staff routes; other roles are redirected if they hit a forbidden path.

---

## SECTION 3 — WHAT MUST BE PRESERVED

During any redesign, **do not break**:

1. **Single `PatientProvider` as source of truth** for all roles  
2. **End-to-end chain:** register → doctor → test/lab → pharmacy → nurse → billing → family → admin  
3. **Auto bill line items** when prescribing / ordering tests / registering  
4. **Notifications** tied to real mutations  
5. **Patient ID format** `SCS-####` and `getPatientById` lookup  
6. **Shared `PATIENT_STATUSES` / test / payment enums**  
7. **Role gating** via `AuthContext` + `StaffLayout.allowedRoles`  
8. **Routes** listed in Section 1 (including `/lab` and `/register`)  
9. **`PatientDetails` contract:** receives patient object/ID from context, never hardcoded page-local patients  
10. **Deterministic pricing** (`PRICE_CATALOG`) — no random clinical prices  
11. **Demo seed patients** `SCS-1001`–`SCS-1005` in distinct lifecycle states  
12. **Family request** submit + admin resolve  
13. **Existing tech stack** (Vite/React/TS/Tailwind/shadcn) — no framework swap  

**Safe to change later (redesign phase):** layout chrome, typography, spacing, card skins, charts presentation, marketing copy, CareGuard panels as **read-derived** overlays.

**Dead / low-risk leftovers (do not confuse with product):**

- `src/pages/Index.tsx` — unused placeholder (not routed)  
- `src/components/NavLink.tsx` — unused by app routes  
- Large unused shadcn surface under `components/ui/` — keep; do not mass-delete  
- `@tanstack/react-query` — unused by pages  

---

## SECTION 4 — FRONTEND REDESIGN ARCHITECTURE

Goal: **skin and composition upgrade**, same state/actions.

### Principle

```
[ Visual shell ]  →  StaffLayout / FamilyLayout / page frames
[ Domain UI ]     →  forms, tables, PatientDetails sections
[ Domain logic ]  →  PatientContext / AuthContext / mockData   ← DO NOT REPLACE
```

### Proposed visual reorganization (no logic rewrite)

| Area | Current | Redesign approach |
|------|---------|-------------------|
| Login | Simple card stack | Premium light hero + role cards; keep same handlers |
| Staff shell | Dark blue sidebar | Light rail or soft teal sidebar; same `ROLE_NAV` |
| Reception | Single form card | “30-second” focused column + live confirmation panel |
| Doctor | List + stacked cards | Split: patient rail + record canvas; reuse `PatientDetails` |
| Nurse / Pharmacy / Lab | Operational lists | Task boards / clean tables; same mutators |
| Billing | List + invoice | Invoice-forward layout; same `billItems` |
| Family | Sections + anchors | Timeline + status header; same data slices |
| Admin | Metric cards + table | Command-center grid; metrics still derived from `patients` |

### Component strategy

- Keep pages as **route containers**.  
- Extract presentational pieces only when redesign needs them (`StatCard`, `StatusBadge`, `PageHeader`, `DataTable`).  
- Prefer wrapping `PatientDetails` over duplicating fields.  
- **Never** introduce per-page `const patients = [...]`.

### Risk zones (redesign can break logic)

- Replacing controlled forms without wiring `addMedicine` / `addTest`  
- Filtering patients client-side and dropping newly registered IDs  
- Hardcoding chart series instead of computing from context  
- Removing `/lab` or collapsing lab into a fake UI  
- Auth bypass by removing `StaffLayout` gates  

---

## SECTION 5 — DESIGN SYSTEM

Inspired by premium healthcare SaaS (clean, light, spacious) — **not** a clone of any reference site.

### Color

| Token | Direction |
|-------|-----------|
| Background | Soft cool gray-white (`~#F7FAFB`) |
| Surface / card | Pure white, subtle border `#E6EEF0` |
| Primary | Teal / clinical green-blue (refine current `--primary` / `--accent`) |
| Text | Slate `#0F172A` / muted `#64748B` |
| Success / warning / danger | Keep semantic tokens; soften saturation |
| Sidebar | Prefer light elevated rail **or** deep teal navy (pick one and stay consistent) |

Avoid: purple gradients, heavy glow, dark-mode-first, terracotta/cream newspaper looks.

### Typography

- Display / page titles: distinctive but professional (e.g. **Plus Jakarta Sans** or **DM Sans**) — not Inter-only if redesigning  
- Body / tables: highly readable sans  
- Clear hierarchy: page title → section label → body → meta  
- Avoid dense “dashboard template” type scale

### Spacing & radius

- Page padding: 24–32px desktop; 16px mobile  
- Section gaps: 24px  
- Card padding: 20–24px  
- Radius: 12–16px cards; 8–10px controls  
- Prefer whitespace over borders-on-borders

### Cards

- White surface, 1px border, **one** soft shadow max  
- No nested decorative cards in headers  
- Cards for **interaction containers** and record sections only

### Buttons

- Primary: solid teal, clear CTA  
- Secondary: outline / ghost  
- Destructive: reserved for reject/discharge-critical  
- Height consistency (~40–44px primary actions)

### Navigation

- Staff: persistent left nav from `ROLE_NAV`; show role label  
- Family: top tabs / sticky section nav  
- Active state via teal underline or soft pill — not neon

### Tables

- Compact clinical tables: muted header, zebra optional, right-align money  
- Empty states: one calm sentence + CTA if relevant

### Status badges

| Status | Visual |
|--------|--------|
| Registered / Admitted | Neutral / info |
| Under Treatment | Primary teal |
| Awaiting Test | Amber |
| Ready for Discharge | Soft green outline |
| Discharged | Muted outline |
| Unpaid / Paid | Danger tint / success outline |
| Test Pending / Completed | Amber / green |

### Alerts

- Inline banners for overdue meds, unpaid discharge, critical allergies  
- Sonner toasts remain for mutation feedback  

### Charts (Admin only, later)

- Sparse: admissions by status, revenue paid vs unpaid, pending ops counts  
- **Must** compute from `patients[]` — no decorative fake series

### Responsive

- Sidebar collapses to drawer (already)  
- Doctor/billing split stacks on mobile  
- Family single column; touch-friendly CTAs  

---

## SECTION 6 — CAREGUARD USP

**CareGuard** = care orchestration intelligence layer (product USP). **Not implemented in this phase.**

### Placement (future)

| Surface | CareGuard role |
|---------|----------------|
| Admin | Hospital-wide risk / bottleneck summary (pending tests, overdue meds, unpaid discharge) |
| Doctor | Patient-level care gaps (e.g. prescribed but not dispensed; awaiting test) |
| Nurse | Priority task queue derived from schedules + status |
| Family | Plain-language “what happens next” from status machine |
| Reception | Optional capacity hint (room occupancy) — keep lightweight |

### Implementation constraint (when built)

- CareGuard must be a **pure derivation** from `PatientContext` state (rules/heuristics or later AI).  
- It must **not** become a second patient store.  
- UI: discrete “CareGuard” panel / insight strip — not a separate conflicting app.

### Out of MVP redesign scope still

- Production AI models, IoT, multi-hospital NECE exchange — remain future narrative only.

---

## SECTION 7 — IMPLEMENTATION ORDER

Safe phases. Complete each without breaking the shared patient flow.

### Phase 0 — Baseline (this task) ✅

- Audit architecture  
- Resolve merge conflicts  
- Fix RegisterPage → `addPatient` contract  
- Confirm build/tests  

### Phase 1 — Design tokens only

- Update `index.css` / Tailwind tokens (color, radius, fonts)  
- No page structure changes  
- Visual regression smoke on Login + Doctor + Family  

### Phase 2 — Shell redesign

- `StaffLayout` + `FamilyLayout` visual refresh  
- Login / Register visual polish  
- Keep routes and auth identical  

### Phase 3 — Shared UI primitives

- `PageHeader`, `StatusBadge`, `StatCard`, table styles  
- Refactor pages to use primitives **without** changing handlers  

### Phase 4 — Role page visual passes (one role at a time)

Order: Reception → Doctor → Lab → Pharmacy → Nurse → Billing → Family → Admin  
After each: acceptance walkthrough with one new `SCS-####` patient  

### Phase 5 — CareGuard v1 (read-only insights)

- Rule-based insights from context  
- Admin + Doctor + Family strips only  
- No new mutations required  

### Phase 6 — Polish & demo

- Empty/loading consistency  
- Demo script for judges  
- Optional light charts on Admin (live data only)  

### Explicit non-goals until later phases

- Rewriting PatientContext  
- Adding backend / auth providers  
- Implementing NECE / IoT  
- Mass-deleting shadcn components  

---

## AUDIT FINDINGS SUMMARY

| Severity | Finding | Action |
|----------|---------|--------|
| Critical | Merge conflicts in `App.tsx`, `LoginPage.tsx` | **Fixed** |
| Critical | `RegisterPage` incompatible with `addPatient` API | **Fixed** |
| Medium | ESLint errors in shadcn stubs / `tailwind.config` require | Leave (upstream kit); not runtime blockers |
| Low | Dead `Index.tsx`, unused `NavLink`, unused React Query | Leave for now |
| Low | In-memory state resets on refresh | Acceptable for demo |
| Info | Build ✅ · Vitest ✅ · Lint has pre-existing UI-kit noise | See check results below |

---

## CHECK RESULTS (2026-09-20)

| Check | Result |
|-------|--------|
| `npm run build` | **Pass** |
| `npm test` | **Pass** (1 placeholder test) |
| `npm run lint` | **Fail with noise** — 5 errors mostly in `components/ui/*` and `tailwind.config.ts` require; PatientContext prefer-const addressed. App compiles and runs. |
| Merge conflict markers | **None remaining** |

---

## NEXT STEP (when approved)

Begin **Phase 1 — design tokens only**, without changing PatientContext or role workflows.

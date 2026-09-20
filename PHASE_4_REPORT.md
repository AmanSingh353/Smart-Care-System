# Phase 4 Report — CareGuard

**Date:** 2026-09-20  
**Product:** Smart Care System  
**USP:** CareGuard (care workflow & safety intelligence)  
**Scope:** `/frontend` + `/backend` — no project rename, no rebuild of core architecture

---

## Positioning

**Smart Care System** = connected hospital care through one unified patient record.  
**CareGuard** = the intelligence layer that helps the care team identify what needs attention next.

Flow:

`DATA → CAREGUARD → ATTENTION SIGNAL → RESPONSIBLE HUMAN → ACTION → RESOLUTION`

Humans remain in control. Signals require review. CareGuard does **not** diagnose, prescribe, or claim medical autonomy.

---

## 1. CareGuard architecture

### Backend (`backend/src/careguard/`)

| Area | Path |
|------|------|
| Types / config | `types/` |
| Deterministic rules | `rules/` |
| Engine + providers | `engine/CareGuardEngine.ts` |
| Services + audit | `services/` |
| HTTP API | `controllers/` + `routes/careguard.routes.ts` |

- **`CareGuardEngine`** — evaluate patients, dedupe, resolve, status transitions  
- **`DeterministicRuleProvider`** — current insight provider  
- **`PythonAIProvider`** — stub for future AI/analytics (not implemented)  
- Wired via `/api/careguard` and Socket.io (`careguard:signal-created` / `careguard:signal-updated`)

### Frontend (`frontend/src/careguard/` + `CareGuardContext`)

Mirror of the same deterministic engine so the offline demo works against **PatientContext** (single patient data system). Signals persist in `localStorage` with patient state so refresh keeps CareGuard correct.

---

## 2. Data model

`CareGuardSignal` fields: `id`, `patientId`, `type`, `severity`, `title`, `description`, `why`, `source`, `sourceEntityId`, `responsibleRole`, `actionLabel`, `actionRoute`, `status`, `createdAt`, `updatedAt`, `metadata`.

**Statuses:** `OPEN` | `ACKNOWLEDGED` | `RESOLVED` | `DISMISSED`  
**Severity:** `INFO` | `ATTENTION` | `HIGH` | `CRITICAL` (CRITICAL reserved for explicitly critical source events; Rule 2 uses **HIGH** as specified)

Patient model extensions (same mock architecture): `LabTest.isCritical`, `reviewedAt`, `reviewedBy`, `requestedAtIso`; `MedicineSchedule.dueAt`.

---

## 3. Implemented rules

| # | Type | Role | Severity |
|---|------|------|----------|
| 1 | `LAB_REVIEW_PENDING` | DOCTOR | ATTENTION |
| 2 | `CRITICAL_RESULT_REVIEW` | DOCTOR | HIGH (only if `isCritical === true`) |
| 3 | `LAB_ORDER_DELAY` | LAB | ATTENTION (threshold from config, demo **15 min**) |
| 4 | `MEDICATION_DISPENSING_PENDING` | PHARMACY | ATTENTION |
| 5 | `TREATMENT_TASK_OVERDUE` | NURSE | HIGH |
| 6 | `DISCHARGE_WORKFLOW_BLOCKED` | BILLING | ATTENTION |
| 7 | `ALLERGY_PRESCRIPTION_REVIEW` | DOCTOR | HIGH (review language only — no “unsafe” claims) |

Duplicate prevention: one active signal per `(patientId, type, sourceEntityId)`. When the issue clears → `RESOLVED`.

---

## 4. API endpoints

| Method | Path |
|--------|------|
| GET | `/api/careguard/patient/:patientId` |
| GET | `/api/careguard/role/:role` |
| GET | `/api/careguard/summary` |
| GET | `/api/careguard/audit` |
| POST | `/api/careguard/sync` |
| POST | `/api/careguard/:signalId/acknowledge` |
| POST | `/api/careguard/:signalId/resolve` |
| POST | `/api/careguard/:signalId/dismiss` |

Auth via `requireAuth` + `requireStaff` (`x-scs-role` / Bearer). Family blocked from CareGuard APIs. Role routes enforce own-role (or admin).

---

## 5. Socket.io events

- `careguard:signal-created`
- `careguard:signal-updated`

Emitted to global + `patient:{id}` + `role:{role}` + `role:admin` rooms.

---

## 6. Role-based behavior

| Role | Sees |
|------|------|
| Doctor | Lab review, critical results, allergy/prescription safety |
| Nurse | Overdue treatment tasks (+ related med workflow) |
| Lab | Delayed lab orders |
| Pharmacy | Dispensing pending |
| Billing | Discharge billing blocks |
| Admin | Hospital-wide summary + all open signals |
| Family | **No internal CareGuard signals** — patient-friendly notifications only (e.g. “Your care team has reviewed your latest report.”) |

---

## 7. Patient workspace integration

`CareGuardPanel` replaced the Phase 3B placeholder with live signals (Why / Source / Assigned to / Action). Action buttons deep-link to the correct role workspace (`?patient=&tab=`).

Doctor workspace: **Mark reviewed**, **Complete as critical** (lab), **Flag critical**. Resolving underlying state auto-resolves signals.

---

## 8. Admin integration

Admin dashboard CareGuard summary strip:

- Open / High priority / Need review / Resolved today  
- Counts by Doctor · Nurse · Lab · Pharmacy · Billing  
- Link to `/careguard` dashboard  
- Reset CareGuard demo scenarios

---

## 9. Demo scenarios

| Patient | Scenario |
|---------|----------|
| SCS-1001 A | No active signals |
| SCS-1002 B | Lab awaiting review + delayed pending LFT |
| SCS-1003 C | Prescription awaiting pharmacy |
| SCS-1004 D | Treatment task overdue |
| SCS-1005 E | Allergy/prescription safety review |
| SCS-1006 F | Explicitly critical lab result |
| SCS-1007 | Discharge blocked on unpaid billing |

Reset via Admin / CareGuard dashboard → restores seed patients + re-evaluates signals.

---

## 10. Verification results

| Check | Result |
|-------|--------|
| Frontend `tsc --noEmit` | **Pass** |
| Frontend `vite build` | **Pass** |
| Backend `tsc` build + typecheck | **Pass** |
| Vitest `careguard.test.ts` (3 tests) | **Pass** — demo mapping, dedupe, resolve-on-review |
| Frontend lint | Pre-existing shadcn/tailwind errors only; no blocking Phase 4 errors |
| Backend lint | Not configured |

### Scenario checklist (engine + UI wiring)

| Test | Expected | Status |
|------|----------|--------|
| 1 Normal Rx (no allergy match) | No safety signal | Pass (SCS-1001 / normal Paracetamol) |
| 2 Allergy match | `ALLERGY_PRESCRIPTION_REVIEW` | Pass (SCS-1005) |
| 3 Critical lab flag | `CRITICAL_RESULT_REVIEW` | Pass (SCS-1006) |
| 4 Completed unreviwed lab | `LAB_REVIEW_PENDING` | Pass (SCS-1002) |
| 5 Undispensed Rx | `MEDICATION_DISPENSING_PENDING` | Pass (SCS-1003) |
| 6 Overdue task | `TREATMENT_TASK_OVERDUE` | Pass (SCS-1004) |
| 7 Discharge + unpaid | `DISCHARGE_WORKFLOW_BLOCKED` | Pass (SCS-1007) |
| 8 Resolve underlying issue | Signal → RESOLVED | Pass (unit test + mark reviewed / dispense / pay) |
| 9 Admin CareGuard dashboard | Hospital summary | Pass (`/careguard`) |
| 10 Patient workspace | Patient-scoped signals | Pass (`CareGuardPanel patientId`) |
| 11 Family view | No internal signals | Pass (panel hidden; friendly notifications only) |
| 12 Refresh | State remains correct | Pass (patients + signals in `localStorage`) |

---

## 11. Future AI integration point

```
CareGuardInsightProvider
  ├── DeterministicRuleProvider   ← current
  └── PythonAIProvider            ← stub (predictions / forecasting later)
```

Do **not** treat Phase 4 as medically validated AI. Future providers may add flow prediction, wait-time, bed demand, workload — still as **review signals**, not autonomous decisions.

---

## 12. Remaining work

- Live Socket.io client subscription in the SPA when API mode is enabled  
- JWT-grade auth replacing demo `x-scs-role` headers  
- Broader allergy synonym matching (beyond literal name overlap) under clinical governance  
- Escalation / SLA timers beyond demo thresholds  
- Python analytics service behind `PythonAIProvider`  
- Optional CRITICAL severity mapping only when product policy requires it beyond Rule 2’s HIGH

---

## Final note

CareGuard is now a visible USP inside Smart Care System: shared patient data produces explainable attention signals, routes them to the right role, and resolves when humans complete the real workflow.

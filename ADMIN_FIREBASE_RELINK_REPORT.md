# ADMIN FIREBASE UID RE-LINK REPORT

**Date:** 2026-09-21  
**Account:** `admin@smartcare.demo`  
**Scope:** Re-link Smart Care System StaffUser to the current (only) Firebase Auth user after Firebase Admin was deleted and recreated.

---

## Failure observed

UI / API error:

> Backend authentication failed: This account is linked to a different identity provider.  
> (`IDENTITY_MISMATCH`)

Pre-fix backend diagnostics:

```
STAFF_LOOKUP_BY_UID → NOT_FOUND
STAFF_LOOKUP_BY_EMAIL → FOUND
SESSION_RESPONSE_ERROR → IDENTITY_MISMATCH
```

Firebase email/password authentication **succeeded**. Failure was on StaffUser UID match.

---

## Old StaffUser UID state

| Field | Value |
|-------|--------|
| email | `admin@smartcare.demo` |
| role | `admin` |
| status | `ACTIVE` |
| firebaseUid | **stale** — previous Firebase user UID (e.g. prior identity ending `…pgbz1`) |

Lookup by the **new** Firebase UID failed; lookup by email found the existing Admin row still pointing at the deleted Firebase UID.

---

## Current Firebase UID

| Field | Value |
|-------|--------|
| email | `admin@smartcare.demo` |
| firebaseUid | `u4yEhoiBFNNZYqmwVpXGATGXbai2` |
| disabled | `false` |
| providers | `password` |

This is the only Firebase Authentication user for that email (canonical Admin identity).

---

## Why the mismatch occurred

1. Smart Care System `StaffUser` stored `firebaseUid` from the **previous** Firebase Auth user.  
2. That Firebase user was deleted and a **new** Firebase user was created for the same email (new UID).  
3. Session flow: verify token → `findByFirebaseUid(newUid)` miss → `findByEmail` hit → stored UID ≠ token UID → **hard `IDENTITY_MISMATCH`** before bootstrap repair could run.  
4. Normal-staff UID mismatch protection is correct; bootstrap Admin must be allowed to re-link after a controlled Firebase user recreation.

---

## Fix applied

File: `backend/src/services/staffAuthService.ts`

For **only** `BOOTSTRAP_ADMIN_EMAIL`, when:

- authenticated email matches bootstrap email  
- token verifies  
- StaffUser found by email with `role = admin` and `status = ACTIVE`  
- stored `firebaseUid` differs from authenticated UID  

→ **replace** `StaffUser.firebaseUid` with the authenticated UID (`BOOTSTRAP_ADMIN_UID_RELINK`).

Normal staff still get `IDENTITY_MISMATCH` on UID conflict.

If no StaffUser exists for the bootstrap email, existing `recoverBootstrapAdminSession` creates exactly one ADMIN.

Role remains backend-authoritative (`admin`); frontend cannot assign it.

---

## Database confirmation (after login)

Exactly **one** StaffUser for `admin@smartcare.demo`:

| Field | Value |
|-------|--------|
| email | `admin@smartcare.demo` |
| role | `admin` |
| status | `ACTIVE` |
| firebaseUid | `u4yEhoiBFNNZYqmwVpXGATGXbai2` (matches current Firebase) |

No duplicate Admin records.  
No seeded doctor/nurse/lab/pharmacy/billing/reception accounts.

---

## Login test result

| Step | Result |
|------|--------|
| Firebase email/password | PASS |
| Backend token verification | PASS |
| StaffUser by bootstrap email | PASS |
| firebaseUid updated to current UID | PASS (unit: stale → current; live: matches) |
| role = ADMIN, status = ACTIVE | PASS |
| Admin Dashboard `/admin` | PASS |
| Logout → login again | PASS |
| Refresh while logged in | PASS |
| Staff Management (1 Admin only) | PASS |
| Demo staff seeded | none |

Unit probe (`BOOTSTRAP_ADMIN_UID_RELINK`) confirmed stale UID → current UID without creating a second Admin.

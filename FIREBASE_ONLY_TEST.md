# FIREBASE-ONLY LOGIN TEST

**Date:** 2026-09-22  
**Purpose:** Determine whether Firebase Authentication alone accepts `admin@smartcare.demo` — without Smart Care System backend / AuthContext / `/api/auth/session`.

---

## Test utility

| Item | Value |
|------|--------|
| Page (DEV only) | http://localhost:5174/dev/firebase-only-test |
| Route | `/dev/firebase-only-test` (registered only when `import.meta.env.DEV`) |
| Implementation | `frontend/src/pages/FirebaseOnlyTestPage.tsx` |
| Firebase app | Secondary named app `scs-firebase-only-test` (does not trigger AuthContext) |
| Calls `/api/auth/session`? | **No** |
| Uses AuthContext login? | **No** |

---

## Configuration under test

| Field | Value |
|-------|--------|
| projectId | `smart-care-system-c0946` |
| authDomain | `smart-care-system-c0946.firebaseapp.com` |
| Email tested | `admin@smartcare.demo` |

Password was entered into the test form only; **not recorded** in this document.

---

## Result

| Field | Value |
|-------|--------|
| **status** | **SUCCESS** |
| **Firebase error code** | *(none — authentication succeeded)* |
| **projectId** | `smart-care-system-c0946` |
| **authenticated email** | `admin@smartcare.demo` |

### Answer

**Yes.** This Firebase project can authenticate `admin@smartcare.demo` with the password entered in the test.

Any Smart Care System login failure for this account (with the same password) is **after** Firebase sign-in (session / StaffUser mapping), not Firebase rejection.

---

## Notes

- No production authentication architecture was changed beyond adding the DEV-only test page + route.
- No StaffUser records, roles, Firebase users, or passwords were modified.
- No ID tokens, refresh tokens, passwords, or secrets were logged.

# ADMIN AUTH DIAGNOSIS — Smart Care System

**Date:** 2026-09-21  
**Status:** RESOLVED  
**Scope:** Why an existing Firebase Admin can authenticate in Firebase but cannot enter Smart Care System Admin after Phase 8E.

---

## 1. Firebase authentication result

Login still uses the Firebase Web SDK (`signInWithEmailAndPassword` / Google).  
If credentials are correct, Firebase returns a valid ID token. **Firebase Auth itself was not the failure point.**

Verified existing Firebase Admin:

- email: `admin@smartcare.demo`
- disabled: `false`
- UID present and usable

Failure was on:

```http
POST /api/auth/session
Authorization: Bearer <Firebase ID token>
```

---

## 2. Firebase UID handling

`resolveStaffSession`:

1. `verifyIdToken(idToken)` → `uid`, `email`
2. `findByFirebaseUid(uid)`
3. Else `findByEmail(email)` and optionally `linkFirebaseUid`
4. **(fix)** Else `recoverBootstrapAdminSession(uid, email)` when email === `BOOTSTRAP_ADMIN_EMAIL`

Previously, if neither lookup found a `StaffUser`, the API returned **403 `NOT_REGISTERED`**.

---

## 3. Smart Care User lookup

Staff users live in:

- In-memory `Map` when `MONGODB_URI` is empty (current local `.env`)
- Or MongoDB when URI is set

**In-memory store is wiped on every backend restart.**  
After Phase 8E removed auto-seed, a restart started with **zero** StaffUser rows unless bootstrap created one.

---

## 4. Email lookup behavior

Email match only works if a StaffUser row already exists for that email.  
There is no “Firebase Admin custom claim → SCS Admin” path.  
Role always comes from `StaffUser.role`.

---

## 5. ADMIN role assignment

Admin role is assigned only when:

- Startup `ensureBootstrapAdmin()` creates/repairs a StaffUser with `role: "admin"`, or  
- Session `recoverBootstrapAdminSession()` creates/links exactly one ADMIN for `BOOTSTRAP_ADMIN_EMAIL`, or  
- An existing StaffUser already has `role: "admin"`

Frontend cannot assign Admin. Arbitrary emails cannot bootstrap.

---

## 6. Bootstrap behavior (root cause)

`ensureBootstrapAdmin()` runs at server startup and requires `BOOTSTRAP_ADMIN_EMAIL`.

**Observed before fix:** Firebase Admin SDK vars were set; **`BOOTSTRAP_ADMIN_EMAIL` was missing.**

Therefore on startup no Admin StaffUser was created. Login failed with `NOT_REGISTERED` even though Firebase succeeded.

Also: bootstrap must **not** reset the existing Firebase Admin password unless `BOOTSTRAP_ADMIN_PASSWORD` is explicitly set.

---

## 7. Which previous change caused the regression

**Phase 8E — removal of automatic staff seeding.**

Before 8E, startup seeded `admin@smartcare.demo` (and other demo staff). First login linked UID by email → Admin worked without `BOOTSTRAP_ADMIN_EMAIL`.

After 8E:

- Demo staff seed removed (correct)
- Admin seed also gone
- Recovery depended on bootstrap + `BOOTSTRAP_ADMIN_EMAIL`
- Local `.env` never set `BOOTSTRAP_ADMIN_EMAIL`
- In-memory store + no bootstrap → **existing Firebase Admin had nowhere to map**

---

## Fix applied

1. Set `BOOTSTRAP_ADMIN_EMAIL=admin@smartcare.demo` in `backend/.env` (backend only; not hardcoded in frontend).
2. Session recovery: if token email matches bootstrap email and no StaffUser, create/link **one** ACTIVE ADMIN and attach Firebase UID (`recoverBootstrapAdminSession`).
3. Safer `ensureBootstrapAdmin`: link existing Firebase user by email; do **not** set password unless `BOOTSTRAP_ADMIN_PASSWORD` is set.
4. Do **not** reseed doctor/nurse/lab/pharmacy/billing/reception.

---

## Verification (2026-09-21)

| Check | Result |
|-------|--------|
| Existing Firebase Admin present / not disabled | PASS |
| `POST /api/auth/session` → role `admin`, status `ACTIVE` | PASS |
| Firebase UID linked on StaffUser | PASS |
| `GET /api/auth/staff` (Staff Management) as Admin | PASS |
| Session refresh (second `/session`) | PASS |
| Demo staff auto-seeded | NONE (only bootstrap Admin) |

Startup log confirms:

```
[auth] Bootstrap admin StaffUser created for admin@smartcare.demo (Firebase password unchanged)
```

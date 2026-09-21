# ADMIN LOGIN DIAGNOSIS — Smart Care System

**Date:** 2026-09-21  
**Account under test:** `admin@smartcare.demo`  
**UI message reported:** `Invalid credentials. Check your email and password.`  
**Earlier message:** `Firebase Admin is not configured`

---

## Verdict

**Exact failure stage: (1) Firebase client email/password sign-in**

| Stage | Result |
|-------|--------|
| 1. `signInWithEmailAndPassword` | **FAIL** when the password typed in the UI does not match the current Firebase password → Firebase code `INVALID_LOGIN_CREDENTIALS` / `auth/invalid-credential` |
| 2. Firebase auth success | PASS only with the password currently stored in Firebase Auth |
| 3. `getIdToken()` | PASS (after successful Firebase sign-in) |
| 4. `POST /api/auth/session` | PASS |
| 5. Backend Firebase Admin token verification | PASS (`firebaseAdminConfigured: true`) |
| 6. Firebase UID extraction | PASS |
| 7. StaffUser lookup by UID | PASS (FOUND after bootstrap) |
| 8. Bootstrap/email lookup | PASS (`BOOTSTRAP_ADMIN_EMAIL=admin@smartcare.demo`) |
| 9. Role resolution | PASS → `admin` |
| 10. Session response | PASS → `ACTIVE` |
| 11. Frontend routing | PASS → `/admin` (when session succeeds) |

**Error code at failure:** Firebase Identity Toolkit / client  
`INVALID_LOGIN_CREDENTIALS` → UI mapped to `auth/invalid-credential` →  
`"Invalid credentials. Check your email and password."`

This is **not** a backend session or StaffUser mapping failure.

---

## Is the UI masking all failures?

**No — not for this message.**

`formatAuthError` maps **only** these Firebase client codes to “Invalid credentials…”:

- `auth/invalid-credential`
- `auth/wrong-password`
- `auth/invalid-login-credentials`

Backend failures use different messages, e.g.:

- `FIREBASE_NOT_CONFIGURED` → “Firebase Admin is not configured…”
- `NOT_REGISTERED` → staff not found
- `ACCOUNT_SUSPENDED` → suspended

So the earlier “Firebase Admin is not configured” meant **Firebase sign-in succeeded** and **session stage 5 failed**.  
The current “Invalid credentials…” means **Firebase sign-in itself is rejecting the password** — the request never reaches `/api/auth/session`.

---

## Why the password no longer matches

During Phase 8E lifecycle testing, the backend was started with a **shell** env var:

`BOOTSTRAP_ADMIN_PASSWORD=<temporary test value>`

`ensureBootstrapAdmin()` then called Firebase `updateUser(..., { password })` for `admin@smartcare.demo`.

That **overwrote** whatever password previously worked in the Firebase Console.

Current `backend/.env` correctly does **not** set `BOOTSTRAP_ADMIN_PASSWORD` (so startups no longer reset it), but Firebase Auth still holds the password from that Phase 8E update.

Live probe (password value not recorded here):

```
FIREBASE_LOGIN_STARTED
FIREBASE_LOGIN_SUCCESS
TOKEN_ACQUIRED=true
SESSION_RESPONSE_STATUS 200
STAFF_ROLE admin
STAFF_STATUS ACTIVE
SESSION_SUCCESS
```

Custom-token session probe (no password) also returned ADMIN / ACTIVE — confirming stages 4–10 are healthy.

Firebase user inspection:

- email present, `disabled: false`
- provider: `password`
- Admin SDK configured and verifying tokens

---

## Diagnostics added (development only)

**Frontend** (`import.meta.env.DEV`):

- `[auth-diag] FIREBASE_LOGIN_STARTED / SUCCESS / ERROR_CODE`
- `TOKEN_ACQUIRED`, `SESSION_REQUEST_STARTED`, `SESSION_RESPONSE_*`, `SESSION_SUCCESS`
- Clearer DEV UI strings distinguishing Firebase vs backend vs staff-not-found

**Backend** (`NODE_ENV=development`):

- `BACKEND_TOKEN_VERIFICATION_*`
- `STAFF_LOOKUP_BY_UID` / `BY_EMAIL`
- `BOOTSTRAP_ADMIN_MATCH`
- `SESSION_SUCCESS` with role/status

Never logs password, ID token, private key, or secrets.

---

## Smallest required fix

**No auth-architecture change.** Backend Admin mapping already works.

Required recovery for the human typing the **old** password:

1. Sign in with the **current** Firebase password for `admin@smartcare.demo` (the one last applied via Phase 8E `BOOTSTRAP_ADMIN_PASSWORD` in the shell — not committed), **or**
2. Use Login → **Forgot password** / Firebase Console to set a password you choose — without deleting the user.

Do **not** set `BOOTSTRAP_ADMIN_PASSWORD` in `.env` unless you intentionally want startup to overwrite the Firebase password again.

Keep:

- `BOOTSTRAP_ADMIN_EMAIL=admin@smartcare.demo`
- Firebase Admin SDK env vars
- No reseed of doctor/nurse/lab/etc.

---

## Browser verification

With the **current** Firebase password (set during Phase 8E shell bootstrap, not the older Console password):

1. Login page → `admin@smartcare.demo` + current password  
2. Navigated to **`/admin`** — Admin Dashboard, role Admin, status ACTIVE  
3. Backend `[auth-diag]` showed: token verify OK → UID FOUND → bootstrap match TRUE → SESSION_SUCCESS  

Typing an older password fails at **stage 1** with Firebase `INVALID_LOGIN_CREDENTIALS` and never hits `/api/auth/session`.

### Secondary finding (refresh)

`StaffLayout` redirected to `/login` on hard navigation before auth hydrate finished (`role` still null while `loading`).  
Minimal guard added: wait for `loading === false` before treating missing role as logged out.

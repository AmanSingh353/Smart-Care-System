# Firebase Staff Setup — Smart Care System

**Based on the current codebase only.**  
No passwords or production secrets are documented here.

---

## Answers (A–G)

### A. Can I create staff users only in Firebase Console and have them automatically appear as Smart Care System users?

**No — not automatically for arbitrary emails.**

Creating a user in Firebase Authentication Console does **not** insert a Smart Care System `StaffUser` record by itself.

**Exception for demo emails:** On backend startup (when the staff store is empty), the code **seeds** Smart Care System records for:

| Email | Role |
|-------|------|
| `admin@smartcare.demo` | `admin` |
| `doctor@smartcare.demo` | `doctor` |
| `nurse@smartcare.demo` | `nurse` |
| `lab@smartcare.demo` | `lab` |
| `pharmacy@smartcare.demo` | `pharmacy` |
| `billing@smartcare.demo` | `billing` |
| `reception@smartcare.demo` | `reception` |

Those records start with `firebaseUid: null`. If you create the **same email** in Firebase Console and sign in, `POST /api/auth/session` matches by **email**, then **links** the Firebase UID. Role is already on the seeded SCS record.

Any **other** email created only in Firebase Console will get:

> This account is not registered with Smart Care System. Contact your administrator.

---

### B. What exact endpoint/flow creates the Smart Care System User record?

| Path | When |
|------|------|
| **Startup seed** (`userStore` demo roster) | Empty store → creates the 7 demo `StaffUser` rows (emails + roles; no passwords) |
| **`ensureBootstrapAdmin()`** | No admin exists + `BOOTSTRAP_ADMIN_EMAIL` set → creates one admin `StaffUser` |
| **`POST /api/auth/staff`** | Authenticated **admin** via Staff Management UI → creates SCS user (+ Firebase user if Admin SDK is configured) |

There is **no** separate “sync from Firebase Console” endpoint that invents roles for unknown Auth users.

Session exchange (does **not** create users):

```http
POST /api/auth/session
Authorization: Bearer <Firebase ID token>
```

This only **resolves** an existing `StaffUser` (by UID or email).

---

### C. Match by Firebase UID, email, or both?

**Both, in this order** (`resolveStaffSession` in `staffAuthService.ts`):

1. Lookup by **Firebase UID** (`findByFirebaseUid`)
2. If missing, lookup by **email** from the token
3. If found by email and `firebaseUid` is null → **link** UID to that record
4. If found by email but UID already differs → `IDENTITY_MISMATCH`
5. If still not found → `NOT_REGISTERED`

Role always comes from the **Smart Care System** record, never from Firebase custom claims or the frontend.

---

### D. How do I create the first Admin?

**Current reality with demo seed:**

With empty in-memory/Mongo staff store, startup already seeds `admin@smartcare.demo` as `role: "admin"`. So `countAdmins() > 0` and **bootstrap usually does not run**.

**Practical first-admin paths:**

1. **Recommended for hackathon demo**  
   - Ensure backend has seeded (or Mongo has) `admin@smartcare.demo` as admin.  
   - Create that email in **Firebase Console** (Email/Password) with a password you choose privately.  
   - Sign in on Staff Login → session links UID → **Admin workspace** (`/admin`).

2. **Bootstrap env** (only if **no** admin exists yet — e.g. wiped store / empty Mongo without seed)  
   ```env
   BOOTSTRAP_ADMIN_EMAIL=admin@smartcare.demo
   # optional, backend-only:
   BOOTSTRAP_ADMIN_PASSWORD=
   BOOTSTRAP_ADMIN_NAME=System Administrator
   ```  
   Creates SCS admin row; if Admin SDK + password are set, also creates the Firebase Auth user.

3. **After you have any admin**  
   Use **Staff Management** → `POST /api/auth/staff` to create more admins/staff.

---

### E. After creating a Firebase user, what assigns DOCTOR / NURSE / LAB / etc.?

**The Smart Care System `StaffUser.role` field** — set when the SCS record is created (seed, bootstrap, or Staff Management).  

Firebase Console does **not** assign hospital roles. Signing in only maps identity → existing SCS user → that user’s stored role → workspace route.

---

### F. Does Staff Management create Firebase accounts through the backend?

**Yes, when Firebase Admin is configured** (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`).

Flow:

1. Admin signed in → Admin → Staff Management  
2. `POST /api/auth/staff` with name, email, role, department, staffId, optional password  
3. Backend `createStaffAccount`:  
   - `auth.createUser(...)` via Firebase Admin (or links existing Auth email)  
   - `createStaffUser(...)` in SCS store with role + `firebaseUid`

If Admin SDK is **not** configured, Staff Management still creates the **SCS** record only; you must create the matching Firebase Auth user yourself (Console), then first login links by email.

---

### G. Environment variables still missing?

Inspecting local `.env` files (values not printed here):

| Location | Status |
|----------|--------|
| Frontend `VITE_FIREBASE_API_KEY`, `AUTH_DOMAIN`, `PROJECT_ID`, `APP_ID` | Present in `frontend/.env` |
| Frontend `VITE_API_URL` | Present |
| Backend `FIREBASE_PROJECT_ID` | **Missing** |
| Backend `FIREBASE_CLIENT_EMAIL` | **Missing** |
| Backend `FIREBASE_PRIVATE_KEY` | **Missing** |
| Backend `BOOTSTRAP_ADMIN_EMAIL` | **Missing** (optional if demo seed admin is enough) |
| Backend `MONGODB_URI` | Empty → **in-memory** staff store (OK for local demo; lost on restart) |

**Critical:** Without backend Firebase Admin vars, `POST /api/auth/session` cannot verify ID tokens (`FIREBASE_NOT_CONFIGURED` / 503). Frontend Web SDK alone is not enough.

**Format warning:** `frontend/.env` currently uses quotes and spaces after `=` (e.g. `KEY= "value"`). Vite may treat quotes as part of the value. Prefer:

```env
VITE_FIREBASE_API_KEY=yourKeyHere
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_APP_ID=1:....:web:....
```

No separate seed **scripts** exist; seeding is inline in `userStore.ts` on init.

---

## Exact setup procedure (current code)

### 1. Backend Firebase Admin (required for login)

1. Firebase Console → Project settings → Service accounts → Generate new private key.  
2. Put into `backend/.env` (never commit):

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...@....iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
CLIENT_URL=http://localhost:5173
PORT=5000
```

3. Restart backend. Log should show `[firebase] Admin SDK initialized` and demo staff seed (if store empty).

### 2. Frontend Web config (you already started this)

Ensure Email/Password (and optional Google) providers are enabled in Firebase Authentication.  
Keep `VITE_FIREBASE_*` aligned with the **same** Firebase project as Admin.

### 3. Create Firebase passwords for demo emails

In Firebase Console → Authentication → Users → Add user for each demo email you need (at least admin).  
Set passwords only in Console / a private manager — never in git.

### 4. Sign in

1. Start backend + frontend.  
2. `/login` → Hospital Staff.  
3. Email/password for a seeded address.  
4. Client → Firebase → ID token → `POST /api/auth/session` → SCS role → workspace.

### 5. Create additional staff later

Prefer Admin → **Staff Management** (creates SCS + Firebase when Admin SDK works),  
or: add SCS via API/seed + matching Firebase Console user with the **same email**.

---

## Example: `admin@smartcare.demo` → Admin Workspace

```
1. Backend starts
   → seed creates StaffUser:
      email: admin@smartcare.demo
      role: admin
      staffId: ADM-001
      firebaseUid: null
      status: ACTIVE

2. You create in Firebase Console
   → Authentication user: admin@smartcare.demo + password
   → Firebase UID: (e.g. abc123)

3. You sign in on Staff Login
   → Firebase Web SDK authenticates
   → ID token sent to POST /api/auth/session

4. Backend
   → verifyIdToken (Admin SDK)
   → no user by UID yet
   → findByEmail(admin@smartcare.demo) → seeded admin
   → link firebaseUid = abc123
   → return { role: "admin", ... }

5. Frontend
   → AuthContext stores staff profile
   → navigate to /admin
   → StaffLayout allows admin → Admin Workspace
```

Same pattern for `doctor@smartcare.demo` → role `doctor` → `/doctor`, etc.

---

## Quick reference — APIs

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/auth` | Status; `firebaseAdminConfigured` |
| POST | `/api/auth/session` | Token → SCS profile + role (no create) |
| GET | `/api/auth/staff` | List staff (admin) |
| POST | `/api/auth/staff` | Create SCS (+ Firebase if Admin configured) |
| PATCH | `/api/auth/staff/:id` | Update role/status/etc. (admin) |

---

## Do not

- Expect Firebase Console alone to invent DOCTOR/NURSE roles  
- Put Admin private keys in `VITE_*`  
- Commit real passwords  
- Rely on in-memory staff store across backend restarts without re-seeding / Mongo

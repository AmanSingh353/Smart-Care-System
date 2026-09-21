# Staff Authentication — Smart Care System

**Provider:** Firebase Authentication  
**Primary staff login:** Email + Password  
**Optional:** Continue with Google  
**Role authority:** Smart Care System backend user store (MongoDB or in-memory)  
**Passwords:** Never stored in MongoDB / application database

---

## Architecture

```
Staff (email/password or Google)
        ↓
Firebase Authentication
        ↓
Firebase ID token
        ↓
POST /api/auth/session  (Authorization: Bearer <idToken>)
        ↓
Firebase Admin verifies token
        ↓
Lookup StaffUser by firebaseUid (or email → link UID)
        ↓
Return profile + role from backend DB
        ↓
Frontend routes to workspace for that role only
```

- **Authentication** (Firebase): Who are you?
- **Authorization role** (backend `StaffUser.role`): What role do you have?
- **Route / API guards**: What are you allowed to do?

The frontend must never be trusted as the source of staff role.

---

## Staff roles

| Role | Workspace |
|------|-----------|
| `admin` | `/admin` (+ Staff Management) |
| `doctor` | `/doctor` |
| `nurse` | `/nurse` |
| `lab` | `/lab` |
| `pharmacy` | `/pharmacy` |
| `billing` | `/billing` |
| `reception` | `/reception` |

Direct URL access to another role’s path is blocked by `StaffLayout` (`allowedRoles`). Admin may access staff workspaces for oversight.

---

## Email + password login

1. Staff opens `/login` → Hospital Staff  
2. Enters email + password → **Sign In**  
3. Firebase `signInWithEmailAndPassword`  
4. Client calls `/api/auth/session` with ID token  
5. Backend returns authoritative profile/role  
6. Navigate to workspace

---

## Optional Google login

1. **Continue with Google** → Firebase popup  
2. Same `/api/auth/session` exchange  
3. If no matching Smart Care System user:  
   `"This Google account is not registered with Smart Care System."`  
4. No automatic role assignment for unknown Google accounts

---

## Password reset

**Forgot password?** uses Firebase `sendPasswordResetEmail`.  
Smart Care System does not implement custom password storage or hashing for staff.

---

## Staff account creation (Admin)

Admin → **Staff Management** on `/admin`:

| Field | Purpose |
|-------|---------|
| Full Name | Display name |
| Email | Login identity |
| Role | Backend-authoritative role |
| Department | Metadata |
| Staff ID | Hospital ID (e.g. `DOC-001`) |
| Account Status | `ACTIVE` / `DISABLED` / `INVITED` |
| Initial password | Optional; sent to Firebase only |

Creates:

1. Firebase Auth user (when Admin SDK is configured)  
2. Smart Care System `StaffUser` record with `firebaseUid`, email, role, etc.

---

## Demo staff accounts

Fictional emails (seeded in backend user store — **no passwords in source**):

| Email | Role | Staff ID |
|-------|------|----------|
| `admin@smartcare.demo` | admin | ADM-001 |
| `doctor@smartcare.demo` | doctor | DOC-001 |
| `nurse@smartcare.demo` | nurse | NUR-001 |
| `lab@smartcare.demo` | lab | LAB-001 |
| `pharmacy@smartcare.demo` | pharmacy | PHR-001 |
| `billing@smartcare.demo` | billing | BIL-001 |
| `reception@smartcare.demo` | reception | REC-001 |

### How to configure demo passwords (local / hackathon)

1. Create a Firebase project; enable **Email/Password** and optionally **Google**.  
2. Set frontend `VITE_FIREBASE_*` and backend `FIREBASE_*` Admin credentials (see `.env.example`).  
3. In Firebase Console → Authentication → Users, create each demo email **or** use Admin Staff Management / bootstrap.  
4. Store demo passwords only in a private password manager or local untracked notes — **never commit them**.

---

## Bootstrap Admin

Backend env:

```env
BOOTSTRAP_ADMIN_EMAIL=admin@smartcare.demo
# BOOTSTRAP_ADMIN_PASSWORD=   # optional, backend-only, never commit
# BOOTSTRAP_ADMIN_NAME=System Administrator
```

On startup, if **no admin** exists:

- Creates a Smart Care System admin user for `BOOTSTRAP_ADMIN_EMAIL`  
- If Admin SDK + `BOOTSTRAP_ADMIN_PASSWORD` are set, also creates the Firebase Auth user  

Used only when no admin exists.

---

## Family authentication

Family remains **separate** from staff Firebase login:

- Login → Family → Patient ID  
- Bound to that patient only  
- Never receives staff roles or CareGuard internal signals  

---

## Environment variables

### Frontend (`VITE_*` — public)

- `VITE_FIREBASE_API_KEY`  
- `VITE_FIREBASE_AUTH_DOMAIN`  
- `VITE_FIREBASE_PROJECT_ID`  
- `VITE_FIREBASE_APP_ID`  
- `VITE_API_URL`  

### Backend (secret)

- `FIREBASE_PROJECT_ID`  
- `FIREBASE_CLIENT_EMAIL`  
- `FIREBASE_PRIVATE_KEY`  
- `BOOTSTRAP_ADMIN_EMAIL`  
- `BOOTSTRAP_ADMIN_PASSWORD` (optional)  
- `MONGODB_URI` (optional; empty → in-memory staff store)  
- `CLIENT_URL`  

---

## API endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/auth` | Auth status / providers |
| POST | `/api/auth/session` | Exchange ID token → profile + role |
| GET | `/api/auth/staff` | List staff (admin) |
| POST | `/api/auth/staff` | Create staff (admin) |
| PATCH | `/api/auth/staff/:id` | Update staff (admin) |

---

## Auth test matrix

| # | Case | Expected |
|---|------|----------|
| 1–7 | Each staff email/password | Lands only on that role’s workspace |
| 8 | Google for registered staff | Same role from DB |
| 9 | Google unregistered | Error; no role |
| 10 | Wrong password | Firebase error |
| 11 | Unknown email | Not registered / Firebase error |
| 12 | Password reset | Firebase email sent |
| 13 | Logout | Clears session + Firebase sign-out |
| 14 | Refresh while authenticated | Session restored via Firebase + `/session` |
| 15 | Doctor opens `/admin` | Redirected to doctor home |

---

## Security notes

- Do not commit production passwords or service account keys.  
- Do not put Admin private keys in `VITE_*`.  
- Role headers from the client are not authoritative for staff; Firebase ID token + DB role are.

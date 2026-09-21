# Staff Authentication — Smart Care System

**Provider:** Firebase Authentication  
**Primary staff login:** Email + Password  
**Optional:** Continue with Google  
**Role authority:** Smart Care System backend user store  
**Passwords:** Never stored in MongoDB / application database

---

## Architecture

```
Admin → Staff Management → Add Staff
        ↓
Backend POST /api/auth/staff
        ↓
Firebase Admin creates Auth user  +  Smart Care StaffUser (role, department, staffId)
        ↓
Staff signs in (email/password or Google)
        ↓
Firebase ID token → POST /api/auth/session
        ↓
Backend verifies token → loads StaffUser → authoritative role → workspace
```

- **Firebase:** Who are you?
- **Smart Care StaffUser.role:** What hospital role?
- **Backend middleware:** What are you allowed to do?

The frontend must never assign itself a privileged role.

---

## First Admin (bootstrap)

When **no active Admin** exists, backend uses:

```env
BOOTSTRAP_ADMIN_EMAIL=
# optional backend-only:
BOOTSTRAP_ADMIN_PASSWORD=
BOOTSTRAP_ADMIN_NAME=System Administrator
```

This creates/links the first Admin StaffUser (and optionally the Firebase Auth user).  
Do **not** hardcode admin passwords in source or the frontend.

After the first Admin exists, **all other staff** are created only via:

**Admin → Staff Management → Add Staff**

---

## Creating staff (normal path)

1. Admin opens `/admin/staff`
2. **+ Add Staff** — Full Name, Email, Role, Department, Staff ID  
3. Roles creatable in UI: Doctor, Nurse, Lab, Pharmacy, Billing, Reception  
4. Backend creates Firebase Auth identity + StaffUser with `firebaseUid` linked  
5. Temporary password / reset link returned once (never stored in MongoDB)  
6. Staff signs in → workspace for their stored role

---

## Account lifecycle

| Status | Access | Firebase Auth user |
|--------|--------|--------------------|
| `ACTIVE` | Allowed | enabled |
| `SUSPENDED` | Denied | disabled |
| `INVITED` | Denied until activated | created / pending |

**Suspend** ↔ **Activate** is the reversible access control.  
**Delete** permanently removes Firebase Auth credential + SCS staff login record. Historical hospital/patient data is preserved.

Cannot:

- Delete your own Admin account  
- Suspend or delete the **final active Admin**

---

## Google login

Registered staff Google account → same session flow → existing role.  
Unknown Google account → `"This Google account is not registered with Smart Care System."` — no auto-create.

---

## Password reset

Login → Forgot password → Firebase `sendPasswordResetEmail`.

---

## Environment

### Frontend (`VITE_*`)

- `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`
- `VITE_API_URL`

### Backend (secret)

- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
- `BOOTSTRAP_ADMIN_EMAIL` (+ optional `BOOTSTRAP_ADMIN_PASSWORD`)
- `MONGODB_URI` (optional)
- `CLIENT_URL`

---

## API

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/auth/session` | Token → profile + role |
| GET | `/api/auth/me` | Own profile |
| GET/POST/PATCH/DELETE | `/api/auth/staff` | Admin staff lifecycle |

---

## Security

- Role from backend DB only  
- Firebase Admin only on backend  
- No passwords in MongoDB  
- Suspended staff cannot use protected APIs  
- Deleted staff cannot authenticate  

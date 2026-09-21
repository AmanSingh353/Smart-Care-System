# PHASE 8B REPORT — Staff Management & Role-Based Authentication

## 1. Current authentication architecture (audit)

```
Email/Password or Google
  → Firebase Auth (identity)
  → ID token
  → POST /api/auth/session
  → Firebase Admin verifyIdToken
  → StaffUser lookup (UID, then email → link UID)
  → Enforce status (ACTIVE only)
  → Authoritative role from SCS store
  → Frontend workspace route
```

| Layer | Responsibility |
|-------|----------------|
| Firebase | Who is this? |
| Smart Care `StaffUser` | What hospital role? |
| Backend middleware + domain routes | What are they allowed to call? |
| `StaffLayout` | UX route guard (not sole security) |

Preserved: demo seed roster, Admin login path, bootstrap, Google unknown-account rejection.

---

## 2. Firebase integration

- **Frontend:** Web SDK (`VITE_FIREBASE_*`), email/password + Google popup + password reset.
- **Backend:** Admin SDK (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`) verifies tokens and creates Auth users on staff create.
- Env values are cleaned of accidental quotes/spaces.

---

## 3. Staff creation flow

```
Admin UI → POST /api/auth/staff (Bearer admin token)
  → requireAdmin
  → Firebase Admin createUser (temp password generated if omitted)
  → optional passwordResetLink
  → createStaffUser (role, department, staffId, status, firebaseUid)
  → response (temp password / reset link once — never stored in MongoDB)
```

Duplicates blocked for email and Staff ID.

---

## 4. Role model

Roles: `admin`, `doctor`, `nurse`, `lab`, `pharmacy`, `billing`, `reception`.  
Stored on `StaffUser.role`. Frontend role headers are not authoritative for staff APIs.

Domain API gates (examples):

| Route prefix | Allowed |
|--------------|---------|
| `/api/admin` | admin |
| `/api/doctors` | doctor (+ admin via `requireRoles`) |
| `/api/nurses` | nurse |
| `/api/lab` | lab |
| `/api/pharmacy` | pharmacy |
| `/api/billing` | billing |
| `/api/patients` | any staff |
| `/api/auth/staff*` | admin |
| `/api/careguard` | staff (existing) |

---

## 5. Account status model

| Status | Behavior |
|--------|----------|
| `INVITED` | Session denied until Admin activates |
| `ACTIVE` | Normal access |
| `SUSPENDED` | Auth identity may exist; SCS access denied; Firebase user disabled when possible |
| `DISABLED` | Access denied; Firebase user disabled when possible |

---

## 6. Google login behavior

Registered email/UID → normal role resolution.  
Unknown Google account → `"This Google account is not registered with Smart Care System."` — no auto-provision.

---

## 7. Password reset

Login → Forgot password → Firebase `sendPasswordResetEmail`.  
Staff create may also return `passwordResetLink` from Admin SDK for secure sharing.

---

## 8. Role authorization

- Admin-only Staff Management APIs.
- Doctor cannot call `/api/admin` or staff CRUD.
- Lab vs pharmacy domain routes separated.
- Family demo token cannot pass `requireStaff`.
- Role change via Admin Edit → next `/session` returns new role (stale frontend session should re-login / refresh).

---

## 9. Demo accounts

See `DEMO_CREDENTIALS.md`. Passwords configured separately — not in git.

---

## 10. Test results

| Check | Result |
|-------|--------|
| Backend `npm run build` (`tsc`) | **PASS** |
| Frontend `npm run build` (`vite build`) | **PASS** |
| Frontend `npm run lint` | Pre-existing errors in `ui/textarea.tsx`, `tailwind.config.ts` (not introduced by 8B). Auth changes only add react-refresh warnings. |
| Admin login → Admin workspace | Manual (Firebase users required) |
| Staff Management create Doctor | Implemented end-to-end via backend Admin SDK |
| Doctor cannot access Admin API | `/api/admin` + `/api/auth/staff` admin-gated |
| Suspend → access denied | `ACCOUNT_SUSPENDED` on `/api/auth/session` |
| Google unknown | Exact NOT_REGISTERED message |
| Logout | Clears Firebase + `scs30-auth` |

---

## 11. Known limitations

- In-memory staff store when `MONGODB_URI` empty — restarts re-seed demo emails; custom staff lost unless Mongo is used.
- Password reset email delivery needs Firebase email templates / provider configured in Console.
- Clinical patient data still primarily frontend PatientContext (unchanged).
- `INVITED` blocks login until activated — use `ACTIVE` for immediate demo access after create.

---

## UI additions (no redesign)

- Staff Management: Name, Email, Role, Department, Staff ID, Status, Created, Last login, View / Edit / Suspend / Activate / Disable.
- My profile card on all staff layouts (read-only role).
- Login error mapping for disabled/suspended/not registered/Firebase/backend failures.

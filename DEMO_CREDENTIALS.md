# DEMO CREDENTIALS — Smart Care System

**DEMO ONLY.** Do not commit real production passwords or secrets.

Staff authentication uses **Firebase Authentication**.  
Smart Care System **never stores staff passwords** in MongoDB or source code.

---

## Staff accounts

Staff accounts (except the first Admin bootstrap) are created through:

**Admin → Staff Management → Add Staff**

There are **no** automatically seeded doctor / nurse / lab / pharmacy / billing / reception logins.

### Suggested demo emails (create in Firebase + Staff Management as needed)

| Email (example) | Role |
|-----------------|------|
| `admin@smartcare.demo` | Admin (bootstrap) |
| `doctor@smartcare.demo` | Doctor |
| `nurse@smartcare.demo` | Nurse |
| `lab@smartcare.demo` | Lab |
| `pharmacy@smartcare.demo` | Pharmacy |
| `billing@smartcare.demo` | Billing |
| `reception@smartcare.demo` | Reception |

Set passwords only in **Firebase Console** (or via Admin “Add Staff” temporary password / reset link).  
Do not put passwords in git, README, or frontend env.

### First Admin (bootstrap)

Configure backend environment (never commit real values):

```env
BOOTSTRAP_ADMIN_EMAIL=admin@smartcare.demo
# BOOTSTRAP_ADMIN_PASSWORD=   # optional, backend-only — avoid unless intentional
# BOOTSTRAP_ADMIN_NAME=System Administrator
```

On startup / first successful login, if configured, the backend creates or re-links that Admin `StaffUser` to the authenticated Firebase UID (`role=admin`, `status=ACTIVE`).

Then:

1. Sign in as Admin (email + password on Login)  
2. Open **Staff Management** (`/admin/staff`)  
3. **Add Staff** for each role needed for the demo  
4. Share temporary password or password-reset link securely (once)

### Account lifecycle (Admin)

| Action | Effect |
|--------|--------|
| Suspend / Activate | Blocks or restores login; Firebase user disabled/enabled |
| Delete | Removes Firebase Auth user + StaffUser (not clinical history) |

Cannot suspend/delete the final active Admin or your own Admin account.

---

## Family access (separate)

Login → **Family** → Patient ID (e.g. from Reception registration).  
Family never receives staff roles.

---

## Clinical demo data

Patient/clinical demo seed data may still exist for product demos (Admin → **Reset Demo Data**).  
That is separate from staff authentication records.

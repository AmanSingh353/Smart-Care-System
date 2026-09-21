# DEMO CREDENTIALS — Smart Care System

**DEMO ONLY.** Do not commit real production passwords.

Staff authentication uses **Firebase Authentication**.  
Smart Care System **never stores staff passwords** in MongoDB or source code.

---

## Staff accounts

**Staff accounts are created through Admin → Staff Management.**

There are **no** automatically seeded doctor/nurse/lab/pharmacy/billing/reception logins.

### First Admin (bootstrap)

Configure backend environment (never commit real values):

```env
BOOTSTRAP_ADMIN_EMAIL=your-admin@example.com
# BOOTSTRAP_ADMIN_PASSWORD=   # optional, backend-only
```

On startup, if no active Admin exists, the backend creates/links that Admin StaffUser.  
Demo passwords are configured separately (Firebase Console or bootstrap password env).

Then:

1. Sign in as Admin  
2. Open **Staff Management** (`/admin/staff`)  
3. **Add Staff** for each role needed for the demo  

---

## Family access (separate)

Login → Family → Patient ID (e.g. from Reception registration).  
Family never receives staff roles.

---

## Clinical demo data

Patient/clinical demo seed data may still exist for product demos.  
That is separate from staff authentication records.

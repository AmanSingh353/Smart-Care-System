# DEMO CREDENTIALS — Smart Care System

**DEMO ONLY** — fictional hackathon access.  
**Do not commit real production passwords.**

Staff authentication uses **Firebase Authentication** (email/password primary, Google optional).  
Smart Care System **never stores staff passwords** in MongoDB or source code.

---

## Staff access (Firebase)

1. Configure Firebase (see `STAFF_AUTHENTICATION.md` and `.env.example` files).  
2. Create Firebase Auth users for the demo emails below (Console or Admin Staff Management).  
3. Open `/login` → **Hospital Staff**.  
4. Sign in with email + password (or Continue with Google if that Google account is registered).

| Email | Role | Staff ID | Path |
|-------|------|----------|------|
| `admin@smartcare.demo` | Admin | ADM-001 | `/admin` |
| `doctor@smartcare.demo` | Doctor | DOC-001 | `/doctor` |
| `nurse@smartcare.demo` | Nurse | NUR-001 | `/nurse` |
| `lab@smartcare.demo` | Lab | LAB-001 | `/lab` |
| `pharmacy@smartcare.demo` | Pharmacy | PHR-001 | `/pharmacy` |
| `billing@smartcare.demo` | Billing | BIL-001 | `/billing` |
| `reception@smartcare.demo` | Reception | REC-001 | `/reception` |

### Demo passwords

Set passwords only in:

- Firebase Console → Authentication → Users, or  
- A private local note / password manager, or  
- Backend-only `BOOTSTRAP_ADMIN_PASSWORD` for the first admin (never commit)

**Passwords are intentionally omitted from this repository.**

---

## Family access (separate from staff)

1. Login → **Family**  
2. Enter Patient ID from Reception  

**Canonical live demo:** register **Arjun Verma** at Reception, then use the generated `SCS-####` ID.

**Supporting seed IDs (after Reset Demo Data):**

| ID | Purpose |
|----|---------|
| SCS-1001 | Quiet patient (no CareGuard signals) |
| SCS-1002 | Lab review + delayed lab |
| SCS-1003 | Pharmacy pending |
| SCS-1004 | Overdue nursing task |
| SCS-1005 | Allergy / prescription review |
| SCS-1006 | Critical lab result |
| SCS-1007 | Discharge billing blocked |

Family users never receive staff roles.

---

## Reset demo clinical data

Admin → **Reset Demo Data** (confirmation required).

Restores fictional seed patients and CareGuard signals. Does **not** delete Firebase Auth users or staff records.

---

## Bootstrap first admin

```env
BOOTSTRAP_ADMIN_EMAIL=admin@smartcare.demo
# BOOTSTRAP_ADMIN_PASSWORD=  # backend .env only, optional
```

Runs only when no admin exists. See `STAFF_AUTHENTICATION.md`.

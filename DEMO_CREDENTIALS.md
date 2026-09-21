# DEMO CREDENTIALS — Smart Care System

**DEMO ONLY** — fictional hackathon access.  
**Do not commit real production passwords.**

Staff authentication uses **Firebase Authentication** (email/password primary, Google optional).  
Smart Care System **never stores staff passwords** in MongoDB or source code.

**Demo passwords are configured separately** (Firebase Console, Admin Staff Management temporary password / reset link, or a private password manager). They are intentionally omitted from this repository.

---

## Staff demo accounts

| Role | Email | Staff ID | Workspace |
|------|-------|----------|-----------|
| Admin | `admin@smartcare.demo` | ADM-001 | `/admin` |
| Doctor | `doctor@smartcare.demo` | DOC-001 | `/doctor` |
| Nurse | `nurse@smartcare.demo` | NUR-001 | `/nurse` |
| Lab | `lab@smartcare.demo` | LAB-001 | `/lab` |
| Pharmacy | `pharmacy@smartcare.demo` | PHR-001 | `/pharmacy` |
| Billing | `billing@smartcare.demo` | BIL-001 | `/billing` |
| Reception | `reception@smartcare.demo` | REC-001 | `/reception` |

These emails are seeded as Smart Care System `StaffUser` records on backend startup. Roles are defined by Smart Care System, not by Firebase.

### How to set demo passwords

1. Firebase Console → Authentication → Users → create each email, **or**  
2. Admin → Staff Management (creates Firebase + SCS user), **or**  
3. Match existing seeded SCS email in Console, then first login links `firebaseUid`.

---

## Family access (separate)

Login → Family → Patient ID (e.g. `SCS-1001`).  
Family never receives staff roles.

---

## Reset clinical demo data

Admin → Reset Demo Data. Does not delete Firebase Auth users or staff role records.

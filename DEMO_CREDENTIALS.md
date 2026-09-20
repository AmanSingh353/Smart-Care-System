# DEMO CREDENTIALS — Smart Care System

**DEMO ONLY** — fictional hackathon access. No production passwords.

Smart Care System uses **role-select authentication** for demos. There is no username/password database.

---

## Staff access

1. Open http://localhost:5173/login  
2. Choose **Hospital Staff**  
3. Select a role:

| Role | Landing path |
|------|----------------|
| Admin | `/admin` |
| Reception | `/reception` |
| Doctor | `/doctor` |
| Nurse | `/nurse` |
| Lab | `/lab` |
| Pharmacy | `/pharmacy` |
| Billing | `/billing` |

No password is required in DEMO MODE.

---

## Family access

1. Login → **Family**  
2. Enter Patient ID from Reception registration  

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

---

## Reset

Admin → **Reset Demo Data** (confirmation required).

Restores fictional seed patients and CareGuard signals only. Does **not** touch a production database.

---

## Security note

Do **not** reuse this auth model for a real hospital deployment. Replace with proper identity (JWT/OIDC) before production clinical use.

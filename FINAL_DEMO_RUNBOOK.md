# Final Demo Runbook — Smart Care System (≈ 5 minutes)

**Product:** Smart Care System  
**USP:** CareGuard  
**Mode:** Local DEMO MODE (fictional data only)

---

## Before you start

### Launch (two terminals)

```bash
# Terminal 1 — API + Socket.io
cd backend
npm install
npm run dev

# Terminal 2 — UI
cd frontend
npm install
npm run dev
```

- Frontend: http://localhost:5173  
- Backend health: http://localhost:5000/api/health  

### Optional prep

1. Login as **Admin** → click **Reset demo data** (banner or CareGuard page).  
2. Confirm DEMO MODE strip shows (top of staff pages).

### Credentials

| Who | How |
|-----|-----|
| Staff | Login → Hospital Staff → pick role (no password) |
| Family | Login → Family → Patient ID from registration |

---

## STEP 1 — Enter Smart Care System (≈ 30s)

1. Open `/` landing page.  
2. Point out: **unified hospital record** + **CareGuard** mention.  
3. Click **Enter** / go to `/login`.

**Say:**  
“Smart Care System connects the hospital through one patient record. CareGuard is the intelligence layer that surfaces what needs attention next.”

---

## STEP 2 — 30-second registration (≈ 40s)

1. Staff login as **Reception**.  
2. Click **Fill canonical demo patient** → **Arjun Verma**.  
3. Submit **Register Patient**.  
4. Show generated **Patient ID** (e.g. `SCS-1008`).  
5. Optionally **Open Patient Workspace**.

**Say:**  
“In under 30 seconds we created a live hospital record — every department will see this same patient.”

**Note the Patient ID** — use it for Family at the end.

---

## STEP 3 — Doctor workspace (≈ 40s)

1. Logout → login as **Doctor**.  
2. Select **Arjun Verma** (same ID).  
3. Show **Patient Header**, **Patient Journey**, **Clinical Summary**.  
4. Update diagnosis briefly (optional).  
5. **Order test** → e.g. `CBC`.

**Say:**  
“This is the unified Patient Workspace — journey, clinical data, and actions in one place.”

---

## STEP 4 — Lab (≈ 40s)

1. Logout → login as **Lab**.  
2. Open the same patient / same CBC order.  
3. Enter a result → **Mark completed & publish**.

**Say:**  
“Lab is not a separate spreadsheet — it’s the same patient record.”

---

## STEP 5 — CareGuard (≈ 60s) ★ USP

1. Login as **Doctor** (or open **CareGuard** from Admin).  
2. Show signal: **Lab result awaiting review** (`LAB_REVIEW_PENDING`).  
3. Open Patient Workspace CareGuard panel **or** click **Review result**.  
4. **Mark reviewed**.  
5. Show signal → **RESOLVED**.  
6. Optional: Admin CareGuard summary counts update.

**Say:**  
“Instead of only storing the result, CareGuard identifies that a doctor still needs to review it — then clears when the human acts.”

### Secondary CareGuard (optional 20s)

1. Doctor opens **SCS-1005** (Vikram Joshi).  
2. Show **Medication requires safety review** (allergy overlap).  
3. Emphasize: review signal only — no auto-substitution.

---

## STEP 6 — Pharmacy (≈ 40s)

1. Doctor: **Prescribe** e.g. `Paracetamol 500 mg`.  
2. Login as **Pharmacy**.  
3. Same patient → same Rx → **Mark packed / dispensed**.

**Say:**  
“Prescription and dispensing stay on one shared record.”

---

## STEP 7 — Family (≈ 30s)

1. Login as **Family** with the **registration Patient ID**.  
2. Show journey / meds / billing / care updates.  
3. Confirm **no internal CareGuard severity** panels.

**Say:**  
“Families see progress and updates — not operational alerts.”

---

## STEP 8 — Admin close (≈ 30s)

1. Login as **Admin**.  
2. Show: patients, pending tests/meds, billing, **CareGuard summary**.  
3. Open the canonical patient journey if time allows.

---

## Closing line

> “Smart Care System connects the entire hospital through one patient record, while CareGuard helps the team identify what needs attention next.”

---

## If something looks wrong

1. Admin → **Reset demo data**.  
2. Hard refresh once.  
3. Confirm backend `/api/health` if live link badge is offline (demo still works offline via PatientContext).

## Do not

- Invent clinical advice  
- Claim medically validated AI  
- Depend on external AI APIs for the core loop  
- Register random patients mid-demo without resetting first  

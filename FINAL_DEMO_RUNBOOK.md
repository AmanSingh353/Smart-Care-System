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
- Health: http://localhost:5000/api/health  

### Prep (once)

1. Ensure Firebase + `BOOTSTRAP_ADMIN_EMAIL` are configured (see `DEMO_CREDENTIALS.md`).  
2. Login as **Admin** (email + password) → **Reset Demo Data** (confirm).  
3. Confirm DEMO MODE banner is visible.  
4. Ensure demo staff roles exist via **Staff Management** if you will switch roles live.

### Access

See `DEMO_CREDENTIALS.md` — staff use Firebase email/password; Family uses Patient ID.

---

## 0:00 — PRODUCT INTRO

Open `/` landing page.

**Say:**  
“Smart Care System connects the hospital around one unified patient record.”

Briefly point to: 30-second registration · real-time coordination · **CareGuard**.

Do not linger on the landing page.

---

## 0:30 — REGISTRATION

1. Login → staff email/password for **Reception** (or Admin navigating to Registration).  
2. **Fill canonical demo patient** → **Arjun Verma**.  
3. Register → show Patient ID (`SCS-####`).  

**Say:**  
“In under 30 seconds we created a live hospital record — every department will see this same patient.”

**Note the Patient ID** for Family.

---

## 1:00 — DOCTOR

1. Login → **Doctor**.  
2. Open **Arjun Verma**.  
3. Show Patient Header · Patient Journey · Clinical Summary.  

**Say:**  
“Every department works from this same record.”

---

## 1:45 — LAB

1. Doctor: **Order test** → e.g. `CBC`.  
2. Login → **Lab**.  
3. Same patient · same test → enter result → **Mark completed & publish**.  

**Say:**  
“Lab is not a separate spreadsheet — it’s the same patient record.”

---

## 2:15 — CAREGUARD USP ★

1. Login → **Doctor** (or open CareGuard).  
2. Show signal: **Lab result awaiting review**.  

**Say:**  
“Traditional systems can store this result. Smart Care System also watches the workflow and identifies that this result still requires attention.”

3. Click **Review result** → **Mark reviewed**.  
4. Show CareGuard signal → **RESOLVED**.  

This is the **main differentiation moment**.

*Optional 15s:* open **SCS-1005** for allergy / prescription review (HIGH, human review only).

---

## 3:00 — PHARMACY

1. Doctor: **Prescribe** e.g. Paracetamol.  
2. Login → **Pharmacy**.  
3. Same Rx → dispense.  
4. Show patient record updated.

---

## 3:30 — FAMILY

1. Login → **Family** with the registration Patient ID.  
2. Show status · journey · meds · billing · updates.  
3. Confirm **no internal CareGuard alerts**.

**Say:**  
“Families see progress — not operational alerts.”

---

## 4:00 — ADMIN

1. Login → **Admin**.  
2. Show overview · patient flow · CareGuard summary · Staff Management briefly.  

**Say:**  
“Management sees the same connected ecosystem.”

---

## 4:30 — FINAL CAREGUARD MOMENT

Open `/careguard`.

**Say:**  
“CareGuard turns hospital events into actionable attention signals and routes them to the responsible human.”

---

## 4:45 — CLOSE

> Smart Care System doesn’t just store hospital information.  
> It connects the patient’s entire care journey,  
> and CareGuard helps the team know what needs attention next.

---

## If something breaks

1. Admin → **Reset Demo Data**.  
2. Hard refresh once.  
3. Continue from Registration.  
4. Confirm backend health and Firebase staff login if role switch fails.  
5. Clinical path still works offline (PatientContext + local CareGuard) if API is down — staff auth requires backend + Firebase.

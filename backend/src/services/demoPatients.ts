/**
 * Idempotent demo patient for CareGuard clinical handover demo.
 */
import mongoose from "mongoose";
import { DEMO_SMART_CARE_ID } from "./demoHospitalNetwork";
import { createPatient, findPatientByPatientId, listPatients } from "./patientStore";

const DEMO_PATIENT_ID = "SCP-2026-00125";
const DEMO_SEQ = 125;

async function ensureCounterAtLeast(year: number, minSeq: number): Promise<void> {
  try {
    if (mongoose.connection.readyState !== 1) return;
    const Counter =
      mongoose.models.Counter ||
      mongoose.model(
        "Counter",
        new mongoose.Schema(
          { _id: String, seq: { type: Number, default: 0 } },
          { collection: "counters" }
        )
      );
    await Counter.findOneAndUpdate(
      { _id: `patientId-${year}` },
      [{ $set: { seq: { $max: ["$seq", minSeq] } } }],
      { upsert: true }
    );
  } catch {
    /* counter sync is best-effort */
  }
}

export async function ensureDemoPatients(): Promise<void> {
  const existing = await findPatientByPatientId(DEMO_PATIENT_ID);
  if (existing) {
    await ensureCounterAtLeast(2026, DEMO_SEQ);
    console.log(`[patients] Demo patient ready (${DEMO_PATIENT_ID}, idempotent)`);
    return;
  }

  try {
    await createPatient({
      patientId: DEMO_PATIENT_ID,
      fullName: "Rahul Sharma",
      age: 54,
      gender: "Male",
      bloodGroup: "B+",
      phone: "+91-98765-43210",
      allergies: "Penicillin",
      currentMedications: ["Aspirin", "Atorvastatin"],
      currentCondition: "Severe chest pain, abnormal ECG, low oxygen saturation",
      diagnosis: "Acute cardiac emergency — suspected ACS",
      relevantVitals: "SpO2 low; ECG abnormal; chest pain ongoing",
      relevantReports: "ECG: ST changes; Troponin pending",
      clinicalSummary:
        "54M with acute chest pain and abnormal ECG. Requires urgent cardiology assessment and ICU support.",
      homeHospitalId: DEMO_SMART_CARE_ID,
    });
    await ensureCounterAtLeast(2026, DEMO_SEQ);
    console.log(`[patients] Demo patient created: Rahul Sharma (${DEMO_PATIENT_ID})`);
  } catch (err) {
    const byName = (
      await listPatients({ homeHospitalId: DEMO_SMART_CARE_ID, search: "Rahul Sharma" })
    )[0];
    if (byName) {
      console.log(`[patients] Demo patient already present as ${byName.patientId}`);
      return;
    }
    console.warn("[patients] Demo patient seed skipped:", err);
  }
}

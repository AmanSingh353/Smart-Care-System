/**
 * One-shot CareGuard patient handover verification (no Firebase).
 * Run: npx tsx scripts/verifyPatientHandover.ts
 */
import { connectDatabase } from "../src/config/database";
import { findPatientByPatientId } from "../src/services/patientStore";
import {
  createAssistance,
  changeAssistanceStatus,
  getAssistancePatientSummary,
  getAssistancePatientRecord,
  NetworkError,
} from "../src/services/networkService";
import { findGrantByRequestId } from "../src/services/patientAccessGrantStore";

async function expectFail(label: string, fn: () => Promise<unknown>, code?: string) {
  try {
    await fn();
    throw new Error(`${label}: expected failure`);
  } catch (err) {
    if (err instanceof NetworkError) {
      if (code && err.code !== code) {
        throw new Error(`${label}: expected ${code}, got ${err.code}`);
      }
      console.log(`  OK fail ${label} (${err.code})`);
      return;
    }
    throw err;
  }
}

async function main() {
  await connectDatabase();

  const patient = await findPatientByPatientId("SCP-2026-00125");
  if (!patient) throw new Error("Demo patient SCP-2026-00125 missing");
  console.log(`A. Patient ready: ${patient.fullName} ${patient.patientId}`);

  const staffA = {
    staffId: "STAFF-VERIFY-A",
    fullName: "Verify Doctor A",
    hospitalId: "HOSP-001",
  };

  const req = await createAssistance(
    {
      targetHospitalId: "HOSP-002",
      priority: "CRITICAL",
      emergencyType: "Cardiac Emergency",
      requiredDepartment: "Cardiology",
      requiredFacilities: ["ICU"],
      requestedProcedure: "Cardiac Intervention",
      shortDescription: "Needs ICU + cardiology",
      patientId: patient.patientId,
    },
    staffA
  );
  console.log(`C. Assistance created ${req.requestId} patientId=${req.patientId}`);
  if (!req.patientSnapshot?.allergies) throw new Error("D. Snapshot missing allergies");
  console.log(`D. Snapshot OK allergies=${req.patientSnapshot.allergies}`);

  const summary = await getAssistancePatientSummary(req.id, { hospitalId: "HOSP-002" });
  console.log(`E. Target sees summary for ${summary.emergencySummary?.patientName}`);

  await expectFail(
    "F. expanded before accept",
    () => getAssistancePatientRecord(req.id, { hospitalId: "HOSP-002" }),
    "ACCESS_NOT_GRANTED"
  );

  const accepted = await changeAssistanceStatus(req.id, "ACCEPTED", {
    role: "doctor",
    staffId: "STAFF-VERIFY-B",
    hospitalId: "HOSP-002",
  });
  console.log(`G. Accepted status=${accepted.status}`);

  const record = await getAssistancePatientRecord(req.id, { hospitalId: "HOSP-002" });
  console.log(`G. Expanded record access=${record.accessStatus} under ${record.sharedUnder}`);

  await expectFail(
    "H. unrelated hospital",
    () => getAssistancePatientRecord(req.id, { hospitalId: "HOSP-003" }),
    "FORBIDDEN"
  );

  await changeAssistanceStatus(req.id, "IN_PROGRESS", {
    role: "doctor",
    staffId: "STAFF-VERIFY-B",
    hospitalId: "HOSP-002",
  });
  await changeAssistanceStatus(req.id, "RESOLVED", {
    role: "doctor",
    staffId: "STAFF-VERIFY-B",
    hospitalId: "HOSP-002",
  });
  const grant = await findGrantByRequestId(req.requestId);
  if (grant?.status !== "CLOSED") throw new Error(`L. expected CLOSED grant, got ${grant?.status}`);
  console.log(`L. Grant closed after resolve`);

  await expectFail(
    "L. expanded after resolve",
    () => getAssistancePatientRecord(req.id, { hospitalId: "HOSP-002" }),
    "ACCESS_NOT_GRANTED"
  );

  // Isolation: HOSP-002 cannot create request using HOSP-001 patient
  await expectFail(
    "I. patient hospital mismatch",
    () =>
      createAssistance(
        {
          targetHospitalId: "HOSP-003",
          priority: "HIGH",
          emergencyType: "Trauma",
          requiredDepartment: "Trauma Care",
          patientId: patient.patientId,
        },
        { staffId: "X", fullName: "X", hospitalId: "HOSP-002" }
      ),
    "PATIENT_HOSPITAL_MISMATCH"
  );

  console.log("\nAll verification checks passed.");
  process.exit(0);
}

main().catch(err => {
  console.error("VERIFY FAILED", err);
  process.exit(1);
});

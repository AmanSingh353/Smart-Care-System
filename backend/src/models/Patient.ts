/** Network-wide Smart Care patient — stable Patient ID across hospitals. */

export interface PatientClinicalSnapshotInput {
  allergies?: string;
  currentMedications?: string[];
  currentCondition?: string;
  diagnosis?: string;
  relevantVitals?: string;
  relevantReports?: string;
  clinicalSummary?: string;
}

export interface Patient {
  id: string;
  /** Stable network ID, e.g. SCP-2026-00001 */
  patientId: string;
  fullName: string;
  dateOfBirth: string;
  age: number | null;
  gender: string;
  bloodGroup: string;
  phone: string;
  allergies: string;
  currentMedications: string[];
  currentCondition: string;
  diagnosis: string;
  relevantVitals: string;
  relevantReports: string;
  clinicalSummary: string;
  /** Hospital that owns/registers this patient record for care context. */
  homeHospitalId: string;
  createdAt: string;
  updatedAt: string;
}

export function toPublicPatient(p: Patient) {
  return {
    id: p.id,
    patientId: p.patientId,
    fullName: p.fullName,
    dateOfBirth: p.dateOfBirth,
    age: p.age,
    gender: p.gender,
    bloodGroup: p.bloodGroup,
    phone: p.phone,
    allergies: p.allergies,
    currentMedications: p.currentMedications,
    currentCondition: p.currentCondition,
    diagnosis: p.diagnosis,
    relevantVitals: p.relevantVitals,
    relevantReports: p.relevantReports,
    clinicalSummary: p.clinicalSummary,
    homeHospitalId: p.homeHospitalId,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

/** Emergency handover subset — point-in-time snapshot on AssistanceRequest. */
export interface PatientEmergencySnapshot {
  patientName: string;
  patientId: string;
  age: number | null;
  gender: string;
  bloodGroup: string;
  allergies: string;
  currentMedications: string[];
  currentCondition: string;
  relevantDiagnosis: string;
  relevantVitals: string;
  relevantReports: string;
  relevantClinicalSummary: string;
}

export function buildEmergencySnapshot(p: Patient): PatientEmergencySnapshot {
  return {
    patientName: p.fullName,
    patientId: p.patientId,
    age: p.age,
    gender: p.gender || "",
    bloodGroup: p.bloodGroup || "",
    allergies: p.allergies || "",
    currentMedications: Array.isArray(p.currentMedications) ? [...p.currentMedications] : [],
    currentCondition: p.currentCondition || "",
    relevantDiagnosis: p.diagnosis || "",
    relevantVitals: p.relevantVitals || "",
    relevantReports: p.relevantReports || "",
    relevantClinicalSummary: p.clinicalSummary || "",
  };
}

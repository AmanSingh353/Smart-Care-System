/** Controlled expanded patient-record access under a CareGuard assistance request. */

export const PATIENT_ACCESS_SECTIONS = [
  "basicProfile",
  "medicalHistory",
  "allergies",
  "medications",
  "labReports",
  "prescriptions",
  "clinicalNotes",
] as const;

export type PatientAccessSection = (typeof PATIENT_ACCESS_SECTIONS)[number];

export const PATIENT_ACCESS_STATUSES = ["ACTIVE", "CLOSED", "REVOKED"] as const;
export type PatientAccessStatus = (typeof PATIENT_ACCESS_STATUSES)[number];

export interface PatientAccessGrant {
  id: string;
  requestId: string;
  assistanceId: string;
  patientId: string;
  requestingHospitalId: string;
  targetHospitalId: string;
  allowedSections: PatientAccessSection[];
  status: PatientAccessStatus;
  createdAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  updatedAt: string;
}

export function toPublicAccessGrant(g: PatientAccessGrant) {
  return {
    id: g.id,
    requestId: g.requestId,
    assistanceId: g.assistanceId,
    patientId: g.patientId,
    requestingHospitalId: g.requestingHospitalId,
    targetHospitalId: g.targetHospitalId,
    allowedSections: g.allowedSections,
    status: g.status,
    createdAt: g.createdAt,
    expiresAt: g.expiresAt,
    revokedAt: g.revokedAt,
    updatedAt: g.updatedAt,
  };
}

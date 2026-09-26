/** Inter-hospital CareGuard assistance request — patient ID + emergency handover snapshot. */

import type { PatientEmergencySnapshot } from "./Patient";

export const ASSISTANCE_PRIORITIES = ["CRITICAL", "HIGH", "NORMAL"] as const;
export type AssistancePriority = (typeof ASSISTANCE_PRIORITIES)[number];

export const ASSISTANCE_STATUSES = [
  "PENDING",
  "ACCEPTED",
  "IN_PROGRESS",
  "RESOLVED",
  "CANCELLED",
  "REJECTED",
] as const;
export type AssistanceStatus = (typeof ASSISTANCE_STATUSES)[number];

export interface AssistanceRequest {
  id: string;
  requestId: string;
  requestingHospitalId: string;
  targetHospitalId: string;
  requestingStaffId: string;
  requestingStaffName: string;
  priority: AssistancePriority;
  emergencyType: string;
  requiredDepartment: string;
  requiredFacilities: string[];
  shortDescription: string;
  /** Optional procedure suggestion from requesting hospital. */
  requestedProcedure: string;
  /** Stable network patient ID when available. */
  patientId: string;
  /** Legacy opaque reference — retained for older rows. */
  patientReference: string;
  /** Point-in-time emergency handover snapshot (Level 1). */
  patientSnapshot: PatientEmergencySnapshot | null;
  status: AssistanceStatus;
  createdAt: string;
  updatedAt: string;
}

export function normalizeAssistancePriority(raw: string): AssistancePriority | null {
  const key = raw.trim().toUpperCase();
  return (ASSISTANCE_PRIORITIES as readonly string[]).includes(key)
    ? (key as AssistancePriority)
    : null;
}

export function normalizeAssistanceStatus(raw: string): AssistanceStatus | null {
  const key = raw.trim().toUpperCase();
  return (ASSISTANCE_STATUSES as readonly string[]).includes(key) ? (key as AssistanceStatus) : null;
}

/** Allowed status transitions for receiving hospital / requester cancel. */
export const ASSISTANCE_TRANSITIONS: Record<AssistanceStatus, AssistanceStatus[]> = {
  PENDING: ["ACCEPTED", "REJECTED", "CANCELLED"],
  ACCEPTED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["RESOLVED", "CANCELLED"],
  RESOLVED: [],
  CANCELLED: [],
  REJECTED: [],
};

export function emptySnapshot(): PatientEmergencySnapshot {
  return {
    patientName: "",
    patientId: "",
    age: null,
    gender: "",
    bloodGroup: "",
    allergies: "",
    currentMedications: [],
    currentCondition: "",
    relevantDiagnosis: "",
    relevantVitals: "",
    relevantReports: "",
    relevantClinicalSummary: "",
  };
}

export function normalizeSnapshot(raw: unknown): PatientEmergencySnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Record<string, unknown>;
  return {
    patientName: String(s.patientName || ""),
    patientId: String(s.patientId || ""),
    age: typeof s.age === "number" ? s.age : s.age == null || s.age === "" ? null : Number(s.age) || null,
    gender: String(s.gender || ""),
    bloodGroup: String(s.bloodGroup || ""),
    allergies: String(s.allergies || ""),
    currentMedications: Array.isArray(s.currentMedications)
      ? s.currentMedications.map(String)
      : [],
    currentCondition: String(s.currentCondition || ""),
    relevantDiagnosis: String(s.relevantDiagnosis || ""),
    relevantVitals: String(s.relevantVitals || ""),
    relevantReports: String(s.relevantReports || ""),
    relevantClinicalSummary: String(s.relevantClinicalSummary || ""),
  };
}

export function toPublicAssistanceRequest(r: AssistanceRequest) {
  return {
    id: r.id,
    requestId: r.requestId,
    requestingHospitalId: r.requestingHospitalId,
    targetHospitalId: r.targetHospitalId,
    requestingStaffId: r.requestingStaffId,
    requestingStaffName: r.requestingStaffName,
    priority: r.priority,
    emergencyType: r.emergencyType,
    requiredDepartment: r.requiredDepartment,
    requiredFacilities: r.requiredFacilities,
    shortDescription: r.shortDescription,
    requestedProcedure: r.requestedProcedure || "",
    patientId: r.patientId || "",
    patientReference: r.patientReference || r.patientId || "",
    patientSnapshot: r.patientSnapshot,
    status: r.status,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

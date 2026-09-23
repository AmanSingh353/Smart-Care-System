/** Inter-hospital CareGuard assistance request — minimal patient reference only. */

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
  /** Opaque patient reference only — no PHI beyond an internal ID/code. */
  patientReference: string;
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
    patientReference: r.patientReference,
    status: r.status,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

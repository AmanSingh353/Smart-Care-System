import {
  ASSISTANCE_TRANSITIONS,
  normalizeAssistancePriority,
  normalizeAssistanceStatus,
  toPublicAssistanceRequest,
  type AssistanceStatus,
} from "../models/AssistanceRequest";
import { normalizeHospitalStatus, toPublicHospital } from "../models/Hospital";
import {
  createAssistanceRequest,
  findAssistanceById,
  listAssistanceRequests,
  listByRequestingHospital,
  listByTargetHospital,
  updateAssistanceStatus,
} from "./assistanceRequestStore";
import {
  createHospital,
  findHospitalByHospitalId,
  findHospitalById,
  getLocalHospital,
  listHospitals,
  updateHospital,
} from "./hospitalStore";
import { buildEmergencySnapshot } from "../models/Patient";
import { findPatientByPatientId, toPublicPatient } from "./patientStore";
import {
  activateAccessGrant,
  closeAccessGrantByRequestId,
  findActiveGrantForTarget,
  findGrantByRequestId,
  toPublicAccessGrant,
} from "./patientAccessGrantStore";

export class NetworkError extends Error {
  status: number;
  code: string;
  constructor(message: string, status = 400, code = "NETWORK_ERROR") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function parseList(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String).map(s => s.trim()).filter(Boolean);
  if (typeof raw === "string") {
    return raw
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);
  }
  return [];
}

export async function getNetworkSummary(actorHospitalId?: string | null) {
  const hospitals = await listHospitals();
  const requests = await listAssistanceRequests();
  const myHospital = actorHospitalId
    ? hospitals.find(h => h.hospitalId === actorHospitalId) || null
    : await getLocalHospital();
  const connected = hospitals.filter(h => !actorHospitalId || h.hospitalId !== actorHospitalId);

  const activeStatuses: AssistanceStatus[] = ["PENDING", "ACCEPTED", "IN_PROGRESS"];
  const scoped = actorHospitalId
    ? requests.filter(
        r => r.requestingHospitalId === actorHospitalId || r.targetHospitalId === actorHospitalId
      )
    : requests;
  const active = scoped.filter(r => activeStatuses.includes(r.status));
  const pending = scoped.filter(r => r.status === "PENDING");
  const accepted = scoped.filter(r => r.status === "ACCEPTED");
  const inProgress = scoped.filter(r => r.status === "IN_PROGRESS");
  const resolved = scoped.filter(r => r.status === "RESOLVED");

  const outgoing = actorHospitalId
    ? requests.filter(r => r.requestingHospitalId === actorHospitalId)
    : [];
  const incoming = actorHospitalId
    ? requests.filter(r => r.targetHospitalId === actorHospitalId)
    : [];

  return {
    localHospital: myHospital ? toPublicHospital(myHospital) : null,
    connectedHospitalCount: connected.length,
    hospitalsOnline: connected.filter(h => h.status === "ONLINE").length,
    activeEmergencyRequests: active.length,
    pendingAssistanceRequests: pending.length,
    acceptedRequests: accepted.length,
    inProgressRequests: inProgress.length,
    resolvedRequests: resolved.length,
    outgoingActive: outgoing.filter(r => activeStatuses.includes(r.status)).length,
    incomingPending: incoming.filter(r => r.status === "PENDING").length,
  };
}

export async function listConnectedHospitals(query: {
  search?: string;
  specialty?: string;
  status?: string;
  includeLocal?: boolean;
  excludeHospitalId?: string | null;
}) {
  let hospitals = await listHospitals();
  if (query.excludeHospitalId) {
    hospitals = hospitals.filter(h => h.hospitalId !== query.excludeHospitalId);
  } else if (!query.includeLocal) {
    hospitals = hospitals.filter(h => !h.isLocal);
  }

  const search = (query.search || "").trim().toLowerCase();
  if (search) {
    hospitals = hospitals.filter(
      h =>
        h.hospitalName.toLowerCase().includes(search) ||
        h.city.toLowerCase().includes(search) ||
        h.state.toLowerCase().includes(search) ||
        h.hospitalId.toLowerCase().includes(search) ||
        h.departments.some(d => d.toLowerCase().includes(search))
    );
  }

  const specialty = (query.specialty || "").trim().toLowerCase();
  if (specialty) {
    hospitals = hospitals.filter(h =>
      h.departments.some(d => d.toLowerCase().includes(specialty))
    );
  }

  if (query.status) {
    const status = normalizeHospitalStatus(query.status);
    if (!status) throw new NetworkError("Invalid hospital status filter", 400, "INVALID_STATUS");
    hospitals = hospitals.filter(h => h.status === status);
  }

  return hospitals.map(toPublicHospital);
}

export async function getHospitalPublic(idOrHospitalId: string) {
  const byId = await findHospitalById(idOrHospitalId);
  const hospital = byId || (await findHospitalByHospitalId(idOrHospitalId));
  if (!hospital) throw new NetworkError("Hospital not found", 404, "HOSPITAL_NOT_FOUND");
  return toPublicHospital(hospital);
}

export async function registerConnectedHospital(input: Record<string, unknown>) {
  const hospitalId = String(input.hospitalId || "").trim();
  const hospitalName = String(input.hospitalName || "").trim();
  if (!hospitalId || !hospitalName) {
    throw new NetworkError("hospitalId and hospitalName are required", 400, "VALIDATION");
  }

  const local = await getLocalHospital();
  if (local && local.hospitalId === hospitalId) {
    throw new NetworkError("Cannot register the local hospital as a partner", 400, "INVALID_HOSPITAL");
  }

  const statusRaw = String(input.status || "ONLINE");
  const status = normalizeHospitalStatus(statusRaw);
  if (!status) throw new NetworkError("Invalid status. Use ONLINE, BUSY, or OFFLINE.", 400, "INVALID_STATUS");

  try {
    const hospital = await createHospital({
      hospitalId,
      hospitalName,
      registrationId: String(input.registrationId || "").trim(),
      address: String(input.address || "").trim(),
      city: String(input.city || "").trim(),
      state: String(input.state || "").trim(),
      contactPhone: String(input.contactPhone || "").trim(),
      contactEmail: String(input.contactEmail || "").trim(),
      departments: parseList(input.departments),
      facilities: parseList(input.facilities),
      emergencySupport: input.emergencySupport !== false && input.emergencySupport !== "false",
      status,
      isLocal: false,
    });
    return toPublicHospital(hospital);
  } catch (err: unknown) {
    const statusCode = (err as { status?: number }).status || 500;
    const code = (err as { code?: string }).code || "CREATE_FAILED";
    throw new NetworkError(err instanceof Error ? err.message : "Failed to register hospital", statusCode, code);
  }
}

export async function patchHospital(
  id: string,
  input: Record<string, unknown>,
  actor?: { hospitalId?: string | null; isPlatformAdmin?: boolean }
) {
  const existing = await findHospitalById(id);
  if (!existing) throw new NetworkError("Hospital not found", 404, "HOSPITAL_NOT_FOUND");

  if (actor && !actor.isPlatformAdmin) {
    if (!actor.hospitalId || existing.hospitalId !== actor.hospitalId) {
      throw new NetworkError("You can only update your own hospital", 403, "FORBIDDEN");
    }
  }

  const patch: Parameters<typeof updateHospital>[1] = {};
  if (input.hospitalName !== undefined) patch.hospitalName = String(input.hospitalName).trim();
  if (input.registrationId !== undefined) patch.registrationId = String(input.registrationId).trim();
  if (input.address !== undefined) patch.address = String(input.address).trim();
  if (input.city !== undefined) patch.city = String(input.city).trim();
  if (input.state !== undefined) patch.state = String(input.state).trim();
  if (input.contactPhone !== undefined) patch.contactPhone = String(input.contactPhone).trim();
  if (input.contactEmail !== undefined) patch.contactEmail = String(input.contactEmail).trim().toLowerCase();
  if (input.departments !== undefined) patch.departments = parseList(input.departments);
  if (input.facilities !== undefined) patch.facilities = parseList(input.facilities);
  if (input.emergencySupport !== undefined) {
    patch.emergencySupport = Boolean(input.emergencySupport);
  }
  if (input.status !== undefined) {
    const status = normalizeHospitalStatus(String(input.status));
    if (!status) throw new NetworkError("Invalid status. Use ONLINE, BUSY, or OFFLINE.", 400, "INVALID_STATUS");
    patch.status = status;
  }

  const updated = await updateHospital(id, patch);
  if (!updated) throw new NetworkError("Hospital not found", 404, "HOSPITAL_NOT_FOUND");
  return toPublicHospital(updated);
}

export async function createAssistance(
  input: Record<string, unknown>,
  staff: {
    staffId: string;
    fullName: string;
    hospitalId: string;
  }
) {
  const requestingHospitalId = staff.hospitalId?.trim();
  if (!requestingHospitalId) {
    throw new NetworkError(
      "Your account is not assigned to a hospital.",
      403,
      "HOSPITAL_UNASSIGNED"
    );
  }

  const requestingHospital = await findHospitalByHospitalId(requestingHospitalId);
  if (!requestingHospital) {
    throw new NetworkError("Your hospital record was not found", 404, "HOSPITAL_NOT_FOUND");
  }

  const targetHospitalId = String(input.targetHospitalId || "").trim();
  if (!targetHospitalId) {
    throw new NetworkError("targetHospitalId is required", 400, "VALIDATION");
  }
  if (targetHospitalId === requestingHospitalId) {
    throw new NetworkError("Cannot send an assistance request to your own hospital", 400, "INVALID_TARGET");
  }

  const target = await findHospitalByHospitalId(targetHospitalId);
  if (!target) throw new NetworkError("Target hospital not found", 404, "HOSPITAL_NOT_FOUND");
  if (target.status === "OFFLINE") {
    throw new NetworkError("Target hospital is currently OFFLINE", 409, "HOSPITAL_OFFLINE");
  }

  const priority = normalizeAssistancePriority(String(input.priority || "NORMAL"));
  if (!priority) {
    throw new NetworkError("Invalid priority. Use CRITICAL, HIGH, or NORMAL.", 400, "INVALID_PRIORITY");
  }

  const emergencyType = String(input.emergencyType || "").trim();
  const requiredDepartment = String(input.requiredDepartment || "").trim();
  if (!emergencyType || !requiredDepartment) {
    throw new NetworkError("emergencyType and requiredDepartment are required", 400, "VALIDATION");
  }

  // Guard double-submit: same hospital→target→emergency within 60s while still PENDING
  const outgoing = await listByRequestingHospital(requestingHospitalId);
  const duplicate = outgoing.find(r => {
    if (r.status !== "PENDING") return false;
    if (r.targetHospitalId !== targetHospitalId) return false;
    if (r.emergencyType !== emergencyType) return false;
    if (r.requiredDepartment !== requiredDepartment) return false;
    const age = Date.now() - new Date(r.createdAt).getTime();
    return age >= 0 && age < 60_000;
  });
  if (duplicate) {
    throw new NetworkError(
      "A matching assistance request was just submitted. Wait a moment or open Incoming Requests.",
      409,
      "DUPLICATE_REQUEST"
    );
  }

  const patientIdRaw = String(input.patientId || input.patientReference || "").trim();
  if (!patientIdRaw) {
    throw new NetworkError("patientId is required", 400, "VALIDATION");
  }

  const patient = await findPatientByPatientId(patientIdRaw);
  if (!patient) {
    throw new NetworkError("Patient not found", 404, "PATIENT_NOT_FOUND");
  }
  // Requesting hospital may only attach patients from their own hospital context
  if (patient.homeHospitalId !== requestingHospitalId) {
    throw new NetworkError(
      "You can only create assistance requests for patients registered at your hospital",
      403,
      "PATIENT_HOSPITAL_MISMATCH"
    );
  }

  const snapshot = buildEmergencySnapshot(patient);
  const requestedProcedure = String(input.requestedProcedure || "").trim();

  const request = await createAssistanceRequest({
    requestingHospitalId,
    targetHospitalId,
    requestingStaffId: staff.staffId,
    requestingStaffName: staff.fullName,
    priority,
    emergencyType,
    requiredDepartment,
    requiredFacilities: parseList(input.requiredFacilities),
    shortDescription: String(input.shortDescription || ""),
    requestedProcedure,
    patientId: patient.patientId,
    patientReference: patient.patientId,
    patientSnapshot: snapshot,
  });

  return toPublicAssistanceRequest(request);
}

export async function listAssistance(query: {
  scope?: string;
  status?: string;
  isPlatformAdmin?: boolean;
  actorHospitalId?: string | null;
}) {
  const actorHospitalId = query.actorHospitalId || "";
  const scope = (query.scope || "all").toLowerCase();

  let rows;
  if (scope === "incoming") {
    // Platform admins can oversee network-wide incoming (hackathon single-login demo).
    // Ordinary staff only see requests targeted at their own hospital.
    if (query.isPlatformAdmin) {
      rows = await listAssistanceRequests();
    } else {
      if (!actorHospitalId) return [];
      rows = await listByTargetHospital(actorHospitalId);
    }
  } else if (scope === "outgoing") {
    if (!actorHospitalId) return [];
    rows = await listByRequestingHospital(actorHospitalId);
  } else if (scope === "network" && query.isPlatformAdmin) {
    rows = await listAssistanceRequests();
  } else {
    if (!actorHospitalId) return [];
    const [out, inn] = await Promise.all([
      listByRequestingHospital(actorHospitalId),
      listByTargetHospital(actorHospitalId),
    ]);
    const map = new Map(out.concat(inn).map(r => [r.id, r]));
    rows = [...map.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  if (query.status) {
    const status = normalizeAssistanceStatus(query.status);
    if (!status) throw new NetworkError("Invalid request status filter", 400, "INVALID_STATUS");
    rows = rows.filter(r => r.status === status);
  }

  return rows.map(toPublicAssistanceRequest);
}

export async function getAssistancePublic(id: string, actor: {
  hospitalId?: string | null;
  isPlatformAdmin?: boolean;
}) {
  const row = await findAssistanceById(id);
  if (!row) throw new NetworkError("Assistance request not found", 404, "REQUEST_NOT_FOUND");
  if (
    !actor.isPlatformAdmin &&
    actor.hospitalId &&
    row.requestingHospitalId !== actor.hospitalId &&
    row.targetHospitalId !== actor.hospitalId
  ) {
    throw new NetworkError("Not authorized to view this request", 403, "FORBIDDEN");
  }
  return toPublicAssistanceRequest(row);
}

export async function changeAssistanceStatus(
  id: string,
  nextStatusRaw: string,
  actor: { role: string; staffId: string; hospitalId?: string | null; isPlatformAdmin?: boolean }
) {
  const row = await findAssistanceById(id);
  if (!row) throw new NetworkError("Assistance request not found", 404, "REQUEST_NOT_FOUND");

  const nextStatus = normalizeAssistanceStatus(nextStatusRaw);
  if (!nextStatus) {
    throw new NetworkError("Invalid status", 400, "INVALID_STATUS");
  }

  const allowed = ASSISTANCE_TRANSITIONS[row.status] || [];
  if (!allowed.includes(nextStatus)) {
    throw new NetworkError(
      `Cannot change status from ${row.status} to ${nextStatus}`,
      409,
      "INVALID_TRANSITION"
    );
  }

  const actorHospitalId = actor.hospitalId || "";
  const isPlatform = Boolean(actor.isPlatformAdmin);
  const isReceiver = Boolean(actorHospitalId && row.targetHospitalId === actorHospitalId);
  const isRequester = Boolean(actorHospitalId && row.requestingHospitalId === actorHospitalId);

  if (nextStatus === "CANCELLED") {
    if (!isPlatform && !isRequester) {
      throw new NetworkError("Only the requesting hospital can cancel this request", 403, "FORBIDDEN");
    }
  } else if (
    nextStatus === "REJECTED" ||
    nextStatus === "ACCEPTED" ||
    nextStatus === "IN_PROGRESS" ||
    nextStatus === "RESOLVED"
  ) {
    if (!isPlatform && !isReceiver) {
      throw new NetworkError("Only the receiving hospital can update this status", 403, "FORBIDDEN");
    }
    if (!isPlatform && !["doctor", "nurse", "admin"].includes(actor.role)) {
      throw new NetworkError("Your role cannot modify assistance requests", 403, "FORBIDDEN");
    }
  }

  const updated = await updateAssistanceStatus(id, nextStatus);
  if (!updated) throw new NetworkError("Assistance request not found", 404, "REQUEST_NOT_FOUND");

  // Access grant lifecycle (Level 2 expanded record)
  if (updated.patientId) {
    if (nextStatus === "ACCEPTED") {
      await activateAccessGrant({
        requestId: updated.requestId,
        assistanceId: updated.id,
        patientId: updated.patientId,
        requestingHospitalId: updated.requestingHospitalId,
        targetHospitalId: updated.targetHospitalId,
      });
    } else if (nextStatus === "RESOLVED" || nextStatus === "CANCELLED" || nextStatus === "REJECTED") {
      await closeAccessGrantByRequestId(
        updated.requestId,
        nextStatus === "RESOLVED" ? "CLOSED" : "REVOKED"
      );
    }
  }

  return toPublicAssistanceRequest(updated);
}

/** Level 1 — emergency handover summary (visible to requester + target once request exists). */
export async function getAssistancePatientSummary(
  id: string,
  actor: { hospitalId?: string | null; isPlatformAdmin?: boolean }
) {
  const row = await findAssistanceById(id);
  if (!row) throw new NetworkError("Assistance request not found", 404, "REQUEST_NOT_FOUND");
  if (
    !actor.isPlatformAdmin &&
    actor.hospitalId &&
    row.requestingHospitalId !== actor.hospitalId &&
    row.targetHospitalId !== actor.hospitalId
  ) {
    throw new NetworkError("Not authorized to view this request", 403, "FORBIDDEN");
  }

  const grant = row.patientId ? await findGrantByRequestId(row.requestId) : null;
  return {
    request: toPublicAssistanceRequest(row),
    emergencySummary: row.patientSnapshot,
    accessStatus: grant?.status || (row.status === "PENDING" ? "NONE" : "NONE"),
  };
}

/** Level 2 — expanded patient record (target hospital only, after ACTIVE grant). */
export async function getAssistancePatientRecord(
  id: string,
  actor: { hospitalId?: string | null; isPlatformAdmin?: boolean }
) {
  const row = await findAssistanceById(id);
  if (!row) throw new NetworkError("Assistance request not found", 404, "REQUEST_NOT_FOUND");
  if (!row.patientId) {
    throw new NetworkError("This request has no linked patient ID", 404, "PATIENT_NOT_LINKED");
  }

  const actorHospitalId = actor.hospitalId || "";
  const isTarget = Boolean(actorHospitalId && row.targetHospitalId === actorHospitalId);
  const isPlatform = Boolean(actor.isPlatformAdmin);

  if (!isPlatform && !isTarget) {
    throw new NetworkError(
      "Only the receiving hospital can open the expanded patient record",
      403,
      "FORBIDDEN"
    );
  }

  const grant = await findActiveGrantForTarget({
    requestId: row.requestId,
    targetHospitalId: row.targetHospitalId,
    patientId: row.patientId,
  });

  if (!grant && !isPlatform) {
    throw new NetworkError(
      "Expanded patient record is not available until the assistance request is accepted",
      403,
      "ACCESS_NOT_GRANTED"
    );
  }

  const patient = await findPatientByPatientId(row.patientId);
  if (!patient) {
    throw new NetworkError("Patient not found", 404, "PATIENT_NOT_FOUND");
  }

  const access = grant || (await findGrantByRequestId(row.requestId));

  return {
    requestId: row.requestId,
    assistanceId: row.id,
    accessStatus: access?.status || "CLOSED",
    sharedUnder: `Shared under CareGuard Assistance Request ${row.requestId}`,
    grant: access ? toPublicAccessGrant(access) : null,
    patient: toPublicPatient(patient),
    emergencySummary: row.patientSnapshot,
  };
}

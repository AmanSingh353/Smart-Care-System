import { careGuardEngine } from "../engine/CareGuardEngine";
import type { CareGuardPatientSnapshot, CareGuardWorkflowEvent } from "../types";
import { recordCareGuardAudit } from "./auditService";
import { getIO } from "../../sockets";

function emitSocket(event: "careguard:signal-created" | "careguard:signal-updated", signal: unknown) {
  const io = getIO();
  if (!io) return;
  io.emit(event, signal);
  const s = signal as { patientId?: string; responsibleRole?: string };
  if (s.patientId) io.to(`patient:${s.patientId}`).emit(event, signal);
  if (s.responsibleRole) io.to(`role:${s.responsibleRole.toLowerCase()}`).emit(event, signal);
  io.to("role:admin").emit(event, signal);
}

let wired = false;

/** Wire engine listeners once — emits Socket.io + audit on create. */
export function ensureCareGuardWired() {
  if (wired) return;
  wired = true;
  careGuardEngine.onSignal((kind, signal) => {
    if (kind === "created") {
      recordCareGuardAudit("SIGNAL_CREATED", signal.id, signal.patientId, "CareGuardEngine", "create");
      emitSocket("careguard:signal-created", signal);
    } else {
      emitSocket("careguard:signal-updated", signal);
    }
  });
}

export function evaluatePatientCareGuard(
  patient: CareGuardPatientSnapshot,
  event: CareGuardWorkflowEvent = "PATIENT_STATE_CHANGED"
) {
  ensureCareGuardWired();
  return careGuardEngine.handleEvent(event, patient);
}

export function evaluateAllPatients(patients: CareGuardPatientSnapshot[]) {
  ensureCareGuardWired();
  return careGuardEngine.evaluateMany(patients);
}

export function getPatientSignals(patientId: string) {
  return careGuardEngine.getForPatient(patientId);
}

export function getRoleSignals(role: string) {
  return careGuardEngine.getForRole(role);
}

export function getCareGuardSummary() {
  return careGuardEngine.summary();
}

export function acknowledgeSignal(signalId: string, actor: string) {
  const s = careGuardEngine.acknowledge(signalId, actor);
  if (s) recordCareGuardAudit("SIGNAL_ACKNOWLEDGED", s.id, s.patientId, actor, "acknowledge");
  return s;
}

export function resolveSignal(signalId: string, actor: string) {
  const s = careGuardEngine.resolve(signalId, actor);
  if (s) recordCareGuardAudit("SIGNAL_RESOLVED", s.id, s.patientId, actor, "resolve");
  return s;
}

export function dismissSignal(signalId: string, actor: string) {
  const s = careGuardEngine.dismiss(signalId, actor);
  if (s) recordCareGuardAudit("SIGNAL_DISMISSED", s.id, s.patientId, actor, "dismiss");
  return s;
}

export { careGuardEngine };

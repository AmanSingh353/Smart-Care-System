import type { CareGuardAuditEntry } from "../types";

const auditLog: CareGuardAuditEntry[] = [];
let auditSeq = 1;

export function recordCareGuardAudit(
  event: CareGuardAuditEntry["event"],
  signalId: string,
  patientId: string,
  actor: string,
  action: string
): CareGuardAuditEntry {
  const entry: CareGuardAuditEntry = {
    id: `CGA-${auditSeq++}`,
    event,
    signalId,
    patientId,
    actor,
    timestamp: new Date().toISOString(),
    action,
  };
  auditLog.push(entry);
  if (auditLog.length > 2000) auditLog.shift();
  console.log(`[careguard:audit] ${event} signal=${signalId} patient=${patientId} actor=${actor}`);
  return entry;
}

export function getCareGuardAuditLog() {
  return [...auditLog];
}

export function resetCareGuardAudit() {
  auditLog.length = 0;
  auditSeq = 1;
}

import type { CareGuardAuditEntry } from "./types";

const STORAGE_KEY = "scs30-careguard-audit";
let auditLog: CareGuardAuditEntry[] = [];
let auditSeq = 1;

try {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    auditLog = JSON.parse(raw) as CareGuardAuditEntry[];
    auditSeq = auditLog.length + 1;
  }
} catch {
  /* ignore */
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(auditLog.slice(-500)));
  } catch {
    /* ignore */
  }
}

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
  persist();
  return entry;
}

export function getCareGuardAuditLog() {
  return [...auditLog];
}

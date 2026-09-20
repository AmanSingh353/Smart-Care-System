import {
  DEMO_STORAGE_VERSION,
  DEMO_VERSION_KEY,
  PATIENT_STORAGE_KEY,
  CAREGUARD_SIGNAL_STORAGE_KEY,
  CAREGUARD_AUDIT_STORAGE_KEY,
  isDemoMode,
} from "@/config/demo";
import { initialPatients, resetPatientIdCounter, type Patient } from "@/data/mockData";

/** Ensure demo seed version — clears stale Phase-era local state once. */
export function ensureDemoSeedVersion(): boolean {
  if (!isDemoMode()) return false;
  try {
    const current = localStorage.getItem(DEMO_VERSION_KEY);
    if (current === DEMO_STORAGE_VERSION) return false;
    localStorage.removeItem(PATIENT_STORAGE_KEY);
    localStorage.removeItem(CAREGUARD_SIGNAL_STORAGE_KEY);
    localStorage.removeItem(CAREGUARD_AUDIT_STORAGE_KEY);
    localStorage.setItem(DEMO_VERSION_KEY, DEMO_STORAGE_VERSION);
    return true;
  } catch {
    return false;
  }
}

/** Full demo reset — demo-local storage only (never a production database). */
export function resetAllDemoLocalState(): Patient[] {
  resetPatientIdCounter(1008);
  try {
    localStorage.removeItem(PATIENT_STORAGE_KEY);
    localStorage.removeItem(CAREGUARD_SIGNAL_STORAGE_KEY);
    localStorage.removeItem(CAREGUARD_AUDIT_STORAGE_KEY);
    localStorage.setItem(DEMO_VERSION_KEY, DEMO_STORAGE_VERSION);
  } catch {
    /* ignore */
  }
  return structuredClone(initialPatients);
}

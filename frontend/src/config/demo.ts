/**
 * Demo Mode — deterministic fictional data for NexaHack judge presentation.
 * No real PII. Reset restores this seed — never touches a production DB.
 */
export const DEMO_MODE = true;
export const DEMO_STORAGE_VERSION = "phase5-v1";

/** Suggested identity for the live 5-minute registration → discharge demo */
export const CANONICAL_DEMO_PATIENT = {
  name: "Arjun Verma",
  age: "38",
  gender: "Male",
  phone: "9876501234",
  emergencyContact: "Neha Verma · 9876501235",
  visitType: "OPD",
  allergies: "None known",
  symptoms: "Persistent cough and mild fever for 3 days",
  notes: "Canonical judge-flow patient — register at Reception to start the live demo.",
} as const;

/** Supporting CareGuard / dashboard scenarios (seed IDs) */
export const DEMO_SCENARIO_IDS = {
  quiet: "SCS-1001",
  labReview: "SCS-1002",
  pharmacyPending: "SCS-1003",
  overdueTask: "SCS-1004",
  allergyReview: "SCS-1005",
  criticalLab: "SCS-1006",
  dischargeBlocked: "SCS-1007",
} as const;

export const PATIENT_STORAGE_KEY = "scs30-patients";
export const CAREGUARD_SIGNAL_STORAGE_KEY = "scs30-careguard-signals";
export const CAREGUARD_AUDIT_STORAGE_KEY = "scs30-careguard-audit";
export const AUTH_STORAGE_KEY = "scs30-auth";
export const DEMO_VERSION_KEY = "scs30-demo-version";
export const PATIENTS_BROADCAST = "scs30-patients-sync";

export function isDemoMode() {
  return DEMO_MODE || import.meta.env.VITE_DEMO_MODE !== "false";
}

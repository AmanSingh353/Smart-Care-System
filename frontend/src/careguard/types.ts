/** CareGuard config — DEMO MODE uses short thresholds for reliable demos. */
export const careGuardConfig = {
  demoMode: true,
  labOrderDelayMinutes: Number(import.meta.env.VITE_CAREGUARD_LAB_DELAY_MINUTES) || 15,
  treatmentOverdueGraceMinutes: Number(import.meta.env.VITE_CAREGUARD_TREATMENT_GRACE_MINUTES) || 0,
};

export type CareGuardRole =
  | "DOCTOR"
  | "NURSE"
  | "LAB"
  | "PHARMACY"
  | "BILLING"
  | "ADMIN"
  | "RECEPTION";

export type CareGuardSeverity = "INFO" | "ATTENTION" | "HIGH" | "CRITICAL";
export type CareGuardSignalStatus = "OPEN" | "ACKNOWLEDGED" | "RESOLVED" | "DISMISSED";

export type CareGuardSignalType =
  | "LAB_REVIEW_PENDING"
  | "CRITICAL_RESULT_REVIEW"
  | "LAB_ORDER_DELAY"
  | "MEDICATION_DISPENSING_PENDING"
  | "TREATMENT_TASK_OVERDUE"
  | "DISCHARGE_WORKFLOW_BLOCKED"
  | "ALLERGY_PRESCRIPTION_REVIEW";

export interface CareGuardSignal {
  id: string;
  patientId: string;
  patientName?: string;
  type: CareGuardSignalType;
  severity: CareGuardSeverity;
  title: string;
  description: string;
  why: string;
  source: string;
  sourceEntityId: string;
  responsibleRole: CareGuardRole;
  actionLabel: string;
  actionRoute: string;
  status: CareGuardSignalStatus;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

export type CareGuardWorkflowEvent =
  | "PATIENT_REGISTERED"
  | "PATIENT_ADMITTED"
  | "DOCTOR_CONSULTATION_UPDATED"
  | "LAB_ORDER_CREATED"
  | "LAB_RESULT_COMPLETED"
  | "LAB_RESULT_MARKED_CRITICAL"
  | "LAB_RESULT_REVIEWED"
  | "PRESCRIPTION_CREATED"
  | "MEDICATION_DISPENSED"
  | "TREATMENT_TASK_CREATED"
  | "TREATMENT_TASK_COMPLETED"
  | "BILL_UPDATED"
  | "DISCHARGE_STATUS_CHANGED"
  | "PATIENT_STATE_CHANGED";

export interface CareGuardAuditEntry {
  id: string;
  event: "SIGNAL_CREATED" | "SIGNAL_ACKNOWLEDGED" | "SIGNAL_RESOLVED" | "SIGNAL_DISMISSED";
  signalId: string;
  patientId: string;
  actor: string;
  timestamp: string;
  action: string;
}

export const ROLE_SIGNAL_TYPES: Record<string, CareGuardSignalType[]> = {
  doctor: ["LAB_REVIEW_PENDING", "CRITICAL_RESULT_REVIEW", "ALLERGY_PRESCRIPTION_REVIEW"],
  nurse: ["TREATMENT_TASK_OVERDUE", "MEDICATION_DISPENSING_PENDING"],
  lab: ["LAB_ORDER_DELAY"],
  pharmacy: ["MEDICATION_DISPENSING_PENDING"],
  billing: ["DISCHARGE_WORKFLOW_BLOCKED"],
  admin: [
    "LAB_REVIEW_PENDING",
    "CRITICAL_RESULT_REVIEW",
    "LAB_ORDER_DELAY",
    "MEDICATION_DISPENSING_PENDING",
    "TREATMENT_TASK_OVERDUE",
    "DISCHARGE_WORKFLOW_BLOCKED",
    "ALLERGY_PRESCRIPTION_REVIEW",
  ],
  reception: ["DISCHARGE_WORKFLOW_BLOCKED"],
};

/** CareGuard configuration — thresholds are centralized here (DEMO MODE uses short delays). */
export const careGuardConfig = {
  demoMode: true,
  /** Minutes a lab order may remain Pending/In Progress before LAB_ORDER_DELAY */
  labOrderDelayMinutes: Number(process.env.CAREGUARD_LAB_DELAY_MINUTES) || 15,
  /** Minutes past scheduled due time before TREATMENT_TASK_OVERDUE */
  treatmentOverdueGraceMinutes: Number(process.env.CAREGUARD_TREATMENT_GRACE_MINUTES) || 0,
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

/** Minimal patient snapshot CareGuard rules need — mirrors frontend patient shape. */
export interface CareGuardPatientSnapshot {
  id: string;
  name: string;
  allergies: string;
  treatmentStatus: string;
  billStatus: string;
  medicines: Array<{
    id: string;
    name: string;
    dispensed: boolean;
    schedule: Array<{
      time: string;
      given: boolean;
      givenAt?: string;
      dueAt?: string;
    }>;
  }>;
  tests: Array<{
    id: string;
    name: string;
    status: string;
    result?: string;
    requestedAt: string;
    requestedAtIso?: string;
    completedAt?: string;
    isCritical?: boolean;
    reviewedAt?: string;
    reviewedBy?: string;
  }>;
  billItems: Array<{ id: string }>;
}

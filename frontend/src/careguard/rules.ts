import type { Patient } from "@/data/mockData";
import { careGuardConfig } from "./types";
import type {
  CareGuardRole,
  CareGuardSeverity,
  CareGuardSignal,
  CareGuardSignalType,
} from "./types";

export interface RuleCandidate {
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
  metadata?: Record<string, unknown>;
}

export interface CareGuardRule {
  id: string;
  evaluate(patient: Patient, now: Date): RuleCandidate[];
}

function hoursMinutesToDate(base: Date, hm: string): Date | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hm.trim());
  if (!m) return null;
  const d = new Date(base);
  d.setHours(Number(m[1]), Number(m[2]), 0, 0);
  return d;
}

function parseRequestedAt(test: Patient["tests"][0], now: Date): Date {
  if (test.requestedAtIso) {
    const d = new Date(test.requestedAtIso);
    if (!Number.isNaN(d.getTime())) return d;
  }
  const fromHm = hoursMinutesToDate(now, test.requestedAt);
  if (fromHm) {
    if (fromHm.getTime() > now.getTime()) fromHm.setDate(fromHm.getDate() - 1);
    return fromHm;
  }
  return now;
}

function allergyTokens(allergies: string): string[] {
  if (!allergies || /^none\b/i.test(allergies.trim())) return [];
  return allergies
    .split(/[,;/|]+/)
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)
    .filter(s => s !== "none known" && s !== "n/a");
}

function medMatchesAllergy(medName: string, allergy: string): boolean {
  const m = medName.toLowerCase();
  const a = allergy.toLowerCase();
  return m.includes(a) || a.includes(m);
}

export const labReviewPendingRule: CareGuardRule = {
  id: "LAB_REVIEW_PENDING",
  evaluate(patient) {
    return patient.tests
      .filter(t => t.status === "Completed" && !t.reviewedAt && !t.isCritical)
      .map(t => ({
        type: "LAB_REVIEW_PENDING" as const,
        severity: "ATTENTION" as const,
        title: "Lab result awaiting review",
        description: `Completed laboratory result for ${t.name} has not yet been reviewed by the assigned doctor.`,
        why: "Lab result was completed and has not been reviewed.",
        source: `Lab Result #${t.id}`,
        sourceEntityId: t.id,
        responsibleRole: "DOCTOR" as const,
        actionLabel: "Review result",
        actionRoute: `/doctor?patient=${patient.id}&tab=tests&focus=${t.id}`,
        metadata: { testName: t.name, result: t.result },
      }));
  },
};

export const criticalResultReviewRule: CareGuardRule = {
  id: "CRITICAL_RESULT_REVIEW",
  evaluate(patient) {
    return patient.tests
      .filter(t => t.status === "Completed" && t.isCritical === true && !t.reviewedAt)
      .map(t => ({
        type: "CRITICAL_RESULT_REVIEW" as const,
        severity: "HIGH" as const,
        title: "Critical result requires review",
        description: `Laboratory workflow marked ${t.name} as critical. A doctor must review this result.`,
        why: "Lab workflow explicitly marked this result as critical and it has not been reviewed.",
        source: `Lab Result #${t.id}`,
        sourceEntityId: t.id,
        responsibleRole: "DOCTOR" as const,
        actionLabel: "Review result",
        actionRoute: `/doctor?patient=${patient.id}&tab=tests&focus=${t.id}`,
        metadata: { testName: t.name, isCritical: true },
      }));
  },
};

export const labOrderDelayRule: CareGuardRule = {
  id: "LAB_ORDER_DELAY",
  evaluate(patient, now) {
    const thresholdMs = careGuardConfig.labOrderDelayMinutes * 60 * 1000;
    return patient.tests
      .filter(t => t.status === "Pending" || t.status === "In Progress")
      .filter(t => now.getTime() - parseRequestedAt(t, now).getTime() >= thresholdMs)
      .map(t => ({
        type: "LAB_ORDER_DELAY" as const,
        severity: "ATTENTION" as const,
        title: "Lab order is delayed",
        description: `${t.name} has remained ${t.status.toLowerCase()} beyond the configured ${careGuardConfig.labOrderDelayMinutes}-minute threshold.`,
        why: `Lab order exceeded the configured delay threshold of ${careGuardConfig.labOrderDelayMinutes} minutes.`,
        source: `Lab Order #${t.id}`,
        sourceEntityId: t.id,
        responsibleRole: "LAB" as const,
        actionLabel: "Open lab task",
        actionRoute: `/lab?patient=${patient.id}&tab=tests&focus=${t.id}`,
        metadata: {
          testName: t.name,
          status: t.status,
          thresholdMinutes: careGuardConfig.labOrderDelayMinutes,
        },
      }));
  },
};

export const medicationDispensingPendingRule: CareGuardRule = {
  id: "MEDICATION_DISPENSING_PENDING",
  evaluate(patient) {
    return patient.medicines
      .filter(m => !m.dispensed)
      .map(m => ({
        type: "MEDICATION_DISPENSING_PENDING" as const,
        severity: "ATTENTION" as const,
        title: "Prescription awaiting dispensing",
        description: `${m.name} has been prescribed and is awaiting pharmacy dispensing.`,
        why: "A prescription exists and has not yet been marked dispensed by pharmacy.",
        source: `Prescription #${m.id}`,
        sourceEntityId: m.id,
        responsibleRole: "PHARMACY" as const,
        actionLabel: "Review prescription",
        actionRoute: `/pharmacy?patient=${patient.id}&tab=medications&focus=${m.id}`,
        metadata: { medicineName: m.name },
      }));
  },
};

export const treatmentTaskOverdueRule: CareGuardRule = {
  id: "TREATMENT_TASK_OVERDUE",
  evaluate(patient, now) {
    const graceMs = careGuardConfig.treatmentOverdueGraceMinutes * 60 * 1000;
    const out: RuleCandidate[] = [];
    for (const med of patient.medicines) {
      for (const slot of med.schedule) {
        if (slot.given) continue;
        let due: Date | null = null;
        if (slot.dueAt) {
          const d = new Date(slot.dueAt);
          if (!Number.isNaN(d.getTime())) due = d;
        }
        if (!due) due = hoursMinutesToDate(now, slot.time);
        if (!due) continue;
        if (due.getTime() + graceMs > now.getTime()) continue;
        out.push({
          type: "TREATMENT_TASK_OVERDUE",
          severity: "HIGH",
          title: "Treatment task requires attention",
          description: `Scheduled dose of ${med.name} at ${slot.time} is overdue and has not been marked complete.`,
          why: "A treatment or medication task passed its due time without completion.",
          source: `Care task ${med.name} @ ${slot.time}`,
          sourceEntityId: `${med.id}:${slot.time}`,
          responsibleRole: "NURSE",
          actionLabel: "Review task",
          actionRoute: `/nurse?patient=${patient.id}&tab=medications&focus=${med.id}`,
          metadata: { medicineId: med.id, medicineName: med.name, scheduleTime: slot.time },
        });
      }
    }
    return out;
  },
};

export const dischargeWorkflowBlockedRule: CareGuardRule = {
  id: "DISCHARGE_WORKFLOW_BLOCKED",
  evaluate(patient) {
    if (patient.treatmentStatus !== "Ready for Discharge") return [];
    if (patient.billStatus === "Paid") return [];
    return [
      {
        type: "DISCHARGE_WORKFLOW_BLOCKED" as const,
        severity: "ATTENTION" as const,
        title: "Discharge workflow is incomplete",
        description: `${patient.name} is ready for discharge but billing requirements are incomplete (${patient.billStatus}).`,
        why: "Patient is ready for discharge while billing/discharge requirements remain incomplete.",
        source: `Patient billing · ${patient.billStatus}`,
        sourceEntityId: `discharge-bill-${patient.id}`,
        responsibleRole: "BILLING" as const,
        actionLabel: "Review billing",
        actionRoute: `/billing?patient=${patient.id}&tab=billing`,
        metadata: { billStatus: patient.billStatus },
      },
    ];
  },
};

export const allergyPrescriptionReviewRule: CareGuardRule = {
  id: "ALLERGY_PRESCRIPTION_REVIEW",
  evaluate(patient) {
    const tokens = allergyTokens(patient.allergies);
    if (tokens.length === 0) return [];
    const out: RuleCandidate[] = [];
    for (const med of patient.medicines) {
      const hit = tokens.find(a => medMatchesAllergy(med.name, a));
      if (!hit) continue;
      out.push({
        type: "ALLERGY_PRESCRIPTION_REVIEW",
        severity: "HIGH",
        title: "Medication requires safety review",
        description:
          "Potential allergy conflict detected. Review patient allergy information and prescription.",
        why: `Recorded allergy list includes “${hit}” which overlaps with prescribed “${med.name}”.`,
        source: `Prescription #${med.id}`,
        sourceEntityId: med.id,
        responsibleRole: "DOCTOR",
        actionLabel: "Review prescription",
        actionRoute: `/doctor?patient=${patient.id}&tab=medications&focus=${med.id}`,
        metadata: { medicineName: med.name, matchedAllergy: hit },
      });
    }
    return out;
  },
};

export const defaultCareGuardRules: CareGuardRule[] = [
  labReviewPendingRule,
  criticalResultReviewRule,
  labOrderDelayRule,
  medicationDispensingPendingRule,
  treatmentTaskOverdueRule,
  dischargeWorkflowBlockedRule,
  allergyPrescriptionReviewRule,
];

export function signalKey(patientId: string, type: string, sourceEntityId: string) {
  return `${patientId}::${type}::${sourceEntityId}`;
}

export function candidateToPartial(
  patient: Patient,
  c: RuleCandidate
): Omit<CareGuardSignal, "id" | "createdAt" | "updatedAt" | "status"> {
  return {
    patientId: patient.id,
    patientName: patient.name,
    type: c.type,
    severity: c.severity,
    title: c.title,
    description: c.description,
    why: c.why,
    source: c.source,
    sourceEntityId: c.sourceEntityId,
    responsibleRole: c.responsibleRole,
    actionLabel: c.actionLabel,
    actionRoute: c.actionRoute,
    metadata: c.metadata,
  };
}

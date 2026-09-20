import { Patient, PatientStatus, roomLabel, getBillTotal } from "@/data/mockData";
import type { StaffRole } from "@/contexts/AuthContext";

export type WorkspaceRole = StaffRole | "family";

export type JourneyStageState = "completed" | "current" | "pending" | "blocked";

export interface JourneyStage {
  id: string;
  label: string;
  state: JourneyStageState;
  detail?: string;
}

export interface ActivityEvent {
  id: string;
  time: string;
  title: string;
  detail?: string;
  source: "registration" | "clinical" | "lab" | "pharmacy" | "nurse" | "billing" | "family" | "system";
}

/** Derive journey stages from live patient state — no invented timestamps. */
export function getJourneyStages(patient: Patient): JourneyStage[] {
  const hasDiagnosis = Boolean(patient.diagnosis?.trim());
  const hasOrders = (patient.medicines?.length ?? 0) > 0 || (patient.tests?.length ?? 0) > 0;
  const tests = patient.tests ?? [];
  const meds = patient.medicines ?? [];
  const hasPendingTest = tests.some(t => t.status === "Pending" || t.status === "In Progress");
  const allTestsDone = tests.length > 0 && tests.every(t => t.status === "Completed");
  const hasPendingMed = meds.some(m => !m.dispensed);
  const allMedsDispensed = meds.length > 0 && meds.every(m => m.dispensed);
  const hasNursing =
    (patient.nurseUpdates?.length ?? 0) > 0 ||
    meds.some(m => m.schedule?.some(s => s.given));
  const isDischarged = patient.treatmentStatus === "Discharged";
  const readyDischarge = patient.treatmentStatus === "Ready for Discharge";
  const admitted =
    Boolean(patient.room) ||
    patient.treatmentStatus !== "Registered";

  const stages: JourneyStage[] = [
    {
      id: "registration",
      label: "Registration",
      state: "completed",
      detail: patient.id,
    },
    {
      id: "admission",
      label: "Admission",
      state: admitted ? "completed" : patient.treatmentStatus === "Registered" ? "current" : "pending",
      detail: admitted ? roomLabel(patient) : undefined,
    },
    {
      id: "consultation",
      label: "Doctor Consultation",
      state: hasDiagnosis
        ? "completed"
        : admitted
          ? "current"
          : "pending",
      detail: hasDiagnosis ? "Diagnosis recorded" : undefined,
    },
    {
      id: "orders",
      label: "Orders",
      state: hasOrders
        ? "completed"
        : hasDiagnosis
          ? "current"
          : "pending",
      detail: hasOrders
        ? `${meds.length} meds · ${tests.length} tests`
        : undefined,
    },
    {
      id: "laboratory",
      label: "Laboratory",
      state: tests.length === 0
        ? "pending"
        : hasPendingTest
          ? "current"
          : allTestsDone
            ? "completed"
            : "pending",
      detail: tests.length
        ? `${tests.filter(t => t.status === "Completed").length}/${tests.length} complete`
        : undefined,
    },
    {
      id: "pharmacy",
      label: "Pharmacy",
      state: meds.length === 0
        ? "pending"
        : hasPendingMed
          ? "current"
          : allMedsDispensed
            ? "completed"
            : "pending",
      detail: meds.length
        ? `${meds.filter(m => m.dispensed).length}/${meds.length} dispensed`
        : undefined,
    },
    {
      id: "nursing",
      label: "Nursing / Treatment",
      state: isDischarged || readyDischarge
        ? "completed"
        : hasNursing || patient.treatmentStatus === "Under Treatment"
          ? hasPendingMed || hasPendingTest
            ? "current"
            : "completed"
          : hasOrders
            ? "current"
            : "pending",
      detail: hasNursing ? `${patient.nurseUpdates.length} updates` : undefined,
    },
    {
      id: "billing",
      label: "Billing",
      state: patient.billStatus === "Paid"
        ? "completed"
        : readyDischarge || isDischarged || (patient.billItems?.length ?? 0) > 0
          ? patient.billStatus === "Unpaid" && (readyDischarge || isDischarged)
            ? "current"
            : (patient.billItems?.length ?? 0) > 0
              ? "completed"
              : "pending"
          : "pending",
      detail: `₹${getBillTotal(patient.billItems ?? []).toLocaleString("en-IN")} · ${patient.billStatus}`,
    },
    {
      id: "discharge",
      label: "Discharge",
      state: isDischarged
        ? "completed"
        : readyDischarge
          ? patient.billStatus === "Unpaid"
            ? "blocked"
            : "current"
          : "pending",
      detail: isDischarged
        ? "Discharged"
        : readyDischarge && patient.billStatus === "Unpaid"
          ? "Awaiting payment"
          : undefined,
    },
  ];

  // Ensure exactly one primary "current" when possible — prefer first non-completed active stage
  const currentIdx = stages.findIndex(s => s.state === "current" || s.state === "blocked");
  if (currentIdx >= 0) {
    stages.forEach((s, i) => {
      if (i !== currentIdx && s.state === "current") s.state = "pending";
    });
  } else if (!isDischarged) {
    // Fallback: mark stage matching treatmentStatus
    const map: Partial<Record<PatientStatus, string>> = {
      Registered: "admission",
      Admitted: "consultation",
      "Under Treatment": "nursing",
      "Awaiting Test": "laboratory",
      "Ready for Discharge": "billing",
    };
    const id = map[patient.treatmentStatus];
    const idx = stages.findIndex(s => s.id === id);
    if (idx >= 0 && stages[idx].state === "pending") stages[idx].state = "current";
  }

  return stages;
}

/** Build activity timeline only from existing patient fields. */
export function buildPatientActivity(patient: Patient): ActivityEvent[] {
  const events: ActivityEvent[] = [];

  events.push({
    id: `reg-${patient.id}`,
    time: new Date(patient.admissionDate).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    title: "Patient registered",
    detail: `${patient.visitType}${patient.room ? ` · ${roomLabel(patient)}` : ""}`,
    source: "registration",
  });

  if (patient.diagnosis?.trim()) {
    events.push({
      id: `dx-${patient.id}`,
      time: "—",
      title: "Diagnosis updated",
      detail: patient.diagnosis.slice(0, 120),
      source: "clinical",
    });
  }

  (patient.tests ?? []).forEach(t => {
    events.push({
      id: `test-req-${t.id}`,
      time: t.requestedAt || "—",
      title: `Test ordered: ${t.name}`,
      detail: `Status: ${t.status}`,
      source: "lab",
    });
    if (t.status === "Completed") {
      events.push({
        id: `test-done-${t.id}`,
        time: t.completedAt || t.requestedAt || "—",
        title: `Test completed: ${t.name}`,
        detail: t.result || "Result recorded",
        source: "lab",
      });
    }
  });

  (patient.medicines ?? []).forEach(m => {
    events.push({
      id: `med-rx-${m.id}`,
      time: "—",
      title: `Prescription: ${m.name}`,
      detail: `${m.dosage} · ${m.frequency}`,
      source: "pharmacy",
    });
    if (m.dispensed) {
      events.push({
        id: `med-disp-${m.id}`,
        time: "—",
        title: `Medication dispensed: ${m.name}`,
        source: "pharmacy",
      });
    }
    (m.schedule ?? [])
      .filter(s => s.given)
      .forEach(s => {
        events.push({
          id: `med-given-${m.id}-${s.time}`,
          time: s.givenAt || s.time,
          title: `Dose given: ${m.name}`,
          detail: `Scheduled ${s.time}`,
          source: "nurse",
        });
      });
  });

  (patient.nurseUpdates ?? []).forEach(u => {
    events.push({
      id: u.id,
      time: u.time,
      title: "Nursing update",
      detail: u.note,
      source: "nurse",
    });
  });

  (patient.notifications ?? []).forEach(n => {
    if (n.type === "billing" || n.message.toLowerCase().includes("bill") || n.message.toLowerCase().includes("payment")) {
      events.push({
        id: n.id,
        time: n.time,
        title: n.message,
        source: "billing",
      });
    }
  });

  if (patient.billStatus === "Paid") {
    events.push({
      id: `paid-${patient.id}`,
      time: "—",
      title: "Payment received",
      detail: `Total ₹${getBillTotal(patient.billItems ?? []).toLocaleString("en-IN")}`,
      source: "billing",
    });
  }

  (patient.requests ?? []).forEach(r => {
    events.push({
      id: r.id,
      time: r.time,
      title: `Family request: ${r.type}`,
      detail: `${r.reason} · ${r.status}`,
      source: "family",
    });
  });

  // Prefer chronological where times exist; keep stable fallback order
  return events.sort((a, b) => {
    if (a.time === "—" && b.time !== "—") return 1;
    if (b.time === "—" && a.time !== "—") return -1;
    return b.time.localeCompare(a.time);
  });
}

export function canEditClinical(role: WorkspaceRole) {
  return role === "doctor" || role === "admin";
}

export function visibleSections(role: WorkspaceRole): string[] {
  if (role === "family") {
    return ["overview", "journey", "clinical", "tests", "medications", "billing", "activity"];
  }
  return ["overview", "journey", "clinical", "tests", "medications", "billing", "activity"];
}

export function familySafeClinical(patient: Patient) {
  return {
    diagnosis: patient.diagnosis || "Awaiting doctor assessment",
    symptoms: patient.symptoms || "—",
    // Hide raw allergy detail intensity for family? Keep allergies — safety for family too
    allergies: patient.allergies || "None known",
  };
}

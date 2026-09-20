import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from "react";
import {
  Patient,
  Medicine,
  LabTest,
  NurseUpdate,
  FamilyRequest,
  BillItem,
  PatientStatus,
  TestStatus,
  PaymentStatus,
  RequestStatus,
  initialPatients,
  generatePatientId,
  normalizePatientId,
  makeNotification,
  makeBillItem,
  getMedicinePrice,
  getTestPrice,
  getConsultationPrice,
  PRICE_CATALOG,
  DOCTORS,
  nowTime,
} from "@/data/mockData";
import { toast } from "sonner";
import {
  PATIENT_STORAGE_KEY,
  PATIENTS_BROADCAST,
} from "@/config/demo";
import { ensureDemoSeedVersion, resetAllDemoLocalState } from "@/config/demoReset";
import { careguardService } from "@/services/careguardService";

function loadPatients(): Patient[] {
  ensureDemoSeedVersion();
  try {
    const raw = localStorage.getItem(PATIENT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Patient[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    /* ignore */
  }
  return structuredClone(initialPatients);
}

function persistPatients(patients: Patient[], broadcast = true) {
  try {
    localStorage.setItem(PATIENT_STORAGE_KEY, JSON.stringify(patients));
  } catch {
    /* ignore */
  }
  if (broadcast && typeof BroadcastChannel !== "undefined") {
    try {
      const ch = new BroadcastChannel(PATIENTS_BROADCAST);
      ch.postMessage({ type: "patients", patients });
      ch.close();
    } catch {
      /* ignore */
    }
  }
}

let syncTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleCareGuardSync(patients: Patient[]) {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    void careguardService.syncPatients(patients);
  }, 400);
}

export interface RegisterPatientInput {
  name: string;
  age: number;
  gender: string;
  phone: string;
  emergencyContact: string;
  visitType: string;
  room: string;
  bed: string;
  assignedDoctor: string;
  department: string;
  allergies?: string;
  symptoms?: string;
}

interface PatientContextType {
  patients: Patient[];

  /** Core */
  addPatient: (data: RegisterPatientInput) => Patient;
  updatePatientFields: (patientId: string, patch: Partial<Patient>) => void;
  getPatientById: (id: string) => Patient | undefined;
  /** @deprecated prefer getPatientById */
  getPatient: (id: string) => Patient | undefined;

  /** Clinical */
  addDiagnosis: (patientId: string, diagnosis: string) => void;
  updateTreatmentStatus: (patientId: string, status: PatientStatus) => void;
  updateSymptoms: (patientId: string, symptoms: string) => void;
  updateAllergies: (patientId: string, allergies: string) => void;

  /** Medicines */
  addMedicine: (patientId: string, med: Omit<Medicine, "id" | "dispensed" | "schedule">) => void;
  updateMedicineStatus: (patientId: string, medicineId: string, dispensed: boolean) => void;
  dispenseMedicine: (patientId: string, medicineId: string) => void;
  markMedicineGiven: (patientId: string, medicineId: string, time: string) => void;

  /** Tests */
  addTest: (patientId: string, testName: string) => void;
  updateTestStatus: (
    patientId: string,
    testId: string,
    status: TestStatus,
    result?: string,
    options?: { isCritical?: boolean }
  ) => void;
  markTestReviewed: (patientId: string, testId: string, reviewer?: string) => void;
  markTestCritical: (patientId: string, testId: string, isCritical?: boolean) => void;

  /** Demo */
  resetDemoData: () => void;

  /** Nursing */
  addNursingUpdate: (patientId: string, note: string, nurseName?: string) => void;
  /** @deprecated prefer addNursingUpdate */
  addNurseUpdate: (patientId: string, note: string, nurseName?: string) => void;

  /** Billing */
  addBillingItem: (
    patientId: string,
    item: { category: BillItem["category"]; description: string; unitPrice: number; quantity?: number }
  ) => void;
  updatePaymentStatus: (patientId: string, status: PaymentStatus) => void;
  /** @deprecated prefer updatePaymentStatus */
  markBillPaid: (patientId: string) => void;
  addOtherCharge: (patientId: string, description: string, amount: number) => void;

  /** Notifications */
  addNotification: (patientId: string, message: string, type?: string) => void;
  markNotificationAsRead: (patientId: string, notificationId: string) => void;
  markAllNotificationsRead: (patientId: string) => void;

  /** Family requests */
  addFamilyRequest: (patientId: string, type: string, reason: string) => void;
  updateFamilyRequestStatus: (patientId: string, requestId: string, status: RequestStatus) => void;
  /** @deprecated prefer updateFamilyRequestStatus */
  resolveFamilyRequest: (patientId: string, requestId: string, status: "Approved" | "Rejected") => void;
}

const PatientContext = createContext<PatientContextType | undefined>(undefined);

const withNotification = (p: Patient, message: string, type?: string): Patient => ({
  ...p,
  notifications: [...p.notifications, makeNotification(message, type)],
});

export const PatientProvider = ({ children }: { children: ReactNode }) => {
  const [patients, setPatients] = useState<Patient[]>(() => loadPatients());

  // Multi-tab sync — same browser, no refresh required for connected demos
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const ch = new BroadcastChannel(PATIENTS_BROADCAST);
    ch.onmessage = (ev: MessageEvent<{ type: string; patients?: Patient[] }>) => {
      if (ev.data?.type === "patients" && Array.isArray(ev.data.patients)) {
        setPatients(ev.data.patients);
      }
    };
    return () => ch.close();
  }, []);

  // Keep backend CareGuard engine in sync when available
  useEffect(() => {
    scheduleCareGuardSync(patients);
  }, [patients]);

  const mutate = useCallback((id: string, updater: (p: Patient) => Patient) => {
    const key = normalizePatientId(id);
    setPatients(prev => {
      const next = prev.map(p => (normalizePatientId(p.id) === key ? updater(p) : p));
      persistPatients(next);
      return next;
    });
  }, []);

  const setAllPatients = useCallback((next: Patient[]) => {
    persistPatients(next);
    setPatients(next);
  }, []);

  const getPatientById = useCallback(
    (id: string) => patients.find(p => normalizePatientId(p.id) === normalizePatientId(id)),
    [patients]
  );

  const addPatient = (data: RegisterPatientInput): Patient => {
    const doctor = DOCTORS.find(d => d.name === data.assignedDoctor) || DOCTORS[0];
    const consultPrice = getConsultationPrice(data.visitType);
    const billItems: BillItem[] = [
      makeBillItem("other", "Registration Fee", PRICE_CATALOG.registration, 1),
      makeBillItem(
        "consultation",
        data.visitType === "Emergency"
          ? "Emergency Consultation"
          : data.visitType === "Follow-up"
            ? "Follow-up Consultation"
            : "Consultation Fee",
        consultPrice,
        1
      ),
    ];
    if (data.room) {
      billItems.push(
        makeBillItem(
          "room",
          `Room ${data.room}${data.bed ? ` Bed ${data.bed}` : ""} (1 day)`,
          PRICE_CATALOG.roomPerDay,
          1
        )
      );
    }

    const newPatient: Patient = {
      id: generatePatientId(),
      name: data.name,
      age: data.age,
      gender: data.gender,
      phone: data.phone,
      emergencyContact: data.emergencyContact,
      visitType: data.visitType,
      admissionDate: new Date().toISOString(),
      room: data.room,
      bed: data.bed,
      assignedDoctor: data.assignedDoctor || doctor.name,
      department: data.department || doctor.department,
      diagnosis: "",
      allergies: data.allergies || "None known",
      symptoms: data.symptoms || "",
      treatmentStatus: data.room ? "Admitted" : "Registered",
      medicines: [],
      tests: [],
      nurseUpdates: [],
      billItems,
      billStatus: "Unpaid",
      notifications: [
        makeNotification("Patient registered successfully", "registration"),
        ...(data.room
          ? [
              makeNotification(
                `Patient admitted to Room ${data.room}${data.bed ? ` Bed ${data.bed}` : ""}`,
                "registration"
              ),
            ]
          : []),
      ],
      requests: [],
    };

    setPatients(prev => {
      const next = [newPatient, ...prev];
      persistPatients(next);
      return next;
    });
    toast.success(`Registered ${newPatient.id}`);
    return newPatient;
  };

  const updatePatientFields = (patientId: string, patch: Partial<Patient>) => {
    mutate(patientId, p => ({ ...p, ...patch, id: p.id }));
  };

  const addDiagnosis = (patientId: string, diagnosis: string) => {
    mutate(patientId, p => {
      let next: Patient = { ...p, diagnosis };
      if (
        diagnosis &&
        (p.treatmentStatus === "Registered" || p.treatmentStatus === "Admitted")
      ) {
        next = { ...next, treatmentStatus: "Under Treatment" };
      }
      return withNotification(next, "Doctor updated diagnosis", "treatment");
    });
    toast.success("Diagnosis saved");
  };

  const updateSymptoms = (patientId: string, symptoms: string) => {
    mutate(patientId, p => ({ ...p, symptoms }));
  };

  const updateAllergies = (patientId: string, allergies: string) => {
    mutate(patientId, p => ({ ...p, allergies }));
  };

  const updateTreatmentStatus = (patientId: string, status: PatientStatus) => {
    mutate(patientId, p =>
      withNotification({ ...p, treatmentStatus: status }, `Patient status: ${status}`, "status")
    );
    toast.success(`Status updated to ${status}`);
  };

  const addMedicine = (patientId: string, med: Omit<Medicine, "id" | "dispensed" | "schedule">) => {
    const days = parseInt(med.duration, 10) || 5;
    const qty = Math.max(days * 2, 1);
    const unitPrice = getMedicinePrice(med.name);
    const newMed: Medicine = {
      ...med,
      id: `m-${Date.now()}`,
      dispensed: false,
      schedule: [
        { time: "08:00", given: false },
        { time: "20:00", given: false },
      ],
    };

    mutate(patientId, p => {
      let next: Patient = {
        ...p,
        medicines: [...p.medicines, newMed],
        billItems: [...p.billItems, makeBillItem("medicine", `${med.name} ${med.dosage}`, unitPrice, qty)],
      };
      if (next.treatmentStatus === "Registered" || next.treatmentStatus === "Admitted") {
        next = { ...next, treatmentStatus: "Under Treatment" };
      }
      return withNotification(next, `New medicine prescribed: ${med.name}`, "medicine");
    });
    toast.success(`Medicine "${med.name}" prescribed`);
  };

  const updateMedicineStatus = (patientId: string, medicineId: string, dispensed: boolean) => {
    mutate(patientId, p => {
      const medicines = p.medicines.map(m => (m.id === medicineId ? { ...m, dispensed } : m));
      const medName = p.medicines.find(m => m.id === medicineId)?.name;
      return withNotification(
        { ...p, medicines },
        dispensed
          ? `Medicine ready for collection: ${medName}`
          : `Medicine marked pending: ${medName}`,
        "medicine"
      );
    });
    if (dispensed) toast.success("Medicine marked as packed");
  };

  const dispenseMedicine = (patientId: string, medicineId: string) => {
    updateMedicineStatus(patientId, medicineId, true);
  };

  const markMedicineGiven = (patientId: string, medicineId: string, time: string) => {
    mutate(patientId, p => {
      const medicines = p.medicines.map(m =>
        m.id === medicineId
          ? {
              ...m,
              schedule: m.schedule.map(s =>
                s.time === time ? { ...s, given: true, givenAt: nowTime() } : s
              ),
            }
          : m
      );
      const medName = p.medicines.find(m => m.id === medicineId)?.name;
      return withNotification({ ...p, medicines }, `Medicine given at ${time} – ${medName}`, "medicine");
    });
    toast.success("Dose marked as given");
  };

  const addTest = (patientId: string, testName: string) => {
    const test: LabTest = {
      id: `t-${Date.now()}`,
      name: testName,
      status: "Pending",
      requestedAt: nowTime(),
      requestedAtIso: new Date().toISOString(),
    };
    const unitPrice = getTestPrice(testName);

    mutate(patientId, p =>
      withNotification(
        {
          ...p,
          tests: [...p.tests, test],
          billItems: [...p.billItems, makeBillItem("test", `${testName} Test`, unitPrice, 1)],
          treatmentStatus: "Awaiting Test",
        },
        `Test requested: ${testName}`,
        "test"
      )
    );
    toast.success(`Test "${testName}" requested`);
  };

  const updateTestStatus = (
    patientId: string,
    testId: string,
    status: TestStatus,
    result?: string,
    options?: { isCritical?: boolean }
  ) => {
    mutate(patientId, p => {
      const tests = p.tests.map(t =>
        t.id === testId
          ? {
              ...t,
              status,
              result: result ?? t.result,
              completedAt: status === "Completed" ? nowTime() : t.completedAt,
              isCritical:
                options?.isCritical !== undefined
                  ? options.isCritical
                  : status === "Completed"
                    ? t.isCritical
                    : t.isCritical,
            }
          : t
      );
      const pendingLeft = tests.some(t => t.status === "Pending" || t.status === "In Progress");
      let next: Patient = {
        ...p,
        tests,
        treatmentStatus: pendingLeft
          ? "Awaiting Test"
          : p.treatmentStatus === "Awaiting Test"
            ? "Under Treatment"
            : p.treatmentStatus,
      };
      if (status === "Completed") {
        const name = tests.find(t => t.id === testId)?.name;
        next = withNotification(next, `Test result available: ${name}`, "test");
      }
      return next;
    });
    toast.success(status === "Completed" ? "Test result saved" : `Test marked ${status}`);
  };

  const markTestReviewed = (patientId: string, testId: string, reviewer = "Assigned doctor") => {
    mutate(patientId, p => {
      const tests = p.tests.map(t =>
        t.id === testId
          ? { ...t, reviewedAt: nowTime(), reviewedBy: reviewer }
          : t
      );
      const name = p.tests.find(t => t.id === testId)?.name;
      return withNotification(
        { ...p, tests },
        `Your care team has reviewed your latest report${name ? ` (${name})` : ""}.`,
        "family"
      );
    });
    toast.success("Lab result marked as reviewed");
  };

  const markTestCritical = (patientId: string, testId: string, isCritical = true) => {
    mutate(patientId, p => ({
      ...p,
      tests: p.tests.map(t => (t.id === testId ? { ...t, isCritical } : t)),
    }));
    toast.message(isCritical ? "Result flagged as critical for clinician review" : "Critical flag cleared");
  };

  const resetDemoData = () => {
    const next = resetAllDemoLocalState();
    setAllPatients(next);
    // Clear backend CareGuard memory if API is up (demo only)
    void fetch(`${(import.meta.env.VITE_API_URL as string) || "http://localhost:5000"}/api/careguard/reset-demo`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-scs-role": "admin",
        Authorization: `Bearer ${btoa(JSON.stringify({ role: "admin" }))}`,
      },
      body: JSON.stringify({
        patients: next.map(p => ({
          id: p.id,
          name: p.name,
          allergies: p.allergies,
          treatmentStatus: p.treatmentStatus,
          billStatus: p.billStatus,
          medicines: p.medicines,
          tests: p.tests,
          billItems: p.billItems.map(b => ({ id: b.id })),
        })),
      }),
    }).catch(() => undefined);
    toast.success("Demo data restored — fictional patients & workflows reset");
  };

  const addNursingUpdate = (patientId: string, note: string, nurseName = "Nurse on duty") => {
    const update: NurseUpdate = {
      id: `nu-${Date.now()}`,
      note,
      time: nowTime(),
      nurseName,
    };
    mutate(patientId, p =>
      withNotification(
        { ...p, nurseUpdates: [...p.nurseUpdates, update] },
        `Nursing update: ${note.slice(0, 60)}${note.length > 60 ? "…" : ""}`,
        "nurse"
      )
    );
    toast.success("Nursing update added");
  };

  const addBillingItem: PatientContextType["addBillingItem"] = (patientId, item) => {
    mutate(patientId, p =>
      withNotification(
        {
          ...p,
          billItems: [
            ...p.billItems,
            makeBillItem(item.category, item.description, item.unitPrice, item.quantity ?? 1),
          ],
          billStatus: "Unpaid",
        },
        `Bill updated: ${item.description}`,
        "billing"
      )
    );
  };

  const updatePaymentStatus = (patientId: string, status: PaymentStatus) => {
    mutate(patientId, p => {
      let next: Patient = { ...p, billStatus: status };
      if (status === "Paid") {
        if (p.treatmentStatus === "Ready for Discharge") {
          next.treatmentStatus = "Discharged";
        }
        next = withNotification(next, "Payment received. Bill settled.", "billing");
      }
      return next;
    });
    if (status === "Paid") toast.success("Bill marked as paid");
  };

  const markBillPaid = (patientId: string) => updatePaymentStatus(patientId, "Paid");

  const addOtherCharge = (patientId: string, description: string, amount: number) => {
    addBillingItem(patientId, { category: "other", description, unitPrice: amount, quantity: 1 });
  };

  const addNotification = (patientId: string, message: string, type?: string) => {
    mutate(patientId, p => withNotification(p, message, type));
  };

  const markNotificationAsRead = (patientId: string, notificationId: string) => {
    mutate(patientId, p => ({
      ...p,
      notifications: p.notifications.map(n => (n.id === notificationId ? { ...n, read: true } : n)),
    }));
  };

  const markAllNotificationsRead = (patientId: string) => {
    mutate(patientId, p => ({
      ...p,
      notifications: p.notifications.map(n => ({ ...n, read: true })),
    }));
  };

  const addFamilyRequest = (patientId: string, type: string, reason: string) => {
    const req: FamilyRequest = {
      id: `r-${Date.now()}`,
      type,
      reason,
      status: "Pending",
      time: nowTime(),
    };
    mutate(patientId, p =>
      withNotification({ ...p, requests: [...p.requests, req] }, `Family requested: ${type}`, "request")
    );
    toast.success("Request submitted");
  };

  const updateFamilyRequestStatus = (
    patientId: string,
    requestId: string,
    status: RequestStatus
  ) => {
    mutate(patientId, p => ({
      ...p,
      requests: p.requests.map(r => (r.id === requestId ? { ...r, status } : r)),
    }));
    toast.success(`Request ${status.toLowerCase()}`);
  };

  return (
    <PatientContext.Provider
      value={{
        patients,
        addPatient,
        updatePatientFields,
        getPatientById,
        getPatient: getPatientById,
        addDiagnosis,
        updateTreatmentStatus,
        updateSymptoms,
        updateAllergies,
        addMedicine,
        updateMedicineStatus,
        dispenseMedicine,
        markMedicineGiven,
        addTest,
        updateTestStatus,
        markTestReviewed,
        markTestCritical,
        addNursingUpdate,
        addNurseUpdate: addNursingUpdate,
        addBillingItem,
        updatePaymentStatus,
        markBillPaid,
        addOtherCharge,
        addNotification,
        markNotificationAsRead,
        markAllNotificationsRead,
        addFamilyRequest,
        updateFamilyRequestStatus,
        resolveFamilyRequest: (patientId, requestId, status) =>
          updateFamilyRequestStatus(patientId, requestId, status),
        resetDemoData,
      }}
    >
      {children}
    </PatientContext.Provider>
  );
};

export const usePatients = () => {
  const ctx = useContext(PatientContext);
  if (!ctx) throw new Error("usePatients must be used within PatientProvider");
  return ctx;
};

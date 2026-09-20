/** Canonical patient lifecycle statuses — used by every dashboard */
export type PatientStatus =
  | "Registered"
  | "Admitted"
  | "Under Treatment"
  | "Awaiting Test"
  | "Ready for Discharge"
  | "Discharged";

export const PATIENT_STATUSES: PatientStatus[] = [
  "Registered",
  "Admitted",
  "Under Treatment",
  "Awaiting Test",
  "Ready for Discharge",
  "Discharged",
];

export type TestStatus = "Pending" | "In Progress" | "Completed";
export type PaymentStatus = "Unpaid" | "Paid";
export type RequestStatus = "Pending" | "Approved" | "Rejected";

/** @deprecated use PaymentStatus */
export type BillStatus = PaymentStatus;

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  phone: string;
  emergencyContact: string;
  visitType: string;
  admissionDate: string;
  room: string;
  bed: string;
  assignedDoctor: string;
  department: string;
  diagnosis: string;
  allergies: string;
  symptoms: string;
  /** Lifecycle status shared across all roles */
  treatmentStatus: PatientStatus;
  medicines: Medicine[];
  tests: LabTest[];
  /** Nursing notes / updates */
  nurseUpdates: NurseUpdate[];
  billItems: BillItem[];
  /** Payment status for the patient bill */
  billStatus: PaymentStatus;
  notifications: Notification[];
  requests: FamilyRequest[];
}

/** Aliases matching product naming in docs */
export type Test = LabTest;
export type NursingUpdate = NurseUpdate;
export type BillingItem = BillItem;

export interface Medicine {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  dispensed: boolean;
  schedule: MedicineSchedule[];
}

export interface MedicineSchedule {
  time: string;
  given: boolean;
  givenAt?: string;
  /** ISO due timestamp — used by CareGuard overdue detection when present */
  dueAt?: string;
}

export interface LabTest {
  id: string;
  name: string;
  status: TestStatus;
  result?: string;
  requestedAt: string;
  /** ISO request time for CareGuard delay rules */
  requestedAtIso?: string;
  completedAt?: string;
  /** Explicit critical flag from lab workflow only — CareGuard never infers this */
  isCritical?: boolean;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface NurseUpdate {
  id: string;
  note: string;
  time: string;
  nurseName: string;
}

export interface BillItem {
  id: string;
  category: "consultation" | "medicine" | "test" | "room" | "other";
  description: string;
  unitPrice: number;
  quantity: number;
}

export interface Notification {
  id: string;
  message: string;
  time: string;
  read: boolean;
  type?: string;
}

export interface FamilyRequest {
  id: string;
  type: string;
  reason: string;
  status: RequestStatus;
  time: string;
}

/** Deterministic price catalog for demo stability */
export const PRICE_CATALOG = {
  registration: 100,
  consultation: 500,
  emergencyConsultation: 1000,
  followUpConsultation: 300,
  roomPerDay: 800,
  medicineDefault: 15,
  testDefault: 400,
  tests: {
    CBC: 300,
    "Urine Routine": 200,
    "Ultrasound Abdomen": 1500,
    LFT: 400,
    HbA1c: 500,
    "X-Ray Chest": 600,
    ECG: 350,
  } as Record<string, number>,
  medicines: {
    Paracetamol: 5,
    Cetirizine: 8,
    Pantoprazole: 12,
    Metformin: 3,
    Amoxicillin: 10,
  } as Record<string, number>,
};

export const DOCTORS = [
  { name: "Dr. Ananya Mehta", department: "General Medicine" },
  { name: "Dr. Vikram Singh", department: "Emergency" },
  { name: "Dr. Neha Kapoor", department: "Cardiology" },
  { name: "Dr. Rohan Desai", department: "Orthopedics" },
];

export const ROOMS = [
  { room: "101", bed: "A", label: "Ward A - Room 101 Bed A" },
  { room: "101", bed: "B", label: "Ward A - Room 101 Bed B" },
  { room: "205", bed: "A", label: "Ward B - Room 205 Bed A" },
  { room: "205", bed: "B", label: "Ward B - Room 205 Bed B" },
  { room: "310", bed: "A", label: "Ward C - Room 310 Bed A" },
];

let nextPatientId = 1008;

/** Unique MVP patient IDs: SCS-1001, SCS-1002, … */
export const generatePatientId = () => `SCS-${nextPatientId++}`;

/** Reset ID counter when restoring demo seed */
export const resetPatientIdCounter = (next = 1008) => {
  nextPatientId = next;
};

const hoursAgoIso = (hours: number) => new Date(Date.now() - hours * 3600_000).toISOString();
const minutesAgoIso = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

export const normalizePatientId = (id: string) => id.trim().toUpperCase();

export const nowTime = () =>
  new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

export const makeNotification = (message: string, type?: string): Notification => ({
  id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  message,
  time: nowTime(),
  read: false,
  type,
});

export const makeBillItem = (
  category: BillItem["category"],
  description: string,
  unitPrice: number,
  quantity = 1
): BillItem => ({
  id: `b-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  category,
  description,
  unitPrice,
  quantity,
});

export const getBillTotal = (items: BillItem[]) =>
  items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

export const getMedicinePrice = (name: string) =>
  PRICE_CATALOG.medicines[name] ?? PRICE_CATALOG.medicineDefault;

export const getTestPrice = (name: string) =>
  PRICE_CATALOG.tests[name] ?? PRICE_CATALOG.testDefault;

export const getConsultationPrice = (visitType: string) => {
  if (visitType === "Emergency") return PRICE_CATALOG.emergencyConsultation;
  if (visitType === "Follow-up") return PRICE_CATALOG.followUpConsultation;
  return PRICE_CATALOG.consultation;
};

export const isPatientActive = (p: Patient) => p.treatmentStatus !== "Discharged";

export const roomLabel = (p: Patient) =>
  p.room ? `Room ${p.room}${p.bed ? ` Bed ${p.bed}` : ""}` : "Not assigned";

const today = new Date().toISOString();
const yesterday = new Date(Date.now() - 86400000).toISOString();

/**
 * CareGuard demo scenarios (deterministic):
 * A SCS-1001 — no active signals
 * B SCS-1002 — lab result awaiting review
 * C SCS-1003 — prescription awaiting pharmacy
 * D SCS-1004 — treatment task overdue
 * E SCS-1005 — allergy / prescription safety review
 * F SCS-1006 — explicitly critical lab result
 * SCS-1007 — discharge workflow blocked (billing)
 */
export const initialPatients: Patient[] = [
  // Patient A — quiet / no CareGuard signals
  {
    id: "SCS-1001",
    name: "Rajesh Kumar",
    age: 45,
    gender: "Male",
    phone: "9876543210",
    emergencyContact: "Sunita Kumar · 9876500001",
    visitType: "OPD",
    admissionDate: today,
    room: "101",
    bed: "A",
    assignedDoctor: "Dr. Ananya Mehta",
    department: "General Medicine",
    diagnosis: "Mild fever with body ache. Suspected viral infection.",
    allergies: "None known",
    symptoms: "Fever, body ache, mild headache",
    treatmentStatus: "Under Treatment",
    medicines: [
      {
        id: "m1",
        name: "Paracetamol",
        dosage: "500 mg",
        frequency: "Twice a day",
        duration: "5",
        dispensed: true,
        schedule: [
          { time: "08:00", given: true, givenAt: "08:05" },
          { time: "20:00", given: false, dueAt: hoursAgoIso(-2) }, // future due — not overdue
        ],
      },
    ],
    tests: [
      {
        id: "t1",
        name: "CBC",
        status: "Completed",
        result: "WBC slightly elevated; otherwise normal",
        requestedAt: "09:00",
        requestedAtIso: hoursAgoIso(4),
        completedAt: "11:20",
        reviewedAt: "11:45",
        reviewedBy: "Dr. Ananya Mehta",
      },
    ],
    nurseUpdates: [
      {
        id: "nu1",
        note: "Patient resting comfortably. Temperature 100.2°F.",
        time: "10:15",
        nurseName: "Nurse Priya",
      },
    ],
    billItems: [
      makeBillItem("consultation", "Consultation Fee", 500, 1),
      makeBillItem("room", "Room 101 Bed A (1 day)", 800, 1),
      makeBillItem("medicine", "Paracetamol 500 mg", 5, 10),
      makeBillItem("test", "CBC Test", 300, 1),
    ],
    billStatus: "Unpaid",
    notifications: [
      { id: "n1", message: "Medicine given at 08:00 – Paracetamol 500 mg", time: "08:05", read: false, type: "medicine" },
      { id: "n2", message: "Your care team has reviewed your latest report.", time: "11:45", read: false, type: "family" },
    ],
    requests: [],
  },
  // Patient B — LAB_REVIEW_PENDING (+ delayed pending order for LAB)
  {
    id: "SCS-1002",
    name: "Priya Sharma",
    age: 32,
    gender: "Female",
    phone: "9123456780",
    emergencyContact: "Amit Sharma · 9123456700",
    visitType: "Emergency",
    admissionDate: today,
    room: "205",
    bed: "A",
    assignedDoctor: "Dr. Vikram Singh",
    department: "Emergency",
    diagnosis: "Acute abdominal pain. Advised ultrasound.",
    allergies: "None known",
    symptoms: "Severe abdominal pain, nausea",
    treatmentStatus: "Awaiting Test",
    medicines: [
      {
        id: "m3",
        name: "Pantoprazole",
        dosage: "40 mg",
        frequency: "Once a day",
        duration: "7",
        dispensed: true,
        schedule: [{ time: "07:00", given: true, givenAt: "07:10" }],
      },
    ],
    tests: [
      {
        id: "t3",
        name: "Ultrasound Abdomen",
        status: "Completed",
        result: "No free fluid. Mild ileus pattern.",
        requestedAt: "07:30",
        requestedAtIso: hoursAgoIso(3),
        completedAt: "10:00",
        // not reviewed → LAB_REVIEW_PENDING
      },
      {
        id: "t4",
        name: "LFT",
        status: "Pending",
        requestedAt: "07:45",
        requestedAtIso: hoursAgoIso(2), // beyond 15-min demo threshold → LAB_ORDER_DELAY
      },
    ],
    nurseUpdates: [
      {
        id: "nu2",
        note: "Pain score 6/10. Monitoring vitals every hour.",
        time: "08:00",
        nurseName: "Nurse Kavita",
      },
    ],
    billItems: [
      makeBillItem("consultation", "Emergency Consultation", 1000, 1),
      makeBillItem("room", "Room 205 Bed A (1 day)", 800, 1),
      makeBillItem("medicine", "Pantoprazole 40 mg", 12, 7),
      makeBillItem("test", "Ultrasound Abdomen", 1500, 1),
      makeBillItem("test", "LFT Test", 400, 1),
    ],
    billStatus: "Unpaid",
    notifications: [
      { id: "n4", message: "Patient admitted to Room 205 Bed A", time: "07:00", read: false, type: "registration" },
      { id: "n5", message: "Test result available: Ultrasound Abdomen", time: "10:00", read: false, type: "test" },
    ],
    requests: [],
  },
  // Patient C — MEDICATION_DISPENSING_PENDING
  {
    id: "SCS-1003",
    name: "Amit Patel",
    age: 60,
    gender: "Male",
    phone: "9988776655",
    emergencyContact: "Meera Patel · 9988776600",
    visitType: "Follow-up",
    admissionDate: yesterday,
    room: "205",
    bed: "B",
    assignedDoctor: "Dr. Neha Kapoor",
    department: "Cardiology",
    diagnosis: "Diabetes follow-up. Medication adjusted.",
    allergies: "None known",
    symptoms: "None currently",
    treatmentStatus: "Under Treatment",
    medicines: [
      {
        id: "m4",
        name: "Metformin",
        dosage: "500 mg",
        frequency: "Twice a day",
        duration: "30",
        dispensed: false,
        schedule: [
          { time: "08:00", given: false, dueAt: hoursAgoIso(-1) },
          { time: "20:00", given: false, dueAt: hoursAgoIso(-8) },
        ],
      },
    ],
    tests: [
      {
        id: "t5",
        name: "HbA1c",
        status: "Completed",
        result: "6.2% — within target range",
        requestedAt: "10:00",
        requestedAtIso: hoursAgoIso(6),
        completedAt: "14:00",
        reviewedAt: "14:30",
        reviewedBy: "Dr. Neha Kapoor",
      },
    ],
    nurseUpdates: [],
    billItems: [
      makeBillItem("consultation", "Follow-up Consultation", 300, 1),
      makeBillItem("medicine", "Metformin 500 mg", 3, 60),
      makeBillItem("test", "HbA1c Test", 500, 1),
    ],
    billStatus: "Unpaid",
    notifications: [
      { id: "n6", message: "New medicine prescribed: Metformin", time: "14:35", read: false, type: "medicine" },
    ],
    requests: [],
  },
  // Patient D — TREATMENT_TASK_OVERDUE
  {
    id: "SCS-1004",
    name: "Sneha Reddy",
    age: 28,
    gender: "Female",
    phone: "9012345678",
    emergencyContact: "Kiran Reddy · 9012345600",
    visitType: "OPD",
    admissionDate: today,
    room: "310",
    bed: "A",
    assignedDoctor: "Dr. Rohan Desai",
    department: "Orthopedics",
    diagnosis: "Soft tissue injury — knee. Conservative management.",
    allergies: "None known",
    symptoms: "Knee pain after fall",
    treatmentStatus: "Under Treatment",
    medicines: [
      {
        id: "m6",
        name: "Ibuprofen",
        dosage: "400 mg",
        frequency: "Twice a day",
        duration: "5",
        dispensed: true,
        schedule: [
          {
            time: "08:00",
            given: false,
            dueAt: minutesAgoIso(90), // overdue → TREATMENT_TASK_OVERDUE
          },
        ],
      },
    ],
    tests: [],
    nurseUpdates: [],
    billItems: [
      makeBillItem("consultation", "Consultation Fee", 500, 1),
      makeBillItem("other", "Registration Fee", 100, 1),
      makeBillItem("room", "Room 310 Bed A (1 day)", 800, 1),
      makeBillItem("medicine", "Ibuprofen 400 mg", 8, 10),
    ],
    billStatus: "Unpaid",
    notifications: [
      { id: "n7", message: "Patient registered successfully", time: "12:00", read: false, type: "registration" },
    ],
    requests: [],
  },
  // Patient E — ALLERGY_PRESCRIPTION_REVIEW
  {
    id: "SCS-1005",
    name: "Vikram Joshi",
    age: 52,
    gender: "Male",
    phone: "9765432100",
    emergencyContact: "Anita Joshi · 9765432101",
    visitType: "OPD",
    admissionDate: today,
    room: "101",
    bed: "B",
    assignedDoctor: "Dr. Ananya Mehta",
    department: "General Medicine",
    diagnosis: "Suspected bacterial pharyngitis.",
    allergies: "Amoxicillin",
    symptoms: "Sore throat, mild fever",
    treatmentStatus: "Under Treatment",
    medicines: [
      {
        id: "m7",
        name: "Amoxicillin",
        dosage: "500 mg",
        frequency: "Three times a day",
        duration: "5",
        dispensed: true,
        schedule: [{ time: "09:00", given: false, dueAt: hoursAgoIso(-3) }],
      },
    ],
    tests: [],
    nurseUpdates: [],
    billItems: [
      makeBillItem("consultation", "Consultation Fee", 500, 1),
      makeBillItem("room", "Room 101 Bed B (1 day)", 800, 1),
      makeBillItem("medicine", "Amoxicillin 500 mg", 10, 15),
    ],
    billStatus: "Unpaid",
    notifications: [
      { id: "n8", message: "New medicine prescribed: Amoxicillin", time: "11:00", read: false, type: "medicine" },
    ],
    requests: [],
  },
  // Patient F — CRITICAL_RESULT_REVIEW (explicit isCritical from lab workflow)
  {
    id: "SCS-1006",
    name: "Meera Nair",
    age: 41,
    gender: "Female",
    phone: "9811122233",
    emergencyContact: "Arjun Nair · 9811122200",
    visitType: "Emergency",
    admissionDate: today,
    room: "205",
    bed: "A",
    assignedDoctor: "Dr. Vikram Singh",
    department: "Emergency",
    diagnosis: "Chest pain — rule out ACS.",
    allergies: "None known",
    symptoms: "Chest discomfort, sweating",
    treatmentStatus: "Under Treatment",
    medicines: [],
    tests: [
      {
        id: "t7",
        name: "Troponin I",
        status: "Completed",
        result: "Elevated — lab flagged as critical for clinician review",
        requestedAt: "08:10",
        requestedAtIso: hoursAgoIso(2),
        completedAt: "09:05",
        isCritical: true,
        // not reviewed → CRITICAL_RESULT_REVIEW
      },
    ],
    nurseUpdates: [
      {
        id: "nu4",
        note: "Patient on continuous monitoring. Awaiting doctor review of troponin.",
        time: "09:10",
        nurseName: "Nurse Kavita",
      },
    ],
    billItems: [
      makeBillItem("consultation", "Emergency Consultation", 1000, 1),
      makeBillItem("test", "Troponin I", 800, 1),
    ],
    billStatus: "Unpaid",
    notifications: [
      { id: "n9", message: "Test result available: Troponin I", time: "09:05", read: false, type: "test" },
    ],
    requests: [],
  },
  // Discharge blocked — DISCHARGE_WORKFLOW_BLOCKED
  {
    id: "SCS-1007",
    name: "Karan Malhotra",
    age: 55,
    gender: "Male",
    phone: "9900112233",
    emergencyContact: "Neha Malhotra · 9900112200",
    visitType: "OPD",
    admissionDate: yesterday,
    room: "310",
    bed: "B",
    assignedDoctor: "Dr. Rohan Desai",
    department: "Orthopedics",
    diagnosis: "Stable post-procedure. Cleared clinically for discharge.",
    allergies: "None known",
    symptoms: "Improving",
    treatmentStatus: "Ready for Discharge",
    medicines: [
      {
        id: "m8",
        name: "Paracetamol",
        dosage: "500 mg",
        frequency: "As needed",
        duration: "3",
        dispensed: true,
        schedule: [{ time: "12:00", given: true, givenAt: "12:05" }],
      },
    ],
    tests: [
      {
        id: "t8",
        name: "X-Ray Chest",
        status: "Completed",
        result: "No acute findings",
        requestedAt: "09:00",
        requestedAtIso: hoursAgoIso(20),
        completedAt: "10:00",
        reviewedAt: "10:30",
        reviewedBy: "Dr. Rohan Desai",
      },
    ],
    nurseUpdates: [
      {
        id: "nu5",
        note: "Ready for discharge pending bill clearance.",
        time: "13:00",
        nurseName: "Nurse Priya",
      },
    ],
    billItems: [
      makeBillItem("consultation", "Consultation Fee", 500, 1),
      makeBillItem("room", "Room 310 Bed B (1 day)", 800, 1),
      makeBillItem("medicine", "Paracetamol 500 mg", 5, 6),
      makeBillItem("test", "X-Ray Chest", 600, 1),
    ],
    billStatus: "Unpaid",
    notifications: [
      { id: "n10", message: "Treatment complete. Discharge pending payment.", time: "13:05", read: false, type: "status" },
    ],
    requests: [],
  },
];

/** Alias for demo reset */
export const careGuardDemoPatients = initialPatients;

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  mobile: string;
  visitType: string;
  status: "Active" | "Discharged";
  registeredAt: string;
  diagnosis: string;
  medicines: Medicine[];
  tests: string[];
  billItems: BillItem[];
  billStatus: "Unpaid" | "Paid";
  notifications: Notification[];
  requests: FamilyRequest[];
  ward?: string;
}

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
}

export interface BillItem {
  description: string;
  unitPrice: number;
  quantity: number;
}

export interface Notification {
  id: string;
  message: string;
  time: string;
  read: boolean;
}

export interface FamilyRequest {
  id: string;
  type: string;
  reason: string;
  status: "Pending" | "Approved" | "Rejected";
  time: string;
}

let nextPatientId = 1004;

export const generatePatientId = () => {
  return `P${nextPatientId++}`;
};

export const initialPatients: Patient[] = [
  {
    id: "P1001",
    name: "Rajesh Kumar",
    age: 45,
    gender: "Male",
    mobile: "9876543210",
    visitType: "OPD",
    status: "Active",
    registeredAt: new Date().toISOString(),
    diagnosis: "Mild fever with body ache. Suspected viral infection.",
    medicines: [
      { id: "m1", name: "Paracetamol", dosage: "500 mg", frequency: "Twice a day", duration: "5 days", dispensed: true, schedule: [
        { time: "08:00", given: true, givenAt: "08:05" },
        { time: "20:00", given: false },
      ]},
      { id: "m2", name: "Cetirizine", dosage: "10 mg", frequency: "Once a day", duration: "3 days", dispensed: false, schedule: [
        { time: "10:00", given: false },
      ]},
    ],
    tests: ["CBC", "Urine Routine"],
    billItems: [
      { description: "Consultation Fee", unitPrice: 500, quantity: 1 },
      { description: "Paracetamol 500 mg × 10", unitPrice: 5, quantity: 10 },
      { description: "Cetirizine 10 mg × 3", unitPrice: 8, quantity: 3 },
      { description: "CBC Test", unitPrice: 300, quantity: 1 },
    ],
    billStatus: "Unpaid",
    ward: "Ward A - Room 101",
    notifications: [
      { id: "n1", message: "Medicine given at 08:00 – Paracetamol 500 mg", time: "08:05", read: false },
      { id: "n2", message: "Doctor added test: CBC", time: "09:30", read: false },
      { id: "n3", message: "Bill updated – new total: ₹874", time: "09:35", read: true },
    ],
    requests: [],
  },
  {
    id: "P1002",
    name: "Priya Sharma",
    age: 32,
    gender: "Female",
    mobile: "9123456780",
    visitType: "Emergency",
    status: "Active",
    registeredAt: new Date().toISOString(),
    diagnosis: "Acute abdominal pain. Advised ultrasound.",
    medicines: [
      { id: "m3", name: "Pantoprazole", dosage: "40 mg", frequency: "Once a day", duration: "7 days", dispensed: false, schedule: [
        { time: "07:00", given: false },
      ]},
    ],
    tests: ["Ultrasound Abdomen", "LFT"],
    billItems: [
      { description: "Emergency Consultation", unitPrice: 1000, quantity: 1 },
      { description: "Pantoprazole 40 mg × 7", unitPrice: 12, quantity: 7 },
      { description: "Ultrasound Abdomen", unitPrice: 1500, quantity: 1 },
      { description: "LFT Test", unitPrice: 400, quantity: 1 },
    ],
    billStatus: "Unpaid",
    ward: "Ward B - Room 205",
    notifications: [
      { id: "n4", message: "Patient admitted to Ward B", time: "07:00", read: false },
    ],
    requests: [],
  },
  {
    id: "P1003",
    name: "Amit Patel",
    age: 60,
    gender: "Male",
    mobile: "9988776655",
    visitType: "Follow-up",
    status: "Discharged",
    registeredAt: new Date(Date.now() - 86400000).toISOString(),
    diagnosis: "Diabetes follow-up. Sugar levels normal.",
    medicines: [
      { id: "m4", name: "Metformin", dosage: "500 mg", frequency: "Twice a day", duration: "30 days", dispensed: true, schedule: [
        { time: "08:00", given: true, givenAt: "08:10" },
        { time: "20:00", given: true, givenAt: "20:05" },
      ]},
    ],
    tests: ["HbA1c"],
    billItems: [
      { description: "Follow-up Consultation", unitPrice: 300, quantity: 1 },
      { description: "Metformin 500 mg × 60", unitPrice: 3, quantity: 60 },
      { description: "HbA1c Test", unitPrice: 500, quantity: 1 },
    ],
    billStatus: "Paid",
    notifications: [],
    requests: [],
  },
];

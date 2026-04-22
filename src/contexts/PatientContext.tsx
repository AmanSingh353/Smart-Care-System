import React, { createContext, useContext, useState, ReactNode } from "react";
import { Patient, Medicine, BillItem, FamilyRequest, initialPatients, generatePatientId } from "@/data/mockData";
import { toast } from "sonner";

interface PatientContextType {
  patients: Patient[];
  addPatient: (data: { name: string; age: number; gender: string; mobile: string; visitType: string }) => Patient;
  addDiagnosis: (patientId: string, diagnosis: string) => void;
  addMedicine: (patientId: string, med: Omit<Medicine, "id" | "dispensed" | "schedule">) => void;
  addTest: (patientId: string, test: string) => void;
  dispenseMedicine: (patientId: string, medicineId: string) => void;
  markMedicineGiven: (patientId: string, medicineId: string, time: string) => void;
  markBillPaid: (patientId: string) => void;
  addFamilyRequest: (patientId: string, type: string, reason: string) => void;
  getPatient: (id: string) => Patient | undefined;
}

const PatientContext = createContext<PatientContextType | undefined>(undefined);

export const PatientProvider = ({ children }: { children: ReactNode }) => {
  const [patients, setPatients] = useState<Patient[]>(initialPatients);

  const updatePatient = (id: string, updater: (p: Patient) => Patient) => {
    setPatients(prev => prev.map(p => p.id === id ? updater(p) : p));
  };

  const addPatient = (data: { name: string; age: number; gender: string; mobile: string; visitType: string }) => {
    const newPatient: Patient = {
      id: generatePatientId(),
      ...data,
      status: "Active",
      registeredAt: new Date().toISOString(),
      diagnosis: "",
      medicines: [],
      tests: [],
      billItems: [{ description: "Registration Fee", unitPrice: 100, quantity: 1 }],
      billStatus: "Unpaid",
      notifications: [{ id: `n-${Date.now()}`, message: "Patient registered successfully", time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }), read: false }],
      requests: [],
    };
    setPatients(prev => [newPatient, ...prev]);
    return newPatient;
  };

  const addDiagnosis = (patientId: string, diagnosis: string) => {
    updatePatient(patientId, p => ({ ...p, diagnosis }));
  };

  const addMedicine = (patientId: string, med: Omit<Medicine, "id" | "dispensed" | "schedule">) => {
    const newMed: Medicine = {
      ...med,
      id: `m-${Date.now()}`,
      dispensed: false,
      schedule: [{ time: "08:00", given: false }, { time: "20:00", given: false }],
    };
    updatePatient(patientId, p => ({
      ...p,
      medicines: [...p.medicines, newMed],
      billItems: [...p.billItems, { description: `${med.name} ${med.dosage}`, unitPrice: Math.floor(Math.random() * 20) + 5, quantity: parseInt(med.duration) * 2 || 10 }],
      notifications: [...p.notifications, { id: `n-${Date.now()}`, message: `New medicine prescribed: ${med.name}`, time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }), read: false }],
    }));
    toast.success(`Medicine "${med.name}" added`);
  };

  const addTest = (patientId: string, test: string) => {
    updatePatient(patientId, p => ({
      ...p,
      tests: [...p.tests, test],
      billItems: [...p.billItems, { description: `${test} Test`, unitPrice: Math.floor(Math.random() * 500) + 200, quantity: 1 }],
      notifications: [...p.notifications, { id: `n-${Date.now()}`, message: `Doctor added test: ${test}`, time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }), read: false }],
    }));
    toast.success(`Test "${test}" added`);
  };

  const dispenseMedicine = (patientId: string, medicineId: string) => {
    updatePatient(patientId, p => ({
      ...p,
      medicines: p.medicines.map(m => m.id === medicineId ? { ...m, dispensed: true } : m),
    }));
    toast.success("Medicine marked as packed");
  };

  const markMedicineGiven = (patientId: string, medicineId: string, time: string) => {
    updatePatient(patientId, p => ({
      ...p,
      medicines: p.medicines.map(m =>
        m.id === medicineId
          ? { ...m, schedule: m.schedule.map(s => s.time === time ? { ...s, given: true, givenAt: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) } : s) }
          : m
      ),
      notifications: [...p.notifications, {
        id: `n-${Date.now()}`,
        message: `Medicine given at ${time} – ${p.medicines.find(m => m.id === medicineId)?.name}`,
        time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
        read: false,
      }],
    }));
    toast.success("Dose marked as given");
  };

  const markBillPaid = (patientId: string) => {
    updatePatient(patientId, p => ({
      ...p,
      billStatus: "Paid",
      notifications: [...p.notifications, { id: `n-${Date.now()}`, message: "Bill marked as paid", time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }), read: false }],
    }));
    toast.success("Bill marked as paid");
  };

  const addFamilyRequest = (patientId: string, type: string, reason: string) => {
    const req: FamilyRequest = {
      id: `r-${Date.now()}`,
      type,
      reason,
      status: "Pending",
      time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
    };
    updatePatient(patientId, p => ({ ...p, requests: [...p.requests, req] }));
    toast.success("Request submitted successfully");
  };

  const getPatient = (id: string) => patients.find(p => p.id === id);

  return (
    <PatientContext.Provider value={{ patients, addPatient, addDiagnosis, addMedicine, addTest, dispenseMedicine, markMedicineGiven, markBillPaid, addFamilyRequest, getPatient }}>
      {children}
    </PatientContext.Provider>
  );
};

export const usePatients = () => {
  const ctx = useContext(PatientContext);
  if (!ctx) throw new Error("usePatients must be used within PatientProvider");
  return ctx;
};

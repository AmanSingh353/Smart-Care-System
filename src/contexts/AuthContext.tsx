import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";

export type StaffRole = "admin" | "reception" | "doctor" | "nurse" | "pharmacy" | "billing" | "lab";

interface AuthContextType {
  role: StaffRole | "family" | null;
  patientId: string | null;
  loginStaff: (role: StaffRole) => void;
  loginFamily: (patientId: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = "scs30-auth";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [role, setRole] = useState<StaffRole | "family" | null>(null);
  const [patientId, setPatientId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { role: StaffRole | "family"; patientId?: string };
        setRole(parsed.role);
        setPatientId(parsed.patientId ?? null);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const persist = (nextRole: StaffRole | "family" | null, nextPatientId: string | null) => {
    setRole(nextRole);
    setPatientId(nextPatientId);
    if (nextRole) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ role: nextRole, patientId: nextPatientId }));
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  };

  const loginStaff = (r: StaffRole) => persist(r, null);
  const loginFamily = (id: string) => persist("family", id.toUpperCase());
  const logout = () => persist(null, null);

  return (
    <AuthContext.Provider value={{ role, patientId, loginStaff, loginFamily, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const ROLE_NAV: Record<StaffRole, { label: string; path: string }[]> = {
  admin: [
    { label: "Dashboard", path: "/admin" },
    { label: "Registration", path: "/reception" },
    { label: "Doctor", path: "/doctor" },
    { label: "Nurse", path: "/nurse" },
    { label: "Pharmacy", path: "/pharmacy" },
    { label: "Lab", path: "/lab" },
    { label: "Billing", path: "/billing" },
  ],
  reception: [{ label: "Registration", path: "/reception" }],
  doctor: [{ label: "Patients", path: "/doctor" }],
  nurse: [{ label: "Nursing Station", path: "/nurse" }],
  pharmacy: [{ label: "Pharmacy", path: "/pharmacy" }],
  billing: [{ label: "Billing", path: "/billing" }],
  lab: [{ label: "Laboratory", path: "/lab" }],
};

export const ROLE_LABELS: Record<StaffRole | "family", string> = {
  admin: "Admin",
  reception: "Reception",
  doctor: "Doctor",
  nurse: "Nurse",
  pharmacy: "Pharmacy",
  billing: "Billing",
  lab: "Laboratory",
  family: "Family",
};

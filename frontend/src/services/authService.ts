import { api } from "./api";

export type StaffRole = "admin" | "reception" | "doctor" | "nurse" | "pharmacy" | "billing" | "lab";

export interface StaffProfile {
  id: string;
  firebaseUid: string | null;
  email: string;
  fullName: string;
  role: StaffRole;
  department: string;
  staffId: string;
  status: "ACTIVE" | "DISABLED" | "INVITED";
  createdAt: string;
  updatedAt: string;
}

export const authService = {
  status: () =>
    api.get<{
      message: string;
      firebaseAdminConfigured: boolean;
      providers: string[];
      staffRoles: string[];
    }>("/api/auth"),

  /** Verify Firebase ID token with backend; returns authoritative role from DB */
  session: (idToken: string) =>
    api.post<{ user: StaffProfile; role: StaffRole; firebase: { uid: string; email?: string } }>(
      "/api/auth/session",
      { idToken },
      { Authorization: `Bearer ${idToken}` }
    ),

  listStaff: (idToken: string) =>
    api.get<{ staff: StaffProfile[] }>("/api/auth/staff", { Authorization: `Bearer ${idToken}` }),

  createStaff: (
    idToken: string,
    body: {
      fullName: string;
      email: string;
      role: StaffRole;
      department: string;
      staffId: string;
      status?: string;
      temporaryPassword?: string;
    }
  ) =>
    api.post<{ user: StaffProfile; temporaryPassword?: string; message: string }>(
      "/api/auth/staff",
      body,
      { Authorization: `Bearer ${idToken}` }
    ),

  updateStaff: (
    idToken: string,
    id: string,
    body: Partial<{ fullName: string; role: StaffRole; department: string; staffId: string; status: string }>
  ) =>
    api.patch<{ user: StaffProfile }>(`/api/auth/staff/${id}`, body, {
      Authorization: `Bearer ${idToken}`,
    }),
};

export default authService;

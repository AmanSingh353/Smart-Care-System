import { api } from "./api";

export type StaffRole = "admin" | "reception" | "doctor" | "nurse" | "pharmacy" | "billing" | "lab";

export type StaffAccountStatus = "INVITED" | "ACTIVE" | "SUSPENDED" | "DISABLED";

export interface StaffProfile {
  id: string;
  firebaseUid: string | null;
  email: string;
  fullName: string;
  role: StaffRole;
  department: string;
  staffId: string;
  status: StaffAccountStatus;
  mustChangePassword?: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

export const authService = {
  status: () =>
    api.get<{
      message: string;
      firebaseAdminConfigured: boolean;
      providers: string[];
      staffRoles: string[];
      accountStatuses?: string[];
    }>("/api/auth"),

  session: (idToken: string) =>
    api.post<{ user: StaffProfile; role: StaffRole; firebase: { uid: string; email?: string } }>(
      "/api/auth/session",
      { idToken },
      { Authorization: `Bearer ${idToken}` }
    ),

  me: (idToken: string) =>
    api.get<{ user: StaffProfile }>("/api/auth/me", { Authorization: `Bearer ${idToken}` }),

  completePasswordChange: (idToken: string) =>
    api.post<{ user: StaffProfile; message: string }>(
      "/api/auth/complete-password-change",
      {},
      { Authorization: `Bearer ${idToken}` }
    ),

  listStaff: (idToken: string) =>
    api.get<{ staff: StaffProfile[] }>("/api/auth/staff", { Authorization: `Bearer ${idToken}` }),

  getStaff: (idToken: string, id: string) =>
    api.get<{ user: StaffProfile }>(`/api/auth/staff/${id}`, { Authorization: `Bearer ${idToken}` }),

  lookupFirebaseAccount: (idToken: string, email: string) =>
    api.get<{
      email: string;
      existsInFirebase: boolean;
      firebaseUid: string | null;
      existsInStaffStore: boolean;
    }>(`/api/auth/firebase-account?email=${encodeURIComponent(email)}`, {
      Authorization: `Bearer ${idToken}`,
    }),

  createStaff: (
    idToken: string,
    body: {
      fullName: string;
      email: string;
      role: StaffRole;
      department: string;
      staffId: string;
      status?: StaffAccountStatus;
      temporaryPassword?: string;
    }
  ) =>
    api.post<{
      user: StaffProfile;
      message: string;
      linkedExistingFirebase: boolean;
      createdFirebase: boolean;
    }>("/api/auth/staff", body, { Authorization: `Bearer ${idToken}` }),

  updateStaff: (
    idToken: string,
    id: string,
    body: Partial<{
      fullName: string;
      role: StaffRole;
      department: string;
      staffId: string;
      status: StaffAccountStatus;
    }>
  ) =>
    api.patch<{ user: StaffProfile }>(`/api/auth/staff/${id}`, body, {
      Authorization: `Bearer ${idToken}`,
    }),

  deleteStaff: (idToken: string, id: string) =>
    api.delete<{ message: string; id: string }>(`/api/auth/staff/${id}`, {
      Authorization: `Bearer ${idToken}`,
    }),
};

export default authService;

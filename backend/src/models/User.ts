/** Staff user — role is authoritative and stored in Smart Care System (not trusted from the client). */

export type StaffRole =
  | "admin"
  | "reception"
  | "doctor"
  | "nurse"
  | "pharmacy"
  | "billing"
  | "lab";

export type StaffAccountStatus = "ACTIVE" | "DISABLED" | "INVITED";

export interface StaffUser {
  id: string;
  firebaseUid: string | null;
  email: string;
  fullName: string;
  role: StaffRole;
  department: string;
  staffId: string;
  status: StaffAccountStatus;
  createdAt: string;
  updatedAt: string;
}

export const STAFF_ROLES: StaffRole[] = [
  "admin",
  "reception",
  "doctor",
  "nurse",
  "pharmacy",
  "billing",
  "lab",
];

export function normalizeStaffRole(raw: string): StaffRole | null {
  const r = raw.trim().toLowerCase();
  return (STAFF_ROLES as string[]).includes(r) ? (r as StaffRole) : null;
}

export function toPublicStaffUser(u: StaffUser) {
  return {
    id: u.id,
    firebaseUid: u.firebaseUid,
    email: u.email,
    fullName: u.fullName,
    role: u.role,
    department: u.department,
    staffId: u.staffId,
    status: u.status,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

/** @deprecated keep name for older imports */
export type UserDocument = StaffUser;

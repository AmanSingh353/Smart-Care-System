/** Staff user — role is authoritative and stored in Smart Care System (not trusted from the client). */

export type StaffRole =
  | "admin"
  | "reception"
  | "doctor"
  | "nurse"
  | "pharmacy"
  | "billing"
  | "lab";

export type StaffAccountStatus = "INVITED" | "ACTIVE" | "SUSPENDED" | "DISABLED";

export const STAFF_STATUSES: StaffAccountStatus[] = ["INVITED", "ACTIVE", "SUSPENDED", "DISABLED"];

export interface StaffUser {
  id: string;
  firebaseUid: string | null;
  email: string;
  fullName: string;
  role: StaffRole;
  department: string;
  staffId: string;
  status: StaffAccountStatus;
  /** Business key matching Hospital.hospitalId — never taken from the client for authorization. */
  hospitalId: string | null;
  /**
   * Platform / network operator for the Smart Care Network.
   * Distinct from role "admin" (Hospital Admin), which is scoped to hospitalId.
   */
  isPlatformAdmin: boolean;
  /** True after Admin creates account with a temporary password; cleared after first password change. */
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
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

/** Roles Hospital Admin may create via Staff Management (Hospital Admin itself is bootstrap/platform-managed). */
export const CREATABLE_STAFF_ROLES: StaffRole[] = [
  "doctor",
  "nurse",
  "lab",
  "pharmacy",
  "billing",
  "reception",
];

export function normalizeStaffRole(raw: string): StaffRole | null {
  const r = raw.trim().toLowerCase();
  return (STAFF_ROLES as string[]).includes(r) ? (r as StaffRole) : null;
}

export function normalizeStaffStatus(raw: string): StaffAccountStatus | null {
  const s = raw.trim().toUpperCase();
  return (STAFF_STATUSES as string[]).includes(s) ? (s as StaffAccountStatus) : null;
}

export function isHospitalAdmin(u: Pick<StaffUser, "role" | "isPlatformAdmin">): boolean {
  return u.role === "admin" && !u.isPlatformAdmin;
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
    hospitalId: u.hospitalId,
    isPlatformAdmin: Boolean(u.isPlatformAdmin),
    mustChangePassword: Boolean(u.mustChangePassword),
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
    lastLoginAt: u.lastLoginAt,
  };
}

/** @deprecated keep name for older imports */
export type UserDocument = StaffUser;

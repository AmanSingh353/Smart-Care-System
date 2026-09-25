/**
 * Platform Administration — hospital network management for isPlatformAdmin operators.
 * Reuses Hospital + StaffUser stores. Does not trust client hospitalId / isPlatformAdmin.
 */
import { toPublicStaffUser, type StaffUser } from "../models/User";
import { toPublicHospital, normalizeHospitalStatus, type Hospital } from "../models/Hospital";
import {
  allocateNextHospitalId,
  createHospital,
  findHospitalByHospitalId,
  findHospitalById,
  findHospitalByRegistrationId,
  listHospitals,
  updateHospital,
} from "./hospitalStore";
import { listStaffUsers } from "./userStore";
import { createHospitalAdminAccount, AuthError } from "./staffAuthService";

export class PlatformError extends Error {
  status: number;
  code: string;
  constructor(message: string, status = 400, code = "PLATFORM_ERROR") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function parseList(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String).map(s => s.trim()).filter(Boolean);
  if (typeof raw === "string") {
    return raw
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);
  }
  return [];
}

export type PlatformHospitalRow = ReturnType<typeof toPublicHospital> & {
  hospitalAdmin: ReturnType<typeof toPublicStaffUser> | null;
};

async function primaryHospitalAdmin(hospitalId: string): Promise<StaffUser | null> {
  const staff = await listStaffUsers({ hospitalId });
  const admins = staff.filter(u => u.role === "admin" && !u.isPlatformAdmin);
  if (!admins.length) return null;
  return admins.sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
}

export async function getPlatformSummary() {
  const hospitals = await listHospitals();
  return {
    totalHospitals: hospitals.length,
    onlineHospitals: hospitals.filter(h => h.status === "ONLINE").length,
    busyHospitals: hospitals.filter(h => h.status === "BUSY").length,
    emergencySupportHospitals: hospitals.filter(h => h.emergencySupport).length,
  };
}

export async function listPlatformHospitals(): Promise<PlatformHospitalRow[]> {
  const hospitals = await listHospitals();
  const rows: PlatformHospitalRow[] = [];
  for (const h of hospitals) {
    const admin = await primaryHospitalAdmin(h.hospitalId);
    rows.push({
      ...toPublicHospital(h),
      hospitalAdmin: admin ? toPublicStaffUser(admin) : null,
    });
  }
  return rows.sort((a, b) => a.hospitalId.localeCompare(b.hospitalId));
}

export async function getPlatformHospital(hospitalIdOrId: string): Promise<PlatformHospitalRow> {
  const byBiz = await findHospitalByHospitalId(hospitalIdOrId);
  const hospital = byBiz || (await findHospitalById(hospitalIdOrId));
  if (!hospital) throw new PlatformError("Hospital not found", 404, "HOSPITAL_NOT_FOUND");
  const admin = await primaryHospitalAdmin(hospital.hospitalId);
  return {
    ...toPublicHospital(hospital),
    hospitalAdmin: admin ? toPublicStaffUser(admin) : null,
  };
}

export async function createPlatformHospital(input: Record<string, unknown>) {
  const hospitalName = String(input.hospitalName || "").trim();
  const registrationId = String(input.registrationId || "").trim();
  const city = String(input.city || "").trim();
  const state = String(input.state || "").trim();

  if (!hospitalName || !registrationId || !city || !state) {
    throw new PlatformError(
      "hospitalName, registrationId, city, and state are required",
      400,
      "VALIDATION"
    );
  }

  const dupReg = await findHospitalByRegistrationId(registrationId);
  if (dupReg) {
    throw new PlatformError(
      "A hospital with this registration ID already exists",
      409,
      "DUPLICATE_REGISTRATION"
    );
  }

  // Allow optional explicit hospitalId only if free; otherwise allocate next HOSP-NNN
  let hospitalId = String(input.hospitalId || "").trim();
  if (hospitalId) {
    const dupId = await findHospitalByHospitalId(hospitalId);
    if (dupId) {
      throw new PlatformError("A hospital with this hospitalId already exists", 409, "DUPLICATE_HOSPITAL");
    }
  } else {
    hospitalId = await allocateNextHospitalId();
  }

  const statusRaw = String(input.status || "ONLINE");
  const status = normalizeHospitalStatus(statusRaw);
  if (!status) {
    throw new PlatformError("Invalid status. Use ONLINE, BUSY, or OFFLINE.", 400, "INVALID_STATUS");
  }

  try {
    const hospital = await createHospital({
      hospitalId,
      hospitalName,
      registrationId,
      address: String(input.address || "").trim(),
      city,
      state,
      contactPhone: String(input.contactPhone || "").trim(),
      contactEmail: String(input.contactEmail || "").trim().toLowerCase(),
      departments: parseList(input.departments),
      facilities: parseList(input.facilities),
      emergencySupport: input.emergencySupport !== false && input.emergencySupport !== "false",
      status,
      isLocal: false,
    });
    return {
      ...toPublicHospital(hospital),
      hospitalAdmin: null,
    };
  } catch (err: unknown) {
    const statusCode = (err as { status?: number }).status || 500;
    const code = (err as { code?: string }).code || "CREATE_FAILED";
    throw new PlatformError(
      err instanceof Error ? err.message : "Failed to create hospital",
      statusCode,
      code
    );
  }
}

export async function updatePlatformHospital(hospitalIdOrId: string, input: Record<string, unknown>) {
  const byBiz = await findHospitalByHospitalId(hospitalIdOrId);
  const existing = byBiz || (await findHospitalById(hospitalIdOrId));
  if (!existing) throw new PlatformError("Hospital not found", 404, "HOSPITAL_NOT_FOUND");

  if (input.registrationId !== undefined) {
    const nextReg = String(input.registrationId).trim();
    if (nextReg) {
      const dup = await findHospitalByRegistrationId(nextReg);
      if (dup && dup.id !== existing.id) {
        throw new PlatformError(
          "A hospital with this registration ID already exists",
          409,
          "DUPLICATE_REGISTRATION"
        );
      }
    }
  }

  const patch: Parameters<typeof updateHospital>[1] = {};
  if (input.hospitalName !== undefined) patch.hospitalName = String(input.hospitalName).trim();
  if (input.registrationId !== undefined) patch.registrationId = String(input.registrationId).trim();
  if (input.address !== undefined) patch.address = String(input.address).trim();
  if (input.city !== undefined) patch.city = String(input.city).trim();
  if (input.state !== undefined) patch.state = String(input.state).trim();
  if (input.contactPhone !== undefined) patch.contactPhone = String(input.contactPhone).trim();
  if (input.contactEmail !== undefined) {
    patch.contactEmail = String(input.contactEmail).trim().toLowerCase();
  }
  if (input.departments !== undefined) patch.departments = parseList(input.departments);
  if (input.facilities !== undefined) patch.facilities = parseList(input.facilities);
  if (input.emergencySupport !== undefined) {
    patch.emergencySupport = Boolean(input.emergencySupport);
  }
  if (input.status !== undefined) {
    const status = normalizeHospitalStatus(String(input.status));
    if (!status) {
      throw new PlatformError("Invalid status. Use ONLINE, BUSY, or OFFLINE.", 400, "INVALID_STATUS");
    }
    patch.status = status;
  }

  // Never allow client to change hospitalId / isLocal via platform patch
  const updated = await updateHospital(existing.id, patch);
  if (!updated) throw new PlatformError("Hospital not found", 404, "HOSPITAL_NOT_FOUND");
  const admin = await primaryHospitalAdmin(updated.hospitalId);
  return {
    ...toPublicHospital(updated),
    hospitalAdmin: admin ? toPublicStaffUser(admin) : null,
  };
}

export async function assignHospitalAdmin(
  hospitalIdOrId: string,
  input: {
    fullName: string;
    email: string;
    department?: string;
    staffId: string;
    temporaryPassword?: string;
  }
) {
  const byBiz = await findHospitalByHospitalId(hospitalIdOrId);
  const hospital = byBiz || (await findHospitalById(hospitalIdOrId));
  if (!hospital) throw new PlatformError("Hospital not found", 404, "HOSPITAL_NOT_FOUND");

  try {
    const result = await createHospitalAdminAccount({
      fullName: input.fullName,
      email: input.email,
      department: input.department || "Administration",
      staffId: input.staffId,
      temporaryPassword: input.temporaryPassword,
      hospitalId: hospital.hospitalId,
    });
    return {
      hospital: toPublicHospital(hospital),
      admin: toPublicStaffUser(result.user),
      linkedExistingFirebase: result.linkedExistingFirebase,
      createdFirebase: result.createdFirebase,
    };
  } catch (err) {
    if (err instanceof AuthError) {
      throw new PlatformError(err.message, err.status, err.code);
    }
    throw err;
  }
}

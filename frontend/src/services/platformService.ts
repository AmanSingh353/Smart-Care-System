import { api } from "./api";
import type { Hospital, HospitalStatus } from "./networkService";
import type { StaffProfile } from "./authService";

export type PlatformHospital = Hospital & {
  hospitalAdmin: StaffProfile | null;
};

export type PlatformSummary = {
  totalHospitals: number;
  onlineHospitals: number;
  busyHospitals: number;
  emergencySupportHospitals: number;
};

function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export const platformService = {
  getSummary: (token: string) =>
    api.get<{ summary: PlatformSummary }>("/api/platform/summary", auth(token)),

  listHospitals: (token: string) =>
    api.get<{ hospitals: PlatformHospital[] }>("/api/platform/hospitals", auth(token)),

  getHospital: (token: string, hospitalId: string) =>
    api.get<{ hospital: PlatformHospital }>(
      `/api/platform/hospitals/${encodeURIComponent(hospitalId)}`,
      auth(token)
    ),

  createHospital: (
    token: string,
    body: {
      hospitalName: string;
      registrationId: string;
      city: string;
      state: string;
      address?: string;
      contactPhone?: string;
      contactEmail?: string;
      departments?: string[];
      facilities?: string[];
      emergencySupport?: boolean;
      status?: HospitalStatus;
    }
  ) =>
    api.post<{ hospital: PlatformHospital; message: string }>(
      "/api/platform/hospitals",
      body,
      auth(token)
    ),

  updateHospital: (
    token: string,
    hospitalId: string,
    body: Partial<{
      hospitalName: string;
      registrationId: string;
      address: string;
      city: string;
      state: string;
      contactPhone: string;
      contactEmail: string;
      departments: string[];
      facilities: string[];
      emergencySupport: boolean;
      status: HospitalStatus;
    }>
  ) =>
    api.patch<{ hospital: PlatformHospital; message: string }>(
      `/api/platform/hospitals/${encodeURIComponent(hospitalId)}`,
      body,
      auth(token)
    ),

  assignAdmin: (
    token: string,
    hospitalId: string,
    body: {
      fullName: string;
      email: string;
      department?: string;
      staffId: string;
      temporaryPassword?: string;
    }
  ) =>
    api.post<{
      hospital: Hospital;
      admin: StaffProfile;
      linkedExistingFirebase: boolean;
      createdFirebase: boolean;
      message: string;
    }>(`/api/platform/hospitals/${encodeURIComponent(hospitalId)}/admin`, body, auth(token)),
};

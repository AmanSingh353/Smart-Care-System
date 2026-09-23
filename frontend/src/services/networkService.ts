import { api, ApiError } from "./api";

export type HospitalStatus = "ONLINE" | "BUSY" | "OFFLINE";
export type AssistancePriority = "CRITICAL" | "HIGH" | "NORMAL";
export type AssistanceStatus =
  | "PENDING"
  | "ACCEPTED"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "CANCELLED"
  | "REJECTED";

export interface Hospital {
  id: string;
  hospitalId: string;
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
  isLocal: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AssistanceRequest {
  id: string;
  requestId: string;
  requestingHospitalId: string;
  targetHospitalId: string;
  requestingStaffId: string;
  requestingStaffName: string;
  priority: AssistancePriority;
  emergencyType: string;
  requiredDepartment: string;
  requiredFacilities: string[];
  shortDescription: string;
  patientReference: string;
  status: AssistanceStatus;
  createdAt: string;
  updatedAt: string;
}

export interface NetworkSummary {
  localHospital: Hospital | null;
  connectedHospitalCount: number;
  hospitalsOnline: number;
  activeEmergencyRequests: number;
  pendingAssistanceRequests: number;
  acceptedRequests: number;
  inProgressRequests: number;
  resolvedRequests: number;
  outgoingActive: number;
  incomingPending: number;
}

function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export function formatNetworkError(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return "Something went wrong. Please try again.";
}

export const networkService = {
  getSummary: (token: string) =>
    api.get<{ summary: NetworkSummary }>("/api/hospitals/summary", auth(token)),

  listHospitals: (
    token: string,
    query?: { search?: string; specialty?: string; status?: string; includeLocal?: boolean }
  ) => {
    const params = new URLSearchParams();
    if (query?.search) params.set("search", query.search);
    if (query?.specialty) params.set("specialty", query.specialty);
    if (query?.status) params.set("status", query.status);
    if (query?.includeLocal) params.set("includeLocal", "true");
    const qs = params.toString();
    return api.get<{ hospitals: Hospital[] }>(
      `/api/hospitals${qs ? `?${qs}` : ""}`,
      auth(token)
    );
  },

  getHospital: (token: string, id: string) =>
    api.get<{ hospital: Hospital }>(`/api/hospitals/${encodeURIComponent(id)}`, auth(token)),

  registerHospital: (
    token: string,
    body: {
      hospitalId: string;
      hospitalName: string;
      registrationId?: string;
      address?: string;
      city?: string;
      state?: string;
      contactPhone?: string;
      contactEmail?: string;
      departments?: string[];
      facilities?: string[];
      emergencySupport?: boolean;
      status?: HospitalStatus;
    }
  ) =>
    api.post<{ hospital: Hospital; message: string }>("/api/hospitals", body, auth(token)),

  updateHospital: (
    token: string,
    id: string,
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
    api.patch<{ hospital: Hospital; message: string }>(
      `/api/hospitals/${encodeURIComponent(id)}`,
      body,
      auth(token)
    ),

  listAssistance: (token: string, query?: { scope?: string; status?: string }) => {
    const params = new URLSearchParams();
    if (query?.scope) params.set("scope", query.scope);
    if (query?.status) params.set("status", query.status);
    const qs = params.toString();
    return api.get<{ requests: AssistanceRequest[] }>(
      `/api/assistance-requests${qs ? `?${qs}` : ""}`,
      auth(token)
    );
  },

  createAssistance: (
    token: string,
    body: {
      targetHospitalId: string;
      priority: AssistancePriority;
      emergencyType: string;
      requiredDepartment: string;
      requiredFacilities?: string[];
      shortDescription?: string;
      patientReference?: string;
    }
  ) =>
    api.post<{ request: AssistanceRequest; message: string }>(
      "/api/assistance-requests",
      body,
      auth(token)
    ),

  updateAssistanceStatus: (token: string, id: string, status: AssistanceStatus) =>
    api.patch<{ request: AssistanceRequest; message: string }>(
      `/api/assistance-requests/${encodeURIComponent(id)}/status`,
      { status },
      auth(token)
    ),
};

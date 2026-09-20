import { api, ApiError } from "./api";
import type { Patient } from "@/data/mockData";
import type { CareGuardSignal } from "@/careguard/types";

function authHeaders(): HeadersInit {
  try {
    const raw = sessionStorage.getItem("scs30-auth");
    if (!raw) return {};
    const parsed = JSON.parse(raw) as { role?: string; patientId?: string };
    const h: Record<string, string> = {};
    if (parsed.role) {
      h["x-scs-role"] = parsed.role;
      h["x-scs-actor"] = parsed.role;
      h.Authorization = `Bearer ${btoa(JSON.stringify({ role: parsed.role, patientId: parsed.patientId }))}`;
    }
    if (parsed.patientId) h["x-scs-patient-id"] = parsed.patientId;
    return h;
  } catch {
    return {};
  }
}

function toSnapshot(p: Patient) {
  return {
    id: p.id,
    name: p.name,
    allergies: p.allergies,
    treatmentStatus: p.treatmentStatus,
    billStatus: p.billStatus,
    medicines: p.medicines.map(m => ({
      id: m.id,
      name: m.name,
      dispensed: m.dispensed,
      schedule: m.schedule.map(s => ({
        time: s.time,
        given: s.given,
        givenAt: s.givenAt,
        dueAt: s.dueAt,
      })),
    })),
    tests: p.tests.map(t => ({
      id: t.id,
      name: t.name,
      status: t.status,
      result: t.result,
      requestedAt: t.requestedAt,
      requestedAtIso: t.requestedAtIso,
      completedAt: t.completedAt,
      isCritical: t.isCritical,
      reviewedAt: t.reviewedAt,
      reviewedBy: t.reviewedBy,
    })),
    billItems: p.billItems.map(b => ({ id: b.id })),
  };
}

async function withAuth<T>(path: string, options: RequestInit = {}): Promise<T | null> {
  try {
    const url = `${api.baseUrl.replace(/\/$/, "")}${path}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
        ...(options.headers || {}),
      },
    });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) return null;
      throw new ApiError(`CareGuard API ${res.status}`, res.status);
    }
    return (await res.json()) as T;
  } catch {
    // Backend optional for local demo — silent fail
    return null;
  }
}

export const careguardService = {
  async syncPatients(patients: Patient[]) {
    return withAuth<{ evaluated: number; summary: unknown }>("/api/careguard/sync", {
      method: "POST",
      body: JSON.stringify({ patients: patients.map(toSnapshot) }),
    });
  },

  async getSummary() {
    return withAuth<{
      open: number;
      highPriority: number;
      awaitingReview: number;
      resolvedToday: number;
      byRole: Record<string, number>;
      signals: CareGuardSignal[];
    }>("/api/careguard/summary");
  },

  async getPatientSignals(patientId: string) {
    return withAuth<{ signals: CareGuardSignal[] }>(`/api/careguard/patient/${patientId}`);
  },

  async acknowledge(signalId: string) {
    return withAuth<{ signal: CareGuardSignal }>(`/api/careguard/${signalId}/acknowledge`, {
      method: "POST",
      body: "{}",
    });
  },

  async resolve(signalId: string) {
    return withAuth<{ signal: CareGuardSignal }>(`/api/careguard/${signalId}/resolve`, {
      method: "POST",
      body: "{}",
    });
  },

  async dismiss(signalId: string) {
    return withAuth<{ signal: CareGuardSignal }>(`/api/careguard/${signalId}/dismiss`, {
      method: "POST",
      body: "{}",
    });
  },
};

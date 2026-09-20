import api from "./api";

export interface HealthResponse {
  status: string;
  service: string;
  timestamp: string;
}

/** Optional connectivity probe — does not affect PatientContext. */
export async function checkBackendHealth(): Promise<HealthResponse> {
  return api.get<HealthResponse>("/api/health");
}

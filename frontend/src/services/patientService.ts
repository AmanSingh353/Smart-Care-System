import api from "./api";

/** Placeholder patient API module — unused by UI until backend migration. */
export const patientService = {
  list: () => api.get<{ message: string }>("/api/patients"),
  getById: (id: string) => api.get<{ message: string }>(`/api/patients/${id}`),
};

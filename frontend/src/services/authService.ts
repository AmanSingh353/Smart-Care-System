import api from "./api";

/** Placeholder auth API module — AuthContext remains demo/local for now. */
export const authService = {
  status: () => api.get<{ message: string }>("/api/auth"),
};

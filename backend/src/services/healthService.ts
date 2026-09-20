import { okMessage } from "../utils/response";

export const healthService = {
  getStatus() {
    return {
      status: "ok",
      service: "Smart Care System",
      timestamp: new Date().toISOString(),
    };
  },
};

export const placeholderService = {
  describe(resource: string) {
    return okMessage(resource);
  },
};

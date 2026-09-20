import { okMessage } from "../utils/response";

export const healthService = {
  getStatus() {
    return {
      status: "ok",
      service: "scs30-backend",
      timestamp: new Date().toISOString(),
    };
  },
};

export const placeholderService = {
  describe(resource: string) {
    return okMessage(resource);
  },
};

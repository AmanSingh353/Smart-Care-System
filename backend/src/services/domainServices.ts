import { placeholderService } from "./healthService";

/** Domain services — stubs until Phase 3 persistence. */
export const authService = {
  status: () => ({
    ...placeholderService.describe("Auth"),
    mode: "firebase",
  }),
};

export const patientService = {
  list: () => placeholderService.describe("Patients"),
};

export const doctorService = {
  status: () => placeholderService.describe("Doctors"),
};

export const nurseService = {
  status: () => placeholderService.describe("Nurses"),
};

export const labService = {
  status: () => placeholderService.describe("Lab"),
};

export const pharmacyService = {
  status: () => placeholderService.describe("Pharmacy"),
};

export const billingService = {
  status: () => placeholderService.describe("Billing"),
};

export const familyService = {
  status: () => placeholderService.describe("Family"),
};

export const adminService = {
  status: () => placeholderService.describe("Admin"),
};

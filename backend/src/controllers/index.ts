import { Request, Response } from "express";
import { healthService } from "../services/healthService";
import {
  authService,
  patientService,
  doctorService,
  nurseService,
  labService,
  pharmacyService,
  billingService,
  familyService,
  adminService,
} from "../services/domainServices";

export const healthController = {
  get(_req: Request, res: Response) {
    res.json(healthService.getStatus());
  },
};

export const authController = {
  status(_req: Request, res: Response) {
    res.json(authService.status());
  },
};

export const patientController = {
  list(_req: Request, res: Response) {
    res.json(patientService.list());
  },
};

export const doctorController = {
  status(_req: Request, res: Response) {
    res.json(doctorService.status());
  },
};

export const nurseController = {
  status(_req: Request, res: Response) {
    res.json(nurseService.status());
  },
};

export const labController = {
  status(_req: Request, res: Response) {
    res.json(labService.status());
  },
};

export const pharmacyController = {
  status(_req: Request, res: Response) {
    res.json(pharmacyService.status());
  },
};

export const billingController = {
  status(_req: Request, res: Response) {
    res.json(billingService.status());
  },
};

export const familyController = {
  status(_req: Request, res: Response) {
    res.json(familyService.status());
  },
};

export const adminController = {
  status(_req: Request, res: Response) {
    res.json(adminService.status());
  },
};

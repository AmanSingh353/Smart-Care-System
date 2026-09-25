import { Request, Response } from "express";
import {
  PlatformError,
  assignHospitalAdmin,
  createPlatformHospital,
  getPlatformHospital,
  getPlatformSummary,
  listPlatformHospitals,
  updatePlatformHospital,
} from "../services/platformService";

function handleError(res: Response, err: unknown) {
  if (err instanceof PlatformError) {
    return res.status(err.status).json({ error: err.code, message: err.message });
  }
  const status = (err as { status?: number }).status || 500;
  const code = (err as { code?: string }).code || "ERROR";
  const message = err instanceof Error ? err.message : "Unexpected error";
  return res.status(status).json({ error: code, message });
}

export const platformController = {
  async summary(_req: Request, res: Response) {
    try {
      const summary = await getPlatformSummary();
      return res.json({ summary });
    } catch (err) {
      return handleError(res, err);
    }
  },

  async list(_req: Request, res: Response) {
    try {
      const hospitals = await listPlatformHospitals();
      return res.json({ hospitals });
    } catch (err) {
      return handleError(res, err);
    }
  },

  async get(req: Request, res: Response) {
    try {
      const hospital = await getPlatformHospital(String(req.params.hospitalId || ""));
      return res.json({ hospital });
    } catch (err) {
      return handleError(res, err);
    }
  },

  async create(req: Request, res: Response) {
    try {
      const hospital = await createPlatformHospital(req.body || {});
      return res.status(201).json({
        hospital,
        message: `Hospital ${hospital.hospitalName} registered (${hospital.hospitalId}).`,
      });
    } catch (err) {
      return handleError(res, err);
    }
  },

  async update(req: Request, res: Response) {
    try {
      const hospital = await updatePlatformHospital(String(req.params.hospitalId || ""), req.body || {});
      return res.json({ hospital, message: "Hospital updated." });
    } catch (err) {
      return handleError(res, err);
    }
  },

  async assignAdmin(req: Request, res: Response) {
    try {
      const body = req.body || {};
      const result = await assignHospitalAdmin(String(req.params.hospitalId || ""), {
        fullName: String(body.fullName || ""),
        email: String(body.email || ""),
        department: String(body.department || "Administration"),
        staffId: String(body.staffId || ""),
        temporaryPassword:
          typeof body.temporaryPassword === "string" ? body.temporaryPassword : undefined,
      });
      return res.status(201).json({
        ...result,
        message: result.createdFirebase
          ? "Hospital Admin created with a new Firebase account."
          : result.linkedExistingFirebase
            ? "Hospital Admin linked to an existing Firebase account."
            : "Hospital Admin assigned.",
      });
    } catch (err) {
      return handleError(res, err);
    }
  },
};

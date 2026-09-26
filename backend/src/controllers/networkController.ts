import { Request, Response } from "express";
import {
  NetworkError,
  changeAssistanceStatus,
  createAssistance,
  getAssistancePatientRecord,
  getAssistancePatientSummary,
  getAssistancePublic,
  getHospitalPublic,
  getNetworkSummary,
  listAssistance,
  listConnectedHospitals,
  patchHospital,
  registerConnectedHospital,
} from "../services/networkService";

function handleError(res: Response, err: unknown) {
  if (err instanceof NetworkError) {
    return res.status(err.status).json({ error: err.code, message: err.message });
  }
  const status = (err as { status?: number }).status || 500;
  const code = (err as { code?: string }).code || "ERROR";
  const message = err instanceof Error ? err.message : "Unexpected error";
  return res.status(status).json({ error: code, message });
}

function actorHospitalId(req: Request): string | null {
  return req.staffUser?.hospitalId || req.user?.hospitalId || null;
}

export const hospitalController = {
  async summary(req: Request, res: Response) {
    try {
      const summary = await getNetworkSummary(actorHospitalId(req));
      return res.json({ summary });
    } catch (err) {
      return handleError(res, err);
    }
  },

  async list(req: Request, res: Response) {
    try {
      const includeLocal = String(req.query.includeLocal || "") === "true";
      const hospitals = await listConnectedHospitals({
        search: String(req.query.search || ""),
        specialty: String(req.query.specialty || ""),
        status: String(req.query.status || ""),
        includeLocal,
        excludeHospitalId: includeLocal ? null : actorHospitalId(req),
      });
      return res.json({ hospitals });
    } catch (err) {
      return handleError(res, err);
    }
  },

  async get(req: Request, res: Response) {
    try {
      const hospital = await getHospitalPublic(String(req.params.id || ""));
      return res.json({ hospital });
    } catch (err) {
      return handleError(res, err);
    }
  },

  async create(req: Request, res: Response) {
    try {
      if (!req.user?.isPlatformAdmin) {
        return res.status(403).json({
          error: "Forbidden",
          message: "Only platform administrators can register hospitals on the network",
        });
      }
      const hospital = await registerConnectedHospital(req.body || {});
      return res.status(201).json({ hospital, message: "Hospital registered on the network." });
    } catch (err) {
      return handleError(res, err);
    }
  },

  async update(req: Request, res: Response) {
    try {
      if (!req.user?.isPlatformAdmin && req.user?.role !== "admin") {
        return res.status(403).json({ error: "Forbidden", message: "Admin only" });
      }
      const hospital = await patchHospital(String(req.params.id || ""), req.body || {}, {
        hospitalId: actorHospitalId(req),
        isPlatformAdmin: Boolean(req.user?.isPlatformAdmin),
      });
      return res.json({ hospital, message: "Hospital updated." });
    } catch (err) {
      return handleError(res, err);
    }
  },
};

export const assistanceController = {
  async list(req: Request, res: Response) {
    try {
      const requests = await listAssistance({
        scope: String(req.query.scope || ""),
        status: String(req.query.status || ""),
        isPlatformAdmin: Boolean(req.user?.isPlatformAdmin),
        actorHospitalId: actorHospitalId(req),
      });
      return res.json({ requests });
    } catch (err) {
      return handleError(res, err);
    }
  },

  async get(req: Request, res: Response) {
    try {
      const request = await getAssistancePublic(String(req.params.id || ""), {
        hospitalId: actorHospitalId(req),
        isPlatformAdmin: Boolean(req.user?.isPlatformAdmin),
      });
      return res.json({ request });
    } catch (err) {
      return handleError(res, err);
    }
  },

  async create(req: Request, res: Response) {
    try {
      if (!req.staffUser) {
        return res.status(401).json({ error: "UNAUTHORIZED", message: "Not authenticated" });
      }
      const role = req.user?.role;
      if (!role || !["admin", "doctor", "nurse"].includes(role)) {
        return res.status(403).json({
          error: "Forbidden",
          message: "Only doctors, nurses, or admins can create assistance requests",
        });
      }
      if (!req.staffUser.hospitalId) {
        return res.status(403).json({
          error: "HOSPITAL_UNASSIGNED",
          message: "Your account is not assigned to a hospital.",
        });
      }
      const request = await createAssistance(req.body || {}, {
        staffId: req.staffUser.staffId,
        fullName: req.staffUser.fullName,
        hospitalId: req.staffUser.hospitalId,
      });
      return res.status(201).json({ request, message: "Assistance request created." });
    } catch (err) {
      return handleError(res, err);
    }
  },

  async updateStatus(req: Request, res: Response) {
    try {
      if (!req.staffUser || !req.user) {
        return res.status(401).json({ error: "UNAUTHORIZED", message: "Not authenticated" });
      }
      const status = String((req.body || {}).status || "");
      const request = await changeAssistanceStatus(String(req.params.id || ""), status, {
        role: req.user.role,
        staffId: req.staffUser.staffId,
        hospitalId: req.staffUser.hospitalId,
        isPlatformAdmin: Boolean(req.user.isPlatformAdmin),
      });
      return res.json({ request, message: `Request marked ${request.status}.` });
    } catch (err) {
      return handleError(res, err);
    }
  },

  /** Level 1 — emergency handover summary (requester or target). */
  async patientSummary(req: Request, res: Response) {
    try {
      const data = await getAssistancePatientSummary(String(req.params.id || ""), {
        hospitalId: actorHospitalId(req),
        isPlatformAdmin: Boolean(req.user?.isPlatformAdmin),
      });
      return res.json(data);
    } catch (err) {
      return handleError(res, err);
    }
  },

  /** Level 2 — expanded patient record (target + active grant only). */
  async patientRecord(req: Request, res: Response) {
    try {
      const data = await getAssistancePatientRecord(String(req.params.id || ""), {
        hospitalId: actorHospitalId(req),
        isPlatformAdmin: Boolean(req.user?.isPlatformAdmin),
      });
      return res.json(data);
    } catch (err) {
      return handleError(res, err);
    }
  },
};

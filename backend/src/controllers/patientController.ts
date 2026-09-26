import { Request, Response } from "express";
import {
  createPatient,
  findPatientByPatientId,
  listPatients,
  toPublicPatient,
} from "../services/patientStore";

function handleError(res: Response, err: unknown) {
  const status = (err as { status?: number }).status || 500;
  const code = (err as { code?: string }).code || "ERROR";
  const message = err instanceof Error ? err.message : "Unexpected error";
  return res.status(status).json({ error: code, message });
}

function actorHospitalId(req: Request): string | null {
  return req.staffUser?.hospitalId || req.user?.hospitalId || null;
}

/**
 * Patients are hospital-scoped for direct lookup.
 * Cross-hospital expanded access goes through CareGuard assistance-request endpoints + grants.
 */
export const networkPatientController = {
  async list(req: Request, res: Response) {
    try {
      const hospitalId = actorHospitalId(req);
      if (!hospitalId && !req.user?.isPlatformAdmin) {
        return res.status(403).json({
          error: "HOSPITAL_UNASSIGNED",
          message: "Your account is not assigned to a hospital.",
        });
      }
      const search = String(req.query.search || req.query.q || "").trim();
      const patients = await listPatients({
        homeHospitalId: req.user?.isPlatformAdmin
          ? String(req.query.hospitalId || hospitalId || "").trim() || undefined
          : hospitalId || undefined,
        search: search || undefined,
      });
      return res.json({ patients: patients.map(toPublicPatient) });
    } catch (err) {
      return handleError(res, err);
    }
  },

  async getByPatientId(req: Request, res: Response) {
    try {
      const patientId = String(req.params.patientId || "").trim();
      if (!patientId) {
        return res.status(400).json({ error: "VALIDATION", message: "patientId is required" });
      }
      const patient = await findPatientByPatientId(patientId);
      if (!patient) {
        return res.status(404).json({ error: "PATIENT_NOT_FOUND", message: "Patient not found" });
      }

      const hospitalId = actorHospitalId(req);
      const isOwnHospital = Boolean(hospitalId && patient.homeHospitalId === hospitalId);
      if (!req.user?.isPlatformAdmin && !isOwnHospital) {
        return res.status(403).json({
          error: "FORBIDDEN",
          message:
            "You cannot access this patient record by ID alone. Expanded access requires an active CareGuard grant.",
        });
      }

      return res.json({ patient: toPublicPatient(patient) });
    } catch (err) {
      return handleError(res, err);
    }
  },

  async create(req: Request, res: Response) {
    try {
      const hospitalId = actorHospitalId(req);
      if (!hospitalId) {
        return res.status(403).json({
          error: "HOSPITAL_UNASSIGNED",
          message: "Your account is not assigned to a hospital.",
        });
      }
      const role = req.user?.role;
      if (!role || !["admin", "doctor", "nurse", "reception"].includes(role)) {
        return res.status(403).json({
          error: "Forbidden",
          message: "Your role cannot register patients",
        });
      }

      const body = req.body || {};
      const medsRaw = body.currentMedications;
      const meds = Array.isArray(medsRaw)
        ? medsRaw.map(String)
        : typeof medsRaw === "string"
          ? medsRaw.split(/[,;]/).map((s: string) => s.trim()).filter(Boolean)
          : [];

      const patient = await createPatient({
        fullName: String(body.fullName || body.name || "").trim(),
        homeHospitalId: hospitalId,
        dateOfBirth: String(body.dateOfBirth || "").trim(),
        age: body.age == null || body.age === "" ? null : Number(body.age),
        gender: String(body.gender || "").trim(),
        bloodGroup: String(body.bloodGroup || "").trim(),
        phone: String(body.phone || "").trim(),
        allergies: String(body.allergies || "").trim(),
        currentMedications: meds,
        currentCondition: String(body.currentCondition || body.symptoms || "").trim(),
        diagnosis: String(body.diagnosis || "").trim(),
        relevantVitals: String(body.relevantVitals || "").trim(),
        relevantReports: String(body.relevantReports || "").trim(),
        clinicalSummary: String(body.clinicalSummary || "").trim(),
        patientId: body.patientId ? String(body.patientId).trim() : undefined,
      });

      return res.status(201).json({
        patient: toPublicPatient(patient),
        message: `Patient registered with ID ${patient.patientId}`,
      });
    } catch (err) {
      return handleError(res, err);
    }
  },
};

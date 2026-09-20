import { Request, Response } from "express";
import {
  getPatientSignals,
  getRoleSignals,
  getCareGuardSummary,
  acknowledgeSignal,
  resolveSignal,
  dismissSignal,
  evaluateAllPatients,
  careGuardEngine,
} from "../services/careGuardService";
import { canAccessPatient, mapFrontendRoleToCareGuard } from "../../middleware/auth";
import { getCareGuardAuditLog } from "../services/auditService";
import type { CareGuardPatientSnapshot } from "../types";

/** In-memory patient snapshots pushed by sync endpoint / demo seed */
const patientStore = new Map<string, CareGuardPatientSnapshot>();

export function upsertPatientSnapshot(p: CareGuardPatientSnapshot) {
  patientStore.set(p.id.toUpperCase(), p);
}

export function getPatientSnapshots() {
  return [...patientStore.values()];
}

export const careGuardController = {
  getPatientSignals(req: Request, res: Response) {
    const patientId = String(req.params.patientId || "").toUpperCase();
    if (!canAccessPatient(req, patientId)) {
      return res.status(403).json({ error: "Forbidden", message: "Cannot access this patient's signals" });
    }
    // Family must not receive internal CareGuard signals
    if (req.user?.role === "family") {
      return res.status(403).json({
        error: "Forbidden",
        message: "Internal CareGuard signals are not available to family users",
      });
    }
    return res.json({ signals: getPatientSignals(patientId) });
  },

  getRoleSignals(req: Request, res: Response) {
    const roleParam = String(req.params.role || "").toLowerCase();
    const requester = req.user?.role;
    if (!requester || requester === "family") {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (requester !== "admin" && requester !== roleParam) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You may only request signals for your own role",
      });
    }
    const cgRole = mapFrontendRoleToCareGuard(roleParam === "admin" ? "admin" : roleParam);
    return res.json({ role: cgRole, signals: getRoleSignals(cgRole) });
  },

  getSummary(req: Request, res: Response) {
    if (!req.user || req.user.role === "family") {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (req.user.role !== "admin" && req.user.role !== "doctor" && req.user.role !== "nurse") {
      // Role-scoped summary: filter
      const roleSignals = getRoleSignals(mapFrontendRoleToCareGuard(req.user.role));
      return res.json({
        open: roleSignals.length,
        highPriority: roleSignals.filter(s => s.severity === "HIGH" || s.severity === "CRITICAL").length,
        awaitingReview: roleSignals.filter(s =>
          ["LAB_REVIEW_PENDING", "CRITICAL_RESULT_REVIEW", "ALLERGY_PRESCRIPTION_REVIEW"].includes(s.type)
        ).length,
        resolvedToday: 0,
        byRole: { [mapFrontendRoleToCareGuard(req.user.role)]: roleSignals.length },
        signals: roleSignals,
      });
    }
    return res.json(getCareGuardSummary());
  },

  acknowledge(req: Request, res: Response) {
    const signal = careGuardEngine.getById(req.params.signalId);
    if (!signal) return res.status(404).json({ error: "Not found" });
    if (!canAccessPatient(req, signal.patientId)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const actor = req.user?.name || req.user?.role || "staff";
    const updated = acknowledgeSignal(signal.id, actor);
    return res.json({ signal: updated });
  },

  resolve(req: Request, res: Response) {
    const signal = careGuardEngine.getById(req.params.signalId);
    if (!signal) return res.status(404).json({ error: "Not found" });
    if (!canAccessPatient(req, signal.patientId)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const actor = req.user?.name || req.user?.role || "staff";
    const updated = resolveSignal(signal.id, actor);
    return res.json({ signal: updated });
  },

  dismiss(req: Request, res: Response) {
    const signal = careGuardEngine.getById(req.params.signalId);
    if (!signal) return res.status(404).json({ error: "Not found" });
    if (!canAccessPatient(req, signal.patientId)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const actor = req.user?.name || req.user?.role || "staff";
    const updated = dismissSignal(signal.id, actor);
    return res.json({ signal: updated });
  },

  /** Sync patient snapshots from frontend/demo and re-evaluate */
  syncPatients(req: Request, res: Response) {
    if (!req.user || req.user.role === "family") {
      return res.status(403).json({ error: "Forbidden" });
    }
    const patients = (req.body?.patients || []) as CareGuardPatientSnapshot[];
    if (!Array.isArray(patients)) {
      return res.status(400).json({ error: "patients array required" });
    }
    for (const p of patients) {
      if (p?.id) upsertPatientSnapshot(p);
    }
    const touched = evaluateAllPatients(getPatientSnapshots());
    return res.json({
      evaluated: getPatientSnapshots().length,
      signalsTouched: touched.length,
      summary: getCareGuardSummary(),
    });
  },

  audit(req: Request, res: Response) {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }
    return res.json({ audit: getCareGuardAuditLog() });
  },

  /** Admin-only demo reset of in-memory CareGuard store (no production DB). */
  resetDemo(req: Request, res: Response) {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ error: "Forbidden", message: "Admin only" });
    }
    careGuardEngine.reset([]);
    const patients = (req.body?.patients || []) as CareGuardPatientSnapshot[];
    if (Array.isArray(patients) && patients.length) {
      for (const p of patients) {
        if (p?.id) upsertPatientSnapshot(p);
      }
      evaluateAllPatients(getPatientSnapshots());
    }
    return res.json({
      message: "Demo CareGuard state reset",
      summary: getCareGuardSummary(),
    });
  },
};

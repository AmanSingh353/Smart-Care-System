import { Request, Response } from "express";
import {
  AuthError,
  authStatusPayload,
  createStaffAccount,
  listStaff,
  resolveStaffSession,
  toPublicStaffUser,
} from "../services/staffAuthService";
import { updateStaffUser, findById } from "../services/userStore";
import { normalizeStaffRole } from "../models/User";

function handleAuthError(res: Response, err: unknown) {
  if (err instanceof AuthError) {
    return res.status(err.status).json({ error: err.code, message: err.message });
  }
  const status = (err as { status?: number }).status || 500;
  const message = err instanceof Error ? err.message : "Unexpected error";
  return res.status(status).json({ error: "ERROR", message });
}

export const staffAuthController = {
  status(_req: Request, res: Response) {
    res.json(authStatusPayload());
  },

  /** Exchange Firebase ID token for Smart Care System profile + authoritative role */
  async session(req: Request, res: Response) {
    try {
      const header = req.header("authorization") || "";
      const token = header.startsWith("Bearer ") ? header.slice(7).trim() : (req.body?.idToken as string | undefined);
      if (!token) {
        return res.status(401).json({ error: "UNAUTHORIZED", message: "Missing Firebase ID token" });
      }
      const { user, firebase } = await resolveStaffSession(token);
      return res.json({
        user: toPublicStaffUser(user),
        role: user.role,
        firebase: { uid: firebase.uid, email: firebase.email },
      });
    } catch (err) {
      return handleAuthError(res, err);
    }
  },

  async listStaff(req: Request, res: Response) {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ error: "Forbidden", message: "Admin only" });
      }
      const staff = await listStaff();
      return res.json({ staff });
    } catch (err) {
      return handleAuthError(res, err);
    }
  },

  async createStaff(req: Request, res: Response) {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ error: "Forbidden", message: "Admin only" });
      }
      const { fullName, email, role, department, staffId, status, temporaryPassword } = req.body || {};
      const result = await createStaffAccount({
        fullName,
        email,
        role,
        department: department || "",
        staffId,
        status,
        temporaryPassword,
      });
      return res.status(201).json({
        user: toPublicStaffUser(result.user),
        /** Returned once when Firebase Admin created the identity — never persisted in MongoDB */
        temporaryPassword: result.temporaryPassword,
        message: result.temporaryPassword
          ? "Staff created. Share the temporary password securely; it is not stored by Smart Care System."
          : "Staff record created. Link Firebase identity on first login if Auth user already exists.",
      });
    } catch (err) {
      return handleAuthError(res, err);
    }
  },

  async updateStaff(req: Request, res: Response) {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ error: "Forbidden", message: "Admin only" });
      }
      const id = String(req.params.id || "");
      const existing = await findById(id);
      if (!existing) {
        return res.status(404).json({ error: "NOT_FOUND", message: "Staff user not found" });
      }
      const { fullName, role, department, staffId, status } = req.body || {};
      const patch: Record<string, string> = {};
      if (typeof fullName === "string") patch.fullName = fullName;
      if (typeof department === "string") patch.department = department;
      if (typeof staffId === "string") patch.staffId = staffId;
      if (typeof status === "string" && ["ACTIVE", "DISABLED", "INVITED"].includes(status)) {
        patch.status = status;
      }
      if (typeof role === "string") {
        const normalized = normalizeStaffRole(role);
        if (!normalized) {
          return res.status(400).json({ error: "INVALID_ROLE", message: "Invalid staff role" });
        }
        patch.role = normalized;
      }
      const updated = await updateStaffUser(id, patch);
      return res.json({ user: updated ? toPublicStaffUser(updated) : null });
    } catch (err) {
      return handleAuthError(res, err);
    }
  },
};

import { Request, Response } from "express";
import {
  AuthError,
  authStatusPayload,
  assertNotLastActiveAdmin,
  completePasswordChange,
  createStaffAccount,
  listStaff,
  lookupFirebaseAccount,
  resolveStaffSession,
  toPublicStaffUser,
} from "../services/staffAuthService";
import { updateStaffUser, findById, deleteStaffUser } from "../services/userStore";
import { getFirebaseAuth } from "../config/firebaseAdmin";
import { normalizeStaffRole, normalizeStaffStatus } from "../models/User";

function handleAuthError(res: Response, err: unknown) {
  if (err instanceof AuthError) {
    return res.status(err.status).json({ error: err.code, message: err.message });
  }
  const status = (err as { status?: number }).status || 500;
  const code = (err as { code?: string }).code || "ERROR";
  const message = err instanceof Error ? err.message : "Unexpected error";
  return res.status(status).json({ error: code, message });
}

function requireAdmin(req: Request, res: Response): boolean {
  if (req.user?.role !== "admin") {
    res.status(403).json({ error: "Forbidden", message: "Admin only" });
    return false;
  }
  return true;
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
      if (process.env.NODE_ENV === "development") {
        console.info("[auth-diag] SESSION_REQUEST_STARTED");
      }
      const { user, firebase } = await resolveStaffSession(token);
      return res.json({
        user: toPublicStaffUser(user),
        role: user.role,
        firebase: { uid: firebase.uid, email: firebase.email },
      });
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        const code = err instanceof AuthError ? err.code : err instanceof Error ? err.message : "UNKNOWN";
        console.info("[auth-diag] SESSION_RESPONSE_ERROR", { code });
      }
      return handleAuthError(res, err);
    }
  },

  /** Authenticated staff: own profile only (role not editable here). */
  async me(req: Request, res: Response) {
    try {
      if (!req.staffUser) {
        return res.status(401).json({ error: "UNAUTHORIZED", message: "Not authenticated" });
      }
      return res.json({ user: toPublicStaffUser(req.staffUser) });
    } catch (err) {
      return handleAuthError(res, err);
    }
  },

  async listStaff(req: Request, res: Response) {
    try {
      if (!requireAdmin(req, res)) return;
      const staff = await listStaff();
      return res.json({ staff });
    } catch (err) {
      return handleAuthError(res, err);
    }
  },

  async getStaff(req: Request, res: Response) {
    try {
      if (!requireAdmin(req, res)) return;
      const user = await findById(String(req.params.id || ""));
      if (!user) return res.status(404).json({ error: "NOT_FOUND", message: "Staff user not found" });
      return res.json({ user: toPublicStaffUser(user) });
    } catch (err) {
      return handleAuthError(res, err);
    }
  },

  async lookupFirebaseAccount(req: Request, res: Response) {
    try {
      if (!requireAdmin(req, res)) return;
      const email = String(req.query.email || "");
      const result = await lookupFirebaseAccount(email);
      return res.json(result);
    } catch (err) {
      return handleAuthError(res, err);
    }
  },

  async createStaff(req: Request, res: Response) {
    try {
      if (!requireAdmin(req, res)) return;
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
      const message = result.linkedExistingFirebase
        ? "Staff linked to existing Firebase account."
        : "Staff account created successfully.";
      return res.status(201).json({
        user: toPublicStaffUser(result.user),
        linkedExistingFirebase: result.linkedExistingFirebase,
        createdFirebase: result.createdFirebase,
        message,
      });
    } catch (err) {
      return handleAuthError(res, err);
    }
  },

  async completePasswordChange(req: Request, res: Response) {
    try {
      if (!req.staffUser) {
        return res.status(401).json({ error: "UNAUTHORIZED", message: "Not authenticated" });
      }
      const user = await completePasswordChange(req.staffUser.id);
      return res.json({
        user: toPublicStaffUser(user),
        message: "Password change recorded.",
      });
    } catch (err) {
      return handleAuthError(res, err);
    }
  },

  async updateStaff(req: Request, res: Response) {
    try {
      if (!requireAdmin(req, res)) return;
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
      if (typeof status === "string") {
        const normalized = normalizeStaffStatus(status);
        if (!normalized || normalized === "DISABLED") {
          return res.status(400).json({
            error: "INVALID_STATUS",
            message: "Use ACTIVE, INVITED, or SUSPENDED. Disable was removed — use Suspend.",
          });
        }
        if (normalized === "SUSPENDED") {
          await assertNotLastActiveAdmin(existing);
        }
        patch.status = normalized;
      }
      if (typeof role === "string") {
        const normalized = normalizeStaffRole(role);
        if (!normalized) {
          return res.status(400).json({ error: "INVALID_ROLE", message: "Invalid staff role" });
        }
        patch.role = normalized;
      }
      const updated = await updateStaffUser(id, patch);

      // Sync Firebase disabled flag with Suspend / Activate
      if (updated?.firebaseUid && patch.status) {
        const auth = getFirebaseAuth();
        if (auth) {
          const disabled = patch.status === "SUSPENDED";
          await auth.updateUser(updated.firebaseUid, { disabled }).catch(() => undefined);
        }
      }

      return res.json({ user: updated ? toPublicStaffUser(updated) : null });
    } catch (err) {
      return handleAuthError(res, err);
    }
  },

  async deleteStaff(req: Request, res: Response) {
    try {
      if (!requireAdmin(req, res)) return;
      const id = String(req.params.id || "");
      const existing = await findById(id);
      if (!existing) {
        return res.status(404).json({ error: "NOT_FOUND", message: "Staff user not found" });
      }
      if (req.user?.userId && req.user.userId === id) {
        return res.status(400).json({ error: "CANNOT_DELETE_SELF", message: "You cannot delete your own account" });
      }
      await assertNotLastActiveAdmin(existing);
      if (existing.firebaseUid) {
        const auth = getFirebaseAuth();
        if (auth) {
          await auth.deleteUser(existing.firebaseUid).catch(async () => {
            await auth.updateUser(existing.firebaseUid!, { disabled: true }).catch(() => undefined);
          });
        }
      }
      await deleteStaffUser(id);
      return res.json({
        message: "Staff login removed. Historical hospital records are preserved.",
        id,
      });
    } catch (err) {
      return handleAuthError(res, err);
    }
  },
};

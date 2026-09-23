import { Request, Response, NextFunction } from "express";
import { resolveStaffSession, AuthError } from "../services/staffAuthService";
import type { StaffRole, StaffUser } from "../models/User";

export type ApiRole = StaffRole | "family";

export interface AuthUser {
  role: ApiRole;
  patientId?: string;
  name?: string;
  email?: string;
  staffId?: string;
  department?: string;
  firebaseUid?: string;
  userId?: string;
  /** Derived from StaffUser — never from client body. */
  hospitalId?: string | null;
  isPlatformAdmin?: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      staffUser?: StaffUser;
    }
  }
}

function extractBearer(req: Request): string | null {
  const auth = req.header("authorization") || "";
  if (auth.startsWith("Bearer ")) return auth.slice(7).trim();
  return null;
}

/**
 * Staff auth: verify Firebase ID token, load role from backend user store.
 * Never trusts a role header from the client for staff authorization.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = extractBearer(req);
    if (!token) {
      return res.status(401).json({ error: "Unauthorized", message: "Missing Bearer token" });
    }

    // Legacy family demo token (base64 JSON) — staff must use Firebase ID tokens
    if (!token.includes(".") && token.length < 500) {
      try {
        const raw = Buffer.from(token, "base64").toString("utf8");
        const parsed = JSON.parse(raw) as { role?: string; patientId?: string };
        if (parsed.role === "family" && parsed.patientId) {
          req.user = {
            role: "family",
            patientId: parsed.patientId.toUpperCase(),
            name: "Family",
          };
          return next();
        }
      } catch {
        /* fall through to Firebase */
      }
    }

    const { user } = await resolveStaffSession(token);
    req.staffUser = user;
    req.user = {
      role: user.role,
      name: user.fullName,
      email: user.email,
      staffId: user.staffId,
      department: user.department,
      firebaseUid: user.firebaseUid || undefined,
      userId: user.id,
      hospitalId: user.hospitalId,
      isPlatformAdmin: Boolean(user.isPlatformAdmin),
    };
    next();
  } catch (err) {
    if (err instanceof AuthError) {
      return res.status(err.status).json({ error: err.code, message: err.message });
    }
    const status = (err as { status?: number }).status || 401;
    const message = err instanceof Error ? err.message : "Authentication failed";
    return res.status(status).json({ error: "UNAUTHORIZED", message });
  }
}

export function requireStaff(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role === "family") {
    return res.status(403).json({ error: "Forbidden", message: "Staff access required" });
  }
  next();
}

export function requireRoles(...roles: StaffRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || req.user.role === "family") {
      return res.status(403).json({ error: "Forbidden", message: "Staff access required" });
    }
    if (req.user.role === "admin" || req.user.isPlatformAdmin) return next();
    if (!roles.includes(req.user.role as StaffRole)) {
      return res.status(403).json({
        error: "Forbidden",
        message: `Requires one of: ${roles.join(", ")}`,
      });
    }
    next();
  };
}

/** Platform / network operator only (not ordinary Hospital Admin). */
export function requirePlatformAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role === "family") {
    return res.status(403).json({ error: "Forbidden", message: "Staff access required" });
  }
  if (!req.user.isPlatformAdmin) {
    return res.status(403).json({
      error: "Forbidden",
      message: "Platform administrator access required",
    });
  }
  next();
}

/** Hospital Admin or platform admin. */
export function requireHospitalOrPlatformAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role === "family") {
    return res.status(403).json({ error: "Forbidden", message: "Staff access required" });
  }
  if (req.user.isPlatformAdmin || req.user.role === "admin") return next();
  return res.status(403).json({ error: "Forbidden", message: "Admin only" });
}

export function canAccessPatient(req: Request, patientId: string): boolean {
  if (!req.user) return false;
  if (req.user.role === "admin") return true;
  if (req.user.role === "family") {
    return (req.user.patientId || "").toUpperCase() === patientId.toUpperCase();
  }
  return ["reception", "doctor", "nurse", "pharmacy", "billing", "lab"].includes(req.user.role);
}

export function mapFrontendRoleToCareGuard(role: string): string {
  return role.trim().toUpperCase();
}

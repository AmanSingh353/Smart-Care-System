import { Request, Response, NextFunction } from "express";

export type ApiRole =
  | "admin"
  | "reception"
  | "doctor"
  | "nurse"
  | "pharmacy"
  | "billing"
  | "lab"
  | "family";

export interface AuthUser {
  role: ApiRole;
  patientId?: string;
  name?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * Demo-friendly auth: reads role from Authorization Bearer JSON or x-scs-role header.
 * Backend still enforces role gates — frontend restrictions are not trusted.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const headerRole = (req.header("x-scs-role") || "").toLowerCase();
  const patientId = req.header("x-scs-patient-id") || undefined;
  let role = headerRole as ApiRole | "";

  const auth = req.header("authorization");
  if (auth?.startsWith("Bearer ")) {
    try {
      const raw = Buffer.from(auth.slice(7), "base64").toString("utf8");
      const parsed = JSON.parse(raw) as { role?: string; patientId?: string };
      if (parsed.role) role = parsed.role.toLowerCase() as ApiRole;
      if (parsed.patientId) req.user = { role: role || "family", patientId: parsed.patientId };
    } catch {
      /* ignore malformed token */
    }
  }

  if (!role) {
    return res.status(401).json({ error: "Unauthorized", message: "Missing role credentials" });
  }

  const allowed: ApiRole[] = [
    "admin",
    "reception",
    "doctor",
    "nurse",
    "pharmacy",
    "billing",
    "lab",
    "family",
  ];
  if (!allowed.includes(role as ApiRole)) {
    return res.status(403).json({ error: "Forbidden", message: "Unknown role" });
  }

  req.user = {
    role: role as ApiRole,
    patientId: patientId || req.user?.patientId,
    name: req.header("x-scs-actor") || role,
  };
  next();
}

export function requireStaff(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role === "family") {
    return res.status(403).json({ error: "Forbidden", message: "Staff access required" });
  }
  next();
}

export function canAccessPatient(req: Request, patientId: string): boolean {
  if (!req.user) return false;
  if (req.user.role === "admin") return true;
  if (req.user.role === "family") {
    // Family may only access their bound patient — URL tampering is rejected
    return (req.user.patientId || "").toUpperCase() === patientId.toUpperCase();
  }
  // Staff roles may view hospital patients in demo
  return ["reception", "doctor", "nurse", "pharmacy", "billing", "lab"].includes(req.user.role);
}

export function mapFrontendRoleToCareGuard(role: string): string {
  return role.trim().toUpperCase();
}

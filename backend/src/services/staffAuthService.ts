import { getFirebaseAuth, isFirebaseAdminConfigured, verifyIdToken } from "../config/firebaseAdmin";
import { env } from "../config/env";
import {
  countAdmins,
  createStaffUser,
  findByEmail,
  findByFirebaseUid,
  linkFirebaseUid,
  listStaffUsers,
  updateStaffUser,
} from "./userStore";
import { normalizeStaffRole, toPublicStaffUser, type StaffRole, type StaffUser } from "../models/User";

export class AuthError extends Error {
  status: number;
  code: string;
  constructor(message: string, status = 401, code = "UNAUTHORIZED") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/** Resolve Smart Care System staff profile from a Firebase ID token. Role comes from DB only. */
export async function resolveStaffSession(idToken: string): Promise<{ user: StaffUser; firebase: { uid: string; email?: string } }> {
  const decoded = await verifyIdToken(idToken);
  const uid = decoded.uid;
  const email = (decoded.email || "").toLowerCase();

  let user = await findByFirebaseUid(uid);
  if (!user && email) {
    user = await findByEmail(email);
    if (user && !user.firebaseUid) {
      user = (await linkFirebaseUid(email, uid)) || user;
    } else if (user && user.firebaseUid && user.firebaseUid !== uid) {
      throw new AuthError("This account is linked to a different identity provider.", 403, "IDENTITY_MISMATCH");
    }
  }

  if (!user) {
    const provider = (decoded.firebase as { sign_in_provider?: string } | undefined)?.sign_in_provider;
    if (provider === "google.com") {
      throw new AuthError(
        "This Google account is not registered with Smart Care System.",
        403,
        "NOT_REGISTERED"
      );
    }
    throw new AuthError(
      "This account is not registered with Smart Care System. Contact your administrator.",
      403,
      "NOT_REGISTERED"
    );
  }

  if (user.status === "DISABLED") {
    throw new AuthError("This staff account is disabled.", 403, "ACCOUNT_DISABLED");
  }

  if (user.firebaseUid !== uid) {
    user = (await updateStaffUser(user.id, { firebaseUid: uid })) || user;
  }

  return { user, firebase: { uid, email: email || user.email } };
}

export async function createStaffAccount(input: {
  fullName: string;
  email: string;
  role: string;
  department: string;
  staffId: string;
  status?: "ACTIVE" | "DISABLED" | "INVITED";
  temporaryPassword?: string;
}): Promise<{ user: StaffUser; temporaryPassword?: string }> {
  const role = normalizeStaffRole(input.role);
  if (!role) throw new AuthError("Invalid staff role", 400, "INVALID_ROLE");
  if (!input.email?.trim() || !input.fullName?.trim() || !input.staffId?.trim()) {
    throw new AuthError("fullName, email, and staffId are required", 400, "VALIDATION");
  }

  const email = input.email.trim().toLowerCase();
  let firebaseUid: string | null = null;
  let temporaryPassword = input.temporaryPassword?.trim() || undefined;

  const auth = getFirebaseAuth();
  if (auth) {
    if (!temporaryPassword) {
      temporaryPassword = `Scs!${Math.random().toString(36).slice(2, 10)}A1`;
    }
    try {
      const fb = await auth.createUser({
        email,
        password: temporaryPassword,
        displayName: input.fullName.trim(),
        emailVerified: false,
        disabled: input.status === "DISABLED",
      });
      firebaseUid = fb.uid;
    } catch (err: unknown) {
      const code = err && typeof err === "object" && "code" in err ? String((err as { code: string }).code) : "";
      if (code === "auth/email-already-exists") {
        const existing = await auth.getUserByEmail(email);
        firebaseUid = existing.uid;
        temporaryPassword = undefined;
      } else {
        throw new AuthError(
          err instanceof Error ? err.message : "Failed to create Firebase user",
          502,
          "FIREBASE_CREATE_FAILED"
        );
      }
    }
  }

  const user = await createStaffUser({
    email,
    fullName: input.fullName,
    role,
    department: input.department || "",
    staffId: input.staffId,
    status: input.status || "ACTIVE",
    firebaseUid,
  });

  return { user, temporaryPassword: auth ? temporaryPassword : undefined };
}

/** Bootstrap first admin when none exists — uses BOOTSTRAP_ADMIN_EMAIL only. */
export async function ensureBootstrapAdmin(): Promise<void> {
  const admins = await countAdmins();
  if (admins > 0) return;

  const email = env.bootstrapAdminEmail;
  if (!email) {
    console.warn("[auth] No admin users and BOOTSTRAP_ADMIN_EMAIL not set — create an admin via Staff Management or env bootstrap");
    return;
  }

  const existing = await findByEmail(email);
  if (existing) {
    if (existing.role !== "admin") {
      await updateStaffUser(existing.id, { role: "admin", status: "ACTIVE" });
      console.log(`[auth] Promoted ${email} to admin (bootstrap)`);
    }
    return;
  }

  let firebaseUid: string | null = null;
  const auth = getFirebaseAuth();
  if (auth && env.bootstrapAdminPassword) {
    try {
      const fb = await auth.createUser({
        email,
        password: env.bootstrapAdminPassword,
        displayName: env.bootstrapAdminName,
        emailVerified: true,
      });
      firebaseUid = fb.uid;
      console.log(`[auth] Created Firebase bootstrap admin for ${email}`);
    } catch (err: unknown) {
      const code = err && typeof err === "object" && "code" in err ? String((err as { code: string }).code) : "";
      if (code === "auth/email-already-exists") {
        const u = await auth.getUserByEmail(email);
        firebaseUid = u.uid;
      } else {
        console.warn("[auth] Bootstrap Firebase user create skipped:", err);
      }
    }
  }

  await createStaffUser({
    email,
    fullName: env.bootstrapAdminName,
    role: "admin",
    department: "Administration",
    staffId: "ADM-BOOTSTRAP",
    status: "ACTIVE",
    firebaseUid,
  });
  console.log(`[auth] Bootstrap admin record created for ${email} (password never stored in MongoDB)`);
}

export function authStatusPayload() {
  return {
    message: "Smart Care System authentication",
    firebaseAdminConfigured: isFirebaseAdminConfigured(),
    providers: ["password", "google"],
    staffRoles: ["admin", "doctor", "nurse", "lab", "pharmacy", "billing", "reception"],
  };
}

export async function listStaff() {
  const users = await listStaffUsers();
  return users.map(toPublicStaffUser);
}

export { toPublicStaffUser };
export type { StaffRole, StaffUser };

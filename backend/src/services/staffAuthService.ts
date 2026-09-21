import { getFirebaseAuth, isFirebaseAdminConfigured, verifyIdToken } from "../config/firebaseAdmin";
import { env } from "../config/env";
import {
  countAdmins,
  createStaffUser,
  findByEmail,
  findByFirebaseUid,
  linkFirebaseUid,
  listStaffUsers,
  touchLastLogin,
  updateStaffUser,
} from "./userStore";
import {
  CREATABLE_STAFF_ROLES,
  normalizeStaffRole,
  normalizeStaffStatus,
  toPublicStaffUser,
  type StaffRole,
  type StaffUser,
} from "../models/User";

export class AuthError extends Error {
  status: number;
  code: string;
  constructor(message: string, status = 401, code = "UNAUTHORIZED") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function assertAccountAccess(user: StaffUser) {
  if (user.status === "DISABLED") {
    throw new AuthError("This staff account is disabled.", 403, "ACCOUNT_DISABLED");
  }
  if (user.status === "SUSPENDED") {
    throw new AuthError("This staff account is suspended. Contact your administrator.", 403, "ACCOUNT_SUSPENDED");
  }
  if (user.status === "INVITED") {
    throw new AuthError(
      "This staff account is invited but not yet activated. Complete password setup or ask Admin to activate.",
      403,
      "ACCOUNT_INVITED"
    );
  }
}

/** Resolve Smart Care System staff profile from a Firebase ID token. Role comes from DB only. */
export async function resolveStaffSession(
  idToken: string
): Promise<{ user: StaffUser; firebase: { uid: string; email?: string } }> {
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

  assertAccountAccess(user);

  if (user.firebaseUid !== uid) {
    user = (await updateStaffUser(user.id, { firebaseUid: uid })) || user;
  }

  user = (await touchLastLogin(user.id)) || user;

  return { user, firebase: { uid, email: email || user.email } };
}

export async function createStaffAccount(input: {
  fullName: string;
  email: string;
  role: string;
  department: string;
  staffId: string;
  status?: string;
  temporaryPassword?: string;
  sendResetEmail?: boolean;
}): Promise<{ user: StaffUser; temporaryPassword?: string; passwordResetLink?: string }> {
  const role = normalizeStaffRole(input.role);
  if (!role || !CREATABLE_STAFF_ROLES.includes(role)) {
    throw new AuthError("Invalid staff role", 400, "INVALID_ROLE");
  }
  if (!input.email?.trim() || !input.fullName?.trim() || !input.staffId?.trim()) {
    throw new AuthError("fullName, email, and staffId are required", 400, "VALIDATION");
  }
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim());
  if (!emailOk) throw new AuthError("Enter a valid email address", 400, "INVALID_EMAIL");

  const status = input.status ? normalizeStaffStatus(input.status) : "ACTIVE";
  if (!status) throw new AuthError("Invalid account status", 400, "INVALID_STATUS");

  const email = input.email.trim().toLowerCase();
  let firebaseUid: string | null = null;
  let temporaryPassword = input.temporaryPassword?.trim() || undefined;
  let passwordResetLink: string | undefined;

  const auth = getFirebaseAuth();
  if (!auth) {
    throw new AuthError(
      "Firebase Admin is not configured. Cannot create staff authentication identity.",
      503,
      "FIREBASE_NOT_CONFIGURED"
    );
  }

  if (!temporaryPassword) {
    temporaryPassword = `Scs!${Math.random().toString(36).slice(2, 10)}A1`;
  }

  try {
    const fb = await auth.createUser({
      email,
      password: temporaryPassword,
      displayName: input.fullName.trim(),
      emailVerified: false,
      disabled: status === "DISABLED" || status === "SUSPENDED",
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

  try {
    passwordResetLink = await auth.generatePasswordResetLink(email);
  } catch {
    /* optional — Admin can share temporary password for demo */
  }

  if (input.sendResetEmail !== false && passwordResetLink) {
    // Firebase Admin does not send email by itself without an email provider;
    // link is returned to Admin UI for secure sharing / demo onboarding.
  }

  try {
    const user = await createStaffUser({
      email,
      fullName: input.fullName,
      role,
      department: input.department || "",
      staffId: input.staffId,
      status: status === "INVITED" ? "INVITED" : status,
      firebaseUid,
    });
    return { user, temporaryPassword, passwordResetLink };
  } catch (err: unknown) {
    const statusCode = (err as { status?: number }).status || 500;
    const code = (err as { code?: string }).code || "CREATE_FAILED";
    throw new AuthError(err instanceof Error ? err.message : "Failed to create staff user", statusCode, code);
  }
}

/** Bootstrap first admin when none exists — uses BOOTSTRAP_ADMIN_EMAIL only. */
export async function ensureBootstrapAdmin(): Promise<void> {
  const admins = await countAdmins();
  if (admins > 0) return;

  const email = env.bootstrapAdminEmail;
  if (!email) {
    console.warn(
      "[auth] No admin users and BOOTSTRAP_ADMIN_EMAIL not set — create an admin via Staff Management or env bootstrap"
    );
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
    accountStatuses: ["INVITED", "ACTIVE", "SUSPENDED", "DISABLED"],
  };
}

export async function listStaff() {
  const users = await listStaffUsers();
  return users.map(toPublicStaffUser);
}

export { toPublicStaffUser };
export type { StaffRole, StaffUser };

import { getFirebaseAuth, isFirebaseAdminConfigured, verifyIdToken } from "../config/firebaseAdmin";
import { env } from "../config/env";
import {
  countAdmins,
  countOtherActiveAdmins,
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
  // DISABLED retained only for legacy records — treat as no access (prefer SUSPENDED going forward)
  if (user.status === "DISABLED" || user.status === "SUSPENDED") {
    throw new AuthError(
      "This staff account is suspended. Contact your administrator.",
      403,
      "ACCOUNT_SUSPENDED"
    );
  }
  if (user.status === "INVITED") {
    throw new AuthError(
      "This staff account is invited but not yet activated. Complete password setup or ask Admin to activate.",
      403,
      "ACCOUNT_INVITED"
    );
  }
}

function authDiag(event: string, detail?: Record<string, string | boolean | number | undefined>) {
  if (env.nodeEnv !== "development") return;
  if (detail) console.info(`[auth-diag] ${event}`, detail);
  else console.info(`[auth-diag] ${event}`);
}

/** Resolve Smart Care System staff profile from a Firebase ID token. Role comes from DB only. */
export async function resolveStaffSession(
  idToken: string
): Promise<{ user: StaffUser; firebase: { uid: string; email?: string } }> {
  let decoded;
  try {
    decoded = await verifyIdToken(idToken);
    authDiag("BACKEND_TOKEN_VERIFICATION_SUCCESS", {
      AUTHENTICATED_UID_PRESENT: Boolean(decoded.uid),
    });
  } catch (err: unknown) {
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code: string }).code)
        : err instanceof Error
          ? err.message
          : "UNKNOWN";
    authDiag("BACKEND_TOKEN_VERIFICATION_ERROR_CODE", { code });
    throw err;
  }

  const uid = decoded.uid;
  const email = (decoded.email || "").toLowerCase();

  let user = await findByFirebaseUid(uid);
  authDiag("STAFF_LOOKUP_BY_UID", { result: user ? "FOUND" : "NOT_FOUND" });
  authDiag("AUTHENTICATED_IDENTITY", {
    email: email || undefined,
    currentFirebaseUidPresent: Boolean(uid),
  });

  const bootstrapMatch = isBootstrapAdminEmail(email);
  authDiag("BOOTSTRAP_ADMIN_MATCH", { match: bootstrapMatch ? "TRUE" : "FALSE" });

  if (!user && email) {
    user = await findByEmail(email);
    authDiag("STAFF_LOOKUP_BY_EMAIL", {
      result: user ? "FOUND" : "NOT_FOUND",
      storedFirebaseUidPresent: Boolean(user?.firebaseUid),
      role: user?.role,
      status: user?.status,
    });
    if (user && !user.firebaseUid) {
      user = (await linkFirebaseUid(email, uid)) || user;
      authDiag("STAFF_UID_LINKED", { email });
    } else if (user && user.firebaseUid && user.firebaseUid !== uid) {
      // Bootstrap Admin only: Firebase user may have been recreated — replace stale UID
      if (bootstrapMatch && user.role === "admin" && user.status === "ACTIVE") {
        authDiag("BOOTSTRAP_ADMIN_UID_RELINK", {
          email,
          staleUidPresent: true,
          newUidPresent: true,
        });
        user = (await updateStaffUser(user.id, { firebaseUid: uid })) || user;
      } else {
        throw new AuthError("This account is linked to a different identity provider.", 403, "IDENTITY_MISMATCH");
      }
    }
  } else if (!user) {
    authDiag("STAFF_LOOKUP_BY_EMAIL", { result: "SKIPPED_NO_EMAIL" });
  }

  // Recover existing Firebase Admin → SCS ADMIN mapping (bootstrap email only)
  if (!user) {
    user = await recoverBootstrapAdminSession(uid, email);
    if (user) authDiag("BOOTSTRAP_ADMIN_RECOVERED", { STAFF_ROLE: user.role, STAFF_STATUS: user.status });
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

  // Ensure bootstrap admin identity stays ADMIN + ACTIVE (never downgrade other roles here)
  if (isBootstrapAdminEmail(email) && user.email === email) {
    const patch: Partial<StaffUser> = {};
    if (user.role !== "admin") patch.role = "admin";
    if (user.status !== "ACTIVE") patch.status = "ACTIVE";
    if (user.firebaseUid !== uid) patch.firebaseUid = uid;
    if (Object.keys(patch).length) {
      user = (await updateStaffUser(user.id, patch)) || user;
    }
  }

  assertAccountAccess(user);

  if (user.firebaseUid !== uid) {
    user = (await updateStaffUser(user.id, { firebaseUid: uid })) || user;
  }

  user = (await touchLastLogin(user.id)) || user;

  authDiag("SESSION_SUCCESS", { STAFF_ROLE: user.role, STAFF_STATUS: user.status });

  return { user, firebase: { uid, email: email || user.email } };
}

function isBootstrapAdminEmail(email: string): boolean {
  const bootstrap = env.bootstrapAdminEmail;
  return Boolean(bootstrap && email && email === bootstrap);
}

/**
 * If the authenticated email is BOOTSTRAP_ADMIN_EMAIL and there is no usable Admin
 * StaffUser yet (or only the bootstrap row needs creating), create/link exactly one ADMIN.
 * Never promotes arbitrary emails. Does not touch Firebase Auth users/passwords.
 */
async function recoverBootstrapAdminSession(uid: string, email: string): Promise<StaffUser | null> {
  if (!isBootstrapAdminEmail(email)) return null;

  const existing = await findByEmail(email);
  if (existing) {
    const patch: Partial<StaffUser> = {
      role: "admin",
      status: "ACTIVE",
      firebaseUid: uid,
    };
    return (await updateStaffUser(existing.id, patch)) || existing;
  }

  const activeAdmins = await countAdmins();
  if (activeAdmins > 0) {
    // Another Admin already exists — do not create a second bootstrap Admin
    return null;
  }

  return createStaffUser({
    email,
    fullName: env.bootstrapAdminName,
    role: "admin",
    department: "Administration",
    staffId: "ADM-BOOTSTRAP",
    status: "ACTIVE",
    firebaseUid: uid,
    mustChangePassword: false,
  });
}

export async function createStaffAccount(input: {
  fullName: string;
  email: string;
  role: string;
  department: string;
  staffId: string;
  status?: string;
  temporaryPassword: string;
}): Promise<{ user: StaffUser }> {
  const role = normalizeStaffRole(input.role);
  if (!role || !CREATABLE_STAFF_ROLES.includes(role)) {
    throw new AuthError("Invalid staff role", 400, "INVALID_ROLE");
  }
  if (!input.email?.trim() || !input.fullName?.trim() || !input.staffId?.trim()) {
    throw new AuthError("fullName, email, and staffId are required", 400, "VALIDATION");
  }
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim());
  if (!emailOk) throw new AuthError("Enter a valid email address", 400, "INVALID_EMAIL");

  const temporaryPassword = input.temporaryPassword?.trim() || "";
  if (temporaryPassword.length < 8) {
    throw new AuthError("Temporary password must be at least 8 characters.", 400, "INVALID_PASSWORD");
  }

  const status = input.status ? normalizeStaffStatus(input.status) : "ACTIVE";
  if (!status || status === "DISABLED") {
    throw new AuthError("Invalid account status. Use ACTIVE, INVITED, or SUSPENDED.", 400, "INVALID_STATUS");
  }

  const email = input.email.trim().toLowerCase();

  const existingStaff = await findByEmail(email);
  if (existingStaff) {
    throw new AuthError("A staff user with this email already exists", 409, "DUPLICATE_EMAIL");
  }

  const auth = getFirebaseAuth();
  if (!auth) {
    throw new AuthError(
      "Firebase Admin is not configured. Cannot create staff authentication identity.",
      503,
      "FIREBASE_NOT_CONFIGURED"
    );
  }

  let firebaseUid: string;
  try {
    const fb = await auth.createUser({
      email,
      password: temporaryPassword,
      displayName: input.fullName.trim(),
      emailVerified: false,
      disabled: status === "SUSPENDED",
    });
    firebaseUid = fb.uid;
  } catch (err: unknown) {
    const code = err && typeof err === "object" && "code" in err ? String((err as { code: string }).code) : "";
    if (code === "auth/email-already-exists") {
      throw new AuthError(
        "A Firebase account already exists for this email.",
        409,
        "FIREBASE_EMAIL_EXISTS"
      );
    }
    if (code === "auth/invalid-password" || code === "auth/weak-password") {
      throw new AuthError(
        "Temporary password does not meet Firebase password requirements.",
        400,
        "INVALID_PASSWORD"
      );
    }
    throw new AuthError(
      err instanceof Error ? err.message : "Failed to create Firebase user",
      502,
      "FIREBASE_CREATE_FAILED"
    );
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
      mustChangePassword: true,
    });
    // Password is never returned or stored — Admin UI keeps the value they typed in memory only.
    return { user };
  } catch (err: unknown) {
    // Roll back orphaned Firebase Auth user if StaffUser create fails
    await auth.deleteUser(firebaseUid).catch(() => undefined);
    const statusCode = (err as { status?: number }).status || 500;
    const code = (err as { code?: string }).code || "CREATE_FAILED";
    throw new AuthError(err instanceof Error ? err.message : "Failed to create staff user", statusCode, code);
  }
}

/** Clear first-login password-change flag after the staff member updates their Firebase password. */
export async function completePasswordChange(userId: string): Promise<StaffUser> {
  const user = await updateStaffUser(userId, { mustChangePassword: false });
  if (!user) {
    throw new AuthError("Staff user not found", 404, "NOT_FOUND");
  }
  return user;
}

/** Bootstrap first admin when none exists — uses BOOTSTRAP_ADMIN_EMAIL only.
 * Never deletes/resets Firebase Admin unless BOOTSTRAP_ADMIN_PASSWORD is explicitly set
 * (password update only). Prefer linking an existing Firebase user by email.
 */
export async function ensureBootstrapAdmin(): Promise<void> {
  const email = env.bootstrapAdminEmail;
  if (!email) {
    const admins = await countAdmins();
    if (admins === 0) {
      console.warn(
        "[auth] No admin users and BOOTSTRAP_ADMIN_EMAIL not set — set BOOTSTRAP_ADMIN_EMAIL to your existing Firebase Admin email to restore Admin access"
      );
    }
    return;
  }

  const auth = getFirebaseAuth();
  let firebaseUid: string | null = null;
  if (auth) {
    try {
      const fbUser = await auth.getUserByEmail(email);
      firebaseUid = fbUser.uid;
      // Only set password when explicitly configured — never wipe existing Admin password by default
      if (env.bootstrapAdminPassword) {
        await auth
          .updateUser(fbUser.uid, {
            password: env.bootstrapAdminPassword,
            displayName: env.bootstrapAdminName,
            disabled: false,
          })
          .catch(() => undefined);
      }
    } catch {
      if (env.bootstrapAdminPassword) {
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
          console.warn("[auth] Bootstrap Firebase user create skipped:", err);
        }
      } else {
        console.warn(
          `[auth] BOOTSTRAP_ADMIN_EMAIL=${email} has no Firebase Auth user yet — Admin can still be linked on first successful login`
        );
      }
    }
  }

  const existing = await findByEmail(email);
  if (existing) {
    const patch: Partial<StaffUser> = {};
    if (existing.role !== "admin") patch.role = "admin";
    if (existing.status !== "ACTIVE") patch.status = "ACTIVE";
    if (firebaseUid && existing.firebaseUid !== firebaseUid) patch.firebaseUid = firebaseUid;
    if (Object.keys(patch).length) {
      await updateStaffUser(existing.id, patch);
      console.log(`[auth] Repaired bootstrap Admin StaffUser for ${email}`);
    }
    return;
  }

  const admins = await countAdmins();
  if (admins > 0) {
    console.log("[auth] Active Admin already exists — skipping new bootstrap StaffUser create");
    return;
  }

  await createStaffUser({
    email,
    fullName: env.bootstrapAdminName,
    role: "admin",
    department: "Administration",
    staffId: "ADM-BOOTSTRAP",
    status: "ACTIVE",
    firebaseUid,
    mustChangePassword: false,
  });
  console.log(`[auth] Bootstrap admin StaffUser created for ${email} (Firebase password unchanged)`);
}

export function authStatusPayload() {
  return {
    message: "Smart Care System authentication",
    firebaseAdminConfigured: isFirebaseAdminConfigured(),
    providers: ["password", "google"],
    staffRoles: ["admin", "doctor", "nurse", "lab", "pharmacy", "billing", "reception"],
    accountStatuses: ["INVITED", "ACTIVE", "SUSPENDED"],
  };
}

export async function listStaff() {
  const users = await listStaffUsers();
  return users.map(toPublicStaffUser);
}

export async function assertNotLastActiveAdmin(target: StaffUser) {
  if (target.role !== "admin" || target.status !== "ACTIVE") return;
  const others = await countOtherActiveAdmins(target.id);
  if (others < 1) {
    throw new AuthError(
      "Cannot suspend or delete the final active Admin account.",
      400,
      "LAST_ADMIN"
    );
  }
}

export { toPublicStaffUser };
export type { StaffRole, StaffUser };

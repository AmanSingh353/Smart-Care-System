import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
} from "react";
import { setAuthTokenProvider, ApiError } from "@/services/api";
import { authService, type StaffProfile, type StaffRole } from "@/services/authService";
import {
  firebaseSignInEmailPassword,
  firebaseSignInGoogle,
  firebaseSendPasswordReset,
  firebaseSignOut,
  getIdToken,
  isFirebaseClientConfigured,
  watchAuth,
} from "@/lib/firebase";
import { authDiag } from "@/lib/authDiag";

export type { StaffRole };

interface AuthContextType {
  role: StaffRole | "family" | null;
  patientId: string | null;
  staff: StaffProfile | null;
  hospital: { hospitalId: string; hospitalName: string } | null;
  loading: boolean;
  firebaseReady: boolean;
  loginStaffEmailPassword: (email: string, password: string) => Promise<StaffProfile>;
  loginStaffGoogle: () => Promise<StaffProfile>;
  sendPasswordReset: (email: string) => Promise<void>;
  loginFamily: (patientId: string) => void;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
  refreshStaffSession: () => Promise<StaffProfile>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = "scs30-auth";

type StoredAuth =
  | {
      kind: "staff";
      role: StaffRole;
      staff: StaffProfile;
      hospital?: { hospitalId: string; hospitalName: string } | null;
    }
  | { kind: "family"; role: "family"; patientId: string };

function readStored(): StoredAuth | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredAuth;
  } catch {
    return null;
  }
}

function writeStored(value: StoredAuth | null) {
  if (!value) sessionStorage.removeItem(STORAGE_KEY);
  else sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

const ROLE_ROUTES: Record<StaffRole, string> = {
  admin: "/admin",
  doctor: "/doctor",
  nurse: "/nurse",
  pharmacy: "/pharmacy",
  billing: "/billing",
  reception: "/reception",
  lab: "/lab",
};

export function workspacePathForRole(role: StaffRole): string {
  return ROLE_ROUTES[role];
}

export function postLoginPath(profile: StaffProfile): string {
  if (profile.mustChangePassword) return "/change-password";
  return workspacePathForRole(profile.role);
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [role, setRole] = useState<StaffRole | "family" | null>(null);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [staff, setStaff] = useState<StaffProfile | null>(null);
  const [hospital, setHospital] = useState<{ hospitalId: string; hospitalName: string } | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const firebaseReady = isFirebaseClientConfigured();

  const getAccessToken = useCallback(async () => {
    const stored = readStored();
    if (stored?.kind === "family") {
      return btoa(JSON.stringify({ role: "family", patientId: stored.patientId }));
    }
    return getIdToken(false);
  }, []);

  useEffect(() => {
    setAuthTokenProvider(() => getAccessToken());
    return () => setAuthTokenProvider(null);
  }, [getAccessToken]);

  const applyStaff = useCallback(
    (
      profile: StaffProfile,
      hospitalInfo?: { hospitalId: string; hospitalName: string } | null
    ) => {
      setRole(profile.role);
      setPatientId(null);
      setStaff(profile);
      const nextHospital =
        hospitalInfo === undefined
          ? profile.hospitalId
            ? { hospitalId: profile.hospitalId, hospitalName: profile.hospitalId }
            : null
          : hospitalInfo;
      setHospital(nextHospital);
      writeStored({
        kind: "staff",
        role: profile.role,
        staff: profile,
        hospital: nextHospital,
      });
    },
    []
  );

  const establishStaffSession = useCallback(
    async (forceRefresh = true) => {
      const token = await getIdToken(forceRefresh);
      if (!token) {
        authDiag("TOKEN_ACQUIRED", { ok: false });
        throw new Error("No Firebase session");
      }
      authDiag("TOKEN_ACQUIRED", { ok: true });
      authDiag("SESSION_REQUEST_STARTED");
      try {
        const result = await authService.session(token);
        authDiag("SESSION_RESPONSE_STATUS", { status: 200 });
        authDiag("SESSION_SUCCESS", {
          STAFF_ROLE: result.user.role,
          STAFF_STATUS: result.user.status,
        });
        applyStaff(result.user, result.hospital);
        return result.user;
      } catch (err) {
        if (err instanceof ApiError) {
          const body = err.body as { error?: string } | null;
          authDiag("SESSION_RESPONSE_STATUS", { status: err.status });
          authDiag("SESSION_RESPONSE_ERROR", { code: body?.error || err.message });
        } else {
          authDiag("SESSION_RESPONSE_ERROR", {
            code: err instanceof Error ? err.message : "UNKNOWN",
          });
        }
        throw err;
      }
    },
    [applyStaff]
  );

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      const stored = readStored();
      if (stored?.kind === "family") {
        if (!cancelled) {
          setRole("family");
          setPatientId(stored.patientId);
          setStaff(null);
          setLoading(false);
        }
        return;
      }

      if (!firebaseReady) {
        if (stored?.kind === "staff" && !cancelled) {
          // Stale staff session without Firebase — clear
          writeStored(null);
        }
        if (!cancelled) setLoading(false);
        return;
      }

      const unsub = watchAuth(async user => {
        if (cancelled) return;
        if (!user) {
          const s = readStored();
          if (s?.kind === "staff") {
            writeStored(null);
            setRole(null);
            setStaff(null);
            setHospital(null);
          }
          setLoading(false);
          return;
        }
        try {
          await establishStaffSession(false);
        } catch {
          writeStored(null);
          setRole(null);
          setStaff(null);
          await firebaseSignOut().catch(() => undefined);
        } finally {
          if (!cancelled) setLoading(false);
        }
      });

      return () => unsub();
    }

    let cleanup: (() => void) | undefined;
    hydrate().then(fn => {
      cleanup = fn;
    });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [establishStaffSession, firebaseReady]);

  const loginStaffEmailPassword = async (email: string, password: string) => {
    authDiag("FIREBASE_LOGIN_STARTED", { email: email.trim().toLowerCase() });
    try {
      await firebaseSignInEmailPassword(email, password);
      authDiag("FIREBASE_LOGIN_SUCCESS");
    } catch (err) {
      const code =
        err && typeof err === "object" && "code" in err
          ? String((err as { code: string }).code)
          : err instanceof Error
            ? err.message
            : "UNKNOWN";
      authDiag("FIREBASE_LOGIN_ERROR_CODE", { code });
      throw err;
    }
    return establishStaffSession(true);
  };

  const loginStaffGoogle = async () => {
    await firebaseSignInGoogle();
    try {
      return await establishStaffSession(true);
    } catch (err) {
      await firebaseSignOut().catch(() => undefined);
      writeStored(null);
      setRole(null);
      setStaff(null);
      throw err;
    }
  };

  const sendPasswordReset = async (email: string) => {
    await firebaseSendPasswordReset(email);
  };

  const loginFamily = (id: string) => {
    const patient = id.trim().toUpperCase();
    setRole("family");
    setPatientId(patient);
    setStaff(null);
    setHospital(null);
    writeStored({ kind: "family", role: "family", patientId: patient });
  };

  const logout = async () => {
    writeStored(null);
    setRole(null);
    setPatientId(null);
    setStaff(null);
    setHospital(null);
    await firebaseSignOut().catch(() => undefined);
  };

  return (
    <AuthContext.Provider
      value={{
        role,
        patientId,
        staff,
        hospital,
        loading,
        firebaseReady,
        loginStaffEmailPassword,
        loginStaffGoogle,
        sendPasswordReset,
        loginFamily,
        logout,
        getAccessToken,
        refreshStaffSession: () => establishStaffSession(true),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export function formatAuthError(err: unknown): string {
  const isDev = Boolean(import.meta.env.DEV);

  if (err instanceof ApiError) {
    const body = err.body as { error?: string; message?: string } | null;
    const code = body?.error || "";
    if (code === "ACCOUNT_DISABLED") return "Account disabled. Contact your administrator.";
    if (code === "ACCOUNT_SUSPENDED") return "Account suspended. Contact your administrator.";
    if (code === "ACCOUNT_INVITED") return "Account invited but not activated yet.";
    if (code === "NOT_REGISTERED") {
      return isDev ? `Staff account not found (${code}).` : err.message;
    }
    if (code === "FIREBASE_EMAIL_EXISTS") {
      return "A Firebase account already exists for this email.";
    }
    if (code === "DUPLICATE_EMAIL") {
      return "A staff user with this email already exists.";
    }
    if (code === "INVALID_PASSWORD") {
      return err.message || "Password does not meet requirements.";
    }
    if (code === "FIREBASE_NOT_CONFIGURED") {
      return isDev
        ? "Firebase Admin configuration error — backend cannot verify ID tokens."
        : "Backend authentication is unavailable. Firebase Admin is not configured.";
    }
    if (err.status === 0 || err.status >= 500) {
      return isDev
        ? `Backend authentication failed (${err.status}${code ? `: ${code}` : ""}).`
        : err.message || "Backend unavailable. Try again later.";
    }
    return isDev ? `Backend authentication failed: ${err.message}` : err.message;
  }
  if (err && typeof err === "object" && "code" in err) {
    const code = String((err as { code: string }).code);
    if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/invalid-login-credentials") {
      return isDev
        ? `Firebase authentication failed (${code}). Email/password rejected by Firebase.`
        : "Invalid credentials. Check your email and password.";
    }
    if (code === "auth/user-not-found") return "Account not found for this email.";
    if (code === "auth/user-disabled") return "Account disabled in Firebase Authentication.";
    if (code === "auth/too-many-requests") return "Too many attempts. Try again later.";
    if (code === "auth/popup-closed-by-user") return "Google sign-in was cancelled.";
    if (code === "auth/invalid-email") return "Enter a valid email address.";
    if (code === "auth/network-request-failed") return "Firebase unavailable. Check your network connection.";
    if (isDev) return `Firebase authentication failed (${code}).`;
  }
  if (err instanceof Error) {
    if (/Firebase client is not configured/i.test(err.message)) {
      return "Firebase unavailable. Frontend VITE_FIREBASE_* variables are missing.";
    }
    return err.message;
  }
  return "Sign-in failed. Please try again.";
}

export const ROLE_NAV: Record<StaffRole, { label: string; path: string }[]> = {
  admin: [
    { label: "Dashboard", path: "/admin" },
    { label: "CareGuard", path: "/careguard" },
    { label: "Connected Hospitals", path: "/careguard/hospitals" },
    { label: "Registration", path: "/reception" },
    { label: "Doctor", path: "/doctor" },
    { label: "Nurse", path: "/nurse" },
    { label: "Pharmacy", path: "/pharmacy" },
    { label: "Lab", path: "/lab" },
    { label: "Billing", path: "/billing" },
    { label: "Staff Management", path: "/admin/staff" },
    { label: "Hospital Network", path: "/admin/network" },
  ],
  reception: [{ label: "Registration", path: "/reception" }],
  doctor: [
    { label: "Patients", path: "/doctor" },
    { label: "CareGuard", path: "/careguard" },
    { label: "Connected Hospitals", path: "/careguard/hospitals" },
  ],
  nurse: [
    { label: "Nursing Station", path: "/nurse" },
    { label: "CareGuard", path: "/careguard" },
    { label: "Connected Hospitals", path: "/careguard/hospitals" },
  ],
  pharmacy: [
    { label: "Pharmacy", path: "/pharmacy" },
    { label: "CareGuard", path: "/careguard" },
  ],
  billing: [
    { label: "Billing", path: "/billing" },
    { label: "CareGuard", path: "/careguard" },
  ],
  lab: [
    { label: "Laboratory", path: "/lab" },
    { label: "CareGuard", path: "/careguard" },
  ],
};

export const ROLE_LABELS: Record<StaffRole | "family", string> = {
  admin: "Hospital Admin",
  reception: "Reception",
  doctor: "Doctor",
  nurse: "Nurse",
  pharmacy: "Pharmacy",
  billing: "Billing",
  lab: "Laboratory",
  family: "Family",
};

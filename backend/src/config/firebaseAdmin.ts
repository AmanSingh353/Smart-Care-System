import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth, type Auth, type DecodedIdToken } from "firebase-admin/auth";
import { env } from "./env";

let initialized = false;

export function isFirebaseAdminConfigured(): boolean {
  return Boolean(env.firebaseProjectId && env.firebaseClientEmail && env.firebasePrivateKey);
}

/** Initialize Firebase Admin once. Safe to call repeatedly. */
export function initFirebaseAdmin(): boolean {
  if (initialized || getApps().length > 0) {
    initialized = true;
    return true;
  }
  if (!isFirebaseAdminConfigured()) {
    console.warn(
      "[firebase] Admin SDK not configured — set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY"
    );
    return false;
  }
  try {
    initializeApp({
      credential: cert({
        projectId: env.firebaseProjectId,
        clientEmail: env.firebaseClientEmail,
        privateKey: env.firebasePrivateKey,
      }),
    });
    initialized = true;
    console.log("[firebase] Admin SDK initialized");
    return true;
  } catch (err) {
    console.error("[firebase] Admin init failed", err);
    return false;
  }
}

export function getFirebaseAuth(): Auth | null {
  if (!initialized && !initFirebaseAdmin()) return null;
  return getAuth();
}

export async function verifyIdToken(idToken: string): Promise<DecodedIdToken> {
  const auth = getFirebaseAuth();
  if (!auth) {
    throw Object.assign(new Error("Firebase Admin is not configured"), {
      code: "FIREBASE_NOT_CONFIGURED",
      status: 503,
    });
  }
  return auth.verifyIdToken(idToken, true);
}

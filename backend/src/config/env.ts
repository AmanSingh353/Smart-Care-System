import dotenv from "dotenv";

dotenv.config();

/**
 * Central env — no secrets committed.
 * Firebase Admin + bootstrap vars are backend-only.
 */
export const env = {
  port: Number(process.env.PORT) || 5000,
  host: process.env.HOST || "0.0.0.0",
  mongoUri: process.env.MONGODB_URI || "",
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  nodeEnv: process.env.NODE_ENV || "development",
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID || "",
  firebaseClientEmail: process.env.FIREBASE_CLIENT_EMAIL || "",
  firebasePrivateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
  /** First admin email — used only when no admin exists */
  bootstrapAdminEmail: (process.env.BOOTSTRAP_ADMIN_EMAIL || "").trim().toLowerCase(),
  /** Optional one-time password for creating bootstrap Firebase user (backend-only, never commit) */
  bootstrapAdminPassword: process.env.BOOTSTRAP_ADMIN_PASSWORD || "",
  bootstrapAdminName: process.env.BOOTSTRAP_ADMIN_NAME || "System Administrator",
};

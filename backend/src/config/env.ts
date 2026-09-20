import dotenv from "dotenv";

dotenv.config();

/**
 * Central env — no secrets committed.
 * Firebase Admin vars are reserved for backend-only auth (not wired yet).
 */
export const env = {
  port: Number(process.env.PORT) || 5000,
  /** Bind host — Render/cloud requires 0.0.0.0 */
  host: process.env.HOST || "0.0.0.0",
  mongoUri: process.env.MONGODB_URI || "",
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  nodeEnv: process.env.NODE_ENV || "development",
  /** Backend-only Firebase Admin placeholders (do not expose to frontend) */
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID || "",
  firebaseClientEmail: process.env.FIREBASE_CLIENT_EMAIL || "",
  firebasePrivateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
};

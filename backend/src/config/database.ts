/**
 * MongoDB connection.
 * Safe when MONGODB_URI is empty — app runs with in-memory staff store.
 */
import mongoose from "mongoose";
import { env } from "./env";
import { initFirebaseAdmin } from "./firebaseAdmin";
import { initUserStore } from "../services/userStore";
import { ensureBootstrapAdmin } from "../services/staffAuthService";

export async function connectDatabase(): Promise<void> {
  initFirebaseAdmin();

  if (!env.mongoUri) {
    console.log("[db] MONGODB_URI not set — running without MongoDB (in-memory staff + stub mode)");
  } else {
    try {
      await mongoose.connect(env.mongoUri);
      console.log("[db] MongoDB connected");
    } catch (err) {
      console.error("[db] MongoDB connection failed — continuing with in-memory fallback", err);
    }
  }

  await initUserStore();
  await ensureBootstrapAdmin();
}

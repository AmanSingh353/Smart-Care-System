/**
 * Database / staff-store bootstrap.
 * MongoDB when MONGODB_URI is set; otherwise durable local file staff store.
 * ensureBootstrapAdmin is idempotent and never wipes existing StaffUser records.
 */
import mongoose from "mongoose";
import { env } from "./env";
import { initFirebaseAdmin } from "./firebaseAdmin";
import { initUserStore } from "../services/userStore";
import { ensureBootstrapAdmin } from "../services/staffAuthService";

export async function connectDatabase(): Promise<void> {
  initFirebaseAdmin();

  if (!env.mongoUri) {
    console.log("[db] MONGODB_URI not set — StaffUser persistence uses local file store");
  } else {
    try {
      await mongoose.connect(env.mongoUri);
      console.log("[db] MongoDB connected");
    } catch (err) {
      console.error("[db] MongoDB connection failed — falling back to file staff store", err);
    }
  }

  await initUserStore();
  await ensureBootstrapAdmin();
}

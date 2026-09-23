/**
 * Database / staff-store bootstrap.
 * MongoDB when MONGODB_URI is set; otherwise durable local file stores.
 * Demo hospital network + bootstrap admin are idempotent and never wipe records.
 */
import mongoose from "mongoose";
import { env } from "./env";
import { initFirebaseAdmin } from "./firebaseAdmin";
import { initUserStore, migrateStaffHospitalAssignments } from "../services/userStore";
import { ensureBootstrapAdmin } from "../services/staffAuthService";
import { getLocalHospital, initHospitalStore } from "../services/hospitalStore";
import { initAssistanceRequestStore } from "../services/assistanceRequestStore";
import {
  DEMO_SMART_CARE_ID,
  ensureDemoHospitalNetwork,
} from "../services/demoHospitalNetwork";

export async function connectDatabase(): Promise<void> {
  initFirebaseAdmin();

  if (!env.mongoUri) {
    console.log("[db] MONGODB_URI not set — StaffUser / Hospital / AssistanceRequest use local file stores");
  } else {
    try {
      await mongoose.connect(env.mongoUri);
      console.log("[db] MongoDB connected");
    } catch (err) {
      console.error("[db] MongoDB connection failed — falling back to file stores", err);
    }
  }

  await initUserStore();
  await initHospitalStore();
  await initAssistanceRequestStore();
  await ensureDemoHospitalNetwork();
  await ensureBootstrapAdmin();
  const local = await getLocalHospital();
  await migrateStaffHospitalAssignments(
    local?.hospitalId || env.localHospitalId || DEMO_SMART_CARE_ID
  );
}

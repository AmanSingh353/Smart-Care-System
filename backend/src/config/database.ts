/**
 * Database / staff-store bootstrap.
 * MongoDB Atlas when MONGODB_URI is set; otherwise durable local JSON file stores.
 * Demo hospital network + bootstrap admin are idempotent and never wipe records.
 */
import mongoose from "mongoose";
import { env } from "./env";
import { initFirebaseAdmin } from "./firebaseAdmin";
import { initUserStore, migrateStaffHospitalAssignments } from "../services/userStore";
import { ensureBootstrapAdmin } from "../services/staffAuthService";
import { getLocalHospital, initHospitalStore } from "../services/hospitalStore";
import { initAssistanceRequestStore } from "../services/assistanceRequestStore";
import { initPatientStore } from "../services/patientStore";
import { initPatientAccessGrantStore } from "../services/patientAccessGrantStore";
import { ensureDemoPatients } from "../services/demoPatients";
import {
  DEMO_SMART_CARE_ID,
  ensureDemoHospitalNetwork,
} from "../services/demoHospitalNetwork";

/** Atlas database name for this deployment. */
export const MONGO_DB_NAME = "smart-care";

export async function connectDatabase(): Promise<void> {
  initFirebaseAdmin();

  if (!env.mongoUri) {
    console.log(
      "[db] MONGODB_URI not set — StaffUser / Hospital / AssistanceRequest / Patient use local file stores"
    );
  } else {
    try {
      await mongoose.connect(env.mongoUri, { dbName: MONGO_DB_NAME });
      const host = mongoose.connection.host || "atlas";
      console.log(`[db] MongoDB Atlas connected — db=${MONGO_DB_NAME} host=${host}`);
    } catch (err) {
      console.error("[db] MongoDB connection failed — stores will fall back to JSON files", err);
    }
  }

  await initUserStore();
  await initHospitalStore();
  await initAssistanceRequestStore();
  await initPatientStore();
  await initPatientAccessGrantStore();
  await ensureDemoHospitalNetwork();
  await ensureDemoPatients();
  await ensureBootstrapAdmin();
  const local = await getLocalHospital();
  await migrateStaffHospitalAssignments(
    local?.hospitalId || env.localHospitalId || DEMO_SMART_CARE_ID
  );

  if (mongoose.connection.readyState === 1) {
    console.log(
      "[db] Active persistence: MongoDB Atlas (hospitals, staffusers, assistancerequests, patients, patientaccessgrants)"
    );
  } else {
    console.log("[db] Active persistence: local JSON file stores");
  }
}

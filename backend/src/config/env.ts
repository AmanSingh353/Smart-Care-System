import dotenv from "dotenv";

dotenv.config();

/** Strip accidental quotes/spaces from .env values (e.g. KEY= "value"). */
function cleanEnv(value: string | undefined): string {
  if (!value) return "";
  return value.trim().replace(/^["']|["']$/g, "");
}

/**
 * Central env — no secrets committed.
 * Firebase Admin + bootstrap vars are backend-only.
 */
export const env = {
  port: Number(process.env.PORT) || 5000,
  host: cleanEnv(process.env.HOST) || "0.0.0.0",
  mongoUri: cleanEnv(process.env.MONGODB_URI),
  clientUrl: cleanEnv(process.env.CLIENT_URL) || "http://localhost:5173",
  nodeEnv: cleanEnv(process.env.NODE_ENV) || "development",
  firebaseProjectId: cleanEnv(process.env.FIREBASE_PROJECT_ID),
  firebaseClientEmail: cleanEnv(process.env.FIREBASE_CLIENT_EMAIL),
  firebasePrivateKey: cleanEnv(process.env.FIREBASE_PRIVATE_KEY).replace(/\\n/g, "\n"),
  bootstrapAdminEmail: cleanEnv(process.env.BOOTSTRAP_ADMIN_EMAIL).toLowerCase(),
  bootstrapAdminPassword: cleanEnv(process.env.BOOTSTRAP_ADMIN_PASSWORD),
  bootstrapAdminName: cleanEnv(process.env.BOOTSTRAP_ADMIN_NAME) || "System Administrator",
  /** Identifies this SCS deployment on the Connected Hospitals network (idempotent bootstrap). */
  localHospitalId: cleanEnv(process.env.LOCAL_HOSPITAL_ID) || "HOSP-001",
  localHospitalName: cleanEnv(process.env.LOCAL_HOSPITAL_NAME) || "Smart Care Hospital",
  localHospitalRegistration: cleanEnv(process.env.LOCAL_HOSPITAL_REGISTRATION),
  localHospitalAddress: cleanEnv(process.env.LOCAL_HOSPITAL_ADDRESS),
  localHospitalCity: cleanEnv(process.env.LOCAL_HOSPITAL_CITY) || "Delhi",
  localHospitalState: cleanEnv(process.env.LOCAL_HOSPITAL_STATE) || "Delhi",
  localHospitalPhone: cleanEnv(process.env.LOCAL_HOSPITAL_PHONE),
  localHospitalEmail: cleanEnv(process.env.LOCAL_HOSPITAL_EMAIL),
  localHospitalDepartments: cleanEnv(process.env.LOCAL_HOSPITAL_DEPARTMENTS)
    .split(",")
    .map(s => s.trim())
    .filter(Boolean),
  localHospitalFacilities: cleanEnv(process.env.LOCAL_HOSPITAL_FACILITIES)
    .split(",")
    .map(s => s.trim())
    .filter(Boolean),
};

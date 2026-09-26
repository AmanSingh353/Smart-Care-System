/**
 * Patient persistence — MongoDB when available, else durable JSON file store.
 * Network-wide Patient ID (SCP-YYYY-NNNNN) with unique index / collision-safe allocation.
 */
import fs from "fs/promises";
import path from "path";
import mongoose, { Schema, type Model } from "mongoose";
import { env } from "../config/env";
import { toPublicPatient, type Patient } from "../models/Patient";
import { writeJsonAtomic } from "../utils/writeJsonAtomic";

const memory = new Map<string, Patient>();
let yearSeq = 1;
let mongoReady = false;
let fileStoreReady = false;

const DATA_DIR = path.resolve(process.cwd(), "data");
const PATIENT_FILE = path.join(DATA_DIR, "patients.json");

interface PatientFilePayload {
  version: 1;
  year: number;
  seq: number;
  patients: Patient[];
}

interface PatientMongo {
  patientId: string;
  fullName: string;
  dateOfBirth: string;
  age: number | null;
  gender: string;
  bloodGroup: string;
  phone: string;
  allergies: string;
  currentMedications: string[];
  currentCondition: string;
  diagnosis: string;
  relevantVitals: string;
  relevantReports: string;
  clinicalSummary: string;
  homeHospitalId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface CounterMongo {
  _id: string;
  seq: number;
}

const PatientSchema = new Schema<PatientMongo>(
  {
    patientId: { type: String, required: true, unique: true, trim: true, index: true },
    fullName: { type: String, required: true, trim: true },
    dateOfBirth: { type: String, default: "" },
    age: { type: Number, default: null },
    gender: { type: String, default: "" },
    bloodGroup: { type: String, default: "" },
    phone: { type: String, default: "" },
    allergies: { type: String, default: "" },
    currentMedications: { type: [String], default: [] },
    currentCondition: { type: String, default: "" },
    diagnosis: { type: String, default: "" },
    relevantVitals: { type: String, default: "" },
    relevantReports: { type: String, default: "" },
    clinicalSummary: { type: String, default: "" },
    homeHospitalId: { type: String, required: true, index: true },
  },
  { timestamps: true, collection: "patients" }
);

const CounterSchema = new Schema<CounterMongo>(
  {
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
  },
  { collection: "counters" }
);

let PatientModel: Model<PatientMongo> | null = null;
let CounterModel: Model<CounterMongo> | null = null;

function fromMongo(
  doc: PatientMongo & { _id: { toString(): string }; createdAt: Date; updatedAt: Date }
): Patient {
  return {
    id: doc._id.toString(),
    patientId: doc.patientId,
    fullName: doc.fullName,
    dateOfBirth: doc.dateOfBirth || "",
    age: doc.age ?? null,
    gender: doc.gender || "",
    bloodGroup: doc.bloodGroup || "",
    phone: doc.phone || "",
    allergies: doc.allergies || "",
    currentMedications: Array.isArray(doc.currentMedications) ? doc.currentMedications : [],
    currentCondition: doc.currentCondition || "",
    diagnosis: doc.diagnosis || "",
    relevantVitals: doc.relevantVitals || "",
    relevantReports: doc.relevantReports || "",
    clinicalSummary: doc.clinicalSummary || "",
    homeHospitalId: doc.homeHospitalId,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

function normalizeRecord(p: Partial<Patient> & { id?: string }): Patient | null {
  if (!p?.patientId || !p?.fullName || !p?.homeHospitalId) return null;
  return {
    id: String(p.id || `PT-${p.patientId}`),
    patientId: String(p.patientId),
    fullName: String(p.fullName),
    dateOfBirth: String(p.dateOfBirth || ""),
    age: typeof p.age === "number" ? p.age : p.age == null ? null : Number(p.age) || null,
    gender: String(p.gender || ""),
    bloodGroup: String(p.bloodGroup || ""),
    phone: String(p.phone || ""),
    allergies: String(p.allergies || ""),
    currentMedications: Array.isArray(p.currentMedications)
      ? p.currentMedications.map(String)
      : [],
    currentCondition: String(p.currentCondition || ""),
    diagnosis: String(p.diagnosis || ""),
    relevantVitals: String(p.relevantVitals || ""),
    relevantReports: String(p.relevantReports || ""),
    clinicalSummary: String(p.clinicalSummary || ""),
    homeHospitalId: String(p.homeHospitalId),
    createdAt: p.createdAt || new Date().toISOString(),
    updatedAt: p.updatedAt || new Date().toISOString(),
  };
}

async function loadFileStore(): Promise<void> {
  memory.clear();
  const year = new Date().getFullYear();
  yearSeq = 1;
  try {
    const raw = await fs.readFile(PATIENT_FILE, "utf8");
    const parsed = JSON.parse(raw) as PatientFilePayload;
    const rows = Array.isArray(parsed.patients) ? parsed.patients : [];
    let maxSeq = 0;
    for (const row of rows) {
      const normalized = normalizeRecord(row);
      if (!normalized) continue;
      memory.set(normalized.id, normalized);
      const m = new RegExp(`^SCP-${year}-(\\d+)$`).exec(normalized.patientId);
      if (m) maxSeq = Math.max(maxSeq, Number(m[1]));
    }
    if (parsed.year === year) {
      yearSeq = Math.max(Number(parsed.seq) || 1, maxSeq + 1);
    } else {
      yearSeq = Math.max(1, maxSeq + 1);
    }
    fileStoreReady = true;
    console.log(`[patients] File store loaded (${memory.size} record(s)) — ${PATIENT_FILE}`);
  } catch (err: unknown) {
    const code =
      err && typeof err === "object" && "code" in err ? String((err as { code: string }).code) : "";
    if (code === "ENOENT") {
      fileStoreReady = true;
      console.log(`[patients] File store ready (empty) — ${PATIENT_FILE}`);
      return;
    }
    console.error("[patients] Failed to load file store — starting empty", err);
    fileStoreReady = true;
  }
}

async function persistFileStore(): Promise<void> {
  if (mongoReady || !fileStoreReady) return;
  await fs.mkdir(DATA_DIR, { recursive: true });
  const payload: PatientFilePayload = {
    version: 1,
    year: new Date().getFullYear(),
    seq: yearSeq,
    patients: [...memory.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
  };
  await writeJsonAtomic(PATIENT_FILE, payload);
}

export async function allocateNextPatientId(): Promise<string> {
  const year = new Date().getFullYear();
  if (mongoReady && CounterModel) {
    const doc = await CounterModel.findOneAndUpdate(
      { _id: `patientId-${year}` },
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: "after" }
    ).lean();
    const n = (doc as { seq?: number } | null)?.seq || 1;
    return `SCP-${year}-${String(n).padStart(5, "0")}`;
  }
  const n = yearSeq++;
  return `SCP-${year}-${String(n).padStart(5, "0")}`;
}

export async function initPatientStore(): Promise<void> {
  if (!env.mongoUri) {
    await loadFileStore();
    return;
  }
  try {
    if (mongoose.connection.readyState !== 1) {
      throw new Error("MongoDB not connected — check MONGODB_URI / Atlas network access");
    }
    PatientModel =
      mongoose.models.Patient || mongoose.model<PatientMongo>("Patient", PatientSchema);
    CounterModel =
      mongoose.models.Counter || mongoose.model<CounterMongo>("Counter", CounterSchema);
    mongoReady = true;
    fileStoreReady = false;
    const count = await PatientModel.countDocuments();
    console.log(`[patients] MongoDB patient store ready (collection=patients, ${count} record(s))`);
  } catch (err) {
    console.error("[patients] Mongo patient store failed — falling back to file store", err);
    mongoReady = false;
    PatientModel = null;
    CounterModel = null;
    await loadFileStore();
  }
}

export async function listPatients(filter?: {
  homeHospitalId?: string;
  search?: string;
}): Promise<Patient[]> {
  if (mongoReady && PatientModel) {
    const q: Record<string, unknown> = {};
    if (filter?.homeHospitalId) q.homeHospitalId = filter.homeHospitalId;
    if (filter?.search?.trim()) {
      const s = filter.search.trim();
      q.$or = [
        { patientId: { $regex: s, $options: "i" } },
        { fullName: { $regex: s, $options: "i" } },
      ];
    }
    const docs = await PatientModel.find(q).sort({ createdAt: -1 }).lean();
    return docs.map(d => fromMongo(d as never));
  }
  let rows = [...memory.values()];
  if (filter?.homeHospitalId) {
    rows = rows.filter(p => p.homeHospitalId === filter.homeHospitalId);
  }
  if (filter?.search?.trim()) {
    const s = filter.search.trim().toLowerCase();
    rows = rows.filter(
      p => p.patientId.toLowerCase().includes(s) || p.fullName.toLowerCase().includes(s)
    );
  }
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function findPatientById(id: string): Promise<Patient | null> {
  if (mongoReady && PatientModel) {
    const doc = await PatientModel.findById(id).lean();
    return doc ? fromMongo(doc as never) : null;
  }
  return memory.get(id) || null;
}

export async function findPatientByPatientId(patientId: string): Promise<Patient | null> {
  const key = patientId.trim();
  if (!key) return null;
  if (mongoReady && PatientModel) {
    const doc = await PatientModel.findOne({ patientId: key }).lean();
    return doc ? fromMongo(doc as never) : null;
  }
  return [...memory.values()].find(p => p.patientId === key) || null;
}

export async function createPatient(input: {
  fullName: string;
  homeHospitalId: string;
  dateOfBirth?: string;
  age?: number | null;
  gender?: string;
  bloodGroup?: string;
  phone?: string;
  allergies?: string;
  currentMedications?: string[];
  currentCondition?: string;
  diagnosis?: string;
  relevantVitals?: string;
  relevantReports?: string;
  clinicalSummary?: string;
  patientId?: string;
}): Promise<Patient> {
  const fullName = input.fullName.trim();
  const homeHospitalId = input.homeHospitalId.trim();
  if (!fullName || !homeHospitalId) {
    throw Object.assign(new Error("fullName and homeHospitalId are required"), {
      status: 400,
      code: "VALIDATION",
    });
  }

  let patientId = (input.patientId || "").trim();
  if (patientId) {
    const exists = await findPatientByPatientId(patientId);
    if (exists) {
      throw Object.assign(new Error("Patient ID already exists"), {
        status: 409,
        code: "DUPLICATE_PATIENT_ID",
      });
    }
  } else {
    for (let attempt = 0; attempt < 5; attempt++) {
      patientId = await allocateNextPatientId();
      const exists = await findPatientByPatientId(patientId);
      if (!exists) break;
      if (attempt === 4) {
        throw Object.assign(new Error("Failed to allocate unique patient ID"), {
          status: 500,
          code: "ID_ALLOCATION_FAILED",
        });
      }
    }
  }

  const meds = (input.currentMedications || []).map(s => String(s).trim()).filter(Boolean);

  if (mongoReady && PatientModel) {
    const doc = await PatientModel.create({
      patientId,
      fullName,
      dateOfBirth: (input.dateOfBirth || "").trim(),
      age: typeof input.age === "number" ? input.age : null,
      gender: (input.gender || "").trim(),
      bloodGroup: (input.bloodGroup || "").trim(),
      phone: (input.phone || "").trim(),
      allergies: (input.allergies || "").trim(),
      currentMedications: meds,
      currentCondition: (input.currentCondition || "").trim(),
      diagnosis: (input.diagnosis || "").trim(),
      relevantVitals: (input.relevantVitals || "").trim(),
      relevantReports: (input.relevantReports || "").trim(),
      clinicalSummary: (input.clinicalSummary || "").trim(),
      homeHospitalId,
    });
    return fromMongo(doc as never);
  }

  const now = new Date().toISOString();
  const id = `PT-${patientId}`;
  const row: Patient = {
    id,
    patientId: patientId!,
    fullName,
    dateOfBirth: (input.dateOfBirth || "").trim(),
    age: typeof input.age === "number" ? input.age : null,
    gender: (input.gender || "").trim(),
    bloodGroup: (input.bloodGroup || "").trim(),
    phone: (input.phone || "").trim(),
    allergies: (input.allergies || "").trim(),
    currentMedications: meds,
    currentCondition: (input.currentCondition || "").trim(),
    diagnosis: (input.diagnosis || "").trim(),
    relevantVitals: (input.relevantVitals || "").trim(),
    relevantReports: (input.relevantReports || "").trim(),
    clinicalSummary: (input.clinicalSummary || "").trim(),
    homeHospitalId,
    createdAt: now,
    updatedAt: now,
  };
  memory.set(id, row);
  await persistFileStore();
  return row;
}

export async function updatePatient(
  id: string,
  patch: Partial<
    Pick<
      Patient,
      | "fullName"
      | "dateOfBirth"
      | "age"
      | "gender"
      | "bloodGroup"
      | "phone"
      | "allergies"
      | "currentMedications"
      | "currentCondition"
      | "diagnosis"
      | "relevantVitals"
      | "relevantReports"
      | "clinicalSummary"
    >
  >
): Promise<Patient | null> {
  if (mongoReady && PatientModel) {
    const doc = await PatientModel.findByIdAndUpdate(
      id,
      { $set: patch },
      { returnDocument: "after" }
    ).lean();
    return doc ? fromMongo(doc as never) : null;
  }
  const cur = memory.get(id);
  if (!cur) return null;
  const next = { ...cur, ...patch, updatedAt: new Date().toISOString() };
  memory.set(id, next);
  await persistFileStore();
  return next;
}

export { toPublicPatient };

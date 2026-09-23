/**
 * Hospital persistence — MongoDB when available, else durable JSON file store.
 * Never auto-seeds partner hospitals. Local hospital is ensured once from env (idempotent).
 */
import fs from "fs/promises";
import path from "path";
import mongoose, { Schema, type Model } from "mongoose";
import { env } from "../config/env";
import {
  HOSPITAL_STATUSES,
  normalizeHospitalStatus,
  type Hospital,
  type HospitalStatus,
} from "../models/Hospital";
import { writeJsonAtomic } from "../utils/writeJsonAtomic";

const memory = new Map<string, Hospital>();
let seq = 1;
let mongoReady = false;
let fileStoreReady = false;

const DATA_DIR = path.resolve(process.cwd(), "data");
const HOSPITAL_FILE = path.join(DATA_DIR, "hospitals.json");

interface HospitalFilePayload {
  version: 1;
  seq: number;
  hospitals: Hospital[];
}

interface HospitalMongo {
  hospitalId: string;
  hospitalName: string;
  registrationId: string;
  address: string;
  city: string;
  state: string;
  contactPhone: string;
  contactEmail: string;
  departments: string[];
  facilities: string[];
  emergencySupport: boolean;
  status: HospitalStatus;
  isLocal: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const HospitalSchema = new Schema<HospitalMongo>(
  {
    hospitalId: { type: String, required: true, unique: true, trim: true },
    hospitalName: { type: String, required: true, trim: true },
    registrationId: { type: String, default: "", trim: true },
    address: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    contactPhone: { type: String, default: "" },
    contactEmail: { type: String, default: "", lowercase: true, trim: true },
    departments: { type: [String], default: [] },
    facilities: { type: [String], default: [] },
    emergencySupport: { type: Boolean, default: true },
    status: { type: String, required: true, enum: HOSPITAL_STATUSES, default: "ONLINE" },
    isLocal: { type: Boolean, default: false },
  },
  { timestamps: true }
);

let HospitalModel: Model<HospitalMongo> | null = null;

function fromMongo(
  doc: HospitalMongo & { _id: { toString(): string }; createdAt: Date; updatedAt: Date }
): Hospital {
  return {
    id: doc._id.toString(),
    hospitalId: doc.hospitalId,
    hospitalName: doc.hospitalName,
    registrationId: doc.registrationId || "",
    address: doc.address || "",
    city: doc.city || "",
    state: doc.state || "",
    contactPhone: doc.contactPhone || "",
    contactEmail: (doc.contactEmail || "").toLowerCase(),
    departments: Array.isArray(doc.departments) ? doc.departments : [],
    facilities: Array.isArray(doc.facilities) ? doc.facilities : [],
    emergencySupport: Boolean(doc.emergencySupport),
    status: doc.status,
    isLocal: Boolean(doc.isLocal),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

function normalizeRecord(h: Partial<Hospital> & { id?: string; hospitalId?: string }): Hospital | null {
  if (!h?.hospitalId || !h?.hospitalName) return null;
  const id = String(h.id || `HOSP-REC-${h.hospitalId}`);
  return {
    id,
    hospitalId: String(h.hospitalId).trim(),
    hospitalName: String(h.hospitalName).trim(),
    registrationId: String(h.registrationId || ""),
    address: String(h.address || ""),
    city: String(h.city || ""),
    state: String(h.state || ""),
    contactPhone: String(h.contactPhone || ""),
    contactEmail: String(h.contactEmail || "").toLowerCase(),
    departments: Array.isArray(h.departments) ? h.departments.map(String) : [],
    facilities: Array.isArray(h.facilities) ? h.facilities.map(String) : [],
    emergencySupport: h.emergencySupport !== false,
    status: normalizeHospitalStatus(String(h.status || "ONLINE")) || "ONLINE",
    isLocal: Boolean(h.isLocal),
    createdAt: h.createdAt || new Date().toISOString(),
    updatedAt: h.updatedAt || new Date().toISOString(),
  };
}

async function loadFileStore(): Promise<void> {
  memory.clear();
  seq = 1;
  try {
    const raw = await fs.readFile(HOSPITAL_FILE, "utf8");
    const parsed = JSON.parse(raw) as HospitalFilePayload;
    const rows = Array.isArray(parsed.hospitals) ? parsed.hospitals : [];
    let maxSeq = 0;
    for (const row of rows) {
      const normalized = normalizeRecord(row);
      if (!normalized) continue;
      memory.set(normalized.id, normalized);
      const m = /^HOSP-REC-(\d+)$/.exec(normalized.id);
      if (m) maxSeq = Math.max(maxSeq, Number(m[1]));
    }
    seq = Math.max(Number(parsed.seq) || 1, maxSeq + 1);
    fileStoreReady = true;
    console.log(`[hospitals] File store loaded (${memory.size} record(s)) — ${HOSPITAL_FILE}`);
  } catch (err: unknown) {
    const code = err && typeof err === "object" && "code" in err ? String((err as { code: string }).code) : "";
    if (code === "ENOENT") {
      fileStoreReady = true;
      console.log(`[hospitals] File store ready (empty) — ${HOSPITAL_FILE}`);
      return;
    }
    console.error("[hospitals] Failed to load file store — starting empty", err);
    fileStoreReady = true;
  }
}

async function persistFileStore(): Promise<void> {
  if (mongoReady || !fileStoreReady) return;
  await fs.mkdir(DATA_DIR, { recursive: true });
  const payload: HospitalFilePayload = {
    version: 1,
    seq,
    hospitals: [...memory.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
  };
  await writeJsonAtomic(HOSPITAL_FILE, payload);
}

export async function initHospitalStore(): Promise<void> {
  if (!env.mongoUri) {
    await loadFileStore();
    return;
  }
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.mongoUri);
    }
    HospitalModel =
      mongoose.models.Hospital || mongoose.model<HospitalMongo>("Hospital", HospitalSchema);
    mongoReady = true;
    fileStoreReady = false;
    console.log("[hospitals] MongoDB hospital store ready — no partner hospitals auto-seeded");
  } catch (err) {
    console.error("[hospitals] Mongo connect failed — falling back to file store", err);
    mongoReady = false;
    await loadFileStore();
  }
}

/**
 * Idempotent: ensure the local hospital from env exists exactly once.
 * Does not create partner hospitals.
 */
export async function ensureLocalHospital(): Promise<Hospital | null> {
  const hospitalId = env.localHospitalId;
  if (!hospitalId) {
    console.warn(
      "[hospitals] LOCAL_HOSPITAL_ID not set — set it to identify this SCS deployment on the network"
    );
    return null;
  }

  const existing = await findHospitalByHospitalId(hospitalId);
  if (existing) {
    const patch: Partial<Hospital> = {};
    if (!existing.isLocal) patch.isLocal = true;
    if (env.localHospitalName && existing.hospitalName !== env.localHospitalName) {
      patch.hospitalName = env.localHospitalName;
    }
    if (Object.keys(patch).length) {
      return (await updateHospital(existing.id, patch)) || existing;
    }
    return existing;
  }

  return createHospital({
    hospitalId,
    hospitalName: env.localHospitalName || "Smart Care Hospital",
    registrationId: env.localHospitalRegistration || hospitalId,
    address: env.localHospitalAddress,
    city: env.localHospitalCity,
    state: env.localHospitalState,
    contactPhone: env.localHospitalPhone,
    contactEmail: env.localHospitalEmail,
    departments: env.localHospitalDepartments,
    facilities: env.localHospitalFacilities,
    emergencySupport: true,
    status: "ONLINE",
    isLocal: true,
  });
}

export async function listHospitals(): Promise<Hospital[]> {
  if (mongoReady && HospitalModel) {
    const docs = await HospitalModel.find().sort({ hospitalName: 1 }).lean();
    return docs.map(d => fromMongo(d as never));
  }
  return [...memory.values()].sort((a, b) => a.hospitalName.localeCompare(b.hospitalName));
}

export async function findHospitalById(id: string): Promise<Hospital | null> {
  if (mongoReady && HospitalModel) {
    const doc = await HospitalModel.findById(id).lean();
    return doc ? fromMongo(doc as never) : null;
  }
  return memory.get(id) || null;
}

export async function findHospitalByHospitalId(hospitalId: string): Promise<Hospital | null> {
  const key = hospitalId.trim();
  if (mongoReady && HospitalModel) {
    const doc = await HospitalModel.findOne({ hospitalId: key }).lean();
    return doc ? fromMongo(doc as never) : null;
  }
  return [...memory.values()].find(h => h.hospitalId === key) || null;
}

export async function getLocalHospital(): Promise<Hospital | null> {
  if (mongoReady && HospitalModel) {
    const doc = await HospitalModel.findOne({ isLocal: true }).lean();
    return doc ? fromMongo(doc as never) : null;
  }
  return [...memory.values()].find(h => h.isLocal) || null;
}

export async function createHospital(input: {
  hospitalId: string;
  hospitalName: string;
  registrationId?: string;
  address?: string;
  city?: string;
  state?: string;
  contactPhone?: string;
  contactEmail?: string;
  departments?: string[];
  facilities?: string[];
  emergencySupport?: boolean;
  status?: HospitalStatus;
  isLocal?: boolean;
}): Promise<Hospital> {
  const hospitalId = input.hospitalId.trim();
  const hospitalName = input.hospitalName.trim();
  if (!hospitalId || !hospitalName) {
    throw Object.assign(new Error("hospitalId and hospitalName are required"), {
      status: 400,
      code: "VALIDATION",
    });
  }
  const existing = await findHospitalByHospitalId(hospitalId);
  if (existing) {
    throw Object.assign(new Error("A hospital with this hospitalId already exists"), {
      status: 409,
      code: "DUPLICATE_HOSPITAL",
    });
  }

  const status = input.status || "ONLINE";
  const departments = (input.departments || []).map(d => d.trim()).filter(Boolean);
  const facilities = (input.facilities || []).map(f => f.trim()).filter(Boolean);

  if (mongoReady && HospitalModel) {
    const doc = await HospitalModel.create({
      hospitalId,
      hospitalName,
      registrationId: (input.registrationId || "").trim(),
      address: (input.address || "").trim(),
      city: (input.city || "").trim(),
      state: (input.state || "").trim(),
      contactPhone: (input.contactPhone || "").trim(),
      contactEmail: (input.contactEmail || "").trim().toLowerCase(),
      departments,
      facilities,
      emergencySupport: input.emergencySupport !== false,
      status,
      isLocal: Boolean(input.isLocal),
    });
    return fromMongo(doc as never);
  }

  const now = new Date().toISOString();
  const id = `HOSP-REC-${seq++}`;
  const hospital: Hospital = {
    id,
    hospitalId,
    hospitalName,
    registrationId: (input.registrationId || "").trim(),
    address: (input.address || "").trim(),
    city: (input.city || "").trim(),
    state: (input.state || "").trim(),
    contactPhone: (input.contactPhone || "").trim(),
    contactEmail: (input.contactEmail || "").trim().toLowerCase(),
    departments,
    facilities,
    emergencySupport: input.emergencySupport !== false,
    status,
    isLocal: Boolean(input.isLocal),
    createdAt: now,
    updatedAt: now,
  };
  memory.set(id, hospital);
  await persistFileStore();
  return hospital;
}

export async function updateHospital(
  id: string,
  patch: Partial<
    Pick<
      Hospital,
      | "hospitalId"
      | "hospitalName"
      | "registrationId"
      | "address"
      | "city"
      | "state"
      | "contactPhone"
      | "contactEmail"
      | "departments"
      | "facilities"
      | "emergencySupport"
      | "status"
      | "isLocal"
    >
  >
): Promise<Hospital | null> {
  if (patch.hospitalId) {
    const other = await findHospitalByHospitalId(patch.hospitalId);
    if (other && other.id !== id) {
      throw Object.assign(new Error("A hospital with this hospitalId already exists"), {
        status: 409,
        code: "DUPLICATE_HOSPITAL",
      });
    }
  }
  if (mongoReady && HospitalModel) {
    const doc = await HospitalModel.findByIdAndUpdate(id, { $set: patch }, { new: true }).lean();
    return doc ? fromMongo(doc as never) : null;
  }
  const cur = memory.get(id);
  if (!cur) return null;
  const next = { ...cur, ...patch, updatedAt: new Date().toISOString() };
  memory.set(id, next);
  await persistFileStore();
  return next;
}

export async function deleteHospital(id: string): Promise<Hospital | null> {
  const existing = await findHospitalById(id);
  if (!existing) return null;
  if (mongoReady && HospitalModel) {
    await HospitalModel.findByIdAndDelete(id);
    return existing;
  }
  memory.delete(id);
  await persistFileStore();
  return existing;
}

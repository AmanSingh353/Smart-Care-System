/**
 * Assistance request persistence — MongoDB when available, else durable JSON file store.
 * Never auto-seeds requests.
 */
import fs from "fs/promises";
import path from "path";
import mongoose, { Schema, type Model } from "mongoose";
import { env } from "../config/env";
import {
  ASSISTANCE_PRIORITIES,
  ASSISTANCE_STATUSES,
  normalizeAssistancePriority,
  normalizeAssistanceStatus,
  type AssistancePriority,
  type AssistanceRequest,
  type AssistanceStatus,
} from "../models/AssistanceRequest";
import { writeJsonAtomic } from "../utils/writeJsonAtomic";

const memory = new Map<string, AssistanceRequest>();
let seq = 1;
let mongoReady = false;
let fileStoreReady = false;

const DATA_DIR = path.resolve(process.cwd(), "data");
const REQUEST_FILE = path.join(DATA_DIR, "assistance-requests.json");

interface RequestFilePayload {
  version: 1;
  seq: number;
  requests: AssistanceRequest[];
}

interface AssistanceMongo {
  requestId: string;
  requestingHospitalId: string;
  targetHospitalId: string;
  requestingStaffId: string;
  requestingStaffName: string;
  priority: AssistancePriority;
  emergencyType: string;
  requiredDepartment: string;
  requiredFacilities: string[];
  shortDescription: string;
  patientReference: string;
  status: AssistanceStatus;
  createdAt: Date;
  updatedAt: Date;
}

const AssistanceSchema = new Schema<AssistanceMongo>(
  {
    requestId: { type: String, required: true, unique: true, trim: true },
    requestingHospitalId: { type: String, required: true, index: true },
    targetHospitalId: { type: String, required: true, index: true },
    requestingStaffId: { type: String, required: true },
    requestingStaffName: { type: String, default: "" },
    priority: { type: String, required: true, enum: ASSISTANCE_PRIORITIES },
    emergencyType: { type: String, required: true },
    requiredDepartment: { type: String, required: true },
    requiredFacilities: { type: [String], default: [] },
    shortDescription: { type: String, default: "" },
    patientReference: { type: String, default: "" },
    status: { type: String, required: true, enum: ASSISTANCE_STATUSES, default: "PENDING" },
  },
  { timestamps: true, collection: "assistancerequests" }
);

let AssistanceModel: Model<AssistanceMongo> | null = null;

function fromMongo(
  doc: AssistanceMongo & { _id: { toString(): string }; createdAt: Date; updatedAt: Date }
): AssistanceRequest {
  return {
    id: doc._id.toString(),
    requestId: doc.requestId,
    requestingHospitalId: doc.requestingHospitalId,
    targetHospitalId: doc.targetHospitalId,
    requestingStaffId: doc.requestingStaffId,
    requestingStaffName: doc.requestingStaffName || "",
    priority: doc.priority,
    emergencyType: doc.emergencyType,
    requiredDepartment: doc.requiredDepartment,
    requiredFacilities: Array.isArray(doc.requiredFacilities) ? doc.requiredFacilities : [],
    shortDescription: doc.shortDescription || "",
    patientReference: doc.patientReference || "",
    status: doc.status,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

function normalizeRecord(r: Partial<AssistanceRequest> & { id?: string }): AssistanceRequest | null {
  if (!r?.requestId || !r?.requestingHospitalId || !r?.targetHospitalId) return null;
  return {
    id: String(r.id || `AR-${r.requestId}`),
    requestId: String(r.requestId),
    requestingHospitalId: String(r.requestingHospitalId),
    targetHospitalId: String(r.targetHospitalId),
    requestingStaffId: String(r.requestingStaffId || ""),
    requestingStaffName: String(r.requestingStaffName || ""),
    priority: normalizeAssistancePriority(String(r.priority || "NORMAL")) || "NORMAL",
    emergencyType: String(r.emergencyType || ""),
    requiredDepartment: String(r.requiredDepartment || ""),
    requiredFacilities: Array.isArray(r.requiredFacilities) ? r.requiredFacilities.map(String) : [],
    shortDescription: String(r.shortDescription || ""),
    patientReference: String(r.patientReference || ""),
    status: normalizeAssistanceStatus(String(r.status || "PENDING")) || "PENDING",
    createdAt: r.createdAt || new Date().toISOString(),
    updatedAt: r.updatedAt || new Date().toISOString(),
  };
}

async function loadFileStore(): Promise<void> {
  memory.clear();
  seq = 1;
  try {
    const raw = await fs.readFile(REQUEST_FILE, "utf8");
    const parsed = JSON.parse(raw) as RequestFilePayload;
    const rows = Array.isArray(parsed.requests) ? parsed.requests : [];
    let maxSeq = 0;
    for (const row of rows) {
      const normalized = normalizeRecord(row);
      if (!normalized) continue;
      memory.set(normalized.id, normalized);
      const m = /^AR-(\d+)$/.exec(normalized.id);
      if (m) maxSeq = Math.max(maxSeq, Number(m[1]));
    }
    seq = Math.max(Number(parsed.seq) || 1, maxSeq + 1);
    fileStoreReady = true;
    console.log(`[assistance] File store loaded (${memory.size} record(s)) — ${REQUEST_FILE}`);
  } catch (err: unknown) {
    const code = err && typeof err === "object" && "code" in err ? String((err as { code: string }).code) : "";
    if (code === "ENOENT") {
      fileStoreReady = true;
      console.log(`[assistance] File store ready (empty) — ${REQUEST_FILE}`);
      return;
    }
    console.error("[assistance] Failed to load file store — starting empty", err);
    fileStoreReady = true;
  }
}

async function persistFileStore(): Promise<void> {
  if (mongoReady || !fileStoreReady) return;
  await fs.mkdir(DATA_DIR, { recursive: true });
  const payload: RequestFilePayload = {
    version: 1,
    seq,
    requests: [...memory.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  };
  await writeJsonAtomic(REQUEST_FILE, payload);
}

export async function initAssistanceRequestStore(): Promise<void> {
  if (!env.mongoUri) {
    await loadFileStore();
    return;
  }
  try {
    if (mongoose.connection.readyState !== 1) {
      throw new Error("MongoDB not connected — check MONGODB_URI / Atlas network access");
    }
    AssistanceModel =
      mongoose.models.AssistanceRequest ||
      mongoose.model<AssistanceMongo>("AssistanceRequest", AssistanceSchema);
    mongoReady = true;
    fileStoreReady = false;
    const docs = await AssistanceModel.find().select("requestId").lean();
    let maxN = 0;
    for (const d of docs) {
      const m = /^CG-(\d+)$/.exec(String((d as { requestId?: string }).requestId || ""));
      if (m) maxN = Math.max(maxN, Number(m[1]));
    }
    seq = Math.max(1, maxN - 1000 + 1, docs.length + 1);
    console.log(
      `[assistance] MongoDB assistance store ready (collection=assistancerequests, ${docs.length} record(s))`
    );
  } catch (err) {
    console.error("[assistance] Mongo assistance store failed — falling back to file store", err);
    mongoReady = false;
    AssistanceModel = null;
    await loadFileStore();
  }
}

export async function listAssistanceRequests(): Promise<AssistanceRequest[]> {
  if (mongoReady && AssistanceModel) {
    const docs = await AssistanceModel.find().sort({ createdAt: -1 }).lean();
    return docs.map(d => fromMongo(d as never));
  }
  return [...memory.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function findAssistanceById(id: string): Promise<AssistanceRequest | null> {
  if (mongoReady && AssistanceModel) {
    const doc = await AssistanceModel.findById(id).lean();
    return doc ? fromMongo(doc as never) : null;
  }
  return memory.get(id) || null;
}

export async function findAssistanceByRequestId(requestId: string): Promise<AssistanceRequest | null> {
  const key = requestId.trim();
  if (mongoReady && AssistanceModel) {
    const doc = await AssistanceModel.findOne({ requestId: key }).lean();
    return doc ? fromMongo(doc as never) : null;
  }
  return [...memory.values()].find(r => r.requestId === key) || null;
}

export async function listByTargetHospital(hospitalId: string): Promise<AssistanceRequest[]> {
  const all = await listAssistanceRequests();
  return all.filter(r => r.targetHospitalId === hospitalId);
}

export async function listByRequestingHospital(hospitalId: string): Promise<AssistanceRequest[]> {
  const all = await listAssistanceRequests();
  return all.filter(r => r.requestingHospitalId === hospitalId);
}

export async function createAssistanceRequest(input: {
  requestingHospitalId: string;
  targetHospitalId: string;
  requestingStaffId: string;
  requestingStaffName: string;
  priority: AssistancePriority;
  emergencyType: string;
  requiredDepartment: string;
  requiredFacilities?: string[];
  shortDescription?: string;
  patientReference?: string;
}): Promise<AssistanceRequest> {
  const n = seq++;
  const requestId = `CG-${1000 + n}`;
  const dup = await findAssistanceByRequestId(requestId);
  if (dup) {
    throw Object.assign(new Error("Request ID collision — retry"), {
      status: 409,
      code: "DUPLICATE_REQUEST",
    });
  }

  const facilities = (input.requiredFacilities || []).map(f => f.trim()).filter(Boolean);

  if (mongoReady && AssistanceModel) {
    const doc = await AssistanceModel.create({
      requestId,
      requestingHospitalId: input.requestingHospitalId,
      targetHospitalId: input.targetHospitalId,
      requestingStaffId: input.requestingStaffId,
      requestingStaffName: input.requestingStaffName,
      priority: input.priority,
      emergencyType: input.emergencyType.trim(),
      requiredDepartment: input.requiredDepartment.trim(),
      requiredFacilities: facilities,
      shortDescription: (input.shortDescription || "").trim().slice(0, 500),
      patientReference: (input.patientReference || "").trim().slice(0, 64),
      status: "PENDING",
    });
    return fromMongo(doc as never);
  }

  const now = new Date().toISOString();
  const id = `AR-${n}`;
  const row: AssistanceRequest = {
    id,
    requestId,
    requestingHospitalId: input.requestingHospitalId,
    targetHospitalId: input.targetHospitalId,
    requestingStaffId: input.requestingStaffId,
    requestingStaffName: input.requestingStaffName,
    priority: input.priority,
    emergencyType: input.emergencyType.trim(),
    requiredDepartment: input.requiredDepartment.trim(),
    requiredFacilities: facilities,
    shortDescription: (input.shortDescription || "").trim().slice(0, 500),
    patientReference: (input.patientReference || "").trim().slice(0, 64),
    status: "PENDING",
    createdAt: now,
    updatedAt: now,
  };
  memory.set(id, row);
  await persistFileStore();
  return row;
}

export async function updateAssistanceStatus(
  id: string,
  status: AssistanceStatus
): Promise<AssistanceRequest | null> {
  if (mongoReady && AssistanceModel) {
    const doc = await AssistanceModel.findByIdAndUpdate(
      id,
      { $set: { status }, $currentDate: { updatedAt: true } },
      { returnDocument: "after" }
    ).lean();
    return doc ? fromMongo(doc as never) : null;
  }
  const cur = memory.get(id);
  if (!cur) return null;
  const next = { ...cur, status, updatedAt: new Date().toISOString() };
  memory.set(id, next);
  await persistFileStore();
  return next;
}

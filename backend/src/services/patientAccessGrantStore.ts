/**
 * Patient access grants — expanded record access after CareGuard acceptance.
 */
import fs from "fs/promises";
import path from "path";
import mongoose, { Schema, type Model } from "mongoose";
import { env } from "../config/env";
import {
  PATIENT_ACCESS_SECTIONS,
  PATIENT_ACCESS_STATUSES,
  type PatientAccessGrant,
  type PatientAccessSection,
  type PatientAccessStatus,
  toPublicAccessGrant,
} from "../models/PatientAccessGrant";
import { writeJsonAtomic } from "../utils/writeJsonAtomic";

const memory = new Map<string, PatientAccessGrant>();
let seq = 1;
let mongoReady = false;
let fileStoreReady = false;

const DATA_DIR = path.resolve(process.cwd(), "data");
const GRANT_FILE = path.join(DATA_DIR, "patient-access-grants.json");

interface GrantFilePayload {
  version: 1;
  seq: number;
  grants: PatientAccessGrant[];
}

interface GrantMongo {
  requestId: string;
  assistanceId: string;
  patientId: string;
  requestingHospitalId: string;
  targetHospitalId: string;
  allowedSections: string[];
  status: PatientAccessStatus;
  expiresAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const GrantSchema = new Schema<GrantMongo>(
  {
    requestId: { type: String, required: true, unique: true, trim: true, index: true },
    assistanceId: { type: String, required: true, index: true },
    patientId: { type: String, required: true, index: true },
    requestingHospitalId: { type: String, required: true, index: true },
    targetHospitalId: { type: String, required: true, index: true },
    allowedSections: { type: [String], default: () => [...PATIENT_ACCESS_SECTIONS] },
    status: { type: String, required: true, enum: PATIENT_ACCESS_STATUSES, default: "ACTIVE" },
    expiresAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "patientaccessgrants" }
);

let GrantModel: Model<GrantMongo> | null = null;

function fromMongo(
  doc: GrantMongo & { _id: { toString(): string }; createdAt: Date; updatedAt: Date }
): PatientAccessGrant {
  return {
    id: doc._id.toString(),
    requestId: doc.requestId,
    assistanceId: doc.assistanceId,
    patientId: doc.patientId,
    requestingHospitalId: doc.requestingHospitalId,
    targetHospitalId: doc.targetHospitalId,
    allowedSections: (doc.allowedSections || []) as PatientAccessSection[],
    status: doc.status,
    createdAt: doc.createdAt.toISOString(),
    expiresAt: doc.expiresAt ? doc.expiresAt.toISOString() : null,
    revokedAt: doc.revokedAt ? doc.revokedAt.toISOString() : null,
    updatedAt: doc.updatedAt.toISOString(),
  };
}

function normalizeRecord(g: Partial<PatientAccessGrant> & { id?: string }): PatientAccessGrant | null {
  if (!g?.requestId || !g?.patientId || !g?.assistanceId) return null;
  return {
    id: String(g.id || `PAG-${g.requestId}`),
    requestId: String(g.requestId),
    assistanceId: String(g.assistanceId),
    patientId: String(g.patientId),
    requestingHospitalId: String(g.requestingHospitalId || ""),
    targetHospitalId: String(g.targetHospitalId || ""),
    allowedSections: (Array.isArray(g.allowedSections)
      ? g.allowedSections
      : [...PATIENT_ACCESS_SECTIONS]) as PatientAccessSection[],
    status: (g.status || "ACTIVE") as PatientAccessStatus,
    createdAt: g.createdAt || new Date().toISOString(),
    expiresAt: g.expiresAt ?? null,
    revokedAt: g.revokedAt ?? null,
    updatedAt: g.updatedAt || new Date().toISOString(),
  };
}

async function loadFileStore(): Promise<void> {
  memory.clear();
  seq = 1;
  try {
    const raw = await fs.readFile(GRANT_FILE, "utf8");
    const parsed = JSON.parse(raw) as GrantFilePayload;
    const rows = Array.isArray(parsed.grants) ? parsed.grants : [];
    let maxSeq = 0;
    for (const row of rows) {
      const normalized = normalizeRecord(row);
      if (!normalized) continue;
      memory.set(normalized.id, normalized);
      const m = /^PAG-(\d+)$/.exec(normalized.id);
      if (m) maxSeq = Math.max(maxSeq, Number(m[1]));
    }
    seq = Math.max(Number(parsed.seq) || 1, maxSeq + 1);
    fileStoreReady = true;
    console.log(`[access] File grant store loaded (${memory.size} record(s)) — ${GRANT_FILE}`);
  } catch (err: unknown) {
    const code =
      err && typeof err === "object" && "code" in err ? String((err as { code: string }).code) : "";
    if (code === "ENOENT") {
      fileStoreReady = true;
      console.log(`[access] File grant store ready (empty) — ${GRANT_FILE}`);
      return;
    }
    console.error("[access] Failed to load grant file store — starting empty", err);
    fileStoreReady = true;
  }
}

async function persistFileStore(): Promise<void> {
  if (mongoReady || !fileStoreReady) return;
  await fs.mkdir(DATA_DIR, { recursive: true });
  const payload: GrantFilePayload = {
    version: 1,
    seq,
    grants: [...memory.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  };
  await writeJsonAtomic(GRANT_FILE, payload);
}

export async function initPatientAccessGrantStore(): Promise<void> {
  if (!env.mongoUri) {
    await loadFileStore();
    return;
  }
  try {
    if (mongoose.connection.readyState !== 1) {
      throw new Error("MongoDB not connected — check MONGODB_URI / Atlas network access");
    }
    GrantModel =
      mongoose.models.PatientAccessGrant ||
      mongoose.model<GrantMongo>("PatientAccessGrant", GrantSchema);
    mongoReady = true;
    fileStoreReady = false;
    const count = await GrantModel.countDocuments();
    console.log(
      `[access] MongoDB grant store ready (collection=patientaccessgrants, ${count} record(s))`
    );
  } catch (err) {
    console.error("[access] Mongo grant store failed — falling back to file store", err);
    mongoReady = false;
    GrantModel = null;
    await loadFileStore();
  }
}

export async function findGrantByRequestId(requestId: string): Promise<PatientAccessGrant | null> {
  const key = requestId.trim();
  if (mongoReady && GrantModel) {
    const doc = await GrantModel.findOne({ requestId: key }).lean();
    return doc ? fromMongo(doc as never) : null;
  }
  return [...memory.values()].find(g => g.requestId === key) || null;
}

export async function findActiveGrantForTarget(opts: {
  requestId: string;
  targetHospitalId: string;
  patientId: string;
}): Promise<PatientAccessGrant | null> {
  const grant = await findGrantByRequestId(opts.requestId);
  if (!grant) return null;
  if (grant.status !== "ACTIVE") return null;
  if (grant.targetHospitalId !== opts.targetHospitalId) return null;
  if (grant.patientId !== opts.patientId) return null;
  if (grant.expiresAt && new Date(grant.expiresAt).getTime() < Date.now()) return null;
  return grant;
}

export async function activateAccessGrant(input: {
  requestId: string;
  assistanceId: string;
  patientId: string;
  requestingHospitalId: string;
  targetHospitalId: string;
}): Promise<PatientAccessGrant> {
  const existing = await findGrantByRequestId(input.requestId);
  if (existing) {
    if (mongoReady && GrantModel) {
      const doc = await GrantModel.findByIdAndUpdate(
        existing.id,
        {
          $set: {
            status: "ACTIVE",
            revokedAt: null,
            patientId: input.patientId,
            requestingHospitalId: input.requestingHospitalId,
            targetHospitalId: input.targetHospitalId,
            assistanceId: input.assistanceId,
            allowedSections: [...PATIENT_ACCESS_SECTIONS],
          },
          $currentDate: { updatedAt: true },
        },
        { returnDocument: "after" }
      ).lean();
      return doc ? fromMongo(doc as never) : existing;
    }
    const next: PatientAccessGrant = {
      ...existing,
      status: "ACTIVE",
      revokedAt: null,
      patientId: input.patientId,
      requestingHospitalId: input.requestingHospitalId,
      targetHospitalId: input.targetHospitalId,
      assistanceId: input.assistanceId,
      allowedSections: [...PATIENT_ACCESS_SECTIONS],
      updatedAt: new Date().toISOString(),
    };
    memory.set(existing.id, next);
    await persistFileStore();
    return next;
  }

  if (mongoReady && GrantModel) {
    const doc = await GrantModel.create({
      requestId: input.requestId,
      assistanceId: input.assistanceId,
      patientId: input.patientId,
      requestingHospitalId: input.requestingHospitalId,
      targetHospitalId: input.targetHospitalId,
      allowedSections: [...PATIENT_ACCESS_SECTIONS],
      status: "ACTIVE",
      expiresAt: null,
      revokedAt: null,
    });
    return fromMongo(doc as never);
  }

  const now = new Date().toISOString();
  const id = `PAG-${seq++}`;
  const row: PatientAccessGrant = {
    id,
    requestId: input.requestId,
    assistanceId: input.assistanceId,
    patientId: input.patientId,
    requestingHospitalId: input.requestingHospitalId,
    targetHospitalId: input.targetHospitalId,
    allowedSections: [...PATIENT_ACCESS_SECTIONS],
    status: "ACTIVE",
    createdAt: now,
    expiresAt: null,
    revokedAt: null,
    updatedAt: now,
  };
  memory.set(id, row);
  await persistFileStore();
  return row;
}

export async function closeAccessGrantByRequestId(
  requestId: string,
  status: "CLOSED" | "REVOKED" = "CLOSED"
): Promise<PatientAccessGrant | null> {
  const existing = await findGrantByRequestId(requestId);
  if (!existing) return null;
  const now = new Date().toISOString();
  if (mongoReady && GrantModel) {
    const doc = await GrantModel.findByIdAndUpdate(
      existing.id,
      {
        $set: { status, revokedAt: new Date(now) },
        $currentDate: { updatedAt: true },
      },
      { returnDocument: "after" }
    ).lean();
    return doc ? fromMongo(doc as never) : null;
  }
  const next: PatientAccessGrant = {
    ...existing,
    status,
    revokedAt: now,
    updatedAt: now,
  };
  memory.set(existing.id, next);
  await persistFileStore();
  return next;
}

export { toPublicAccessGrant };

/**
 * Staff user persistence.
 * - MongoDB when MONGODB_URI is set
 * - Otherwise a durable local JSON file store (survives backend restarts)
 * Never stores passwords — identity is Firebase Authentication only.
 * Never auto-seeds demo staff and never rebuilds StaffUser rows from Firebase Auth.
 */
import fs from "fs/promises";
import path from "path";
import mongoose, { Schema, type Model } from "mongoose";
import { env } from "../config/env";
import type { StaffAccountStatus, StaffRole, StaffUser } from "../models/User";
import { STAFF_ROLES, STAFF_STATUSES } from "../models/User";

const memory = new Map<string, StaffUser>();
let seq = 1;
let mongoReady = false;
let fileStoreReady = false;

const DATA_DIR = path.resolve(process.cwd(), "data");
const STAFF_FILE = path.join(DATA_DIR, "staff-users.json");

interface StaffFilePayload {
  version: 1;
  seq: number;
  users: StaffUser[];
}

interface StaffUserMongo {
  firebaseUid: string | null;
  email: string;
  fullName: string;
  role: StaffRole;
  department: string;
  staffId: string;
  status: StaffAccountStatus;
  mustChangePassword: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const StaffUserSchema = new Schema<StaffUserMongo>(
  {
    firebaseUid: { type: String, default: null, index: true, sparse: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    fullName: { type: String, required: true },
    role: { type: String, required: true, enum: STAFF_ROLES },
    department: { type: String, default: "" },
    staffId: { type: String, required: true, unique: true },
    status: { type: String, required: true, enum: STAFF_STATUSES },
    mustChangePassword: { type: Boolean, default: false },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true }
);

let StaffModel: Model<StaffUserMongo> | null = null;

function fromMongo(
  doc: StaffUserMongo & { _id: { toString(): string }; createdAt: Date; updatedAt: Date }
): StaffUser {
  return {
    id: doc._id.toString(),
    firebaseUid: doc.firebaseUid,
    email: doc.email.toLowerCase(),
    fullName: doc.fullName,
    role: doc.role,
    department: doc.department,
    staffId: doc.staffId,
    status: doc.status,
    mustChangePassword: Boolean(doc.mustChangePassword),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    lastLoginAt: doc.lastLoginAt ? doc.lastLoginAt.toISOString() : null,
  };
}

async function loadFileStore(): Promise<void> {
  memory.clear();
  seq = 1;
  try {
    const raw = await fs.readFile(STAFF_FILE, "utf8");
    const parsed = JSON.parse(raw) as StaffFilePayload;
    const users = Array.isArray(parsed.users) ? parsed.users : [];
    let maxSeq = 0;
    for (const u of users) {
      if (!u?.id || !u?.email) continue;
      const normalized: StaffUser = {
        id: String(u.id),
        firebaseUid: u.firebaseUid ?? null,
        email: String(u.email).toLowerCase(),
        fullName: String(u.fullName || ""),
        role: u.role,
        department: String(u.department || ""),
        staffId: String(u.staffId || ""),
        status: u.status || "ACTIVE",
        mustChangePassword: Boolean(u.mustChangePassword),
        createdAt: u.createdAt || new Date().toISOString(),
        updatedAt: u.updatedAt || new Date().toISOString(),
        lastLoginAt: u.lastLoginAt ?? null,
      };
      memory.set(normalized.id, normalized);
      const m = /^SU-(\d+)$/.exec(normalized.id);
      if (m) maxSeq = Math.max(maxSeq, Number(m[1]));
    }
    seq = Math.max(Number(parsed.seq) || 1, maxSeq + 1);
    fileStoreReady = true;
    console.log(`[users] File staff store loaded (${memory.size} record(s)) — ${STAFF_FILE}`);
  } catch (err: unknown) {
    const code = err && typeof err === "object" && "code" in err ? String((err as { code: string }).code) : "";
    if (code === "ENOENT") {
      fileStoreReady = true;
      console.log(`[users] File staff store ready (empty) — ${STAFF_FILE}`);
      return;
    }
    console.error("[users] Failed to load staff file store — starting empty", err);
    fileStoreReady = true;
  }
}

async function persistFileStore(): Promise<void> {
  if (mongoReady || !fileStoreReady) return;
  await fs.mkdir(DATA_DIR, { recursive: true });
  const payload: StaffFilePayload = {
    version: 1,
    seq,
    users: [...memory.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
  };
  const tmp = `${STAFF_FILE}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(payload, null, 2), "utf8");
  await fs.rename(tmp, STAFF_FILE);
}

export async function initUserStore(): Promise<void> {
  if (!env.mongoUri) {
    await loadFileStore();
    return;
  }
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.mongoUri);
    }
    StaffModel = mongoose.models.StaffUser || mongoose.model<StaffUserMongo>("StaffUser", StaffUserSchema);
    mongoReady = true;
    fileStoreReady = false;
    console.log("[users] MongoDB staff store ready — no auto-seeded staff");
  } catch (err) {
    console.error("[users] Mongo connect failed — falling back to file staff store", err);
    mongoReady = false;
    await loadFileStore();
  }
}

export async function listStaffUsers(): Promise<StaffUser[]> {
  if (mongoReady && StaffModel) {
    const docs = await StaffModel.find().sort({ createdAt: 1 }).lean();
    return docs.map(d => fromMongo(d as never));
  }
  return [...memory.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function findByEmail(email: string): Promise<StaffUser | null> {
  const key = email.trim().toLowerCase();
  if (mongoReady && StaffModel) {
    const doc = await StaffModel.findOne({ email: key }).lean();
    return doc ? fromMongo(doc as never) : null;
  }
  return [...memory.values()].find(u => u.email === key) || null;
}

export async function findByStaffId(staffId: string): Promise<StaffUser | null> {
  const key = staffId.trim();
  if (mongoReady && StaffModel) {
    const doc = await StaffModel.findOne({ staffId: key }).lean();
    return doc ? fromMongo(doc as never) : null;
  }
  return [...memory.values()].find(u => u.staffId === key) || null;
}

export async function findByFirebaseUid(uid: string): Promise<StaffUser | null> {
  if (mongoReady && StaffModel) {
    const doc = await StaffModel.findOne({ firebaseUid: uid }).lean();
    return doc ? fromMongo(doc as never) : null;
  }
  return [...memory.values()].find(u => u.firebaseUid === uid) || null;
}

export async function findById(id: string): Promise<StaffUser | null> {
  if (mongoReady && StaffModel) {
    const doc = await StaffModel.findById(id).lean();
    return doc ? fromMongo(doc as never) : null;
  }
  return memory.get(id) || null;
}

export async function countAdmins(): Promise<number> {
  if (mongoReady && StaffModel) {
    return StaffModel.countDocuments({
      role: "admin",
      status: "ACTIVE",
    });
  }
  return [...memory.values()].filter(u => u.role === "admin" && u.status === "ACTIVE").length;
}

/** Active admins excluding a given user id (for last-admin protection). */
export async function countOtherActiveAdmins(excludeId: string): Promise<number> {
  if (mongoReady && StaffModel) {
    return StaffModel.countDocuments({
      role: "admin",
      status: "ACTIVE",
      _id: { $ne: excludeId },
    });
  }
  return [...memory.values()].filter(u => u.role === "admin" && u.status === "ACTIVE" && u.id !== excludeId)
    .length;
}

export async function createStaffUser(input: {
  email: string;
  fullName: string;
  role: StaffRole;
  department: string;
  staffId: string;
  status?: StaffAccountStatus;
  firebaseUid?: string | null;
  mustChangePassword?: boolean;
}): Promise<StaffUser> {
  const email = input.email.trim().toLowerCase();
  const staffId = input.staffId.trim();
  const existingEmail = await findByEmail(email);
  if (existingEmail) {
    throw Object.assign(new Error("A staff user with this email already exists"), { status: 409, code: "DUPLICATE_EMAIL" });
  }
  const existingId = await findByStaffId(staffId);
  if (existingId) {
    throw Object.assign(new Error("A staff user with this Staff ID already exists"), { status: 409, code: "DUPLICATE_STAFF_ID" });
  }
  const mustChangePassword = Boolean(input.mustChangePassword);
  if (mongoReady && StaffModel) {
    const doc = await StaffModel.create({
      firebaseUid: input.firebaseUid ?? null,
      email,
      fullName: input.fullName.trim(),
      role: input.role,
      department: input.department.trim(),
      staffId,
      status: input.status || "ACTIVE",
      mustChangePassword,
      lastLoginAt: null,
    });
    return fromMongo(doc as never);
  }
  const now = new Date().toISOString();
  const id = `SU-${seq++}`;
  const user: StaffUser = {
    id,
    firebaseUid: input.firebaseUid ?? null,
    email,
    fullName: input.fullName.trim(),
    role: input.role,
    department: input.department.trim(),
    staffId,
    status: input.status || "ACTIVE",
    mustChangePassword,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: null,
  };
  memory.set(id, user);
  await persistFileStore();
  return user;
}

export async function updateStaffUser(
  id: string,
  patch: Partial<
    Pick<
      StaffUser,
      "fullName" | "role" | "department" | "staffId" | "status" | "firebaseUid" | "lastLoginAt" | "mustChangePassword"
    >
  >
): Promise<StaffUser | null> {
  if (patch.staffId) {
    const other = await findByStaffId(patch.staffId);
    if (other && other.id !== id) {
      throw Object.assign(new Error("A staff user with this Staff ID already exists"), {
        status: 409,
        code: "DUPLICATE_STAFF_ID",
      });
    }
  }
  if (mongoReady && StaffModel) {
    const mongoPatch: Record<string, unknown> = { ...patch };
    if (patch.lastLoginAt !== undefined) {
      mongoPatch.lastLoginAt = patch.lastLoginAt ? new Date(patch.lastLoginAt) : null;
    }
    const doc = await StaffModel.findByIdAndUpdate(id, { $set: mongoPatch }, { new: true }).lean();
    return doc ? fromMongo(doc as never) : null;
  }
  const cur = memory.get(id);
  if (!cur) return null;
  const next = { ...cur, ...patch, updatedAt: new Date().toISOString() };
  memory.set(id, next);
  await persistFileStore();
  return next;
}

export async function linkFirebaseUid(email: string, firebaseUid: string): Promise<StaffUser | null> {
  const user = await findByEmail(email);
  if (!user) return null;
  return updateStaffUser(user.id, { firebaseUid });
}

export async function touchLastLogin(id: string): Promise<StaffUser | null> {
  return updateStaffUser(id, { lastLoginAt: new Date().toISOString() });
}

export async function deleteStaffUser(id: string): Promise<StaffUser | null> {
  const existing = await findById(id);
  if (!existing) return null;
  if (mongoReady && StaffModel) {
    await StaffModel.findByIdAndDelete(id);
    return existing;
  }
  memory.delete(id);
  await persistFileStore();
  return existing;
}

/**
 * Staff user persistence.
 * Uses MongoDB when MONGODB_URI is set; otherwise an in-memory store (hackathon / local).
 * Never stores passwords — identity is Firebase Authentication only.
 */
import mongoose, { Schema, type Model } from "mongoose";
import { env } from "../config/env";
import type { StaffAccountStatus, StaffRole, StaffUser } from "../models/User";
import { STAFF_ROLES, STAFF_STATUSES } from "../models/User";

const memory = new Map<string, StaffUser>();
let seq = 1;
let mongoReady = false;

interface StaffUserMongo {
  firebaseUid: string | null;
  email: string;
  fullName: string;
  role: StaffRole;
  department: string;
  staffId: string;
  status: StaffAccountStatus;
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
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    lastLoginAt: doc.lastLoginAt ? doc.lastLoginAt.toISOString() : null,
  };
}

export async function initUserStore(): Promise<void> {
  if (!env.mongoUri) {
    console.log("[users] Using in-memory staff store (MONGODB_URI not set)");
    seedDemoStaffIfEmpty();
    return;
  }
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.mongoUri);
    }
    StaffModel = mongoose.models.StaffUser || mongoose.model<StaffUserMongo>("StaffUser", StaffUserSchema);
    mongoReady = true;
    console.log("[users] MongoDB staff store ready");
    const count = await StaffModel.countDocuments();
    if (count === 0) {
      await seedDemoStaffMongo();
    }
  } catch (err) {
    console.error("[users] Mongo connect failed — falling back to in-memory", err);
    mongoReady = false;
    seedDemoStaffIfEmpty();
  }
}

/** Fictional demo roster — emails only; passwords live in Firebase, never here. */
const DEMO_ROSTER: Array<
  Omit<StaffUser, "id" | "firebaseUid" | "createdAt" | "updatedAt" | "status" | "lastLoginAt"> & {
    status?: StaffAccountStatus;
  }
> = [
  { email: "admin@smartcare.demo", fullName: "Demo Administrator", role: "admin", department: "Administration", staffId: "ADM-001" },
  { email: "doctor@smartcare.demo", fullName: "Dr. Demo Physician", role: "doctor", department: "General Medicine", staffId: "DOC-001" },
  { email: "nurse@smartcare.demo", fullName: "Demo Nurse", role: "nurse", department: "Nursing", staffId: "NUR-001" },
  { email: "lab@smartcare.demo", fullName: "Demo Lab Tech", role: "lab", department: "Pathology", staffId: "LAB-001" },
  { email: "pharmacy@smartcare.demo", fullName: "Demo Pharmacist", role: "pharmacy", department: "Pharmacy", staffId: "PHR-001" },
  { email: "billing@smartcare.demo", fullName: "Demo Billing Officer", role: "billing", department: "Finance", staffId: "BIL-001" },
  { email: "reception@smartcare.demo", fullName: "Demo Receptionist", role: "reception", department: "Front Desk", staffId: "REC-001" },
];

function seedDemoStaffIfEmpty() {
  if (memory.size > 0) return;
  const now = new Date().toISOString();
  for (const row of DEMO_ROSTER) {
    const id = `SU-${seq++}`;
    memory.set(id, {
      id,
      firebaseUid: null,
      email: row.email.toLowerCase(),
      fullName: row.fullName,
      role: row.role,
      department: row.department,
      staffId: row.staffId,
      status: "ACTIVE",
      createdAt: now,
      updatedAt: now,
      lastLoginAt: null,
    });
  }
  console.log(`[users] Seeded ${DEMO_ROSTER.length} demo staff records (no passwords stored)`);
}

async function seedDemoStaffMongo() {
  if (!StaffModel) return;
  const now = new Date();
  for (const row of DEMO_ROSTER) {
    await StaffModel.create({
      firebaseUid: null,
      email: row.email.toLowerCase(),
      fullName: row.fullName,
      role: row.role,
      department: row.department,
      staffId: row.staffId,
      status: "ACTIVE",
      lastLoginAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }
  console.log(`[users] Seeded ${DEMO_ROSTER.length} demo staff records in MongoDB`);
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
      status: { $in: ["ACTIVE", "INVITED"] },
    });
  }
  return [...memory.values()].filter(u => u.role === "admin" && (u.status === "ACTIVE" || u.status === "INVITED"))
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
  if (mongoReady && StaffModel) {
    const doc = await StaffModel.create({
      firebaseUid: input.firebaseUid ?? null,
      email,
      fullName: input.fullName.trim(),
      role: input.role,
      department: input.department.trim(),
      staffId,
      status: input.status || "ACTIVE",
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
    createdAt: now,
    updatedAt: now,
    lastLoginAt: null,
  };
  memory.set(id, user);
  return user;
}

export async function updateStaffUser(
  id: string,
  patch: Partial<
    Pick<StaffUser, "fullName" | "role" | "department" | "staffId" | "status" | "firebaseUid" | "lastLoginAt">
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
  return existing;
}

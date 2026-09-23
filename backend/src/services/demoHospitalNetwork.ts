/**
 * Idempotent hackathon demo hospital network (JSON / Mongo stores).
 * Never creates duplicate hospitals on restart. Never creates Firebase users.
 */
import {
  createHospital,
  deleteHospital,
  findHospitalByHospitalId,
  listHospitals,
  updateHospital,
} from "./hospitalStore";
import type { Hospital, HospitalStatus } from "../models/Hospital";

/** Canonical demo IDs for the finals network. */
export const DEMO_SMART_CARE_ID = "HOSP-001";
export const DEMO_APOLLO_ID = "HOSP-002";
export const DEMO_FORTIS_ID = "HOSP-003";

/** Legacy id used before the demo network — remapped once to HOSP-001. */
const LEGACY_LOCAL_ID = "HOSP-LOCAL";

interface DemoHospitalSpec {
  hospitalId: string;
  hospitalName: string;
  city: string;
  state: string;
  departments: string[];
  facilities: string[];
  emergencySupport: boolean;
  status: HospitalStatus;
  isLocal: boolean;
}

const DEMO_NETWORK: DemoHospitalSpec[] = [
  {
    hospitalId: DEMO_SMART_CARE_ID,
    hospitalName: "Smart Care Hospital",
    city: "Delhi",
    state: "Delhi",
    departments: ["Cardiology", "Emergency Medicine", "General Medicine", "Neurology"],
    facilities: ["ICU", "Emergency Department", "Cardiac Care Unit", "Diagnostic Lab"],
    emergencySupport: true,
    status: "ONLINE",
    isLocal: true,
  },
  {
    hospitalId: DEMO_APOLLO_ID,
    hospitalName: "Apollo Hospital",
    city: "Delhi",
    state: "Delhi",
    departments: ["Cardiology", "Neurology", "Emergency Medicine", "Critical Care"],
    facilities: ["ICU", "Cardiac Care Unit", "Emergency Department", "Blood Bank"],
    emergencySupport: true,
    status: "ONLINE",
    isLocal: false,
  },
  {
    hospitalId: DEMO_FORTIS_ID,
    hospitalName: "Fortis Hospital",
    city: "Delhi",
    state: "Delhi",
    departments: ["Cardiology", "Trauma Care", "Neurology", "Critical Care"],
    facilities: ["ICU", "Trauma Centre", "Emergency Department", "Diagnostic Lab"],
    emergencySupport: true,
    status: "BUSY",
    isLocal: false,
  },
];

function namesMatch(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** Prefer remapping legacy HOSP-LOCAL → HOSP-001 before any create. */
async function resolveLegacySmartCare(): Promise<void> {
  const canonical = await findHospitalByHospitalId(DEMO_SMART_CARE_ID);
  const legacy = await findHospitalByHospitalId(LEGACY_LOCAL_ID);

  if (legacy && !canonical) {
    await updateHospital(legacy.id, {
      hospitalId: DEMO_SMART_CARE_ID,
      hospitalName: "Smart Care Hospital",
      registrationId: DEMO_SMART_CARE_ID,
      city: "Delhi",
      state: "Delhi",
      departments: DEMO_NETWORK[0].departments,
      facilities: DEMO_NETWORK[0].facilities,
      emergencySupport: true,
      status: "ONLINE",
      isLocal: true,
    });
    console.log(`[hospitals] Remapped ${LEGACY_LOCAL_ID} → ${DEMO_SMART_CARE_ID}`);
    return;
  }

  if (legacy && canonical) {
    await deleteHospital(legacy.id);
    console.log(`[hospitals] Removed orphan legacy hospital ${LEGACY_LOCAL_ID}`);
  }
}

async function findExistingForSpec(spec: DemoHospitalSpec): Promise<Hospital | null> {
  const byId = await findHospitalByHospitalId(spec.hospitalId);
  if (byId) return byId;

  const all = await listHospitals();
  return all.find(h => namesMatch(h.hospitalName, spec.hospitalName)) || null;
}

async function upsertDemoHospital(spec: DemoHospitalSpec): Promise<Hospital> {
  const existing = await findExistingForSpec(spec);
  if (existing) {
    // Never collide hospitalId onto another row
    const patch: Parameters<typeof updateHospital>[1] = {
      hospitalName: spec.hospitalName,
      registrationId: existing.registrationId || spec.hospitalId,
      city: spec.city,
      state: spec.state,
      departments: spec.departments,
      facilities: spec.facilities,
      emergencySupport: spec.emergencySupport,
      status: spec.status,
      isLocal: spec.isLocal,
    };
    if (existing.hospitalId !== spec.hospitalId) {
      const conflict = await findHospitalByHospitalId(spec.hospitalId);
      if (!conflict) {
        patch.hospitalId = spec.hospitalId;
      }
    }
    const updated = await updateHospital(existing.id, patch);
    return updated || existing;
  }

  return createHospital({
    hospitalId: spec.hospitalId,
    hospitalName: spec.hospitalName,
    registrationId: spec.hospitalId,
    city: spec.city,
    state: spec.state,
    departments: spec.departments,
    facilities: spec.facilities,
    emergencySupport: spec.emergencySupport,
    status: spec.status,
    isLocal: spec.isLocal,
  });
}

/**
 * Ensure the 3-hospital demo network exists exactly once.
 * Safe to call on every backend start.
 */
export async function ensureDemoHospitalNetwork(): Promise<void> {
  await resolveLegacySmartCare();

  const before = await listHospitals();
  const beforeIds = new Set(before.map(h => h.hospitalId));

  for (const spec of DEMO_NETWORK) {
    await upsertDemoHospital(spec);
  }

  // Deduplicate by canonical hospitalId — keep the richest / local row
  const afterUpsert = await listHospitals();
  const byKey = new Map<string, Hospital[]>();
  for (const h of afterUpsert) {
    const key = h.hospitalId;
    const list = byKey.get(key) || [];
    list.push(h);
    byKey.set(key, list);
  }
  for (const [, rows] of byKey) {
    if (rows.length <= 1) continue;
    const keep = rows.find(r => r.isLocal) || rows[0];
    for (const row of rows) {
      if (row.id !== keep.id) {
        await deleteHospital(row.id);
        console.log(`[hospitals] Removed duplicate ${row.hospitalId} (${row.id})`);
      }
    }
  }

  // Also collapse duplicate Smart Care names with different ids
  const named = (await listHospitals()).filter(h =>
    namesMatch(h.hospitalName, "Smart Care Hospital")
  );
  if (named.length > 1) {
    const keep =
      named.find(h => h.hospitalId === DEMO_SMART_CARE_ID) ||
      named.find(h => h.isLocal) ||
      named[0];
    for (const row of named) {
      if (row.id !== keep.id) {
        await deleteHospital(row.id);
        console.log(`[hospitals] Removed duplicate Smart Care row ${row.hospitalId}`);
      }
    }
  }

  const all = await listHospitals();
  for (const h of all) {
    const shouldBeLocal = h.hospitalId === DEMO_SMART_CARE_ID;
    if (h.isLocal !== shouldBeLocal) {
      await updateHospital(h.id, { isLocal: shouldBeLocal });
    }
  }

  const after = await listHospitals();
  const created = after.filter(h => !beforeIds.has(h.hospitalId)).map(h => h.hospitalId);
  if (created.length) {
    console.log(`[hospitals] Demo network hospitals created: ${created.join(", ")}`);
  } else {
    console.log(
      `[hospitals] Demo network ready (${after.length} hospital(s), idempotent)`
    );
  }
}

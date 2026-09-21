/**
 * Phase 8E lifecycle verification (local).
 * Run: node scripts/phase8e-lifecycle-test.mjs
 * Requires backend running with Firebase Admin + BOOTSTRAP_ADMIN_* set.
 * Does not print passwords.
 */
import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../.env") });

function clean(v) {
  return (v || "").trim().replace(/^["']|["']$/g, "");
}

const API = clean(process.env.TEST_API_URL) || "http://127.0.0.1:5000";
const WEB_API_KEY = clean(process.env.VITE_FIREBASE_API_KEY) || clean(process.env.FIREBASE_WEB_API_KEY);
const ADMIN_EMAIL = clean(process.env.BOOTSTRAP_ADMIN_EMAIL) || "admin@smartcare.demo";
const ADMIN_PASSWORD = clean(process.env.BOOTSTRAP_ADMIN_PASSWORD);
const DOCTOR_EMAIL = `doctor.phase8e.${Date.now()}@smartcare.demo`;

if (!WEB_API_KEY) {
  console.error("FAIL: need VITE_FIREBASE_API_KEY or FIREBASE_WEB_API_KEY for Identity Toolkit sign-in");
  process.exit(1);
}
if (!ADMIN_PASSWORD) {
  console.error("FAIL: set BOOTSTRAP_ADMIN_PASSWORD for this automated test");
  process.exit(1);
}

async function signIn(email, password) {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${WEB_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error?.message || "signIn failed");
    err.code = data.error?.message;
    err.status = res.status;
    throw err;
  }
  return data.idToken;
}

async function api(method, path, token, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { ok: res.ok, status: res.status, data };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const results = [];

async function step(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`PASS: ${name}`);
  } catch (e) {
    results.push({ name, ok: false, error: e.message || String(e) });
    console.error(`FAIL: ${name} — ${e.message || e}`);
    throw e;
  }
}

async function main() {
  let adminToken;
  let doctorId;
  let doctorTempPassword;
  let doctorToken;

  await step("Admin sign-in", async () => {
    adminToken = await signIn(ADMIN_EMAIL, ADMIN_PASSWORD);
    const session = await api("POST", "/api/auth/session", adminToken, {});
    assert(session.ok, `session ${session.status}: ${JSON.stringify(session.data)}`);
    assert(session.data.role === "admin", `expected admin role, got ${session.data.role}`);
  });

  await step("Create Doctor via POST /api/auth/staff", async () => {
    const created = await api("POST", "/api/auth/staff", adminToken, {
      fullName: "Phase8E Test Doctor",
      email: DOCTOR_EMAIL,
      role: "doctor",
      department: "General Medicine",
      staffId: `DOC-8E-${Date.now().toString().slice(-6)}`,
      status: "ACTIVE",
    });
    assert(created.ok, `create ${created.status}: ${JSON.stringify(created.data)}`);
    assert(created.data.user?.role === "doctor", "role must be doctor");
    assert(created.data.user?.firebaseUid, "firebaseUid must be linked");
    doctorId = created.data.user.id;
    doctorTempPassword = created.data.temporaryPassword;
    assert(doctorTempPassword, "temporaryPassword should be returned once");
  });

  await step("Doctor login → doctor workspace role", async () => {
    doctorToken = await signIn(DOCTOR_EMAIL, doctorTempPassword);
    const session = await api("POST", "/api/auth/session", doctorToken, {});
    assert(session.ok, `doctor session ${session.status}: ${JSON.stringify(session.data)}`);
    assert(session.data.role === "doctor", `expected doctor, got ${session.data.role}`);
  });

  await step("Doctor cannot access Admin staff APIs", async () => {
    const list = await api("GET", "/api/auth/staff", doctorToken);
    assert(list.status === 403, `expected 403, got ${list.status}`);
    const adminApi = await api("GET", "/api/admin", doctorToken);
    assert(adminApi.status === 403, `expected admin 403, got ${adminApi.status}`);
  });

  await step("Admin suspends Doctor", async () => {
    adminToken = await signIn(ADMIN_EMAIL, ADMIN_PASSWORD);
    const upd = await api("PATCH", `/api/auth/staff/${doctorId}`, adminToken, { status: "SUSPENDED" });
    assert(upd.ok, `suspend ${upd.status}: ${JSON.stringify(upd.data)}`);
    assert(upd.data.user?.status === "SUSPENDED", "status SUSPENDED");
  });

  await step("Suspended Doctor cannot sign in / session", async () => {
    let signInBlocked = false;
    try {
      await signIn(DOCTOR_EMAIL, doctorTempPassword);
    } catch {
      signInBlocked = true;
    }
    if (!signInBlocked) {
      const token = await signIn(DOCTOR_EMAIL, doctorTempPassword);
      const session = await api("POST", "/api/auth/session", token, {});
      assert(!session.ok && session.status === 403, "session must deny suspended");
      assert(
        session.data?.error === "ACCOUNT_SUSPENDED" || /suspend/i.test(session.data?.message || ""),
        "ACCOUNT_SUSPENDED"
      );
    }
  });

  await step("Admin activates Doctor", async () => {
    const upd = await api("PATCH", `/api/auth/staff/${doctorId}`, adminToken, { status: "ACTIVE" });
    assert(upd.ok, `activate ${upd.status}`);
    assert(upd.data.user?.status === "ACTIVE", "ACTIVE");
  });

  await step("Reactivated Doctor can login", async () => {
    doctorToken = await signIn(DOCTOR_EMAIL, doctorTempPassword);
    const session = await api("POST", "/api/auth/session", doctorToken, {});
    assert(session.ok && session.data.role === "doctor", "doctor session after activate");
  });

  await step("Admin deletes Doctor", async () => {
    const del = await api("DELETE", `/api/auth/staff/${doctorId}`, adminToken);
    assert(del.ok, `delete ${del.status}: ${JSON.stringify(del.data)}`);
  });

  await step("Deleted Doctor cannot authenticate", async () => {
    let failed = false;
    try {
      await signIn(DOCTOR_EMAIL, doctorTempPassword);
    } catch {
      failed = true;
    }
    if (!failed) {
      const token = await signIn(DOCTOR_EMAIL, doctorTempPassword);
      const session = await api("POST", "/api/auth/session", token, {});
      assert(!session.ok, "deleted user session must fail");
    }
  });

  console.log("\nPhase 8E lifecycle: ALL STEPS PASSED");
}

main().catch(() => {
  console.error("\nPhase 8E lifecycle: FAILED");
  process.exit(1);
});

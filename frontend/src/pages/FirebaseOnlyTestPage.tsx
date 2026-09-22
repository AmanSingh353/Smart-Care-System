/**
 * TEMPORARY DEV-ONLY: Firebase Authentication isolated test.
 * Does NOT use AuthContext and does NOT call /api/auth/session.
 * Uses a secondary Firebase app so the main AuthProvider watcher is not triggered.
 */
import { FormEvent, useMemo, useState } from "react";
import { initializeApp, getApps, deleteApp, type FirebaseApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { Link } from "react-router-dom";

function cleanVite(value: string | undefined): string {
  if (!value) return "";
  return String(value).trim().replace(/^["']|['"]$/g, "");
}

const firebaseConfig = {
  apiKey: cleanVite(import.meta.env.VITE_FIREBASE_API_KEY as string | undefined),
  authDomain: cleanVite(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined),
  projectId: cleanVite(import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined),
  appId: cleanVite(import.meta.env.VITE_FIREBASE_APP_ID as string | undefined),
};

const TEST_APP_NAME = "scs-firebase-only-test";

type Result =
  | { status: "idle" }
  | {
      status: "SUCCESS";
      projectId: string;
      email: string;
    }
  | {
      status: "FAILURE";
      projectId: string;
      errorCode: string;
      errorMessage?: string;
    };

export default function FirebaseOnlyTestPage() {
  const [email, setEmail] = useState("admin@smartcare.demo");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result>({ status: "idle" });

  const configured = useMemo(
    () => Boolean(firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId),
    []
  );

  if (!import.meta.env.DEV) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">This page is available in development only.</p>
      </div>
    );
  }

  const runTest = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setResult({ status: "idle" });

    let app: FirebaseApp | null = null;
    try {
      if (!configured) {
        setResult({
          status: "FAILURE",
          projectId: firebaseConfig.projectId || "(missing)",
          errorCode: "CLIENT_NOT_CONFIGURED",
          errorMessage: "VITE_FIREBASE_* variables missing",
        });
        return;
      }

      const existing = getApps().find((a) => a.name === TEST_APP_NAME);
      if (existing) {
        await deleteApp(existing).catch(() => undefined);
      }

      // Secondary named app — avoids AuthContext onAuthStateChanged on the default app
      app = initializeApp(firebaseConfig, TEST_APP_NAME);
      const auth = getAuth(app);

      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const authenticatedEmail = (cred.user.email || email.trim()).toLowerCase();

      // Sign out of the secondary app only; never log tokens
      await signOut(auth).catch(() => undefined);

      setResult({
        status: "SUCCESS",
        projectId: firebaseConfig.projectId,
        email: authenticatedEmail,
      });
    } catch (err: unknown) {
      const code =
        err && typeof err === "object" && "code" in err
          ? String((err as { code: string }).code)
          : "UNKNOWN";
      const message = err instanceof Error ? err.message : undefined;
      setResult({
        status: "FAILURE",
        projectId: firebaseConfig.projectId || "(unknown)",
        errorCode: code,
        errorMessage: message,
      });
    } finally {
      if (app) {
        await deleteApp(app).catch(() => undefined);
      }
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4 rounded-lg border bg-white p-6 shadow-sm">
        <div>
          <h1 className="text-lg font-semibold">Firebase-only login test</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Development utility. Calls <code>signInWithEmailAndPassword</code> only. Does not use
            AuthContext or <code>/api/auth/session</code>.
          </p>
        </div>

        <form onSubmit={runTest} className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1" htmlFor="fb-test-email">
              Email
            </label>
            <input
              id="fb-test-email"
              className="w-full border rounded px-3 py-2 text-sm"
              type="email"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              autoComplete="username"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" htmlFor="fb-test-password">
              Password
            </label>
            <input
              id="fb-test-password"
              className="w-full border rounded px-3 py-2 text-sm"
              type="password"
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <button
            type="submit"
            disabled={busy || !configured}
            className="w-full rounded bg-slate-900 text-white text-sm py-2 disabled:opacity-50"
          >
            {busy ? "Testing…" : "Test Firebase sign-in"}
          </button>
        </form>

        <div className="rounded border bg-slate-50 p-3 text-sm font-mono space-y-1">
          <div>projectId: {firebaseConfig.projectId || "(missing)"}</div>
          {!configured && <div className="text-red-600">CLIENT_NOT_CONFIGURED</div>}
          {result.status === "SUCCESS" && (
            <>
              <div className="text-green-700 font-semibold">SUCCESS</div>
              <div>email: {result.email}</div>
              <div>projectId: {result.projectId}</div>
            </>
          )}
          {result.status === "FAILURE" && (
            <>
              <div className="text-red-700 font-semibold">FAILURE</div>
              <div>errorCode: {result.errorCode}</div>
              <div>projectId: {result.projectId}</div>
              {result.errorMessage && <div>message: {result.errorMessage}</div>}
            </>
          )}
          {result.status === "idle" && <div className="text-muted-foreground">No result yet</div>}
        </div>

        <Link to="/login" className="text-sm text-blue-600 underline">
          Back to normal login
        </Link>
      </div>
    </div>
  );
}

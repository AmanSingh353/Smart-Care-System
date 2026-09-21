/**
 * Development-only auth diagnostics. Never logs passwords, ID tokens, or secrets.
 * Enabled when Vite DEV mode is on (import.meta.env.DEV).
 */
const ENABLED = Boolean(import.meta.env.DEV);

export function authDiag(event: string, detail?: Record<string, string | boolean | number | null | undefined>) {
  if (!ENABLED) return;
  if (detail && Object.keys(detail).length) {
    console.info(`[auth-diag] ${event}`, detail);
  } else {
    console.info(`[auth-diag] ${event}`);
  }
}

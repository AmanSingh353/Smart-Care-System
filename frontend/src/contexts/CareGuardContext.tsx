import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
  useCallback,
} from "react";
import { usePatients } from "@/contexts/PatientContext";
import { useAuth, StaffRole } from "@/contexts/AuthContext";
import { CareGuardEngine, DeterministicRuleProvider } from "@/careguard/engine";
import { recordCareGuardAudit } from "@/careguard/audit";
import type { CareGuardSignal, CareGuardWorkflowEvent } from "@/careguard/types";
import { ROLE_SIGNAL_TYPES } from "@/careguard/types";
import { toast } from "sonner";

const SIGNAL_STORAGE = "scs30-careguard-signals";

interface CareGuardContextType {
  signals: CareGuardSignal[];
  openSignals: CareGuardSignal[];
  summary: ReturnType<CareGuardEngine["summary"]>;
  getPatientSignals: (patientId: string, activeOnly?: boolean) => CareGuardSignal[];
  getRoleSignals: (role?: StaffRole | "family" | null) => CareGuardSignal[];
  acknowledge: (signalId: string) => void;
  resolve: (signalId: string) => void;
  dismiss: (signalId: string) => void;
  evaluateNow: (event?: CareGuardWorkflowEvent) => void;
  resetDemoSignals: () => void;
}

const CareGuardContext = createContext<CareGuardContextType | undefined>(undefined);

function loadStoredSignals(): CareGuardSignal[] {
  try {
    const raw = localStorage.getItem(SIGNAL_STORAGE);
    if (!raw) return [];
    return JSON.parse(raw) as CareGuardSignal[];
  } catch {
    return [];
  }
}

function persistSignals(signals: CareGuardSignal[]) {
  try {
    localStorage.setItem(SIGNAL_STORAGE, JSON.stringify(signals));
  } catch {
    /* ignore */
  }
}

export const CareGuardProvider = ({ children }: { children: ReactNode }) => {
  const { patients } = usePatients();
  const { role } = useAuth();
  const engineRef = useRef(new CareGuardEngine(new DeterministicRuleProvider()));
  const [signals, setSignals] = useState<CareGuardSignal[]>([]);
  const hydrated = useRef(false);

  const syncFromEngine = useCallback(() => {
    const all = engineRef.current.serialize();
    setSignals(all);
    persistSignals(all);
  }, []);

  // Hydrate dismissed/acked statuses then evaluate
  useEffect(() => {
    if (!hydrated.current) {
      const stored = loadStoredSignals();
      if (stored.length) engineRef.current.hydrate(stored);
      hydrated.current = true;
    }

    const unsub = engineRef.current.onSignal((kind, signal) => {
      if (kind === "created") {
        recordCareGuardAudit("SIGNAL_CREATED", signal.id, signal.patientId, "CareGuardEngine", "create");
      }
    });

    engineRef.current.evaluateMany(patients);
    syncFromEngine();

    // Periodic re-check for delay/overdue thresholds (demo)
    const timer = window.setInterval(() => {
      engineRef.current.evaluateMany(patients);
      syncFromEngine();
    }, 30_000);

    return () => {
      unsub();
      window.clearInterval(timer);
    };
  }, [patients, syncFromEngine]);

  const evaluateNow = useCallback(
    (_event?: CareGuardWorkflowEvent) => {
      engineRef.current.evaluateMany(patients);
      syncFromEngine();
    },
    [patients, syncFromEngine]
  );

  const acknowledge = useCallback(
    (signalId: string) => {
      const s = engineRef.current.acknowledge(signalId);
      if (s) {
        recordCareGuardAudit("SIGNAL_ACKNOWLEDGED", s.id, s.patientId, role || "staff", "acknowledge");
        syncFromEngine();
        toast.message("Signal acknowledged");
      }
    },
    [role, syncFromEngine]
  );

  const resolve = useCallback(
    (signalId: string) => {
      const s = engineRef.current.resolve(signalId);
      if (s) {
        recordCareGuardAudit("SIGNAL_RESOLVED", s.id, s.patientId, role || "staff", "resolve");
        syncFromEngine();
      }
    },
    [role, syncFromEngine]
  );

  const dismiss = useCallback(
    (signalId: string) => {
      const s = engineRef.current.dismiss(signalId);
      if (s) {
        recordCareGuardAudit("SIGNAL_DISMISSED", s.id, s.patientId, role || "staff", "dismiss");
        syncFromEngine();
        toast.message("Signal dismissed");
      }
    },
    [role, syncFromEngine]
  );

  const resetDemoSignals = useCallback(() => {
    engineRef.current.reset();
    localStorage.removeItem(SIGNAL_STORAGE);
    engineRef.current.evaluateMany(patients);
    syncFromEngine();
    toast.success("CareGuard demo signals restored");
  }, [patients, syncFromEngine]);

  const getPatientSignals = useCallback(
    (patientId: string, activeOnly = true) => {
      const list = engineRef.current.getForPatient(patientId);
      if (!activeOnly) return list;
      return list.filter(s => s.status === "OPEN" || s.status === "ACKNOWLEDGED");
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [signals]
  );

  const getRoleSignals = useCallback(
    (r?: StaffRole | "family" | null) => {
      const useRole = r ?? role;
      if (!useRole || useRole === "family") return [];
      if (useRole === "admin") {
        return signals.filter(s => s.status === "OPEN" || s.status === "ACKNOWLEDGED");
      }
      const allowed = ROLE_SIGNAL_TYPES[useRole] || [];
      const cgRole = useRole.toUpperCase();
      return signals.filter(
        s =>
          (s.status === "OPEN" || s.status === "ACKNOWLEDGED") &&
          (s.responsibleRole === cgRole || allowed.includes(s.type))
      );
    },
    [role, signals]
  );

  const openSignals = useMemo(
    () => signals.filter(s => s.status === "OPEN" || s.status === "ACKNOWLEDGED"),
    [signals]
  );

  const summary = useMemo(() => {
    const all = signals;
    const open = all.filter(s => s.status === "OPEN" || s.status === "ACKNOWLEDGED");
    const today = new Date().toISOString().slice(0, 10);
    const resolvedToday = all.filter(
      s => s.status === "RESOLVED" && s.updatedAt.slice(0, 10) === today
    );
    const highPriority = open.filter(s => s.severity === "HIGH" || s.severity === "CRITICAL");
    const awaitingReview = open.filter(s =>
      ["LAB_REVIEW_PENDING", "CRITICAL_RESULT_REVIEW", "ALLERGY_PRESCRIPTION_REVIEW"].includes(s.type)
    );
    const byRole: Record<string, number> = {};
    for (const s of open) byRole[s.responsibleRole] = (byRole[s.responsibleRole] || 0) + 1;
    const bySeverity: Record<string, number> = {};
    for (const s of open) bySeverity[s.severity] = (bySeverity[s.severity] || 0) + 1;
    return {
      open: open.length,
      highPriority: highPriority.length,
      awaitingReview: awaitingReview.length,
      resolvedToday: resolvedToday.length,
      byRole,
      bySeverity,
      signals: open,
    };
  }, [signals]);

  const value: CareGuardContextType = {
    signals,
    openSignals,
    summary,
    getPatientSignals,
    getRoleSignals,
    acknowledge,
    resolve,
    dismiss,
    evaluateNow,
    resetDemoSignals,
  };

  return <CareGuardContext.Provider value={value}>{children}</CareGuardContext.Provider>;
};

export const useCareGuard = () => {
  const ctx = useContext(CareGuardContext);
  if (!ctx) throw new Error("useCareGuard must be used within CareGuardProvider");
  return ctx;
};

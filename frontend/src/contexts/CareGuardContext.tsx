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
import { CAREGUARD_SIGNAL_STORAGE_KEY } from "@/config/demo";
import { connectSocket, disconnectSocket, onSocketEvent, joinPatientRoom } from "@/services/socket";
import { careguardService } from "@/services/careguardService";
import { toast } from "sonner";

interface CareGuardContextType {
  signals: CareGuardSignal[];
  openSignals: CareGuardSignal[];
  summary: {
    open: number;
    highPriority: number;
    awaitingReview: number;
    resolvedToday: number;
    byRole: Record<string, number>;
    bySeverity: Record<string, number>;
    signals: CareGuardSignal[];
  };
  backendConnected: boolean;
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
    const raw = localStorage.getItem(CAREGUARD_SIGNAL_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CareGuardSignal[];
  } catch {
    return [];
  }
}

function persistSignals(signals: CareGuardSignal[]) {
  try {
    localStorage.setItem(CAREGUARD_SIGNAL_STORAGE_KEY, JSON.stringify(signals));
  } catch {
    /* ignore */
  }
}

function buildSummary(all: CareGuardSignal[]) {
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
}

export const CareGuardProvider = ({ children }: { children: ReactNode }) => {
  const { patients } = usePatients();
  const { role } = useAuth();
  const engineRef = useRef(new CareGuardEngine(new DeterministicRuleProvider()));
  const [signals, setSignals] = useState<CareGuardSignal[]>([]);
  const [backendConnected, setBackendConnected] = useState(false);
  const hydrated = useRef(false);
  const knownIds = useRef<Set<string>>(new Set());
  const skipCreateToast = useRef(true);

  const syncFromEngine = useCallback(() => {
    const all = engineRef.current.serialize();
    setSignals(all);
    persistSignals(all);
  }, []);

  // Local evaluate whenever shared patient state changes
  useEffect(() => {
    if (!hydrated.current) {
      const stored = loadStoredSignals();
      if (stored.length) {
        engineRef.current.hydrate(stored);
        stored.forEach(s => knownIds.current.add(s.id));
      }
      hydrated.current = true;
    }

    const unsub = engineRef.current.onSignal((kind, signal) => {
      if (kind === "created") {
        recordCareGuardAudit("SIGNAL_CREATED", signal.id, signal.patientId, "CareGuardEngine", "create");
        if (!skipCreateToast.current && !knownIds.current.has(signal.id)) {
          toast.message("CareGuard", {
            description: `${signal.title} · ${signal.patientId}`,
          });
        }
        knownIds.current.add(signal.id);
      }
    });

    engineRef.current.evaluateMany(patients);
    syncFromEngine();
    skipCreateToast.current = false;

    // Re-check delay/overdue thresholds (demo) without busy polling
    const timer = window.setInterval(() => {
      engineRef.current.evaluateMany(patients);
      syncFromEngine();
    }, 60_000);

    return () => {
      unsub();
      window.clearInterval(timer);
    };
  }, [patients, syncFromEngine]);

  // Socket.io — live CareGuard updates when backend is running
  useEffect(() => {
    if (!role || role === "family") {
      disconnectSocket();
      setBackendConnected(false);
      return;
    }

    const s = connectSocket(role);
    const onConnect = () => setBackendConnected(true);
    const onDisconnect = () => setBackendConnected(false);
    s?.on("connect", onConnect);
    s?.on("disconnect", onDisconnect);
    if (s?.connected) setBackendConnected(true);

    const unsubCreated = onSocketEvent("careguard:signal-created", payload => {
      const signal = payload as CareGuardSignal;
      if (!signal?.id) return;
      knownIds.current.add(signal.id);
      toast.message("CareGuard signal", { description: `${signal.title} · ${signal.patientId}` });
      // Re-evaluate from shared patients so local + remote stay aligned
      engineRef.current.evaluateMany(patients);
      syncFromEngine();
    });

    const unsubUpdated = onSocketEvent("careguard:signal-updated", () => {
      engineRef.current.evaluateMany(patients);
      syncFromEngine();
    });

    return () => {
      unsubCreated();
      unsubUpdated();
      s?.off("connect", onConnect);
      s?.off("disconnect", onDisconnect);
    };
  }, [role, patients, syncFromEngine]);

  // Join patient rooms for open signals
  useEffect(() => {
    const ids = new Set(signals.map(s => s.patientId));
    ids.forEach(id => joinPatientRoom(id));
  }, [signals]);

  const evaluateNow = useCallback(
    (_event?: CareGuardWorkflowEvent) => {
      engineRef.current.evaluateMany(patients);
      syncFromEngine();
      void careguardService.syncPatients(patients);
    },
    [patients, syncFromEngine]
  );

  const acknowledge = useCallback(
    (signalId: string) => {
      const s = engineRef.current.acknowledge(signalId);
      if (s) {
        recordCareGuardAudit("SIGNAL_ACKNOWLEDGED", s.id, s.patientId, role || "staff", "acknowledge");
        syncFromEngine();
        void careguardService.acknowledge(signalId);
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
        void careguardService.resolve(signalId);
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
        void careguardService.dismiss(signalId);
        toast.message("Signal dismissed");
      }
    },
    [role, syncFromEngine]
  );

  const resetDemoSignals = useCallback(() => {
    engineRef.current.reset();
    knownIds.current.clear();
    skipCreateToast.current = true;
    localStorage.removeItem(CAREGUARD_SIGNAL_STORAGE_KEY);
    engineRef.current.evaluateMany(patients);
    syncFromEngine();
    skipCreateToast.current = false;
    void careguardService.syncPatients(patients);
    toast.success("CareGuard demo signals restored");
  }, [patients, syncFromEngine]);

  const getPatientSignals = useCallback(
    (patientId: string, activeOnly = true) => {
      const list = signals.filter(s => s.patientId.toUpperCase() === patientId.toUpperCase());
      if (!activeOnly) return list;
      return list.filter(s => s.status === "OPEN" || s.status === "ACKNOWLEDGED");
    },
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

  const summary = useMemo(() => buildSummary(signals), [signals]);

  const value: CareGuardContextType = {
    signals,
    openSignals,
    summary,
    backendConnected,
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

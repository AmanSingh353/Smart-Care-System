import type { CareGuardPatientSnapshot, CareGuardSignal, CareGuardWorkflowEvent } from "../types";
import type { RuleCandidate } from "../rules";
import { defaultCareGuardRules, signalKey, candidateToPartial, type CareGuardRule } from "../rules";

export interface CareGuardInsightProvider {
  readonly name: string;
  evaluate(patient: CareGuardPatientSnapshot, now?: Date): RuleCandidate[];
}

/** Current deterministic provider — future PythonAIProvider can implement the same interface. */
export class DeterministicRuleProvider implements CareGuardInsightProvider {
  readonly name = "DeterministicRuleProvider";
  constructor(private rules: CareGuardRule[] = defaultCareGuardRules) {}

  evaluate(patient: CareGuardPatientSnapshot, now: Date = new Date()): RuleCandidate[] {
    return this.rules.flatMap(rule => rule.evaluate(patient, now));
  }
}

/** Placeholder for future Python AI/analytics service integration. */
export class PythonAIProvider implements CareGuardInsightProvider {
  readonly name = "PythonAIProvider";
  evaluate(_patient: CareGuardPatientSnapshot, _now?: Date): RuleCandidate[] {
    // Not implemented in Phase 4 — reserved for flow prediction / forecasting.
    return [];
  }
}

export type SignalListener = (
  event: "created" | "updated",
  signal: CareGuardSignal
) => void;

export class CareGuardEngine {
  private signals = new Map<string, CareGuardSignal>();
  private listeners: SignalListener[] = [];
  private idSeq = 1;

  constructor(private provider: CareGuardInsightProvider = new DeterministicRuleProvider()) {}

  onSignal(listener: SignalListener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private emit(kind: "created" | "updated", signal: CareGuardSignal) {
    for (const l of this.listeners) l(kind, signal);
  }

  private nextId() {
    return `CG-${String(this.idSeq++).padStart(4, "0")}`;
  }

  getAll(): CareGuardSignal[] {
    return [...this.signals.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  getById(id: string) {
    return this.signals.get(id);
  }

  getForPatient(patientId: string) {
    const key = patientId.trim().toUpperCase();
    return this.getAll().filter(s => s.patientId.toUpperCase() === key);
  }

  getForRole(role: string) {
    const r = role.trim().toUpperCase();
    if (r === "ADMIN") return this.getAll().filter(s => s.status === "OPEN" || s.status === "ACKNOWLEDGED");
    return this.getAll().filter(
      s =>
        s.responsibleRole === r &&
        (s.status === "OPEN" || s.status === "ACKNOWLEDGED")
    );
  }

  /** Receive workflow event and re-evaluate a patient snapshot. */
  handleEvent(
    _event: CareGuardWorkflowEvent,
    patient: CareGuardPatientSnapshot,
    now: Date = new Date()
  ) {
    return this.evaluatePatient(patient, now);
  }

  evaluatePatient(patient: CareGuardPatientSnapshot, now: Date = new Date()) {
    const candidates = this.provider.evaluate(patient, now);
    const activeKeys = new Set(
      candidates.map(c => signalKey(patient.id, c.type, c.sourceEntityId))
    );
    const nowIso = now.toISOString();
    const touched: CareGuardSignal[] = [];

    for (const c of candidates) {
      const key = signalKey(patient.id, c.type, c.sourceEntityId);
      const existing = [...this.signals.values()].find(
        s =>
          s.patientId === patient.id &&
          s.type === c.type &&
          s.sourceEntityId === c.sourceEntityId &&
          (s.status === "OPEN" || s.status === "ACKNOWLEDGED")
      );

      if (existing) {
        // Refresh explainable fields without duplicating
        const updated: CareGuardSignal = {
          ...existing,
          ...candidateToPartial(patient, c),
          id: existing.id,
          status: existing.status,
          createdAt: existing.createdAt,
          updatedAt: nowIso,
        };
        this.signals.set(existing.id, updated);
        this.emit("updated", updated);
        touched.push(updated);
      } else {
        // Do not recreate if previously dismissed for same key unless new event — dismissed stays dismissed until sourceEntity changes
        const dismissed = [...this.signals.values()].find(
          s =>
            s.patientId === patient.id &&
            s.type === c.type &&
            s.sourceEntityId === c.sourceEntityId &&
            s.status === "DISMISSED"
        );
        if (dismissed) continue;

        const created: CareGuardSignal = {
          id: this.nextId(),
          ...candidateToPartial(patient, c),
          status: "OPEN",
          createdAt: nowIso,
          updatedAt: nowIso,
        };
        this.signals.set(created.id, created);
        this.emit("created", created);
        touched.push(created);
      }
      void key;
    }

    // Resolve signals whose underlying issue is gone
    for (const s of [...this.signals.values()]) {
      if (s.patientId !== patient.id) continue;
      if (s.status !== "OPEN" && s.status !== "ACKNOWLEDGED") continue;
      const key = signalKey(s.patientId, s.type, s.sourceEntityId);
      if (activeKeys.has(key)) continue;
      const resolved: CareGuardSignal = {
        ...s,
        status: "RESOLVED",
        updatedAt: nowIso,
      };
      this.signals.set(s.id, resolved);
      this.emit("updated", resolved);
      touched.push(resolved);
    }

    return touched;
  }

  evaluateMany(patients: CareGuardPatientSnapshot[], now: Date = new Date()) {
    return patients.flatMap(p => this.evaluatePatient(p, now));
  }

  acknowledge(signalId: string, actor = "system") {
    return this.setStatus(signalId, "ACKNOWLEDGED", actor);
  }

  resolve(signalId: string, actor = "system") {
    return this.setStatus(signalId, "RESOLVED", actor);
  }

  dismiss(signalId: string, actor = "system") {
    return this.setStatus(signalId, "DISMISSED", actor);
  }

  private setStatus(
    signalId: string,
    status: CareGuardSignal["status"],
    _actor: string
  ): CareGuardSignal | undefined {
    const s = this.signals.get(signalId);
    if (!s) return undefined;
    const updated: CareGuardSignal = {
      ...s,
      status,
      updatedAt: new Date().toISOString(),
    };
    this.signals.set(signalId, updated);
    this.emit("updated", updated);
    return updated;
  }

  summary() {
    const all = this.getAll();
    const open = all.filter(s => s.status === "OPEN" || s.status === "ACKNOWLEDGED");
    const today = new Date().toISOString().slice(0, 10);
    const resolvedToday = all.filter(
      s => s.status === "RESOLVED" && s.updatedAt.slice(0, 10) === today
    );
    const highPriority = open.filter(s => s.severity === "HIGH" || s.severity === "CRITICAL");
    const awaitingReview = open.filter(
      s =>
        s.type === "LAB_REVIEW_PENDING" ||
        s.type === "CRITICAL_RESULT_REVIEW" ||
        s.type === "ALLERGY_PRESCRIPTION_REVIEW"
    );
    const byRole: Record<string, number> = {};
    for (const s of open) {
      byRole[s.responsibleRole] = (byRole[s.responsibleRole] || 0) + 1;
    }
    const bySeverity: Record<string, number> = {};
    for (const s of open) {
      bySeverity[s.severity] = (bySeverity[s.severity] || 0) + 1;
    }
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

  /** Replace store (e.g. demo reset). */
  reset(signals: CareGuardSignal[] = []) {
    this.signals.clear();
    for (const s of signals) this.signals.set(s.id, s);
    const max = signals.reduce((n, s) => {
      const m = /^CG-(\d+)$/.exec(s.id);
      return m ? Math.max(n, Number(m[1])) : n;
    }, 0);
    this.idSeq = max + 1;
  }
}

/** Singleton CareGuard rule engine for the API process. */
export const careGuardEngine = new CareGuardEngine(new DeterministicRuleProvider());

/** Alias matching product naming in docs */
export const CareGuardRuleEngine = CareGuardEngine;

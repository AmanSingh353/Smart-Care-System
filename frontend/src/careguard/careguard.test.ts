import { describe, it, expect } from "vitest";
import { initialPatients } from "@/data/mockData";
import { CareGuardEngine, DeterministicRuleProvider } from "@/careguard/engine";

describe("CareGuard deterministic rules", () => {
  it("evaluates demo patients into expected signal types", () => {
    const engine = new CareGuardEngine(new DeterministicRuleProvider());
    engine.evaluateMany(initialPatients);
    const open = engine.getAll().filter(s => s.status === "OPEN" || s.status === "ACKNOWLEDGED");
    const typesFor = (id: string) => open.filter(s => s.patientId === id).map(s => s.type);

    expect(typesFor("SCS-1001")).toEqual([]);
    expect(typesFor("SCS-1002")).toContain("LAB_REVIEW_PENDING");
    expect(typesFor("SCS-1002")).toContain("LAB_ORDER_DELAY");
    expect(typesFor("SCS-1003")).toContain("MEDICATION_DISPENSING_PENDING");
    expect(typesFor("SCS-1004")).toContain("TREATMENT_TASK_OVERDUE");
    expect(typesFor("SCS-1005")).toContain("ALLERGY_PRESCRIPTION_REVIEW");
    expect(typesFor("SCS-1006")).toContain("CRITICAL_RESULT_REVIEW");
    expect(typesFor("SCS-1007")).toContain("DISCHARGE_WORKFLOW_BLOCKED");
  });

  it("does not duplicate active signals on re-evaluate", () => {
    const engine = new CareGuardEngine(new DeterministicRuleProvider());
    engine.evaluateMany(initialPatients);
    const first = engine.getAll().filter(s => s.status === "OPEN").length;
    engine.evaluateMany(initialPatients);
    const second = engine.getAll().filter(s => s.status === "OPEN").length;
    expect(second).toBe(first);
  });

  it("resolves lab review when reviewedAt is set", () => {
    const engine = new CareGuardEngine(new DeterministicRuleProvider());
    const patient = structuredClone(initialPatients.find(p => p.id === "SCS-1002")!);
    engine.evaluatePatient(patient);
    expect(engine.getForPatient("SCS-1002").some(s => s.type === "LAB_REVIEW_PENDING" && s.status === "OPEN")).toBe(true);
    patient.tests = patient.tests.map(t =>
      t.id === "t3" ? { ...t, reviewedAt: "12:00", reviewedBy: "Doctor" } : t
    );
    engine.evaluatePatient(patient);
    const pending = engine
      .getForPatient("SCS-1002")
      .find(s => s.type === "LAB_REVIEW_PENDING" && s.sourceEntityId === "t3");
    expect(pending?.status).toBe("RESOLVED");
  });
});

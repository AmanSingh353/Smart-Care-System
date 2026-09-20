import { useEffect, useMemo, useState } from "react";
import { Patient, PATIENT_STATUSES, PatientStatus, getBillTotal } from "@/data/mockData";
import { usePatients } from "@/contexts/PatientContext";
import { useAuth } from "@/contexts/AuthContext";
import type { WorkspaceRole } from "./workspaceUtils";
import { PatientHeader } from "./PatientHeader";
import { PatientJourney } from "./PatientJourney";
import { ClinicalSummary } from "./ClinicalSummary";
import { PatientOrders } from "./PatientOrders";
import { MedicationList } from "./MedicationList";
import { PatientActivityTimeline } from "./PatientActivityTimeline";
import { CareGuardPanel } from "./CareGuardPanel";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type TabId = "overview" | "journey" | "clinical" | "tests" | "medications" | "billing" | "activity";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "journey", label: "Journey" },
  { id: "clinical", label: "Clinical" },
  { id: "tests", label: "Tests" },
  { id: "medications", label: "Medications" },
  { id: "billing", label: "Billing" },
  { id: "activity", label: "Activity" },
];

interface PatientWorkspaceProps {
  patient: Patient;
  /** Override role; defaults to AuthContext role */
  role?: WorkspaceRole;
  className?: string;
  defaultTab?: TabId;
}

export function PatientWorkspace({ patient, role: roleProp, className, defaultTab = "overview" }: PatientWorkspaceProps) {
  const { role: authRole } = useAuth();
  const role = (roleProp || authRole || "admin") as WorkspaceRole;
  const familyMode = role === "family";

  const {
    addDiagnosis,
    updateSymptoms,
    updateAllergies,
    addMedicine,
    addTest,
    updateTestStatus,
    dispenseMedicine,
    markMedicineGiven,
    addNursingUpdate,
    updateTreatmentStatus,
    updatePaymentStatus,
    markTestReviewed,
    markTestCritical,
  } = usePatients();

  const [tab, setTab] = useState<TabId>(defaultTab);
  const [diag, setDiag] = useState(patient.diagnosis);
  const [symptoms, setSymptoms] = useState(patient.symptoms);
  const [allergies, setAllergies] = useState(patient.allergies);
  const [medForm, setMedForm] = useState({ name: "", dosage: "", frequency: "", duration: "" });
  const [testName, setTestName] = useState("");
  const [testResult, setTestResult] = useState<Record<string, string>>({});
  const [nurseNote, setNurseNote] = useState("");
  const [showMed, setShowMed] = useState(false);
  const [showTest, setShowTest] = useState(false);

  useEffect(() => {
    setDiag(patient.diagnosis);
    setSymptoms(patient.symptoms);
    setAllergies(patient.allergies);
  }, [patient.id, patient.diagnosis, patient.symptoms, patient.allergies]);

  const tabs = useMemo(() => {
    if (familyMode) {
      return TABS.filter(t => t.id !== "clinical" || true).map(t =>
        t.id === "clinical" ? { ...t, label: "Condition" } : t
      );
    }
    return TABS;
  }, [familyMode]);

  const headerActions = (
    <>
      {role === "doctor" && (
        <>
          <Button size="sm" variant="outline" onClick={() => { setTab("clinical"); }}>
            Notes
          </Button>
          <Button size="sm" variant="outline" onClick={() => { setTab("medications"); setShowMed(true); }}>
            Prescribe
          </Button>
          <Button size="sm" onClick={() => { setTab("tests"); setShowTest(true); }}>
            Order test
          </Button>
        </>
      )}
      {role === "nurse" && (
        <Button size="sm" onClick={() => setTab("medications")}>
          Care tasks
        </Button>
      )}
      {role === "lab" && (
        <Button size="sm" onClick={() => setTab("tests")}>
          Lab queue
        </Button>
      )}
      {role === "pharmacy" && (
        <Button size="sm" onClick={() => setTab("medications")}>
          Dispense
        </Button>
      )}
      {role === "billing" && (
        <Button
          size="sm"
          disabled={patient.billStatus === "Paid"}
          onClick={() => updatePaymentStatus(patient.id, "Paid")}
        >
          Mark paid
        </Button>
      )}
      {(role === "admin" || role === "reception") && (
        <Button size="sm" variant="outline" onClick={() => setTab("journey")}>
          View journey
        </Button>
      )}
    </>
  );

  return (
    <div className={cn("space-y-4 animate-fade-in", className)}>
      <PatientHeader patient={patient} actions={headerActions} familyMode={familyMode} />

      {/* Secondary nav */}
      <nav className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin" aria-label="Patient workspace sections">
        {tabs.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            aria-current={tab === t.id ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              tab === t.id
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:bg-muted hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {(tab === "overview" || tab === "journey") && (
        <>
          <PatientJourney patient={patient} />
          {!familyMode && <CareGuardPanel patientId={patient.id} />}
        </>
      )}

      {tab === "overview" && (
        <div className="grid lg:grid-cols-2 gap-4">
          <ClinicalSummary patient={patient} familyMode={familyMode} />
          <PatientOrders patient={patient} familyMode={familyMode} />
          <MedicationList patient={patient} />
          <PatientActivityTimeline patient={patient} limit={8} />
        </div>
      )}

      {tab === "clinical" && (
        <div className="space-y-4">
          <ClinicalSummary patient={patient} familyMode={familyMode} />
          {(role === "doctor" || role === "admin") && (
            <Card className="rounded-2xl shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Update clinical record</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs">Diagnosis</Label>
                  <Textarea className="mt-1" rows={3} value={diag} onChange={e => setDiag(e.target.value)} />
                  <Button size="sm" className="mt-2" onClick={() => addDiagnosis(patient.id, diag)}>
                    Save diagnosis
                  </Button>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Symptoms</Label>
                    <Textarea className="mt-1" rows={2} value={symptoms} onChange={e => setSymptoms(e.target.value)} />
                    <Button size="sm" variant="outline" className="mt-2" onClick={() => updateSymptoms(patient.id, symptoms)}>
                      Save symptoms
                    </Button>
                  </div>
                  <div>
                    <Label className="text-xs">Allergies</Label>
                    <Input className="mt-1" value={allergies} onChange={e => setAllergies(e.target.value)} />
                    <Button size="sm" variant="outline" className="mt-2" onClick={() => updateAllergies(patient.id, allergies)}>
                      Save allergies
                    </Button>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Treatment status</Label>
                  <select
                    className="mt-1 h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                    value={patient.treatmentStatus}
                    onChange={e => updateTreatmentStatus(patient.id, e.target.value as PatientStatus)}
                  >
                    {PATIENT_STATUSES.map(s => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </CardContent>
            </Card>
          )}
          {role === "nurse" && (
            <Card className="rounded-2xl shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Nursing update</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Textarea
                  rows={3}
                  placeholder="Short care update for doctor & family…"
                  value={nurseNote}
                  onChange={e => setNurseNote(e.target.value)}
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    disabled={!nurseNote.trim()}
                    onClick={() => {
                      addNursingUpdate(patient.id, nurseNote.trim());
                      setNurseNote("");
                    }}
                  >
                    Post update
                  </Button>
                  <select
                    className="h-9 rounded-xl border border-input bg-background px-2 text-xs"
                    value={patient.treatmentStatus}
                    onChange={e => updateTreatmentStatus(patient.id, e.target.value as PatientStatus)}
                  >
                    {PATIENT_STATUSES.filter(s => s !== "Discharged").map(s => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {tab === "tests" && (
        <div className="space-y-4">
          <PatientOrders patient={patient} familyMode={familyMode} />
          {(role === "doctor" || role === "admin") && (
            <Card className="rounded-2xl shadow-card">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold">Order test</CardTitle>
                <Button size="sm" variant="outline" onClick={() => setShowTest(v => !v)}>
                  {showTest ? "Hide" : "New test"}
                </Button>
              </CardHeader>
              {showTest && (
                <CardContent className="space-y-2">
                  <Input
                    placeholder="e.g. CBC, LFT, X-Ray Chest"
                    value={testName}
                    onChange={e => setTestName(e.target.value)}
                  />
                  <Button
                    size="sm"
                    disabled={!testName.trim()}
                    onClick={() => {
                      addTest(patient.id, testName.trim());
                      setTestName("");
                      setShowTest(false);
                    }}
                  >
                    Request test
                  </Button>
                </CardContent>
              )}
            </Card>
          )}
          {(role === "lab" || role === "admin") && (
            <Card className="rounded-2xl shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Update lab results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(patient.tests ?? []).filter(t => t.status !== "Completed").length === 0 && (
                  <p className="text-sm text-muted-foreground">No open tests</p>
                )}
                {(patient.tests ?? [])
                  .filter(t => t.status !== "Completed")
                  .map(t => (
                    <div key={t.id} className="rounded-xl border border-border p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold">{t.name}</p>
                        <StatusBadge status={t.status} />
                      </div>
                      {t.status === "Pending" && (
                        <Button size="sm" variant="outline" onClick={() => updateTestStatus(patient.id, t.id, "In Progress")}>
                          Start processing
                        </Button>
                      )}
                      <Input
                        placeholder="Result summary"
                        value={testResult[t.id] || ""}
                        onChange={e => setTestResult(r => ({ ...r, [t.id]: e.target.value }))}
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            updateTestStatus(patient.id, t.id, "Completed", testResult[t.id] || "Result recorded");
                            setTestResult(r => ({ ...r, [t.id]: "" }));
                          }}
                        >
                          Mark completed & publish
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            updateTestStatus(
                              patient.id,
                              t.id,
                              "Completed",
                              testResult[t.id] || "Result recorded",
                              { isCritical: true }
                            );
                            setTestResult(r => ({ ...r, [t.id]: "" }));
                          }}
                        >
                          Complete as critical
                        </Button>
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>
          )}

          {(role === "doctor" || role === "admin") && (
            <Card className="rounded-2xl shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Doctor lab review</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(patient.tests ?? []).filter(t => t.status === "Completed" && !t.reviewedAt).length === 0 && (
                  <p className="text-sm text-muted-foreground">No results awaiting review</p>
                )}
                {(patient.tests ?? [])
                  .filter(t => t.status === "Completed" && !t.reviewedAt)
                  .map(t => (
                    <div key={t.id} className="rounded-xl border border-border p-3 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold">
                          {t.name}
                          {t.isCritical && (
                            <span className="ml-2 text-[10px] uppercase font-bold text-destructive">Critical</span>
                          )}
                        </p>
                        <StatusBadge status="Completed" />
                      </div>
                      {t.result && <p className="text-xs text-muted-foreground">{t.result}</p>}
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => markTestReviewed(patient.id, t.id, "Assigned doctor")}>
                          Mark reviewed
                        </Button>
                        {!t.isCritical && (
                          <Button size="sm" variant="outline" onClick={() => markTestCritical(patient.id, t.id, true)}>
                            Flag critical (lab workflow)
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {tab === "medications" && (
        <div className="space-y-4">
          <MedicationList patient={patient} />
          {(role === "doctor" || role === "admin") && (
            <Card className="rounded-2xl shadow-card">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold">Prescribe medicine</CardTitle>
                <Button size="sm" variant="outline" onClick={() => setShowMed(v => !v)}>
                  {showMed ? "Hide" : "New Rx"}
                </Button>
              </CardHeader>
              {showMed && (
                <CardContent className="space-y-2">
                  <div className="grid sm:grid-cols-2 gap-2">
                    <Input placeholder="Name" value={medForm.name} onChange={e => setMedForm(f => ({ ...f, name: e.target.value }))} />
                    <Input placeholder="Dosage" value={medForm.dosage} onChange={e => setMedForm(f => ({ ...f, dosage: e.target.value }))} />
                    <Input placeholder="Frequency" value={medForm.frequency} onChange={e => setMedForm(f => ({ ...f, frequency: e.target.value }))} />
                    <Input placeholder="Duration (days)" value={medForm.duration} onChange={e => setMedForm(f => ({ ...f, duration: e.target.value }))} />
                  </div>
                  <Button
                    size="sm"
                    disabled={!medForm.name.trim()}
                    onClick={() => {
                      addMedicine(patient.id, medForm);
                      setMedForm({ name: "", dosage: "", frequency: "", duration: "" });
                      setShowMed(false);
                    }}
                  >
                    Save prescription
                  </Button>
                </CardContent>
              )}
            </Card>
          )}
          {(role === "pharmacy" || role === "admin") && (
            <Card className="rounded-2xl shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Dispense medicines</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(patient.medicines ?? []).filter(m => !m.dispensed).length === 0 && (
                  <p className="text-sm text-muted-foreground">Nothing pending</p>
                )}
                {(patient.medicines ?? [])
                  .filter(m => !m.dispensed)
                  .map(m => (
                    <div key={m.id} className="flex items-center justify-between gap-2 rounded-xl bg-muted/40 px-3 py-2 text-sm">
                      <span>
                        {m.name} · {m.dosage}
                      </span>
                      <Button size="sm" variant="outline" onClick={() => dispenseMedicine(patient.id, m.id)}>
                        Mark packed
                      </Button>
                    </div>
                  ))}
              </CardContent>
            </Card>
          )}
          {(role === "nurse" || role === "admin") && (
            <Card className="rounded-2xl shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Medication / care tasks</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(patient.medicines ?? []).flatMap(m =>
                  (m.schedule ?? []).map(s => (
                    <div key={`${m.id}-${s.time}`} className="flex items-center justify-between gap-2 rounded-xl bg-muted/40 px-3 py-2 text-sm">
                      <span>
                        {s.time} – {m.name} {m.dosage}
                        {!m.dispensed && (
                          <span className="ml-2 text-[10px] text-muted-foreground">Pharmacy pending</span>
                        )}
                      </span>
                      {s.given ? (
                        <StatusBadge status="Completed" />
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => markMedicineGiven(patient.id, m.id, s.time)}>
                          Mark given
                        </Button>
                      )}
                    </div>
                  ))
                )}
                {(patient.medicines ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground">No medication tasks</p>
                )}
                <div className="pt-2 border-t border-border space-y-2">
                  <Label className="text-xs">Add nursing update</Label>
                  <Textarea rows={2} value={nurseNote} onChange={e => setNurseNote(e.target.value)} />
                  <Button
                    size="sm"
                    disabled={!nurseNote.trim()}
                    onClick={() => {
                      addNursingUpdate(patient.id, nurseNote.trim());
                      setNurseNote("");
                    }}
                  >
                    Post update
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {tab === "billing" && (
        <Card className="rounded-2xl shadow-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm font-semibold">Billing</CardTitle>
              <StatusBadge status={patient.billStatus} />
            </div>
          </CardHeader>
          <CardContent>
            {(patient.billItems?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No billing items</p>
            ) : (
              <div className="space-y-2">
                {patient.billItems.map(item => (
                  <div key={item.id} className="flex justify-between gap-3 text-sm">
                    <span className="text-muted-foreground truncate">
                      {item.description}
                      {!familyMode && <span className="capitalize text-[10px] ml-2">{item.category}</span>}
                    </span>
                    <span className="font-medium tabular-nums shrink-0">
                      ₹{(item.unitPrice * item.quantity).toLocaleString("en-IN")}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between pt-2 border-t border-border font-bold">
                  <span>Total</span>
                  <span className="text-primary tabular-nums">
                    ₹{getBillTotal(patient.billItems).toLocaleString("en-IN")}
                  </span>
                </div>
                {(role === "billing" || role === "admin") && patient.billStatus === "Unpaid" && (
                  <Button className="w-full mt-2" onClick={() => updatePaymentStatus(patient.id, "Paid")}>
                    Mark as paid
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "activity" && <PatientActivityTimeline patient={patient} />}

      {tab === "journey" && familyMode && (
        <p className="text-sm text-muted-foreground rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-3">
          Your care team is coordinating this journey. You will receive updates when important steps are completed.
        </p>
      )}
    </div>
  );
}

export default PatientWorkspace;

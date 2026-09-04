import { useState } from "react";
import { StaffLayout } from "@/components/StaffLayout";
import { PatientDetails } from "@/components/PatientDetails";
import { usePatients } from "@/contexts/PatientContext";
import { isPatientActive, PATIENT_STATUSES, PatientStatus } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Plus, User, Stethoscope } from "lucide-react";

const DoctorPanel = () => {
  const {
    patients,
    getPatientById,
    addDiagnosis,
    addMedicine,
    addTest,
    updateTreatmentStatus,
    updateSymptoms,
    updateAllergies,
  } = usePatients();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showMedForm, setShowMedForm] = useState(false);
  const [showTestForm, setShowTestForm] = useState(false);
  const [medForm, setMedForm] = useState({ name: "", dosage: "", frequency: "", duration: "" });
  const [testName, setTestName] = useState("");
  const [diagText, setDiagText] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [allergies, setAllergies] = useState("");

  const activePatients = patients.filter(isPatientActive);
  const selected = selectedId ? getPatientById(selectedId) : undefined;

  const selectPatient = (id: string) => {
    const p = getPatientById(id);
    setSelectedId(id);
    setDiagText(p?.diagnosis || "");
    setSymptoms(p?.symptoms || "");
    setAllergies(p?.allergies || "");
    setShowMedForm(false);
    setShowTestForm(false);
  };

  const handleAddMed = () => {
    if (selectedId && medForm.name) {
      addMedicine(selectedId, medForm);
      setMedForm({ name: "", dosage: "", frequency: "", duration: "" });
      setShowMedForm(false);
    }
  };

  const handleAddTest = () => {
    if (selectedId && testName) {
      addTest(selectedId, testName);
      setTestName("");
      setShowTestForm(false);
    }
  };

  return (
    <StaffLayout allowedRoles={["doctor", "admin"]}>
      <h2 className="text-xl font-bold text-foreground mb-6">Doctor Panel</h2>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Admitted Patients ({activePatients.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-2 space-y-1 max-h-[70vh] overflow-y-auto">
              {activePatients.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => selectPatient(p.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-md text-sm transition-colors ${
                    selectedId === p.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{p.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground ml-5">
                    {p.id} · {p.treatmentStatus}
                  </p>
                </button>
              ))}
              {activePatients.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No active patients</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3 space-y-4">
          {selected ? (
            <>
              <PatientDetails patient={selected} showBilling />

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-sm">Update Treatment Status</CardTitle>
                  <select
                    value={selected.treatmentStatus}
                    onChange={e => updateTreatmentStatus(selected.id, e.target.value as PatientStatus)}
                    className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                  >
                    {PATIENT_STATUSES.map(s => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </CardHeader>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Edit Symptoms</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Textarea value={symptoms} onChange={e => setSymptoms(e.target.value)} rows={2} />
                    <Button size="sm" variant="outline" onClick={() => updateSymptoms(selected.id, symptoms)}>
                      Save Symptoms
                    </Button>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Edit Allergies</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Input value={allergies} onChange={e => setAllergies(e.target.value)} />
                    <Button size="sm" variant="outline" onClick={() => updateAllergies(selected.id, allergies)}>
                      Save Allergies
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Update Diagnosis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Textarea
                    value={diagText}
                    onChange={e => setDiagText(e.target.value)}
                    placeholder="Add diagnosis / notes..."
                    rows={3}
                  />
                  <Button size="sm" onClick={() => addDiagnosis(selected.id, diagText)}>
                    Save Diagnosis
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-sm">Prescribe Medicine</CardTitle>
                  <Button size="sm" variant="outline" onClick={() => setShowMedForm(true)} className="gap-1">
                    <Plus className="h-3.5 w-3.5" /> Prescribe
                  </Button>
                </CardHeader>
                <CardContent>
                  {(selected.medicines?.length ?? 0) > 0 ? (
                    <div className="overflow-x-auto mb-3">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border text-left">
                            <th className="pb-2 font-medium text-muted-foreground">Name</th>
                            <th className="pb-2 font-medium text-muted-foreground">Dosage</th>
                            <th className="pb-2 font-medium text-muted-foreground">Frequency</th>
                            <th className="pb-2 font-medium text-muted-foreground">Pharmacy</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selected.medicines.map(m => (
                            <tr key={m.id} className="border-b border-border/50 last:border-0">
                              <td className="py-2">{m.name}</td>
                              <td className="py-2">{m.dosage}</td>
                              <td className="py-2">{m.frequency}</td>
                              <td className="py-2">
                                <Badge variant={m.dispensed ? "outline" : "secondary"} className="text-xs">
                                  {m.dispensed ? "Packed" : "Pending"}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground mb-3">No medicines prescribed yet</p>
                  )}

                  {showMedForm && (
                    <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Medicine Name</Label>
                          <Input
                            value={medForm.name}
                            onChange={e => setMedForm(f => ({ ...f, name: e.target.value }))}
                            placeholder="e.g. Paracetamol"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Dosage</Label>
                          <Input
                            value={medForm.dosage}
                            onChange={e => setMedForm(f => ({ ...f, dosage: e.target.value }))}
                            placeholder="e.g. 500 mg"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Frequency</Label>
                          <Input
                            value={medForm.frequency}
                            onChange={e => setMedForm(f => ({ ...f, frequency: e.target.value }))}
                            placeholder="e.g. Twice a day"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Duration (days)</Label>
                          <Input
                            value={medForm.duration}
                            onChange={e => setMedForm(f => ({ ...f, duration: e.target.value }))}
                            placeholder="e.g. 5"
                            className="mt-1"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleAddMed}>
                          Save
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setShowMedForm(false)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-sm">Request Test</CardTitle>
                  <Button size="sm" variant="outline" onClick={() => setShowTestForm(true)} className="gap-1">
                    <Plus className="h-3.5 w-3.5" /> Request Test
                  </Button>
                </CardHeader>
                <CardContent>
                  {(selected.tests?.length ?? 0) === 0 && (
                    <p className="text-sm text-muted-foreground mb-3">No tests ordered yet</p>
                  )}
                  {showTestForm && (
                    <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                      <div>
                        <Label className="text-xs">Test Name</Label>
                        <Input
                          value={testName}
                          onChange={e => setTestName(e.target.value)}
                          placeholder="e.g. CBC, X-Ray Chest"
                          className="mt-1"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleAddTest}>
                          Save
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setShowTestForm(false)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-16 text-center">
                <Stethoscope className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">Select a patient to open their unified record</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </StaffLayout>
  );
};

export default DoctorPanel;

import { useState } from "react";
import { StaffLayout } from "@/components/StaffLayout";
import { usePatients } from "@/contexts/PatientContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Plus, User, Stethoscope } from "lucide-react";

const DoctorPanel = () => {
  const { patients, addDiagnosis, addMedicine, addTest } = usePatients();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showMedForm, setShowMedForm] = useState(false);
  const [showTestForm, setShowTestForm] = useState(false);
  const [medForm, setMedForm] = useState({ name: "", dosage: "", frequency: "", duration: "" });
  const [testName, setTestName] = useState("");
  const [diagText, setDiagText] = useState("");

  const activePatients = patients.filter(p => p.status === "Active");
  const selected = patients.find(p => p.id === selectedId);

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

  const handleSaveDiagnosis = () => {
    if (selectedId) {
      addDiagnosis(selectedId, diagText);
    }
  };

  return (
    <StaffLayout>
      <h2 className="text-xl font-bold text-foreground mb-6">Doctor Panel</h2>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Patient list sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">My Patients</CardTitle>
            </CardHeader>
            <CardContent className="p-2 space-y-1">
              {activePatients.map(p => (
                <button
                  key={p.id}
                  onClick={() => { setSelectedId(p.id); setDiagText(p.diagnosis); }}
                  className={`w-full text-left px-3 py-2.5 rounded-md text-sm transition-colors ${selectedId === p.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-foreground"}`}
                >
                  <div className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{p.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground ml-5.5">{p.id} · {p.visitType}</p>
                </button>
              ))}
              {activePatients.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No active patients</p>}
            </CardContent>
          </Card>
        </div>

        {/* Main area */}
        <div className="lg:col-span-3 space-y-4">
          {selected ? (
            <>
              {/* Patient header */}
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-4 pb-4 flex flex-wrap gap-4 items-center text-sm">
                  <Badge>{selected.id}</Badge>
                  <span className="font-semibold text-foreground">{selected.name}</span>
                  <span className="text-muted-foreground">{selected.age}y · {selected.gender}</span>
                  <span className="text-muted-foreground">{selected.mobile}</span>
                  <Badge variant="secondary">{selected.visitType}</Badge>
                </CardContent>
              </Card>

              {/* Diagnosis */}
              <Card>
                <CardHeader><CardTitle className="text-sm">Diagnosis</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <Textarea value={diagText} onChange={e => setDiagText(e.target.value)} placeholder="Add diagnosis / notes..." rows={3} />
                  <Button size="sm" onClick={handleSaveDiagnosis}>Save Diagnosis</Button>
                </CardContent>
              </Card>

              {/* Medicines */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-sm">Medicines</CardTitle>
                  <Button size="sm" variant="outline" onClick={() => setShowMedForm(true)} className="gap-1">
                    <Plus className="h-3.5 w-3.5" /> Add Medicine
                  </Button>
                </CardHeader>
                <CardContent>
                  {selected.medicines.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border text-left">
                            <th className="pb-2 font-medium text-muted-foreground">Name</th>
                            <th className="pb-2 font-medium text-muted-foreground">Dosage</th>
                            <th className="pb-2 font-medium text-muted-foreground">Frequency</th>
                            <th className="pb-2 font-medium text-muted-foreground">Duration</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selected.medicines.map(m => (
                            <tr key={m.id} className="border-b border-border/50 last:border-0">
                              <td className="py-2 text-foreground">{m.name}</td>
                              <td className="py-2 text-foreground">{m.dosage}</td>
                              <td className="py-2 text-foreground">{m.frequency}</td>
                              <td className="py-2 text-foreground">{m.duration}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No medicines prescribed yet</p>
                  )}

                  {showMedForm && (
                    <div className="mt-4 p-4 bg-muted/50 rounded-lg space-y-3 animate-fade-in">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Medicine Name</Label>
                          <Input value={medForm.name} onChange={e => setMedForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Paracetamol" className="mt-1" />
                        </div>
                        <div>
                          <Label className="text-xs">Dosage</Label>
                          <Input value={medForm.dosage} onChange={e => setMedForm(f => ({ ...f, dosage: e.target.value }))} placeholder="e.g. 500 mg" className="mt-1" />
                        </div>
                        <div>
                          <Label className="text-xs">Frequency</Label>
                          <Input value={medForm.frequency} onChange={e => setMedForm(f => ({ ...f, frequency: e.target.value }))} placeholder="e.g. Twice a day" className="mt-1" />
                        </div>
                        <div>
                          <Label className="text-xs">Duration (days)</Label>
                          <Input value={medForm.duration} onChange={e => setMedForm(f => ({ ...f, duration: e.target.value }))} placeholder="e.g. 5" className="mt-1" />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleAddMed}>Save</Button>
                        <Button size="sm" variant="ghost" onClick={() => setShowMedForm(false)}>Cancel</Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Tests */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-sm">Tests</CardTitle>
                  <Button size="sm" variant="outline" onClick={() => setShowTestForm(true)} className="gap-1">
                    <Plus className="h-3.5 w-3.5" /> Add Test
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {selected.tests.map((t, i) => (
                      <Badge key={i} variant="secondary">{t}</Badge>
                    ))}
                    {selected.tests.length === 0 && <p className="text-sm text-muted-foreground">No tests ordered yet</p>}
                  </div>
                  {showTestForm && (
                    <div className="mt-4 p-4 bg-muted/50 rounded-lg space-y-3 animate-fade-in">
                      <div>
                        <Label className="text-xs">Test Name</Label>
                        <Input value={testName} onChange={e => setTestName(e.target.value)} placeholder="e.g. CBC, X-ray chest" className="mt-1" />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleAddTest}>Save</Button>
                        <Button size="sm" variant="ghost" onClick={() => setShowTestForm(false)}>Cancel</Button>
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
                <p className="text-muted-foreground">Select a patient from the list to view their record</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </StaffLayout>
  );
};

export default DoctorPanel;

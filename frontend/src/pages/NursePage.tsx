import { useState } from "react";
import { StaffLayout } from "@/components/StaffLayout";
import { usePatients } from "@/contexts/PatientContext";
import { isPatientActive, PATIENT_STATUSES, PatientStatus, roomLabel } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";

const NursePage = () => {
  const { patients, markMedicineGiven, addNursingUpdate, updateTreatmentStatus } = usePatients();
  const activePatients = patients.filter(isPatientActive);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const now = new Date();
  const currentHour = now.getHours();
  const overdue: { patientId: string; medicine: string; time: string }[] = [];

  activePatients.forEach(p => {
    p.medicines.forEach(m => {
      m.schedule.forEach(s => {
        const hour = parseInt(s.time.split(":")[0], 10);
        if (!s.given && hour < currentHour) {
          overdue.push({ patientId: p.id, medicine: m.name, time: s.time });
        }
      });
    });
  });

  const logs: { time: string; patientId: string; medicine: string }[] = [];
  activePatients.forEach(p => {
    p.medicines.forEach(m => {
      m.schedule.forEach(s => {
        if (s.given) logs.push({ time: s.givenAt || s.time, patientId: p.id, medicine: m.name });
      });
    });
  });

  return (
    <StaffLayout allowedRoles={["nurse", "admin"]}>
      <h2 className="text-xl font-bold text-foreground mb-2">Nursing Station</h2>
      <p className="text-sm text-muted-foreground mb-6">Medicines, patient status, and nursing updates</p>

      {overdue.length > 0 && (
        <div className="mb-6 p-3 bg-warning/10 border border-warning/20 rounded-lg flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
          <div className="text-sm space-y-0.5">
            {overdue.map((o, i) => (
              <p key={i} className="text-foreground">
                <span className="font-medium">Overdue:</span> {o.medicine} for {o.patientId} @ {o.time}
              </p>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4 mb-8">
        {activePatients.map(p => (
          <Card key={p.id}>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center gap-2 justify-between">
                <div className="flex items-center gap-2">
                  <Badge>{p.id}</Badge>
                  <span className="font-medium text-foreground text-sm">{p.name}</span>
                  <span className="text-xs text-muted-foreground">· {roomLabel(p)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{p.treatmentStatus}</Badge>
                  <select
                    value={p.treatmentStatus}
                    onChange={e => updateTreatmentStatus(p.id, e.target.value as PatientStatus)}
                    className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                  >
                    {PATIENT_STATUSES.filter(s => s !== "Discharged").map(s => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {p.diagnosis && <p className="text-xs text-muted-foreground mt-1">Dx: {p.diagnosis}</p>}
              {p.allergies && p.allergies !== "None known" && (
                <p className="text-xs text-destructive mt-1">Allergies: {p.allergies}</p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Medicine tasks</h4>
                {p.medicines.length === 0 && <p className="text-sm text-muted-foreground">No medicines yet</p>}
                <div className="space-y-2">
                  {p.medicines.map(m =>
                    m.schedule.map((s, si) => (
                      <div key={`${m.id}-${si}`} className="flex items-center justify-between bg-muted/50 rounded-md px-3 py-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>
                            {s.time} – {m.name} {m.dosage}
                          </span>
                          {!m.dispensed && (
                            <Badge variant="secondary" className="text-[10px]">
                              Pharmacy pending
                            </Badge>
                          )}
                        </div>
                        {s.given ? (
                          <Badge variant="outline" className="text-success border-success/30 gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Given
                          </Badge>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => markMedicineGiven(p.id, m.id, s.time)}>
                            Mark Given
                          </Button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Add nursing update</h4>
                <Textarea
                  value={notes[p.id] || ""}
                  onChange={e => setNotes(n => ({ ...n, [p.id]: e.target.value }))}
                  placeholder="Short update for doctor & family..."
                  rows={2}
                  className="mb-2"
                />
                <Button
                  size="sm"
                  disabled={!notes[p.id]?.trim()}
                  onClick={() => {
                    addNursingUpdate(p.id, notes[p.id].trim());
                    setNotes(n => ({ ...n, [p.id]: "" }));
                  }}
                >
                  Post Update
                </Button>
                {p.nurseUpdates.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {[...p.nurseUpdates].slice(-2).reverse().map(u => (
                      <p key={u.id} className="text-xs text-muted-foreground bg-muted/40 rounded px-2 py-1.5">
                        <span className="text-foreground">{u.note}</span> · {u.time}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {activePatients.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">No assigned patients</CardContent>
          </Card>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Recent dose logs</h3>
        <Card>
          <CardContent className="pt-4">
            {logs.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-2 font-medium text-muted-foreground">Time</th>
                    <th className="pb-2 font-medium text-muted-foreground">Patient</th>
                    <th className="pb-2 font-medium text-muted-foreground">Medicine</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l, i) => (
                    <tr key={i} className="border-b border-border/50 last:border-0">
                      <td className="py-2">{l.time}</td>
                      <td className="py-2 text-primary font-medium">{l.patientId}</td>
                      <td className="py-2">{l.medicine}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No logs yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </StaffLayout>
  );
};

export default NursePage;

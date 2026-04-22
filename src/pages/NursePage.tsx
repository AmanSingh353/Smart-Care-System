import { StaffLayout } from "@/components/StaffLayout";
import { usePatients } from "@/contexts/PatientContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";

const NursePage = () => {
  const { patients, markMedicineGiven } = usePatients();
  const activePatients = patients.filter(p => p.status === "Active");

  // Collect overdue doses
  const now = new Date();
  const currentHour = now.getHours();
  const overdue: { patientId: string; patientName: string; medicine: string; time: string }[] = [];

  activePatients.forEach(p => {
    p.medicines.forEach(m => {
      m.schedule.forEach(s => {
        const hour = parseInt(s.time.split(":")[0]);
        if (!s.given && hour < currentHour) {
          overdue.push({ patientId: p.id, patientName: p.name, medicine: m.name, time: s.time });
        }
      });
    });
  });

  // Recent logs
  const logs: { time: string; patientId: string; medicine: string; status: string }[] = [];
  activePatients.forEach(p => {
    p.medicines.forEach(m => {
      m.schedule.forEach(s => {
        if (s.given) {
          logs.push({ time: s.givenAt || s.time, patientId: p.id, medicine: m.name, status: "Given" });
        }
      });
    });
  });

  return (
    <StaffLayout>
      <h2 className="text-xl font-bold text-foreground mb-6">Medicine Schedule & Alerts</h2>

      {overdue.length > 0 && (
        <div className="mb-6 p-3 bg-warning/10 border border-warning/20 rounded-lg flex items-start gap-2 animate-fade-in">
          <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
          <div className="text-sm">
            {overdue.map((o, i) => (
              <p key={i} className="text-foreground">
                <span className="font-medium">Overdue:</span> {o.medicine} for {o.patientId} @ {o.time}
              </p>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4 mb-8">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Today's Medicines</h3>
        {activePatients.map(p => (
          <Card key={p.id} className="animate-fade-in">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Badge>{p.id}</Badge>
                <span className="font-medium text-foreground text-sm">{p.name}</span>
                {p.ward && <span className="text-xs text-muted-foreground">· {p.ward}</span>}
              </div>
              <div className="space-y-2">
                {p.medicines.map(m =>
                  m.schedule.map((s, si) => (
                    <div key={`${m.id}-${si}`} className="flex items-center justify-between bg-muted/50 rounded-md px-3 py-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-foreground">{s.time} – {m.name} {m.dosage}</span>
                      </div>
                      {s.given ? (
                        <Badge variant="outline" className="text-success border-success/30 gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Given
                        </Badge>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => markMedicineGiven(p.id, m.id, s.time)}>
                          Mark as Given
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Recent Logs</h3>
        <Card>
          <CardContent className="pt-4">
            {logs.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-2 font-medium text-muted-foreground">Time</th>
                    <th className="pb-2 font-medium text-muted-foreground">Patient ID</th>
                    <th className="pb-2 font-medium text-muted-foreground">Medicine</th>
                    <th className="pb-2 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l, i) => (
                    <tr key={i} className="border-b border-border/50 last:border-0">
                      <td className="py-2 text-foreground">{l.time}</td>
                      <td className="py-2 text-primary font-medium">{l.patientId}</td>
                      <td className="py-2 text-foreground">{l.medicine}</td>
                      <td className="py-2"><Badge variant="outline" className="text-success border-success/30 text-xs">Given</Badge></td>
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

import { useMemo, useState } from "react";
import { StaffLayout } from "@/components/StaffLayout";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { PatientWorkspace } from "@/components/patient/PatientWorkspace";
import { usePatients } from "@/contexts/PatientContext";
import { isPatientActive, roomLabel } from "@/data/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

const NursePage = () => {
  const { patients, getPatientById } = usePatients();
  const activePatients = patients.filter(isPatientActive);
  const [selectedId, setSelectedId] = useState<string | null>(activePatients[0]?.id ?? null);
  const selected = selectedId ? getPatientById(selectedId) : undefined;

  const overdue = useMemo(() => {
    const currentHour = new Date().getHours();
    const list: { patientId: string; medicine: string; time: string }[] = [];
    activePatients.forEach(p => {
      p.medicines.forEach(m => {
        m.schedule.forEach(s => {
          const hour = parseInt(s.time.split(":")[0], 10);
          if (!s.given && hour < currentHour) {
            list.push({ patientId: p.id, medicine: m.name, time: s.time });
          }
        });
      });
    });
    return list;
  }, [activePatients]);

  return (
    <StaffLayout allowedRoles={["nurse", "admin"]}>
      <PageHeader
        title="Nursing Station"
        description="Open a patient workspace to complete doses, post updates, and advance care status."
      />

      {overdue.length > 0 && (
        <div className="mb-6 p-3 bg-warning/10 border border-warning/20 rounded-2xl flex items-start gap-2">
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-1 rounded-2xl shadow-card">
          <CardHeader>
            <CardTitle className="text-sm">Assigned patients ({activePatients.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-2 space-y-1 max-h-[70vh] overflow-y-auto">
            {activePatients.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedId(p.id)}
                className={cn(
                  "w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors",
                  selectedId === p.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"
                )}
              >
                <p className="font-medium">{p.name}</p>
                <p className="text-xs text-muted-foreground">
                  {p.id} · {roomLabel(p)}
                </p>
              </button>
            ))}
          </CardContent>
        </Card>
        <div className="lg:col-span-3">
          {selected ? (
            <PatientWorkspace patient={selected} role="nurse" defaultTab="medications" />
          ) : (
            <Card className="rounded-2xl shadow-card">
              <CardContent className="py-16 text-center text-muted-foreground">
                <Heart className="h-10 w-10 mx-auto mb-3 opacity-30" />
                Select a patient to open their workspace
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </StaffLayout>
  );
};

export default NursePage;

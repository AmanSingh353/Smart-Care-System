import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { StaffLayout } from "@/components/StaffLayout";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { PatientWorkspace } from "@/components/patient/PatientWorkspace";
import { CareGuardPanel } from "@/components/patient/CareGuardPanel";
import { usePatients } from "@/contexts/PatientContext";
import { isPatientActive, roomLabel } from "@/data/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/dashboard/EmptyState";

const NursePage = () => {
  const { patients, getPatientById } = usePatients();
  const [params] = useSearchParams();
  const activePatients = patients.filter(isPatientActive);
  const [selectedId, setSelectedId] = useState<string | null>(
    params.get("patient") || activePatients[0]?.id || null
  );

  useEffect(() => {
    const p = params.get("patient");
    if (p) setSelectedId(p);
  }, [params]);

  const selected = selectedId ? getPatientById(selectedId) : undefined;

  const overdue = useMemo(() => {
    const list: { patientId: string; medicine: string; time: string }[] = [];
    activePatients.forEach(p => {
      p.medicines.forEach(m => {
        m.schedule.forEach(s => {
          if (s.given) return;
          if (s.dueAt && new Date(s.dueAt).getTime() < Date.now()) {
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

      <CareGuardPanel roleMode className="mb-6" compact />

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
              <CardContent className="py-12">
                <EmptyState
                  icon={Heart}
                  title="Select a patient for care tasks"
                  description="Open a patient to complete medication schedules, post nursing updates, and advance treatment status."
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </StaffLayout>
  );
};

export default NursePage;

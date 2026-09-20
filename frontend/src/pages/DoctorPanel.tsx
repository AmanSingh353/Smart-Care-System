import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { StaffLayout } from "@/components/StaffLayout";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { PatientWorkspace } from "@/components/patient/PatientWorkspace";
import { CareGuardPanel } from "@/components/patient/CareGuardPanel";
import { usePatients } from "@/contexts/PatientContext";
import { isPatientActive } from "@/data/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Stethoscope } from "lucide-react";
import { cn } from "@/lib/utils";

const DoctorPanel = () => {
  const { patients, getPatientById } = usePatients();
  const [params] = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(params.get("patient"));

  useEffect(() => {
    const p = params.get("patient");
    if (p) setSelectedId(p);
  }, [params]);

  const activePatients = patients.filter(isPatientActive);
  const selected = selectedId ? getPatientById(selectedId) : undefined;
  const defaultTab = (params.get("tab") as "overview" | "tests" | "medications" | undefined) || "overview";

  return (
    <StaffLayout allowedRoles={["doctor", "admin"]}>
      <PageHeader
        title="Doctor Workspace"
        description="Open a patient to update the unified record — CareGuard surfaces what needs review."
      />

      <CareGuardPanel roleMode className="mb-6" compact />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <Card className="rounded-2xl shadow-card">
            <CardHeader>
              <CardTitle className="text-sm">Admitted patients ({activePatients.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-2 space-y-1 max-h-[70vh] overflow-y-auto">
              {activePatients.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedId(p.id)}
                  className={cn(
                    "w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors",
                    selectedId === p.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-foreground"
                  )}
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

        <div className="lg:col-span-3">
          {selected ? (
            <PatientWorkspace patient={selected} role="doctor" defaultTab={defaultTab} />
          ) : (
            <Card className="rounded-2xl shadow-card">
              <CardContent className="py-16 text-center">
                <Stethoscope className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">Select a patient to open the unified Patient Workspace</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </StaffLayout>
  );
};

export default DoctorPanel;

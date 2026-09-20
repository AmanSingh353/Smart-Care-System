import { useMemo, useState } from "react";
import { StaffLayout } from "@/components/StaffLayout";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { PatientWorkspace } from "@/components/patient/PatientWorkspace";
import { usePatients } from "@/contexts/PatientContext";
import { isPatientActive } from "@/data/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pill } from "lucide-react";
import { cn } from "@/lib/utils";

const PharmacyPage = () => {
  const { patients, getPatientById } = usePatients();

  const withPendingRx = useMemo(
    () => patients.filter(p => isPatientActive(p) && p.medicines.some(m => !m.dispensed)),
    [patients]
  );

  const [selectedId, setSelectedId] = useState<string | null>(withPendingRx[0]?.id ?? null);
  const selected = selectedId ? getPatientById(selectedId) : undefined;

  return (
    <StaffLayout allowedRoles={["pharmacy", "admin"]}>
      <PageHeader
        title="Pharmacy"
        description="Dispense from the same prescriptions doctors write into the patient workspace."
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-1 rounded-2xl shadow-card">
          <CardHeader>
            <CardTitle className="text-sm">Pending prescriptions ({withPendingRx.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-2 space-y-1 max-h-[70vh] overflow-y-auto">
            {withPendingRx.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">Queue clear</p>
            )}
            {withPendingRx.map(p => (
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
                  {p.id} · {p.medicines.filter(m => !m.dispensed).length} pending
                </p>
              </button>
            ))}
          </CardContent>
        </Card>
        <div className="lg:col-span-3">
          {selected ? (
            <PatientWorkspace patient={selected} role="pharmacy" defaultTab="medications" />
          ) : (
            <Card className="rounded-2xl shadow-card">
              <CardContent className="py-16 text-center text-muted-foreground">
                <Pill className="h-10 w-10 mx-auto mb-3 opacity-30" />
                Select a patient with pending prescriptions
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </StaffLayout>
  );
};

export default PharmacyPage;

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { StaffLayout } from "@/components/StaffLayout";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { PatientWorkspace } from "@/components/patient/PatientWorkspace";
import { CareGuardPanel } from "@/components/patient/CareGuardPanel";
import { usePatients } from "@/contexts/PatientContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";

const LabPage = () => {
  const { patients, getPatientById } = usePatients();
  const [params] = useSearchParams();

  const withOpenTests = useMemo(
    () =>
      patients.filter(p => p.tests.some(t => t.status === "Pending" || t.status === "In Progress")),
    [patients]
  );

  const [selectedId, setSelectedId] = useState<string | null>(
    params.get("patient") || withOpenTests[0]?.id || null
  );

  useEffect(() => {
    const p = params.get("patient");
    if (p) setSelectedId(p);
  }, [params]);

  const selected = selectedId ? getPatientById(selectedId) : undefined;

  return (
    <StaffLayout allowedRoles={["lab", "admin", "doctor"]}>
      <PageHeader
        title="Laboratory"
        description="Select a patient with open tests — results publish into the shared patient record."
      />

      <CareGuardPanel roleMode className="mb-6" compact />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-1 rounded-2xl shadow-card">
          <CardHeader>
            <CardTitle className="text-sm">Open lab work ({withOpenTests.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-2 space-y-1 max-h-[70vh] overflow-y-auto">
            {withOpenTests.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">No pending tests</p>
            )}
            {withOpenTests.map(p => {
              const open = p.tests.filter(t => t.status !== "Completed");
              return (
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
                    {p.id} · {open.length} open
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {open.slice(0, 2).map(t => (
                      <StatusBadge key={t.id} status={t.status} />
                    ))}
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <div className="lg:col-span-3">
          {selected ? (
            <PatientWorkspace patient={selected} role="lab" defaultTab="tests" />
          ) : (
            <Card className="rounded-2xl shadow-card">
              <CardContent className="py-12">
                <EmptyState
                  icon={FlaskConical}
                  title="No lab work selected"
                  description="When doctors order tests, they appear here on the same patient record. Select a patient with open tests to enter results."
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </StaffLayout>
  );
};

export default LabPage;

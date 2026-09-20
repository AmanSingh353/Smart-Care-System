import { StaffLayout } from "@/components/StaffLayout";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { CareGuardSignalCard } from "@/components/patient/CareGuardPanel";
import { useCareGuard } from "@/contexts/CareGuardContext";
import { usePatients } from "@/contexts/PatientContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, AlertTriangle, ClipboardCheck, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const CareGuardDashboard = () => {
  const { summary, getRoleSignals, openSignals, resetDemoSignals } = useCareGuard();
  const { resetDemoData } = usePatients();
  const { role } = useAuth();

  const signals = role === "admin" ? openSignals : getRoleSignals();
  const priority = [...signals].sort((a, b) => {
    const order = { CRITICAL: 0, HIGH: 1, ATTENTION: 2, INFO: 3 };
    return (order[a.severity] ?? 9) - (order[b.severity] ?? 9);
  });

  const roleKeys = ["DOCTOR", "NURSE", "LAB", "PHARMACY", "BILLING"] as const;

  return (
    <StaffLayout allowedRoles={["admin", "doctor", "nurse", "lab", "pharmacy", "billing"]}>
      <PageHeader
        title="CareGuard"
        description="Attention signals across Smart Care System — human review required."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        <StatCard label="Open signals" value={summary.open} icon={Shield} />
        <StatCard label="High priority" value={summary.highPriority} icon={AlertTriangle} />
        <StatCard label="Awaiting review" value={summary.awaitingReview} icon={ClipboardCheck} />
        <StatCard label="Resolved today" value={summary.resolvedToday} icon={CheckCircle2} />
      </div>

      {role === "admin" && (
        <Card className="rounded-2xl shadow-card mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Open signals by role</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {roleKeys.map(r => (
                <div key={r} className="rounded-xl bg-muted/40 px-3 py-2.5 text-center">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                    {r}
                  </p>
                  <p className="text-lg font-bold text-foreground tabular-nums">
                    {summary.byRole[r] || 0}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  resetDemoData();
                  setTimeout(() => resetDemoSignals(), 50);
                }}
              >
                Reset CareGuard demo
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Priority signals
        </h3>
        <span className="text-xs text-muted-foreground">{priority.length} active</span>
      </div>

      {priority.length === 0 ? (
        <Card className="rounded-2xl shadow-card">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            CareGuard found no active workflow or safety signals.
          </CardContent>
        </Card>
      ) : (
        <div className={cn("grid gap-3", "md:grid-cols-2")}>
          {priority.map(s => (
            <CareGuardSignalCard key={s.id} signal={s} />
          ))}
        </div>
      )}
    </StaffLayout>
  );
};

export default CareGuardDashboard;

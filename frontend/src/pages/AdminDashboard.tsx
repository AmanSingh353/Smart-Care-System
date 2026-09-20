import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { PatientWorkspace } from "@/components/patient/PatientWorkspace";
import { getJourneyStages } from "@/components/patient/workspaceUtils";
import { usePatients } from "@/contexts/PatientContext";
import { useCareGuard } from "@/contexts/CareGuardContext";
import { getBillTotal, isPatientActive, roomLabel } from "@/data/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  Activity,
  FlaskConical,
  Pill,
  Receipt,
  IndianRupee,
  ArrowLeft,
  AlertTriangle,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import { StaffLayout } from "@/components/StaffLayout";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";

const AdminDashboard = () => {
  const { patients, getPatientById, updateFamilyRequestStatus, resetDemoData } = usePatients();
  const { summary, resetDemoSignals } = useCareGuard();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const activePatients = patients.filter(isPatientActive);
  const underTreatment = patients.filter(p =>
    ["Under Treatment", "Awaiting Test", "Admitted"].includes(p.treatmentStatus)
  ).length;
  const pendingTests = patients.reduce(
    (n, p) => n + p.tests.filter(t => t.status === "Pending" || t.status === "In Progress").length,
    0
  );
  const pendingMeds = patients.reduce((n, p) => n + p.medicines.filter(m => !m.dispensed).length, 0);
  const unpaidBills = patients.filter(p => p.billStatus === "Unpaid");
  const paidBills = patients.filter(p => p.billStatus === "Paid");
  const revenue = paidBills.reduce((s, p) => s + getBillTotal(p.billItems), 0);
  const unpaidTotal = unpaidBills.reduce((s, p) => s + getBillTotal(p.billItems), 0);

  const recentActivity = patients
    .flatMap(p =>
      p.notifications.map(n => ({
        patientId: p.id,
        patientName: p.name,
        message: n.message,
        time: n.time,
        id: n.id,
      }))
    )
    .sort((a, b) => b.id.localeCompare(a.id))
    .slice(0, 10);

  const pendingRequests = patients.flatMap(p =>
    p.requests.filter(r => r.status === "Pending").map(r => ({ patient: p, request: r }))
  );

  const delayedPatients = useMemo(() => {
    return activePatients
      .map(p => {
        const stages = getJourneyStages(p);
        const current = stages.find(s => s.state === "current");
        const blocked = stages.filter(s => s.state === "blocked");
        const pendingTestCount = p.tests.filter(t => t.status === "Pending" || t.status === "In Progress").length;
        const pendingMedCount = p.medicines.filter(m => !m.dispensed).length;
        const attention =
          blocked.length > 0 ||
          pendingTestCount > 0 ||
          pendingMedCount > 0 ||
          p.billStatus === "Unpaid";
        return {
          patient: p,
          currentLabel: current?.label ?? p.treatmentStatus,
          blocked,
          pendingTestCount,
          pendingMedCount,
          attention,
        };
      })
      .filter(row => row.attention);
  }, [activePatients]);

  const selected = selectedId ? getPatientById(selectedId) : undefined;

  if (selected) {
    return (
      <StaffLayout allowedRoles={["admin"]}>
        <div className="mb-4">
          <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)} className="gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            Back to command overview
          </Button>
        </div>
        <PatientWorkspace patient={selected} role="admin" />
      </StaffLayout>
    );
  }

  return (
    <StaffLayout allowedRoles={["admin"]}>
      <PageHeader
        title="Hospital Command"
        description="Live overview derived from the shared patient record across every department."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        <StatCard label="Total patients" value={patients.length} icon={Users} />
        <StatCard label="Active / admitted" value={activePatients.length} icon={Activity} hint="Not discharged" />
        <StatCard label="Active treatments" value={underTreatment} icon={Activity} />
        <StatCard label="Pending tests" value={pendingTests} icon={FlaskConical} />
        <StatCard label="Pending medicines" value={pendingMeds} icon={Pill} />
        <StatCard label="Unpaid bills" value={unpaidBills.length} icon={Receipt} />
        <StatCard label="Paid bills" value={paidBills.length} icon={Receipt} />
        <StatCard label="Revenue collected" value={`₹${revenue.toLocaleString("en-IN")}`} icon={IndianRupee} />
      </div>

      <Card className="rounded-2xl shadow-card mb-6 border-primary/20">
        <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            CareGuard summary
          </CardTitle>
          <Button asChild size="sm" variant="outline">
            <Link to="/careguard">Open CareGuard</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="rounded-xl bg-muted/40 px-3 py-2">
              <p className="text-[10px] uppercase text-muted-foreground font-semibold">Open</p>
              <p className="text-lg font-bold tabular-nums">{summary.open}</p>
            </div>
            <div className="rounded-xl bg-muted/40 px-3 py-2">
              <p className="text-[10px] uppercase text-muted-foreground font-semibold">High priority</p>
              <p className="text-lg font-bold tabular-nums">{summary.highPriority}</p>
            </div>
            <div className="rounded-xl bg-muted/40 px-3 py-2">
              <p className="text-[10px] uppercase text-muted-foreground font-semibold">Need review</p>
              <p className="text-lg font-bold tabular-nums">{summary.awaitingReview}</p>
            </div>
            <div className="rounded-xl bg-muted/40 px-3 py-2">
              <p className="text-[10px] uppercase text-muted-foreground font-semibold">Resolved today</p>
              <p className="text-lg font-bold tabular-nums">{summary.resolvedToday}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {(["DOCTOR", "NURSE", "LAB", "PHARMACY", "BILLING"] as const).map(r => (
              <div key={r} className="rounded-xl border border-border/60 px-2 py-2 text-center">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{r}</p>
                <p className="text-sm font-bold tabular-nums">{summary.byRole[r] || 0}</p>
              </div>
            ))}
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="mt-3"
            onClick={() => {
              if (
                !window.confirm(
                  "Reset DEMO DATA only?\n\nThis restores fictional patients, workflows, and CareGuard signals. It does not touch any production database."
                )
              ) {
                return;
              }
              resetDemoData();
              setTimeout(() => resetDemoSignals(), 50);
            }}
          >
            Reset Demo Data
          </Button>
        </CardContent>
      </Card>

      {delayedPatients.length > 0 && (
        <Card className="rounded-2xl shadow-card mb-6 border-warning/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Operational attention
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {delayedPatients.slice(0, 8).map(row => (
              <button
                key={row.patient.id}
                type="button"
                onClick={() => setSelectedId(row.patient.id)}
                className="w-full text-left flex flex-wrap items-center justify-between gap-2 text-sm bg-muted/40 hover:bg-muted/70 rounded-xl px-3 py-2.5 transition-colors"
              >
                <div>
                  <span className="font-medium text-primary">{row.patient.id}</span>
                  <span className="ml-2">{row.patient.name}</span>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Stage: {row.currentLabel}
                    {row.pendingTestCount > 0 && ` · ${row.pendingTestCount} pending test(s)`}
                    {row.pendingMedCount > 0 && ` · ${row.pendingMedCount} pending med(s)`}
                    {row.patient.billStatus === "Unpaid" && " · unpaid bill"}
                  </p>
                </div>
                <StatusBadge status={row.patient.treatmentStatus} />
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2 rounded-2xl shadow-card">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Patients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-3 font-medium text-muted-foreground">ID</th>
                    <th className="pb-3 font-medium text-muted-foreground">Name</th>
                    <th className="pb-3 font-medium text-muted-foreground hidden md:table-cell">Doctor</th>
                    <th className="pb-3 font-medium text-muted-foreground hidden sm:table-cell">Location</th>
                    <th className="pb-3 font-medium text-muted-foreground">Status</th>
                    <th className="pb-3 font-medium text-muted-foreground text-right">Bill</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map(p => (
                    <tr
                      key={p.id}
                      className={cn(
                        "border-b border-border/50 last:border-0 cursor-pointer hover:bg-muted/40 transition-colors"
                      )}
                      onClick={() => setSelectedId(p.id)}
                    >
                      <td className="py-3 font-medium text-primary">{p.id}</td>
                      <td className="py-3">{p.name}</td>
                      <td className="py-3 hidden md:table-cell text-muted-foreground text-xs">{p.assignedDoctor}</td>
                      <td className="py-3 hidden sm:table-cell text-muted-foreground text-xs">{roomLabel(p)}</td>
                      <td className="py-3">
                        <StatusBadge status={p.treatmentStatus} />
                      </td>
                      <td className="py-3 text-right">
                        <span className="block tabular-nums">₹{getBillTotal(p.billItems).toLocaleString("en-IN")}</span>
                        <span className="text-[10px] text-muted-foreground">{p.billStatus}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Outstanding receivables: ₹{unpaidTotal.toLocaleString("en-IN")} · Click a row to open Patient Workspace
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-card">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[420px] overflow-y-auto">
            {recentActivity.length === 0 && <p className="text-sm text-muted-foreground">No activity yet</p>}
            {recentActivity.map(a => (
              <button
                key={a.id}
                type="button"
                onClick={() => setSelectedId(a.patientId)}
                className="w-full text-left text-sm border-b border-border/50 last:border-0 pb-2 hover:opacity-80"
              >
                <p className="text-foreground leading-snug">{a.message}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {a.patientId} · {a.patientName} · {a.time}
                </p>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      {pendingRequests.length > 0 && (
        <Card className="rounded-2xl shadow-card">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Family requests pending</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingRequests.map(({ patient, request }) => (
              <div
                key={request.id}
                className="flex flex-wrap items-center justify-between gap-2 text-sm bg-muted/40 rounded-xl px-3 py-2"
              >
                <button
                  type="button"
                  className="text-left hover:underline"
                  onClick={() => setSelectedId(patient.id)}
                >
                  <span className="text-primary font-medium">{patient.id}</span>
                  <span className="ml-2">
                    {request.type}: {request.reason}
                  </span>
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="text-xs font-semibold text-success hover:underline"
                    onClick={() => updateFamilyRequestStatus(patient.id, request.id, "Approved")}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="text-xs font-semibold text-destructive hover:underline"
                    onClick={() => updateFamilyRequestStatus(patient.id, request.id, "Rejected")}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </StaffLayout>
  );
};

export default AdminDashboard;

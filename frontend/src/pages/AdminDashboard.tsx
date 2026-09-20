import { StaffLayout } from "@/components/StaffLayout";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { CareGuardPanel } from "@/components/patient/CareGuardPanel";
import { usePatients } from "@/contexts/PatientContext";
import { getBillTotal, isPatientActive, roomLabel } from "@/data/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Activity, FlaskConical, Pill, Receipt, IndianRupee } from "lucide-react";

const AdminDashboard = () => {
  const { patients, updateFamilyRequestStatus } = usePatients();
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

      <CareGuardPanel className="mb-6" />

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
                    <tr key={p.id} className="border-b border-border/50 last:border-0">
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
              Outstanding receivables: ₹{unpaidTotal.toLocaleString("en-IN")}
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
              <div key={a.id} className="text-sm border-b border-border/50 last:border-0 pb-2">
                <p className="text-foreground leading-snug">{a.message}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {a.patientId} · {a.patientName} · {a.time}
                </p>
              </div>
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
                <div>
                  <span className="text-primary font-medium">{patient.id}</span>
                  <span className="ml-2">
                    {request.type}: {request.reason}
                  </span>
                </div>
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

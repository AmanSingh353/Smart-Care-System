import { StaffLayout } from "@/components/StaffLayout";
import { usePatients } from "@/contexts/PatientContext";
import { getBillTotal, isPatientActive, roomLabel } from "@/data/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

  const metrics = [
    { label: "Total patients", value: patients.length, icon: Users, tone: "bg-primary/10 text-primary" },
    { label: "Admitted / active", value: activePatients.length, icon: Activity, tone: "bg-success/10 text-success" },
    { label: "Active treatments", value: underTreatment, icon: Activity, tone: "bg-info/10 text-info" },
    { label: "Pending tests", value: pendingTests, icon: FlaskConical, tone: "bg-warning/10 text-warning" },
    { label: "Pending medicines", value: pendingMeds, icon: Pill, tone: "bg-warning/10 text-warning" },
    { label: "Unpaid bills", value: unpaidBills.length, icon: Receipt, tone: "bg-destructive/10 text-destructive" },
    { label: "Paid bills", value: paidBills.length, icon: Receipt, tone: "bg-success/10 text-success" },
    { label: "Revenue collected", value: `₹${revenue.toLocaleString("en-IN")}`, icon: IndianRupee, tone: "bg-primary/10 text-primary" },
  ];

  return (
    <StaffLayout allowedRoles={["admin"]}>
      <h2 className="text-xl font-bold text-foreground mb-2">Admin Dashboard</h2>
      <p className="text-sm text-muted-foreground mb-6">Hospital overview from live shared patient state</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {metrics.map(m => (
          <Card key={m.label}>
            <CardContent className="pt-4 flex items-start gap-3">
              <div className={`h-9 w-9 rounded-md flex items-center justify-center shrink-0 ${m.tone}`}>
                <m.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground leading-tight">{m.label}</p>
                <p className="text-lg font-bold text-foreground truncate">{m.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Patients</CardTitle>
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
                        <Badge variant={p.treatmentStatus === "Discharged" ? "outline" : "secondary"} className="text-xs">
                          {p.treatmentStatus}
                        </Badge>
                      </td>
                      <td className="py-3 text-right">
                        <span className="block">₹{getBillTotal(p.billItems).toLocaleString("en-IN")}</span>
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

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent activity</CardTitle>
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
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Family requests pending</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingRequests.map(({ patient, request }) => (
              <div key={request.id} className="flex flex-wrap items-center justify-between gap-2 text-sm bg-muted/40 rounded-md px-3 py-2">
                <div>
                  <span className="text-primary font-medium">{patient.id}</span>
                  <span className="ml-2">
                    {request.type}: {request.reason}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="text-xs text-success hover:underline"
                    onClick={() => updateFamilyRequestStatus(patient.id, request.id, "Approved")}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="text-xs text-destructive hover:underline"
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

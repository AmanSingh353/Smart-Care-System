import { StaffLayout } from "@/components/StaffLayout";
import { usePatients } from "@/contexts/PatientContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

const AdminDashboard = () => {
  const { patients } = usePatients();
  const activePatients = patients.filter(p => p.status === "Active");

  const getBillTotal = (p: typeof patients[0]) =>
    p.billItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  return (
    <StaffLayout>
      <h2 className="text-xl font-bold text-foreground mb-6">Admin Dashboard</h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Patients Today</p>
              <p className="text-2xl font-bold text-foreground">{patients.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-success/10 flex items-center justify-center">
              <Users className="h-6 w-6 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active</p>
              <p className="text-2xl font-bold text-foreground">{activePatients.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-warning/10 flex items-center justify-center">
              <Users className="h-6 w-6 text-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Discharged</p>
              <p className="text-2xl font-bold text-foreground">{patients.length - activePatients.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Current Patients</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-3 font-medium text-muted-foreground">Patient ID</th>
                  <th className="pb-3 font-medium text-muted-foreground">Name</th>
                  <th className="pb-3 font-medium text-muted-foreground hidden sm:table-cell">Age</th>
                  <th className="pb-3 font-medium text-muted-foreground hidden md:table-cell">Gender</th>
                  <th className="pb-3 font-medium text-muted-foreground hidden md:table-cell">Mobile</th>
                  <th className="pb-3 font-medium text-muted-foreground">Status</th>
                  <th className="pb-3 font-medium text-muted-foreground text-right">Total Bill</th>
                  <th className="pb-3 font-medium text-muted-foreground text-center">State</th>
                </tr>
              </thead>
              <tbody>
                {patients.map(p => (
                  <tr key={p.id} className="border-b border-border/50 last:border-0">
                    <td className="py-3 font-medium text-primary">{p.id}</td>
                    <td className="py-3 text-foreground">{p.name}</td>
                    <td className="py-3 hidden sm:table-cell text-foreground">{p.age}</td>
                    <td className="py-3 hidden md:table-cell text-foreground">{p.gender}</td>
                    <td className="py-3 hidden md:table-cell text-foreground">{p.mobile}</td>
                    <td className="py-3">
                      <Badge variant="secondary" className="text-xs">{p.visitType}</Badge>
                    </td>
                    <td className="py-3 text-right text-foreground">₹{getBillTotal(p).toLocaleString("en-IN")}</td>
                    <td className="py-3 text-center">
                      <Badge variant={p.status === "Active" ? "default" : "outline"} className="text-xs">
                        {p.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </StaffLayout>
  );
};

export default AdminDashboard;

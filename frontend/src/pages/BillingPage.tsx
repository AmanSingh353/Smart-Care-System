import { useState } from "react";
import { StaffLayout } from "@/components/StaffLayout";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { PatientWorkspace } from "@/components/patient/PatientWorkspace";
import { usePatients } from "@/contexts/PatientContext";
import { getBillTotal } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Receipt, Search } from "lucide-react";
import { cn } from "@/lib/utils";

const BillingPage = () => {
  const { patients, getPatientById } = usePatients();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filtered = patients.filter(
    p =>
      p.id.toLowerCase().includes(search.toLowerCase()) ||
      p.name.toLowerCase().includes(search.toLowerCase())
  );
  const selected = selectedId ? getPatientById(selectedId) : undefined;

  const totalRevenue = patients
    .filter(p => p.billStatus === "Paid")
    .reduce((sum, p) => sum + getBillTotal(p.billItems ?? []), 0);
  const unpaidCount = patients.filter(p => p.billStatus === "Unpaid").length;

  return (
    <StaffLayout allowedRoles={["billing", "admin"]}>
      <PageHeader
        title="Billing & Payments"
        description="Charges stay linked to care actions — open a patient workspace to review and collect."
      />

      <div className="grid grid-cols-2 gap-3 mb-6 max-w-md">
        <Card className="rounded-2xl shadow-card">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Unpaid bills</p>
            <p className="text-xl font-bold">{unpaidCount}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-card">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Collected revenue</p>
            <p className="text-xl font-bold text-primary">₹{totalRevenue.toLocaleString("en-IN")}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search Patient ID or name"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 rounded-xl"
            />
          </div>
          <div className="space-y-1">
            {filtered.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No patients match</p>
            )}
            {filtered.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedId(p.id)}
                className={cn(
                  "w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors",
                  selectedId === p.id ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium truncate">
                    {p.id} – {p.name}
                  </span>
                  <Badge variant={p.billStatus === "Paid" ? "outline" : "default"} className="text-xs shrink-0 rounded-full">
                    {p.billStatus}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
                  ₹{getBillTotal(p.billItems ?? []).toLocaleString("en-IN")}
                </p>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2">
          {selected ? (
            <PatientWorkspace patient={selected} role="billing" defaultTab="billing" />
          ) : (
            <Card className="rounded-2xl shadow-card">
              <CardContent className="py-16 text-center">
                <Receipt className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">Select a patient to open billing in their workspace</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </StaffLayout>
  );
};

export default BillingPage;

import { useState } from "react";
import { StaffLayout } from "@/components/StaffLayout";
import { PatientDetails } from "@/components/PatientDetails";
import { usePatients } from "@/contexts/PatientContext";
import { getBillTotal } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Receipt, Search } from "lucide-react";

const BillingPage = () => {
  const { patients, getPatientById, updatePaymentStatus } = usePatients();
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
      <h2 className="text-xl font-bold text-foreground mb-6">Billing & Payments</h2>

      <div className="grid grid-cols-2 gap-3 mb-6 max-w-md">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Unpaid bills</p>
            <p className="text-xl font-bold">{unpaidCount}</p>
          </CardContent>
        </Card>
        <Card>
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
              className="pl-9"
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
                className={`w-full text-left px-3 py-2.5 rounded-md text-sm transition-colors ${
                  selectedId === p.id ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium truncate">
                    {p.id} – {p.name}
                  </span>
                  <Badge variant={p.billStatus === "Paid" ? "outline" : "default"} className="text-xs shrink-0">
                    {p.billStatus}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  ₹{getBillTotal(p.billItems ?? []).toLocaleString("en-IN")}
                </p>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {selected ? (
            <>
              <PatientDetails patient={selected} compact />
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">Invoice – {selected.id}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {selected.name} · {new Date(selected.admissionDate).toLocaleDateString("en-IN")}
                      </p>
                    </div>
                    <Badge variant={selected.billStatus === "Paid" ? "outline" : "default"}>
                      {selected.billStatus}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {(selected.billItems?.length ?? 0) === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">No billing items</p>
                  ) : (
                    <table className="w-full text-sm mb-4">
                      <thead>
                        <tr className="border-b border-border text-left">
                          <th className="pb-2 font-medium text-muted-foreground">Item</th>
                          <th className="pb-2 font-medium text-muted-foreground">Category</th>
                          <th className="pb-2 font-medium text-muted-foreground text-right">Price</th>
                          <th className="pb-2 font-medium text-muted-foreground text-right">Qty</th>
                          <th className="pb-2 font-medium text-muted-foreground text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selected.billItems.map(item => (
                          <tr key={item.id} className="border-b border-border/50 last:border-0">
                            <td className="py-2">{item.description}</td>
                            <td className="py-2 capitalize text-muted-foreground">{item.category}</td>
                            <td className="py-2 text-right">₹{item.unitPrice}</td>
                            <td className="py-2 text-right">{item.quantity}</td>
                            <td className="py-2 text-right font-medium">
                              ₹{(item.unitPrice * item.quantity).toLocaleString("en-IN")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-border">
                          <td colSpan={4} className="pt-3 font-bold">
                            Grand Total
                          </td>
                          <td className="pt-3 text-right font-bold text-primary text-lg">
                            ₹{getBillTotal(selected.billItems).toLocaleString("en-IN")}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  )}

                  {selected.billStatus === "Unpaid" && (
                    <Button onClick={() => updatePaymentStatus(selected.id, "Paid")} className="w-full">
                      Mark as Paid
                    </Button>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-16 text-center">
                <Receipt className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">Select a patient to view their bill</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </StaffLayout>
  );
};

export default BillingPage;

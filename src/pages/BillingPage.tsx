import { useState } from "react";
import { StaffLayout } from "@/components/StaffLayout";
import { usePatients } from "@/contexts/PatientContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Receipt, Search } from "lucide-react";

const BillingPage = () => {
  const { patients, markBillPaid } = usePatients();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filtered = patients.filter(p => p.id.toLowerCase().includes(search.toLowerCase()) || p.name.toLowerCase().includes(search.toLowerCase()));
  const selected = patients.find(p => p.id === selectedId);

  const getBillTotal = (items: typeof patients[0]["billItems"]) =>
    items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

  const totalRevenue = patients.filter(p => p.billStatus === "Paid").reduce((sum, p) => sum + getBillTotal(p.billItems), 0);

  return (
    <StaffLayout>
      <h2 className="text-xl font-bold text-foreground mb-6">Billing & Payments</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patient list */}
        <div className="lg:col-span-1 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by Patient ID or name" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="space-y-1">
            {filtered.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className={`w-full text-left px-3 py-2.5 rounded-md text-sm transition-colors ${selectedId === p.id ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground"}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{p.id} – {p.name}</span>
                  <Badge variant={p.billStatus === "Paid" ? "outline" : "default"} className="text-xs">
                    {p.billStatus}
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Bill details */}
        <div className="lg:col-span-2 space-y-4">
          {selected ? (
            <Card className="animate-fade-in">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Invoice – {selected.id}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{selected.name} · {new Date(selected.registeredAt).toLocaleDateString("en-IN")}</p>
                  </div>
                  <Badge variant={selected.billStatus === "Paid" ? "outline" : "default"} className="text-xs">
                    {selected.billStatus}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm mb-4">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="pb-2 font-medium text-muted-foreground">Description</th>
                      <th className="pb-2 font-medium text-muted-foreground text-right">Unit Price</th>
                      <th className="pb-2 font-medium text-muted-foreground text-right">Qty</th>
                      <th className="pb-2 font-medium text-muted-foreground text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.billItems.map((item, i) => (
                      <tr key={i} className="border-b border-border/50 last:border-0">
                        <td className="py-2 text-foreground">{item.description}</td>
                        <td className="py-2 text-right text-foreground">₹{item.unitPrice}</td>
                        <td className="py-2 text-right text-foreground">{item.quantity}</td>
                        <td className="py-2 text-right font-medium text-foreground">₹{(item.unitPrice * item.quantity).toLocaleString("en-IN")}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border">
                      <td colSpan={3} className="pt-3 font-bold text-foreground">Grand Total</td>
                      <td className="pt-3 text-right font-bold text-primary text-lg">₹{getBillTotal(selected.billItems).toLocaleString("en-IN")}</td>
                    </tr>
                  </tfoot>
                </table>

                {selected.billStatus === "Unpaid" && (
                  <Button onClick={() => markBillPaid(selected.id)} className="w-full">Mark as Paid</Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-16 text-center">
                <Receipt className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">Select a patient to view their bill</p>
              </CardContent>
            </Card>
          )}

          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-4 flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Total Revenue Today</span>
              <span className="text-lg font-bold text-primary">₹{totalRevenue.toLocaleString("en-IN")}</span>
            </CardContent>
          </Card>
        </div>
      </div>
    </StaffLayout>
  );
};

export default BillingPage;

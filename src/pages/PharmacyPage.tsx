import { useState } from "react";
import { StaffLayout } from "@/components/StaffLayout";
import { usePatients } from "@/contexts/PatientContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, CheckCircle } from "lucide-react";

const PharmacyPage = () => {
  const { patients, dispenseMedicine } = usePatients();

  const pending: { patientId: string; patientName: string; medicines: { id: string; name: string; dosage: string; quantity: string }[] }[] = [];
  const ready: typeof pending = [];

  patients.filter(p => p.status === "Active").forEach(p => {
    const pendingMeds = p.medicines.filter(m => !m.dispensed);
    const readyMeds = p.medicines.filter(m => m.dispensed);
    if (pendingMeds.length > 0) {
      pending.push({
        patientId: p.id,
        patientName: p.name,
        medicines: pendingMeds.map(m => ({ id: m.id, name: m.name, dosage: m.dosage, quantity: m.duration })),
      });
    }
    if (readyMeds.length > 0) {
      ready.push({
        patientId: p.id,
        patientName: p.name,
        medicines: readyMeds.map(m => ({ id: m.id, name: m.name, dosage: m.dosage, quantity: m.duration })),
      });
    }
  });

  return (
    <StaffLayout>
      <h2 className="text-xl font-bold text-foreground mb-6">Pending & Prepared Medicines</h2>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending Prescriptions ({pending.length})</TabsTrigger>
          <TabsTrigger value="ready">Ready for Collection ({ready.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4 space-y-3">
          {pending.length === 0 && (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No pending prescriptions</CardContent></Card>
          )}
          {pending.map(entry => (
            <Card key={entry.patientId} className="animate-fade-in">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="font-medium text-primary text-sm">{entry.patientId}</span>
                    <span className="text-foreground text-sm ml-2">{entry.patientName}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {entry.medicines.map(m => (
                    <div key={m.id} className="flex items-center justify-between bg-muted/50 rounded-md px-3 py-2 text-sm">
                      <div>
                        <span className="text-foreground font-medium">{m.name}</span>
                        <span className="text-muted-foreground ml-2">{m.dosage} · {m.quantity} days</span>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => dispenseMedicine(entry.patientId, m.id)} className="gap-1">
                        <Package className="h-3.5 w-3.5" /> Mark as Packed
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="ready" className="mt-4 space-y-3">
          {ready.length === 0 && (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No medicines ready yet</CardContent></Card>
          )}
          {ready.map(entry => (
            <Card key={entry.patientId} className="animate-fade-in">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="font-medium text-primary text-sm">{entry.patientId}</span>
                    <span className="text-foreground text-sm ml-2">{entry.patientName}</span>
                  </div>
                  <Badge className="bg-success/10 text-success border-success/20 gap-1">
                    <CheckCircle className="h-3 w-3" /> Ready
                  </Badge>
                </div>
                <div className="space-y-1">
                  {entry.medicines.map(m => (
                    <div key={m.id} className="text-sm text-foreground px-3 py-1.5">
                      {m.name} – {m.dosage} · {m.quantity} days
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </StaffLayout>
  );
};

export default PharmacyPage;

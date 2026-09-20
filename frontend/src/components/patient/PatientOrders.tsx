import { Patient, getBillTotal } from "@/data/mockData";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FlaskConical, Pill, Heart, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";

interface PatientOrdersProps {
  patient: Patient;
  familyMode?: boolean;
  className?: string;
}

export function PatientOrders({ patient, familyMode = false, className }: PatientOrdersProps) {
  const tests = patient.tests ?? [];
  const meds = patient.medicines ?? [];
  const pendingDoses = meds.flatMap(m =>
    (m.schedule ?? [])
      .filter(s => !s.given)
      .map(s => ({ med: m.name, time: s.time, id: `${m.id}-${s.time}` }))
  );

  return (
    <Card className={cn("rounded-2xl shadow-card", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Orders & results</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {tests.length === 0 && meds.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">No orders yet</p>
        )}

        {tests.map(t => (
          <div key={t.id} className="flex items-start gap-3 rounded-xl bg-muted/40 px-3 py-2.5 text-sm">
            <FlaskConical className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground mr-2">Lab</span>
                  {t.name}
                </p>
                <StatusBadge status={t.status} />
              </div>
              {t.result && <p className="text-xs text-muted-foreground mt-1">{t.result}</p>}
              {!familyMode && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  Requested {t.requestedAt}
                  {t.completedAt ? ` · Completed ${t.completedAt}` : ""}
                </p>
              )}
            </div>
          </div>
        ))}

        {meds.map(m => (
          <div key={m.id} className="flex items-start gap-3 rounded-xl bg-muted/40 px-3 py-2.5 text-sm">
            <Pill className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground mr-2">Pharmacy</span>
                  {m.name}
                </p>
                <StatusBadge status={m.dispensed ? "Completed" : "Pending"} />
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {m.dosage} · {m.frequency}
                {!familyMode ? ` · ${m.duration} days` : ""}
              </p>
            </div>
          </div>
        ))}

        {!familyMode &&
          pendingDoses.slice(0, 4).map(d => (
            <div key={d.id} className="flex items-start gap-3 rounded-xl bg-muted/40 px-3 py-2.5 text-sm">
              <Heart className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1 flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground mr-2">Nursing</span>
                  {d.med} @ {d.time}
                </p>
                <StatusBadge status="Pending" />
              </div>
            </div>
          ))}

        {familyMode &&
          pendingDoses.slice(0, 4).map(d => (
            <div key={d.id} className="flex items-start gap-3 rounded-xl bg-muted/40 px-3 py-2.5 text-sm">
              <Heart className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1 flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground mr-2">Care</span>
                  {d.med} scheduled {d.time}
                </p>
                <StatusBadge status="Pending" />
              </div>
            </div>
          ))}

        <div className="flex items-start gap-3 rounded-xl bg-muted/40 px-3 py-2.5 text-sm">
          <Receipt className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1 flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground mr-2">Billing</span>
              Current balance ₹{getBillTotal(patient.billItems ?? []).toLocaleString("en-IN")}
            </p>
            <StatusBadge status={patient.billStatus} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

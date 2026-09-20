import { Patient } from "@/data/mockData";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MedicationListProps {
  patient: Patient;
  className?: string;
}

export function MedicationList({ patient, className }: MedicationListProps) {
  const meds = patient.medicines ?? [];

  return (
    <Card className={cn("rounded-2xl shadow-card", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Medications</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {meds.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No medicines prescribed</p>}
        {meds.map(m => (
          <div key={m.id} className="rounded-xl bg-muted/40 px-3 py-2.5 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">
                {m.name} <span className="font-normal text-muted-foreground">{m.dosage}</span>
              </p>
              <StatusBadge status={m.dispensed ? "Completed" : "Pending"} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {m.frequency} · {m.duration} days
            </p>
            {(m.schedule?.length ?? 0) > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {m.schedule.map(s => (
                  <span
                    key={s.time}
                    className={cn(
                      "text-[10px] font-medium rounded-full px-2 py-0.5 border",
                      s.given
                        ? "bg-success/10 text-success border-success/20"
                        : "bg-muted text-muted-foreground border-transparent"
                    )}
                  >
                    {s.time} {s.given ? "· given" : "· due"}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

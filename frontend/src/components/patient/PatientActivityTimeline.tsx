import { Patient } from "@/data/mockData";
import { buildPatientActivity } from "./workspaceUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PatientActivityTimelineProps {
  patient: Patient;
  className?: string;
  limit?: number;
}

const sourceTone: Record<string, string> = {
  registration: "bg-info",
  clinical: "bg-primary",
  lab: "bg-warning",
  pharmacy: "bg-accent",
  nurse: "bg-success",
  billing: "bg-destructive",
  family: "bg-muted-foreground",
  system: "bg-muted-foreground",
};

export function PatientActivityTimeline({ patient, className, limit = 20 }: PatientActivityTimelineProps) {
  const events = buildPatientActivity(patient).slice(0, limit);

  return (
    <Card className={cn("rounded-2xl shadow-card", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Activity timeline</CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No activity yet</p>
        ) : (
          <ol className="relative space-y-0 border-l border-border ml-2">
            {events.map(e => (
              <li key={e.id} className="relative pl-5 pb-4 last:pb-0">
                <span
                  className={cn(
                    "absolute -left-1.5 top-1.5 h-3 w-3 rounded-full border-2 border-card",
                    sourceTone[e.source] || "bg-muted-foreground"
                  )}
                />
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="text-xs font-bold tabular-nums text-muted-foreground">{e.time}</span>
                  <span className="text-sm font-semibold text-foreground">{e.title}</span>
                </div>
                {e.detail && <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{e.detail}</p>}
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

import { PatientStatus } from "@/data/mockData";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

const JOURNEY: { key: string; label: string; match: PatientStatus[] }[] = [
  { key: "reg", label: "Registration", match: ["Registered", "Admitted", "Under Treatment", "Awaiting Test", "Ready for Discharge", "Discharged"] },
  { key: "admit", label: "Admission", match: ["Admitted", "Under Treatment", "Awaiting Test", "Ready for Discharge", "Discharged"] },
  { key: "treat", label: "Treatment", match: ["Under Treatment", "Awaiting Test", "Ready for Discharge", "Discharged"] },
  { key: "lab", label: "Lab", match: ["Awaiting Test", "Under Treatment", "Ready for Discharge", "Discharged"] },
  { key: "rx", label: "Pharmacy", match: ["Under Treatment", "Ready for Discharge", "Discharged"] },
  { key: "bill", label: "Billing", match: ["Ready for Discharge", "Discharged"] },
  { key: "out", label: "Discharge", match: ["Discharged"] },
];

interface PatientJourneyProps {
  status: PatientStatus;
  className?: string;
}

export function PatientJourney({ status, className }: PatientJourneyProps) {
  const activeIndex = (() => {
    const order: PatientStatus[] = [
      "Registered",
      "Admitted",
      "Under Treatment",
      "Awaiting Test",
      "Ready for Discharge",
      "Discharged",
    ];
    return Math.max(0, order.indexOf(status));
  })();

  return (
    <div className={cn("rounded-2xl border border-border bg-card p-4 md:p-5 shadow-card", className)}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">Patient journey</p>
      <div className="flex gap-1 overflow-x-auto pb-1">
        {JOURNEY.map((step, i) => {
          const done = step.match.includes(status) && i <= activeIndex + 1;
          const current =
            (status === "Registered" && step.key === "reg") ||
            (status === "Admitted" && step.key === "admit") ||
            (status === "Under Treatment" && step.key === "treat") ||
            (status === "Awaiting Test" && step.key === "lab") ||
            (status === "Ready for Discharge" && step.key === "bill") ||
            (status === "Discharged" && step.key === "out");

          return (
            <div key={step.key} className="flex items-center min-w-0 flex-1">
              <div className="flex flex-col items-center gap-1.5 min-w-[4.5rem] flex-1">
                <div
                  className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold border transition-colors",
                    current
                      ? "bg-primary text-primary-foreground border-primary"
                      : done
                        ? "bg-primary/15 text-primary border-primary/20"
                        : "bg-muted text-muted-foreground border-transparent"
                  )}
                >
                  {done && !current ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </div>
                <span
                  className={cn(
                    "text-[10px] md:text-xs text-center leading-tight",
                    current ? "font-semibold text-foreground" : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>
              {i < JOURNEY.length - 1 && (
                <div className={cn("h-px w-2 md:w-4 shrink-0 mb-5", done ? "bg-primary/40" : "bg-border")} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

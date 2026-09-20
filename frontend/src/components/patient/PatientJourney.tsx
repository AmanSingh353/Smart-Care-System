import { Patient } from "@/data/mockData";
import { getJourneyStages, JourneyStageState } from "./workspaceUtils";
import { cn } from "@/lib/utils";
import { Check, Circle, Lock } from "lucide-react";

interface PatientJourneyProps {
  patient: Patient;
  className?: string;
}

function StageIcon({ state }: { state: JourneyStageState }) {
  if (state === "completed") return <Check className="h-3.5 w-3.5" />;
  if (state === "blocked") return <Lock className="h-3.5 w-3.5" />;
  if (state === "current") return <Circle className="h-3.5 w-3.5 fill-current" />;
  return <span className="h-1.5 w-1.5 rounded-full bg-current opacity-40" />;
}

export function PatientJourney({ patient, className }: PatientJourneyProps) {
  const stages = getJourneyStages(patient);

  return (
    <div className={cn("rounded-2xl border border-border bg-card p-4 md:p-5 shadow-card", className)}>
      <div className="flex items-center justify-between gap-2 mb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Patient journey</p>
        <p className="text-xs text-muted-foreground truncate">{patient.treatmentStatus}</p>
      </div>

      {/* Desktop horizontal */}
      <div className="hidden md:flex items-stretch gap-1">
        {stages.map((stage, i) => (
          <div key={stage.id} className="flex items-center flex-1 min-w-0">
            <div
              className={cn(
                "w-full rounded-xl border px-2 py-3 text-center transition-colors",
                stage.state === "current" && "border-primary bg-primary/10 shadow-sm",
                stage.state === "completed" && "border-primary/15 bg-primary/[0.04]",
                stage.state === "pending" && "border-transparent bg-muted/40",
                stage.state === "blocked" && "border-destructive/30 bg-destructive/5"
              )}
            >
              <div
                className={cn(
                  "mx-auto mb-2 h-7 w-7 rounded-full flex items-center justify-center text-xs",
                  stage.state === "current" && "bg-primary text-primary-foreground",
                  stage.state === "completed" && "bg-primary/15 text-primary",
                  stage.state === "pending" && "bg-muted text-muted-foreground",
                  stage.state === "blocked" && "bg-destructive/15 text-destructive"
                )}
              >
                <StageIcon state={stage.state} />
              </div>
              <p
                className={cn(
                  "text-[11px] font-semibold leading-tight",
                  stage.state === "current" ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {stage.label}
              </p>
              {stage.detail && (
                <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{stage.detail}</p>
              )}
            </div>
            {i < stages.length - 1 && (
              <div
                className={cn(
                  "h-px w-2 shrink-0 mx-0.5",
                  stage.state === "completed" || stage.state === "current" ? "bg-primary/40" : "bg-border"
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Mobile vertical timeline */}
      <ol className="md:hidden space-y-3">
        {stages.map(stage => (
          <li key={stage.id} className="flex gap-3">
            <div
              className={cn(
                "mt-0.5 h-8 w-8 rounded-full flex items-center justify-center shrink-0 border",
                stage.state === "current" && "bg-primary text-primary-foreground border-primary",
                stage.state === "completed" && "bg-primary/15 text-primary border-primary/20",
                stage.state === "pending" && "bg-muted text-muted-foreground border-transparent",
                stage.state === "blocked" && "bg-destructive/10 text-destructive border-destructive/20"
              )}
            >
              <StageIcon state={stage.state} />
            </div>
            <div className="min-w-0 pb-3 border-b border-border/60 last:border-0 flex-1">
              <p className={cn("text-sm font-semibold", stage.state === "current" ? "text-foreground" : "text-muted-foreground")}>
                {stage.label}
              </p>
              <p className="text-[11px] capitalize text-muted-foreground">{stage.state}</p>
              {stage.detail && <p className="text-xs text-muted-foreground mt-0.5">{stage.detail}</p>}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

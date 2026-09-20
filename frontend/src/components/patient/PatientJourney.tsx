import { Patient } from "@/data/mockData";
import { getJourneyStages, JourneyStageState } from "./workspaceUtils";
import { cn } from "@/lib/utils";
import { Check, Circle, Lock } from "lucide-react";

interface PatientJourneyProps {
  patient: Patient;
  className?: string;
}

function StageIcon({ state }: { state: JourneyStageState }) {
  if (state === "completed") return <Check className="h-3.5 w-3.5" aria-hidden />;
  if (state === "blocked") return <Lock className="h-3.5 w-3.5" aria-hidden />;
  if (state === "current") return <Circle className="h-3.5 w-3.5 fill-current" aria-hidden />;
  return <span className="h-1.5 w-1.5 rounded-full bg-current opacity-40" aria-hidden />;
}

const stateLabel: Record<JourneyStageState, string> = {
  completed: "Completed",
  current: "Current",
  pending: "Pending",
  blocked: "Blocked",
};

export function PatientJourney({ patient, className }: PatientJourneyProps) {
  const stages = getJourneyStages(patient);
  const current = stages.find(s => s.state === "current" || s.state === "blocked");

  return (
    <div
      className={cn("rounded-2xl border border-border bg-card p-4 md:p-5 shadow-card", className)}
      aria-label="Patient Journey"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Patient Journey</p>
          {current && (
            <p className="text-sm font-semibold text-foreground mt-0.5">
              Now: {current.label}
            </p>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">{patient.treatmentStatus}</p>
      </div>

      <div className="flex flex-wrap gap-3 mb-4 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-primary/40" aria-hidden /> Completed
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-primary" aria-hidden /> Current
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-muted-foreground/30" aria-hidden /> Pending
        </span>
      </div>

      {/* Desktop horizontal */}
      <div className="hidden md:flex items-stretch gap-1" role="list">
        {stages.map((stage, i) => (
          <div key={stage.id} className="flex items-center flex-1 min-w-0" role="listitem">
            <div
              className={cn(
                "w-full rounded-xl border px-2 py-3 text-center transition-all duration-200",
                stage.state === "current" && "border-primary bg-primary/10 shadow-sm ring-2 ring-primary/20 scale-[1.02]",
                stage.state === "completed" && "border-primary/10 bg-primary/[0.03] opacity-80",
                stage.state === "pending" && "border-transparent bg-muted/35 opacity-70",
                stage.state === "blocked" && "border-destructive/30 bg-destructive/5 ring-2 ring-destructive/15"
              )}
            >
              <div
                className={cn(
                  "mx-auto mb-2 h-7 w-7 rounded-full flex items-center justify-center text-xs transition-colors",
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
                  stage.state === "current" || stage.state === "blocked" ? "text-foreground" : "text-muted-foreground"
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
                  "h-px w-2 shrink-0 mx-0.5 transition-colors",
                  stage.state === "completed" || stage.state === "current" ? "bg-primary/40" : "bg-border"
                )}
                aria-hidden
              />
            )}
          </div>
        ))}
      </div>

      {/* Mobile vertical timeline */}
      <ol className="md:hidden space-y-0">
        {stages.map((stage, i) => (
          <li key={stage.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center shrink-0 border transition-all",
                  stage.state === "current" && "bg-primary text-primary-foreground border-primary ring-2 ring-primary/25",
                  stage.state === "completed" && "bg-primary/15 text-primary border-primary/20",
                  stage.state === "pending" && "bg-muted text-muted-foreground border-transparent",
                  stage.state === "blocked" && "bg-destructive/10 text-destructive border-destructive/20"
                )}
              >
                <StageIcon state={stage.state} />
              </div>
              {i < stages.length - 1 && (
                <div
                  className={cn(
                    "w-px flex-1 min-h-[1.25rem]",
                    stage.state === "completed" || stage.state === "current" ? "bg-primary/35" : "bg-border"
                  )}
                  aria-hidden
                />
              )}
            </div>
            <div
              className={cn(
                "min-w-0 pb-4 flex-1",
                stage.state === "current" && "rounded-xl bg-primary/5 -ml-1 pl-2 pr-2 py-1 border border-primary/15"
              )}
            >
              <p className={cn("text-sm font-semibold", stage.state === "current" || stage.state === "blocked" ? "text-foreground" : "text-muted-foreground")}>
                {stage.label}
              </p>
              <p className="text-[11px] text-muted-foreground">{stateLabel[stage.state]}</p>
              {stage.detail && <p className="text-xs text-muted-foreground mt-0.5">{stage.detail}</p>}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

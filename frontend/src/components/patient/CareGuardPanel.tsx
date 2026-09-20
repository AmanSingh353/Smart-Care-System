import { Shield, AlertTriangle, ListChecks, Workflow, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

interface CareGuardPanelProps {
  className?: string;
  compact?: boolean;
}

/**
 * Structured CareGuard UI shell — empty controlled states only.
 * Intelligence wiring is Phase 3C+.
 */
export function CareGuardPanel({ className, compact = false }: CareGuardPanelProps) {
  if (compact) {
    return (
      <div className={cn("rounded-2xl border border-dashed border-primary/25 bg-primary/[0.03] p-4", className)}>
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <p className="text-sm font-bold text-foreground">CareGuard</p>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-primary/80 bg-primary/10 px-2 py-0.5 rounded-full">
            Preview
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">
          CareGuard will surface important patient-care signals here.
        </p>
      </div>
    );
  }

  const sections = [
    {
      icon: AlertTriangle,
      title: "Safety signals",
      empty: "No active safety signals.",
    },
    {
      icon: ListChecks,
      title: "Pending actions",
      empty: "No pending actions requiring attention.",
    },
    {
      icon: Workflow,
      title: "Workflow attention",
      empty: "No workflow actions requiring attention.",
    },
    {
      icon: Lightbulb,
      title: "Recommended next actions",
      empty: "CareGuard will surface important patient-care signals here.",
    },
  ];

  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed border-primary/25 bg-primary/[0.03] p-4 md:p-5",
        className
      )}
    >
      <div className="flex items-start gap-3 mb-4">
        <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Shield className="h-5 w-5" />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold text-foreground">CareGuard</h3>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-primary/80 bg-primary/10 px-2 py-0.5 rounded-full">
              UI ready
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Intelligence engine not connected yet — empty states only.
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {sections.map(s => (
          <div key={s.title} className="rounded-xl border border-border/70 bg-card/70 px-3 py-3">
            <div className="flex items-center gap-2 mb-1.5">
              <s.icon className="h-3.5 w-3.5 text-primary" />
              <p className="text-xs font-semibold text-foreground">{s.title}</p>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{s.empty}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CareGuardPanel;

import { CareGuardSignal, CareGuardSeverity } from "@/careguard/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Shield, AlertTriangle, Info, Flame } from "lucide-react";
import { Link } from "react-router-dom";
import { useCareGuard } from "@/contexts/CareGuardContext";

const severityStyles: Record<
  CareGuardSeverity,
  { badge: string; border: string; icon: typeof Info }
> = {
  INFO: {
    badge: "bg-muted text-muted-foreground border-border",
    border: "border-border",
    icon: Info,
  },
  ATTENTION: {
    badge: "bg-warning/15 text-warning-foreground border-warning/30",
    border: "border-warning/35",
    icon: AlertTriangle,
  },
  HIGH: {
    badge: "bg-orange-500/15 text-orange-800 border-orange-500/30",
    border: "border-orange-500/40",
    icon: AlertTriangle,
  },
  CRITICAL: {
    badge: "bg-destructive/15 text-destructive border-destructive/40",
    border: "border-destructive/50",
    icon: Flame,
  },
};

export function CareGuardSignalCard({
  signal,
  showPatient = true,
  compact = false,
}: {
  signal: CareGuardSignal;
  showPatient?: boolean;
  compact?: boolean;
}) {
  const { acknowledge, dismiss } = useCareGuard();
  const style = severityStyles[signal.severity];
  const Icon = style.icon;

  return (
    <div className={cn("rounded-2xl border bg-card p-4 shadow-card", style.border)}>
      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider rounded-full border px-2.5 py-0.5",
            style.badge
          )}
        >
          <Icon className="h-3 w-3" />
          {signal.severity}
        </span>
        <span className="text-[10px] font-semibold uppercase text-muted-foreground">
          {signal.status}
        </span>
      </div>

      <h4 className="text-sm font-bold text-foreground leading-snug">{signal.title}</h4>
      {!compact && (
        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{signal.description}</p>
      )}

      {showPatient && (
        <p className="text-xs mt-2">
          <span className="text-muted-foreground">Patient · </span>
          <span className="font-semibold text-primary">{signal.patientId}</span>
          {signal.patientName ? ` · ${signal.patientName}` : ""}
        </p>
      )}

      <div className={cn("grid gap-1.5 mt-3 text-xs", compact ? "" : "sm:grid-cols-2")}>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Why</p>
          <p className="text-foreground/90">{signal.why}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Source</p>
          <p className="text-foreground/90">{signal.source}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Assigned to</p>
          <p className="font-semibold text-foreground">{signal.responsibleRole}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Action</p>
          <p className="text-foreground/90">{signal.actionLabel}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-3">
        <Button asChild size="sm">
          <Link to={signal.actionRoute}>{signal.actionLabel}</Link>
        </Button>
        {signal.status === "OPEN" && (
          <Button size="sm" variant="outline" onClick={() => acknowledge(signal.id)}>
            Acknowledge
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => dismiss(signal.id)}>
          Dismiss
        </Button>
      </div>

      <p className="text-[10px] text-muted-foreground mt-2">
        Created {new Date(signal.createdAt).toLocaleString("en-IN")}
      </p>
    </div>
  );
}

interface CareGuardPanelProps {
  patientId?: string;
  className?: string;
  compact?: boolean;
  /** When true, show role-filtered hospital signals instead of patient-scoped */
  roleMode?: boolean;
}

/**
 * Live CareGuard panel — workflow & safety signals requiring human review.
 */
export function CareGuardPanel({ patientId, className, compact = false, roleMode = false }: CareGuardPanelProps) {
  const { getPatientSignals, getRoleSignals, openSignals } = useCareGuard();

  const signals = roleMode
    ? getRoleSignals()
    : patientId
      ? getPatientSignals(patientId, true)
      : openSignals;

  return (
    <div
      className={cn(
        "rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.05] to-card p-4 md:p-5 shadow-card",
        className
      )}
    >
      <div className="flex items-start gap-3 mb-4">
        <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Shield className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-bold tracking-tight text-foreground">CareGuard</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Care workflow intelligence</p>
        </div>
      </div>

      {signals.length === 0 ? (
        <p className="text-sm text-muted-foreground rounded-xl border border-dashed border-border bg-muted/30 px-3 py-4 text-center">
          CareGuard found no active workflow or safety signals.
        </p>
      ) : (
        <div className="space-y-3">
          {signals.map(s => (
            <CareGuardSignalCard
              key={s.id}
              signal={s}
              showPatient={!patientId}
              compact={compact}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default CareGuardPanel;

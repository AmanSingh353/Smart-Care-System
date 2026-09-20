import { CareGuardSignal, CareGuardSeverity } from "@/careguard/types";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { cn } from "@/lib/utils";
import { Shield, AlertTriangle, Info, Flame, CheckCircle2 } from "lucide-react";
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
    badge: "bg-orange-500/15 text-orange-900 border-orange-500/30",
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
    <article
      className={cn(
        "rounded-2xl border bg-card p-4 shadow-card transition-shadow hover:shadow-soft",
        style.border
      )}
      aria-label={`${signal.severity}: ${signal.title}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider rounded-full border px-2.5 py-0.5",
            style.badge
          )}
        >
          <Icon className="h-3 w-3" aria-hidden />
          {signal.severity}
        </span>
        <span className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wide">
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

      <dl className={cn("grid gap-1.5 mt-3 text-xs", compact ? "" : "sm:grid-cols-2")}>
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Why</dt>
          <dd className="text-foreground/90">{signal.why}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Source</dt>
          <dd className="text-foreground/90">{signal.source}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Assigned to</dt>
          <dd className="font-semibold text-foreground">{signal.responsibleRole}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Action</dt>
          <dd className="text-foreground/90">{signal.actionLabel}</dd>
        </div>
      </dl>

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
    </article>
  );
}

interface CareGuardPanelProps {
  patientId?: string;
  className?: string;
  compact?: boolean;
  roleMode?: boolean;
}

/**
 * CareGuard panel — workflow & safety signals requiring human review.
 */
export function CareGuardPanel({ patientId, className, compact = false, roleMode = false }: CareGuardPanelProps) {
  const { getPatientSignals, getRoleSignals, openSignals } = useCareGuard();

  const signals = roleMode
    ? getRoleSignals()
    : patientId
      ? getPatientSignals(patientId, true)
      : openSignals;

  return (
    <section
      className={cn(
        "rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.07] via-card to-card p-4 md:p-5 shadow-card",
        className
      )}
      aria-labelledby="careguard-panel-title"
    >
      <div className="flex items-start gap-3 mb-1">
        <div className="h-10 w-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0 ring-1 ring-primary/20">
          <Shield className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 id="careguard-panel-title" className="text-sm font-bold tracking-tight text-foreground">
              CareGuard
            </h3>
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              USP
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            Helps identify what needs attention next — human review required.
          </p>
        </div>
      </div>

      {signals.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="No active CareGuard signals"
          description="All current workflow items are up to date. CareGuard will surface attention items when labs, meds, or discharge steps need review."
          className="py-8 mt-2 rounded-xl border border-dashed border-border/80 bg-muted/20"
        />
      ) : (
        <div className="space-y-3 mt-4">
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
    </section>
  );
}

export default CareGuardPanel;

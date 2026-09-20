import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface CareGuardPanelProps {
  className?: string;
  compact?: boolean;
}

/**
 * Placeholder architecture for future CareGuard intelligence.
 * Does not invent medical recommendations.
 */
export function CareGuardPanel({ className, compact = false }: CareGuardPanelProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed border-primary/25 bg-primary/[0.03] p-4 md:p-5",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Shield className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold text-foreground">CareGuard</h3>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-primary/80 bg-primary/10 px-2 py-0.5 rounded-full">
              Coming soon
            </span>
          </div>
          {!compact && (
            <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
              Care intelligence will surface important actions and safety signals here — derived from the
              unified patient record, without replacing clinical judgment.
            </p>
          )}
          {compact && (
            <p className="mt-1 text-xs text-muted-foreground">
              Care intelligence will surface important actions and safety signals here.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default CareGuardPanel;

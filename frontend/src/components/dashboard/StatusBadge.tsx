import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { PatientStatus, TestStatus, PaymentStatus } from "@/data/mockData";

type StatusKind = PatientStatus | TestStatus | PaymentStatus | string;

const toneMap: Record<string, string> = {
  Registered: "bg-muted text-muted-foreground border-transparent",
  Admitted: "bg-info/10 text-info border-info/20",
  "Under Treatment": "bg-primary/10 text-primary border-primary/20",
  "Awaiting Test": "bg-warning/15 text-warning-foreground border-warning/30",
  "Ready for Discharge": "bg-success/10 text-success border-success/20",
  Discharged: "bg-muted text-muted-foreground border-transparent",
  Pending: "bg-warning/15 text-warning-foreground border-warning/30",
  "In Progress": "bg-info/10 text-info border-info/20",
  Completed: "bg-success/10 text-success border-success/20",
  Unpaid: "bg-destructive/10 text-destructive border-destructive/20",
  Paid: "bg-success/10 text-success border-success/20",
};

interface StatusBadgeProps {
  status: StatusKind;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-semibold border", toneMap[status] || "bg-muted", className)}
    >
      {status}
    </Badge>
  );
}

import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { StaffLayout } from "@/components/StaffLayout";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { CareGuardSignalCard } from "@/components/patient/CareGuardPanel";
import { useCareGuard } from "@/contexts/CareGuardContext";
import { usePatients } from "@/contexts/PatientContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  AlertTriangle,
  ClipboardCheck,
  CheckCircle2,
  Building2,
  Inbox,
  Siren,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/dashboard/EmptyState";
import {
  formatNetworkError,
  networkService,
  type AssistancePriority,
  type AssistanceRequest,
  type NetworkSummary,
} from "@/services/networkService";

function priorityClass(p: AssistancePriority) {
  if (p === "CRITICAL") return "bg-destructive/15 text-destructive border-destructive/30";
  if (p === "HIGH") return "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30";
  return "bg-muted text-muted-foreground border-border";
}

function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

const CareGuardDashboard = () => {
  const { summary, getRoleSignals, openSignals, resetDemoSignals } = useCareGuard();
  const { resetDemoData } = usePatients();
  const { role, getAccessToken, staff } = useAuth();

  const [netSummary, setNetSummary] = useState<NetworkSummary | null>(null);
  const [recentRequests, setRecentRequests] = useState<AssistanceRequest[]>([]);
  const [netError, setNetError] = useState<string | null>(null);

  const refreshNetwork = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) return;
    const [sum, req] = await Promise.all([
      networkService.getSummary(token),
      networkService.listAssistance(token),
    ]);
    setNetSummary(sum.summary);
    setRecentRequests(
      req.requests
        .filter(r => ["PENDING", "ACCEPTED", "IN_PROGRESS"].includes(r.status))
        .slice(0, 8)
    );
  }, [getAccessToken]);

  useEffect(() => {
    refreshNetwork().catch(err => setNetError(formatNetworkError(err)));
    const t = window.setInterval(() => {
      refreshNetwork().catch(() => undefined);
    }, 30000);
    return () => window.clearInterval(t);
  }, [refreshNetwork]);

  const signals = role === "admin" ? openSignals : getRoleSignals();
  const priority = [...signals].sort((a, b) => {
    const order = { CRITICAL: 0, HIGH: 1, ATTENTION: 2, INFO: 3 };
    return (order[a.severity] ?? 9) - (order[b.severity] ?? 9);
  });

  const roleKeys = ["DOCTOR", "NURSE", "LAB", "PHARMACY", "BILLING"] as const;
  const canNetwork = role === "admin" || role === "doctor" || role === "nurse";

  return (
    <StaffLayout allowedRoles={["admin", "doctor", "nurse", "lab", "pharmacy", "billing"]}>
      <PageHeader
        title="CareGuard"
        description="Workflow signals and inter-hospital assistance — what needs attention next."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        <StatCard
          label="Active emergency requests"
          value={netSummary?.activeEmergencyRequests ?? 0}
          icon={Siren}
        />
        <StatCard
          label="Pending assistance"
          value={netSummary?.pendingAssistanceRequests ?? 0}
          icon={AlertTriangle}
        />
        <StatCard
          label="Accepted requests"
          value={netSummary?.acceptedRequests ?? 0}
          icon={ClipboardCheck}
        />
        <StatCard
          label="Resolved requests"
          value={netSummary?.resolvedRequests ?? 0}
          icon={CheckCircle2}
        />
      </div>

      {canNetwork && (
        <div className="flex flex-wrap gap-2 mb-6">
          <Button asChild size="sm" variant="outline" className="gap-1.5">
            <Link to="/careguard/hospitals">
              <Building2 className="h-4 w-4" />
              Connected Hospitals
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="gap-1.5">
            <Link to="/careguard/incoming">
              <Inbox className="h-4 w-4" />
              Incoming
              {(netSummary?.incomingPending ?? 0) > 0 ? ` (${netSummary?.incomingPending})` : ""}
            </Link>
          </Button>
          {role === "admin" && staff?.isPlatformAdmin && (
            <Button asChild size="sm" variant="outline">
              <Link to="/admin/network">Platform Network</Link>
            </Button>
          )}
        </div>
      )}

      {netError && <p className="text-sm text-destructive mb-3">{netError}</p>}

      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Assistance requests needing attention
        </h3>
        <span className="text-xs text-muted-foreground">{recentRequests.length} active</span>
      </div>

      {recentRequests.length === 0 ? (
        <Card className="rounded-2xl shadow-card mb-8">
          <CardContent className="py-4">
            <EmptyState
              icon={CheckCircle2}
              title="No active assistance requests"
              description="When your hospital sends or receives a CareGuard assistance request, it will appear here."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2 mb-8">
          {recentRequests.map(r => (
            <Card key={r.id} className="rounded-2xl shadow-card">
              <CardContent className="py-3 px-4 flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-mono text-sm font-semibold">{r.requestId}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {r.emergencyType} · {r.requiredDepartment} · {fmt(r.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={cn(
                      "text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-lg border",
                      priorityClass(r.priority)
                    )}
                  >
                    {r.priority}
                  </span>
                  <Badge variant="secondary" className="text-[10px]">
                    {r.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        <StatCard label="Open workflow signals" value={summary.open} icon={Shield} />
        <StatCard label="High priority signals" value={summary.highPriority} icon={AlertTriangle} />
        <StatCard label="Awaiting review" value={summary.awaitingReview} icon={ClipboardCheck} />
        <StatCard label="Resolved today" value={summary.resolvedToday} icon={CheckCircle2} />
      </div>

      {role === "admin" && (
        <Card className="rounded-2xl shadow-card mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Open signals by role</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {roleKeys.map(r => (
                <div key={r} className="rounded-xl bg-muted/40 px-3 py-2.5 text-center">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                    {r}
                  </p>
                  <p className="text-lg font-bold text-foreground tabular-nums">
                    {summary.byRole[r] || 0}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (
                    !window.confirm(
                      "Reset DEMO DATA only?\n\nThis restores fictional patients, workflows, and CareGuard signals. It does not touch any production database."
                    )
                  ) {
                    return;
                  }
                  resetDemoData();
                  setTimeout(() => resetDemoSignals(), 50);
                }}
              >
                Reset Demo Data
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Priority workflow signals
        </h3>
        <span className="text-xs text-muted-foreground">{priority.length} active</span>
      </div>

      {priority.length === 0 ? (
        <Card className="rounded-2xl shadow-card">
          <CardContent className="py-4">
            <EmptyState
              icon={CheckCircle2}
              title="No active CareGuard signals"
              description="All current workflow items are up to date. When a lab result needs review or a discharge is blocked, it will appear here."
            />
          </CardContent>
        </Card>
      ) : (
        <div className={cn("grid gap-3", "md:grid-cols-2")}>
          {priority.map(s => (
            <CareGuardSignalCard key={s.id} signal={s} />
          ))}
        </div>
      )}
    </StaffLayout>
  );
};

export default CareGuardDashboard;

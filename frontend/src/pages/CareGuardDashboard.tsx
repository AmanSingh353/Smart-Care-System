import { useCallback, useEffect, useMemo, useState } from "react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Shield,
  AlertTriangle,
  ClipboardCheck,
  CheckCircle2,
  Building2,
  Inbox,
  Siren,
  Activity,
  Play,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/dashboard/EmptyState";
import {
  formatNetworkError,
  networkService,
  type AssistancePriority,
  type AssistanceRequest,
  type AssistanceStatus,
  type Hospital,
  type NetworkSummary,
} from "@/services/networkService";

function priorityClass(p: AssistancePriority) {
  if (p === "CRITICAL") return "bg-destructive/15 text-destructive border-destructive/40";
  if (p === "HIGH") return "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30";
  return "bg-muted text-muted-foreground border-border";
}

function statusBadgeVariant(
  status: AssistanceStatus
): "default" | "secondary" | "outline" | "destructive" {
  if (status === "PENDING") return "destructive";
  if (status === "ACCEPTED" || status === "IN_PROGRESS") return "default";
  return "outline";
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

type TimelineStep = { key: string; label: string; done: boolean; current: boolean; at?: string };

function buildTimeline(r: AssistanceRequest): TimelineStep[] {
  if (r.status === "CANCELLED" || r.status === "REJECTED") {
    return [
      { key: "REQUESTED", label: "REQUESTED", done: true, current: false, at: r.createdAt },
      {
        key: r.status,
        label: r.status === "CANCELLED" ? "CANCELLED" : "REJECTED",
        done: true,
        current: true,
        at: r.updatedAt,
      },
    ];
  }

  const order: AssistanceStatus[] = ["PENDING", "ACCEPTED", "IN_PROGRESS", "RESOLVED"];
  const labels = ["REQUESTED", "ACCEPTED", "IN PROGRESS", "RESOLVED"];
  const idx = Math.max(0, order.indexOf(r.status));

  return order.map((key, i) => ({
    key,
    label: labels[i],
    done: i <= idx,
    current: i === idx,
    at: i === 0 ? r.createdAt : i === idx ? r.updatedAt : undefined,
  }));
}

function activityLines(
  requests: AssistanceRequest[],
  hospitalName: (id: string) => string
): string[] {
  const lines: string[] = [];
  const sorted = [...requests].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 8);

  for (const r of sorted) {
    const from = hospitalName(r.requestingHospitalId);
    const to = hospitalName(r.targetHospitalId);
    if (r.status === "PENDING") {
      lines.push(`${from} sent an emergency assistance request to ${to}.`);
    } else if (r.status === "ACCEPTED") {
      lines.push(`${to} accepted CareGuard request ${r.requestId}.`);
    } else if (r.status === "IN_PROGRESS") {
      lines.push(`CareGuard request ${r.requestId} is now in progress.`);
    } else if (r.status === "RESOLVED") {
      lines.push(`CareGuard request ${r.requestId} was resolved.`);
    } else if (r.status === "CANCELLED") {
      lines.push(`CareGuard request ${r.requestId} was cancelled.`);
    } else if (r.status === "REJECTED") {
      lines.push(`${to} rejected CareGuard request ${r.requestId}.`);
    }
  }
  return lines;
}

const CareGuardDashboard = () => {
  const { summary, getRoleSignals, openSignals, resetDemoSignals } = useCareGuard();
  const { resetDemoData } = usePatients();
  const { role, getAccessToken, staff, loading: authLoading } = useAuth();

  const [netSummary, setNetSummary] = useState<NetworkSummary | null>(null);
  const [allRequests, setAllRequests] = useState<AssistanceRequest[]>([]);
  const [incomingPending, setIncomingPending] = useState(0);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [netError, setNetError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [selected, setSelected] = useState<AssistanceRequest | null>(null);
  const [busy, setBusy] = useState(false);

  const canAct = role === "admin" || role === "doctor" || role === "nurse";
  const canNetwork = canAct;

  const hospitalName = useCallback(
    (hospitalId: string) =>
      hospitals.find(h => h.hospitalId === hospitalId)?.hospitalName || hospitalId,
    [hospitals]
  );

  const refreshNetwork = useCallback(async () => {
    if (authLoading) return;
    const token = await getAccessToken();
    if (!token) return;
    const [sum, req, hosp, incoming] = await Promise.all([
      networkService.getSummary(token),
      networkService.listAssistance(token),
      networkService.listHospitals(token, { includeLocal: true }),
      networkService.listAssistance(token, { scope: "incoming" }),
    ]);
    setNetSummary(sum.summary);
    setHospitals(hosp.hospitals);
    const sorted = [...req.requests].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    setAllRequests(sorted);
    setIncomingPending(incoming.requests.filter(r => r.status === "PENDING").length);
    setSelected(prev => (prev ? sorted.find(r => r.id === prev.id) || prev : null));
  }, [authLoading, getAccessToken]);

  useEffect(() => {
    refreshNetwork().catch(err => setNetError(formatNetworkError(err)));
    const t = window.setInterval(() => {
      refreshNetwork().catch(() => undefined);
    }, 20000);
    return () => window.clearInterval(t);
  }, [refreshNetwork]);

  const recentRequests = useMemo(() => allRequests.slice(0, 12), [allRequests]);
  const activity = useMemo(
    () => activityLines(allRequests, hospitalName),
    [allRequests, hospitalName]
  );

  const setStatus = async (row: AssistanceRequest, status: AssistanceStatus) => {
    setBusy(true);
    setActionError(null);
    setActionMessage(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");
      const res = await networkService.updateAssistanceStatus(token, row.id, status);
      setActionMessage(res.message);
      await refreshNetwork();
    } catch (err) {
      setActionError(formatNetworkError(err));
    } finally {
      setBusy(false);
    }
  };

  const signals = role === "admin" ? openSignals : getRoleSignals();
  const priority = [...signals].sort((a, b) => {
    const order = { CRITICAL: 0, HIGH: 1, ATTENTION: 2, INFO: 3 };
    return (order[a.severity] ?? 9) - (order[b.severity] ?? 9);
  });
  const roleKeys = ["DOCTOR", "NURSE", "LAB", "PHARMACY", "BILLING"] as const;

  const timeline = selected ? buildTimeline(selected) : [];

  return (
    <StaffLayout allowedRoles={["admin", "doctor", "nurse", "lab", "pharmacy", "billing"]}>
      <PageHeader
        title="CareGuard Command Center"
        description="Inter-hospital emergency coordination — track assistance requests across the Smart Care Network."
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
        <StatCard
          label="Active Requests"
          value={netSummary?.activeEmergencyRequests ?? 0}
          icon={Siren}
        />
        <StatCard
          label="Pending"
          value={netSummary?.pendingAssistanceRequests ?? 0}
          icon={AlertTriangle}
        />
        <StatCard
          label="Accepted"
          value={netSummary?.acceptedRequests ?? 0}
          icon={ClipboardCheck}
        />
        <StatCard
          label="In Progress"
          value={netSummary?.inProgressRequests ?? 0}
          icon={Play}
        />
        <StatCard
          label="Resolved"
          value={netSummary?.resolvedRequests ?? 0}
          icon={CheckCircle2}
        />
      </div>

      {canNetwork && (
        <div className="flex flex-wrap gap-2 mb-5">
          <Button asChild size="sm" className="gap-1.5">
            <Link to="/careguard/hospitals">
              <Building2 className="h-4 w-4" />
              Find a Hospital
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="gap-1.5">
            <Link to="/careguard/incoming">
              <Inbox className="h-4 w-4" />
              Incoming Requests
              {incomingPending > 0 ? (
                <Badge className="ml-1 h-5 min-w-5 px-1.5 text-[10px]">{incomingPending}</Badge>
              ) : null}
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="gap-1.5">
            <Link to="/careguard/hospitals">Connected Hospitals</Link>
          </Button>
          {role === "admin" && staff?.isPlatformAdmin && (
            <Button asChild size="sm" variant="ghost">
              <Link to="/admin/platform">Platform Administration</Link>
            </Button>
          )}
        </div>
      )}

      {netError && <p className="text-sm text-destructive mb-3">{netError}</p>}

      <div className="grid gap-5 lg:grid-cols-[1fr_minmax(240px,280px)] mb-8">
        <div className="min-w-0">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Recent / Active Requests
            </h3>
            <span className="text-xs text-muted-foreground">{recentRequests.length} shown</span>
          </div>

          {recentRequests.length === 0 ? (
            <Card className="rounded-2xl shadow-card">
              <CardContent className="py-4">
                <EmptyState
                  icon={Siren}
                  title="No active CareGuard requests"
                  description="Emergency assistance requests between connected hospitals will appear here."
                />
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {recentRequests.map(r => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setActionError(null);
                    setActionMessage(null);
                    setSelected(r);
                  }}
                  className={cn(
                    "w-full text-left rounded-2xl border bg-card shadow-card transition-colors hover:bg-muted/30",
                    r.priority === "CRITICAL" && "border-destructive/35",
                    selected?.id === r.id && "ring-2 ring-primary/30"
                  )}
                >
                  <div className="px-4 py-3 space-y-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-mono text-sm font-semibold text-foreground">
                          {r.requestId}
                        </p>
                        <p className="text-sm text-foreground mt-0.5">{r.emergencyType}</p>
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
                        <Badge variant={statusBadgeVariant(r.status)} className="text-[10px]">
                          {r.status.replace("_", " ")}
                        </Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <p>
                        <span className="text-muted-foreground/80">From </span>
                        <span className="text-foreground font-medium">
                          {hospitalName(r.requestingHospitalId)}
                        </span>
                      </p>
                      <p>
                        <span className="text-muted-foreground/80">To </span>
                        <span className="text-foreground font-medium">
                          {hospitalName(r.targetHospitalId)}
                        </span>
                      </p>
                      <p>
                        Dept: <span className="text-foreground">{r.requiredDepartment}</span>
                        {r.requiredFacilities.length
                          ? ` · ${r.requiredFacilities.join(", ")}`
                          : ""}
                      </p>
                      <p>Created {fmt(r.createdAt)}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <Card className="rounded-2xl shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Network Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activity.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  CareGuard activity across connected hospitals will appear here.
                </p>
              ) : (
                <ul className="space-y-2.5">
                  {activity.map((line, i) => (
                    <li
                      key={`${i}-${line.slice(0, 24)}`}
                      className="text-sm text-muted-foreground leading-snug border-l-2 border-primary/25 pl-3"
                    >
                      {line}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={!!selected} onOpenChange={open => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="font-mono text-base">
                  CAREGUARD REQUEST #{selected.requestId}
                </DialogTitle>
                <DialogDescription>
                  Emergency coordination between connected hospitals. Patient details stay minimal.
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-wrap gap-2">
                <span
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-lg border",
                    priorityClass(selected.priority)
                  )}
                >
                  {selected.priority}
                </span>
                <Badge variant={statusBadgeVariant(selected.status)}>
                  {selected.status.replace("_", " ")}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground font-semibold">
                    From Hospital
                  </p>
                  <p className="font-medium">{hospitalName(selected.requestingHospitalId)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground font-semibold">
                    To Hospital
                  </p>
                  <p className="font-medium">{hospitalName(selected.targetHospitalId)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground font-semibold">
                    Emergency
                  </p>
                  <p className="font-medium">{selected.emergencyType}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground font-semibold">
                    Required Department
                  </p>
                  <p className="font-medium">{selected.requiredDepartment}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground font-semibold">
                    Required Facility
                  </p>
                  <p className="font-medium">
                    {selected.requiredFacilities.length
                      ? selected.requiredFacilities.join(", ")
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground font-semibold">
                    Created
                  </p>
                  <p className="font-medium">{fmt(selected.createdAt)}</p>
                </div>
              </div>

              {selected.shortDescription ? (
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground font-semibold">
                    Description
                  </p>
                  <p className="text-sm mt-0.5">{selected.shortDescription}</p>
                </div>
              ) : null}

              {selected.patientReference ? (
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground font-semibold">
                    Patient Reference
                  </p>
                  <p className="text-sm font-mono mt-0.5">{selected.patientReference}</p>
                </div>
              ) : null}

              <div>
                <p className="text-[10px] uppercase text-muted-foreground font-semibold mb-2">
                  Status Timeline
                </p>
                <ol className="space-y-0">
                  {timeline.map((step, i) => (
                    <li key={step.key} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <span
                          className={cn(
                            "h-3 w-3 rounded-full border-2 shrink-0 mt-1",
                            step.current
                              ? "border-primary bg-primary"
                              : step.done
                                ? "border-primary/60 bg-primary/40"
                                : "border-muted-foreground/30 bg-transparent"
                          )}
                        />
                        {i < timeline.length - 1 && (
                          <span
                            className={cn(
                              "w-0.5 flex-1 min-h-[1.25rem]",
                              step.done ? "bg-primary/40" : "bg-border"
                            )}
                          />
                        )}
                      </div>
                      <div className="pb-3">
                        <p
                          className={cn(
                            "text-xs font-semibold tracking-wide",
                            step.current ? "text-primary" : "text-foreground"
                          )}
                        >
                          {step.label}
                        </p>
                        {step.at && (
                          <p className="text-[11px] text-muted-foreground">{fmt(step.at)}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              {actionError && <p className="text-sm text-destructive">{actionError}</p>}
              {actionMessage && (
                <p className="text-sm text-foreground bg-muted/50 rounded-xl px-3 py-2">
                  {actionMessage}
                </p>
              )}

              {canAct && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {selected.status === "PENDING" && (
                    <>
                      <Button
                        size="sm"
                        disabled={busy}
                        onClick={() => setStatus(selected, "ACCEPTED")}
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => setStatus(selected, "REJECTED")}
                      >
                        Reject
                      </Button>
                    </>
                  )}
                  {selected.status === "ACCEPTED" && (
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() => setStatus(selected, "IN_PROGRESS")}
                    >
                      Start Assistance
                    </Button>
                  )}
                  {selected.status === "IN_PROGRESS" && (
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() => setStatus(selected, "RESOLVED")}
                    >
                      Mark Resolved
                    </Button>
                  )}
                  {selected.status === "RESOLVED" && (
                    <span className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4" />
                      Resolved
                    </span>
                  )}
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

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

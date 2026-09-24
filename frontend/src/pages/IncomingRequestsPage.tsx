import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { StaffLayout } from "@/components/StaffLayout";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import {
  formatNetworkError,
  networkService,
  type AssistancePriority,
  type AssistanceRequest,
  type AssistanceStatus,
  type Hospital,
} from "@/services/networkService";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

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

const IncomingRequestsPage = () => {
  const { getAccessToken, role, staff, loading: authLoading } = useAuth();
  const canAct = role === "admin" || role === "doctor" || role === "nurse";
  const isPlatform = Boolean(staff?.isPlatformAdmin);

  const [requests, setRequests] = useState<AssistanceRequest[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const pendingCount = requests.filter(r => r.status === "PENDING").length;

  const refresh = useCallback(async () => {
    if (authLoading) return;
    const token = await getAccessToken();
    if (!token) return;
    const [reqRes, hospRes] = await Promise.all([
      networkService.listAssistance(token, { scope: "incoming" }),
      networkService.listHospitals(token, { includeLocal: true }),
    ]);
    setRequests(reqRes.requests);
    setHospitals(hospRes.hospitals);
  }, [authLoading, getAccessToken]);

  useEffect(() => {
    refresh().catch(err => setError(formatNetworkError(err)));
    const t = window.setInterval(() => {
      refresh().catch(() => undefined);
    }, 30000);
    return () => window.clearInterval(t);
  }, [refresh]);

  const hospitalName = (hospitalId: string) =>
    hospitals.find(h => h.hospitalId === hospitalId)?.hospitalName || hospitalId;

  const setStatus = async (row: AssistanceRequest, status: AssistanceStatus) => {
    setBusyId(row.id);
    setError(null);
    setMessage(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");
      const res = await networkService.updateAssistanceStatus(token, row.id, status);
      setMessage(res.message);
      await refresh();
    } catch (err) {
      setError(formatNetworkError(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <StaffLayout allowedRoles={["admin", "doctor", "nurse"]}>
      <PageHeader
        title={pendingCount > 0 ? `Incoming Requests  ${pendingCount}` : "Incoming Requests"}
        description={
          isPlatform
            ? "Network-wide CareGuard assistance requests. Accept, start, and resolve on behalf of partner hospitals for the demo."
            : "Assistance requests sent to this hospital. Accept, start, and resolve through CareGuard."
        }
      />

      <div className="flex gap-2 mb-4">
        <Button asChild variant="outline" size="sm">
          <Link to="/careguard/hospitals">Connected Hospitals</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link to="/careguard">CareGuard Dashboard</Link>
        </Button>
      </div>

      {error && <p className="text-sm text-destructive mb-3">{error}</p>}
      {message && (
        <p className="text-sm text-foreground bg-muted/50 rounded-xl px-3 py-2 mb-3">{message}</p>
      )}

      {requests.length === 0 ? (
        <Card className="rounded-2xl shadow-card">
          <CardContent className="py-4">
            <EmptyState
              icon={Inbox}
              title="No incoming assistance requests"
              description="When another hospital requests assistance from this facility, it will appear here."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map(r => (
            <Card key={r.id} className="rounded-2xl shadow-card">
              <CardContent className="pt-4 pb-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground font-mono text-sm">
                      CareGuard Request #{r.requestId}
                    </p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      From {hospitalName(r.requestingHospitalId)}
                      {isPlatform ? (
                        <>
                          {" → "}
                          <span className="text-foreground font-medium">
                            {hospitalName(r.targetHospitalId)}
                          </span>
                        </>
                      ) : null}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-lg border",
                        priorityClass(r.priority)
                      )}
                    >
                      {r.priority}
                    </span>
                    <Badge
                      variant={r.status === "RESOLVED" ? "outline" : "secondary"}
                      className="text-[10px]"
                    >
                      {r.status === "RESOLVED" ? "Resolved" : r.status}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">Emergency</p>
                    <p className="font-medium">{r.emergencyType}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">Required</p>
                    <p className="font-medium">
                      {r.requiredDepartment}
                      {r.requiredFacilities.length
                        ? ` + ${r.requiredFacilities.join(", ")}`
                        : ""}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">Facilities</p>
                    <p className="font-medium">
                      {r.requiredFacilities.length ? r.requiredFacilities.join(", ") : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">Created</p>
                    <p className="font-medium">{fmt(r.createdAt)}</p>
                  </div>
                </div>

                {r.shortDescription && (
                  <p className="text-sm text-muted-foreground">{r.shortDescription}</p>
                )}
                {r.patientReference && (
                  <p className="text-xs text-muted-foreground">
                    Patient reference: <span className="font-mono">{r.patientReference}</span>
                  </p>
                )}

                {canAct && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {r.status === "PENDING" && (
                      <>
                        <Button
                          size="sm"
                          disabled={busyId === r.id}
                          onClick={() => setStatus(r, "ACCEPTED")}
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId === r.id}
                          onClick={() => setStatus(r, "REJECTED")}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                    {r.status === "ACCEPTED" && (
                      <Button
                        size="sm"
                        disabled={busyId === r.id}
                        onClick={() => setStatus(r, "IN_PROGRESS")}
                      >
                        Start Assistance
                      </Button>
                    )}
                    {r.status === "IN_PROGRESS" && (
                      <Button
                        size="sm"
                        disabled={busyId === r.id}
                        onClick={() => setStatus(r, "RESOLVED")}
                      >
                        Mark Resolved
                      </Button>
                    )}
                    {r.status === "RESOLVED" && (
                      <span className="text-sm font-medium text-muted-foreground">Resolved</span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </StaffLayout>
  );
};

export default IncomingRequestsPage;

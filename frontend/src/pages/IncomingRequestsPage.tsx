import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { StaffLayout } from "@/components/StaffLayout";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import {
  formatNetworkError,
  networkService,
  type AssistancePriority,
  type AssistanceRequest,
  type AssistanceStatus,
  type Hospital,
  type NetworkPatient,
  type PatientEmergencySnapshot,
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

function snapName(r: AssistanceRequest) {
  return r.patientSnapshot?.patientName || r.patientId || r.patientReference || "—";
}

function snapId(r: AssistanceRequest) {
  return r.patientSnapshot?.patientId || r.patientId || r.patientReference || "";
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
  const [summaryOpen, setSummaryOpen] = useState<{
    request: AssistanceRequest;
    emergencySummary: PatientEmergencySnapshot | null;
    accessStatus: string;
  } | null>(null);
  const [recordOpen, setRecordOpen] = useState<{
    requestId: string;
    accessStatus: string;
    sharedUnder: string;
    patient: NetworkPatient;
  } | null>(null);

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

  const viewSummary = async (row: AssistanceRequest) => {
    setBusyId(row.id);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");
      const data = await networkService.getPatientSummary(token, row.id);
      setSummaryOpen(data);
    } catch (err) {
      setError(formatNetworkError(err));
    } finally {
      setBusyId(null);
    }
  };

  const openRecord = async (row: AssistanceRequest) => {
    setBusyId(row.id);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");
      const data = await networkService.getPatientRecord(token, row.id);
      setRecordOpen({
        requestId: data.requestId,
        accessStatus: data.accessStatus,
        sharedUnder: data.sharedUnder,
        patient: data.patient,
      });
    } catch (err) {
      setError(formatNetworkError(err));
    } finally {
      setBusyId(null);
    }
  };

  const accessLabel = (status: AssistanceStatus) => {
    if (status === "ACCEPTED" || status === "IN_PROGRESS") return "ACTIVE";
    if (status === "RESOLVED" || status === "CANCELLED" || status === "REJECTED") return "CLOSED";
    return "NONE";
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
          {requests.map(r => {
            const snap = r.patientSnapshot;
            return (
              <Card key={r.id} className="rounded-2xl shadow-card">
                <CardContent className="pt-4 pb-4 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground font-mono text-sm">
                        CareGuard Request #{r.requestId}
                      </p>
                      <p className="text-sm mt-1">
                        <span className="font-semibold text-foreground">{snapName(r)}</span>
                        {snapId(r) && (
                          <span className="ml-2 font-mono text-xs text-muted-foreground">
                            {snapId(r)}
                          </span>
                        )}
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
                      <p className="text-[10px] uppercase text-muted-foreground">Department</p>
                      <p className="font-medium">{r.requiredDepartment}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-muted-foreground">Facilities</p>
                      <p className="font-medium">
                        {r.requiredFacilities.length ? r.requiredFacilities.join(", ") : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-muted-foreground">Procedure</p>
                      <p className="font-medium">{r.requestedProcedure || "—"}</p>
                    </div>
                  </div>

                  {(snap?.currentCondition || r.shortDescription) && (
                    <div className="text-sm">
                      <p className="text-[10px] uppercase text-muted-foreground">Current condition</p>
                      <p className="text-foreground">
                        {snap?.currentCondition || r.shortDescription}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    {snap?.allergies && (
                      <div>
                        <p className="text-[10px] uppercase text-muted-foreground">
                          Critical allergies
                        </p>
                        <p className="font-medium text-destructive">{snap.allergies}</p>
                      </div>
                    )}
                    {snap?.currentMedications && snap.currentMedications.length > 0 && (
                      <div>
                        <p className="text-[10px] uppercase text-muted-foreground">
                          Current medications
                        </p>
                        <p className="font-medium">{snap.currentMedications.join(", ")}</p>
                      </div>
                    )}
                    {(snap?.relevantVitals || snap?.relevantReports) && (
                      <div className="sm:col-span-2">
                        <p className="text-[10px] uppercase text-muted-foreground">
                          Relevant vitals / reports
                        </p>
                        <p className="font-medium">
                          {[snap.relevantVitals, snap.relevantReports].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Access status:{" "}
                    <span className="font-semibold text-foreground">{accessLabel(r.status)}</span>
                    {" · "}
                    Created {fmt(r.createdAt)}
                  </p>

                  {canAct && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === r.id}
                        onClick={() => viewSummary(r)}
                      >
                        View Emergency Summary
                      </Button>
                      {r.status === "PENDING" && (
                        <>
                          <Button
                            size="sm"
                            disabled={busyId === r.id}
                            onClick={() => setStatus(r, "ACCEPTED")}
                          >
                            Accept Assistance
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
                      {(r.status === "ACCEPTED" || r.status === "IN_PROGRESS") && (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={busyId === r.id}
                          onClick={() => openRecord(r)}
                        >
                          Open Patient Record
                        </Button>
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
                        <span className="text-sm font-medium text-muted-foreground self-center">
                          Access Status: CLOSED
                        </span>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!summaryOpen} onOpenChange={open => !open && setSummaryOpen(null)}>
        <DialogContent className="sm:max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Emergency Handover Summary</DialogTitle>
            <DialogDescription>
              Level 1 CareGuard snapshot — enough to decide if you can safely assist.
            </DialogDescription>
          </DialogHeader>
          {summaryOpen && (
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-[10px] uppercase text-muted-foreground font-semibold">Patient</p>
                <p className="font-semibold text-base">
                  {summaryOpen.emergencySummary?.patientName ||
                    snapName(summaryOpen.request)}
                </p>
                <p className="font-mono text-xs text-muted-foreground">
                  {summaryOpen.emergencySummary?.patientId || snapId(summaryOpen.request)}
                </p>
                <p className="text-muted-foreground mt-1">
                  {[
                    summaryOpen.emergencySummary?.age != null
                      ? `${summaryOpen.emergencySummary.age} years`
                      : null,
                    summaryOpen.emergencySummary?.gender,
                    summaryOpen.emergencySummary?.bloodGroup
                      ? `Blood Group: ${summaryOpen.emergencySummary.bloodGroup}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-muted-foreground font-semibold">
                  Emergency
                </p>
                <p className="font-medium">{summaryOpen.request.emergencyType}</p>
                <p className="text-muted-foreground">
                  Priority: {summaryOpen.request.priority}
                </p>
              </div>
              {summaryOpen.emergencySummary?.currentCondition && (
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground font-semibold">
                    Current condition
                  </p>
                  <p>{summaryOpen.emergencySummary.currentCondition}</p>
                </div>
              )}
              {summaryOpen.emergencySummary?.allergies && (
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground font-semibold">
                    Allergies
                  </p>
                  <p className="text-destructive font-medium">
                    {summaryOpen.emergencySummary.allergies}
                  </p>
                </div>
              )}
              {summaryOpen.emergencySummary?.currentMedications?.length ? (
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground font-semibold">
                    Current medications
                  </p>
                  <p>{summaryOpen.emergencySummary.currentMedications.join(", ")}</p>
                </div>
              ) : null}
              <div>
                <p className="text-[10px] uppercase text-muted-foreground font-semibold">
                  Required assistance
                </p>
                <p>
                  {[
                    summaryOpen.request.requiredDepartment,
                    ...summaryOpen.request.requiredFacilities,
                    summaryOpen.request.requestedProcedure,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                From {hospitalName(summaryOpen.request.requestingHospitalId)} · Access:{" "}
                {summaryOpen.accessStatus}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!recordOpen} onOpenChange={open => !open && setRecordOpen(null)}>
        <DialogContent className="sm:max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Patient Record</DialogTitle>
            <DialogDescription>
              {recordOpen?.sharedUnder || "Shared under CareGuard"}
            </DialogDescription>
          </DialogHeader>
          {recordOpen && (
            <div className="space-y-3 text-sm">
              <p className="text-xs">
                Access Status:{" "}
                <span className="font-semibold text-foreground">{recordOpen.accessStatus}</span>
              </p>
              <div>
                <p className="font-semibold text-base">{recordOpen.patient.fullName}</p>
                <p className="font-mono text-xs text-muted-foreground">
                  {recordOpen.patient.patientId}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground">Age / Gender</p>
                  <p>
                    {recordOpen.patient.age ?? "—"} / {recordOpen.patient.gender || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground">Blood group</p>
                  <p>{recordOpen.patient.bloodGroup || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground">Phone</p>
                  <p>{recordOpen.patient.phone || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground">Home hospital</p>
                  <p className="font-mono text-xs">{recordOpen.patient.homeHospitalId}</p>
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase text-muted-foreground">Allergies</p>
                <p>{recordOpen.patient.allergies || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-muted-foreground">Medications</p>
                <p>
                  {recordOpen.patient.currentMedications?.length
                    ? recordOpen.patient.currentMedications.join(", ")
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-muted-foreground">Diagnosis</p>
                <p>{recordOpen.patient.diagnosis || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-muted-foreground">Clinical summary</p>
                <p>{recordOpen.patient.clinicalSummary || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-muted-foreground">Vitals / reports</p>
                <p>
                  {[recordOpen.patient.relevantVitals, recordOpen.patient.relevantReports]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </StaffLayout>
  );
};

export default IncomingRequestsPage;

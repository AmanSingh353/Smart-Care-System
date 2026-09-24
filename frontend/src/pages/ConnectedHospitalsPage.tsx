import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { StaffLayout } from "@/components/StaffLayout";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import {
  formatNetworkError,
  networkService,
  type AssistancePriority,
  type Hospital,
  type HospitalStatus,
} from "@/services/networkService";
import { Building2, Search, Siren } from "lucide-react";

const STATUS_OPTIONS: Array<HospitalStatus | "all"> = ["all", "ONLINE", "BUSY", "OFFLINE"];

const EMERGENCY_TYPES = [
  "Cardiac Emergency",
  "Trauma",
  "Neurological Emergency",
  "General Emergency",
] as const;

const DEPARTMENT_OPTIONS = [
  "Cardiology",
  "Neurology",
  "Emergency Medicine",
  "Critical Care",
  "Trauma Care",
] as const;

const FACILITY_OPTIONS = [
  "ICU",
  "Cardiac Care Unit",
  "Emergency Department",
  "Trauma Centre",
  "Blood Bank",
] as const;

function statusVariant(status: HospitalStatus): "default" | "secondary" | "outline" {
  if (status === "ONLINE") return "default";
  if (status === "BUSY") return "secondary";
  return "outline";
}

const ConnectedHospitalsPage = () => {
  const { getAccessToken, role, loading: authLoading } = useAuth();
  const canRequest = role === "admin" || role === "doctor" || role === "nurse";

  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [search, setSearch] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [statusFilter, setStatusFilter] = useState<HospitalStatus | "all">("all");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [target, setTarget] = useState<Hospital | null>(null);
  const [form, setForm] = useState({
    priority: "HIGH" as AssistancePriority,
    emergencyType: EMERGENCY_TYPES[0],
    requiredDepartment: DEPARTMENT_OPTIONS[0],
    requiredFacilities: FACILITY_OPTIONS[0],
    shortDescription: "",
    patientReference: "",
  });

  const refresh = useCallback(async () => {
    // Page hooks run while StaffLayout still shows "Restoring session…" — wait for auth.
    if (authLoading) return;
    const token = await getAccessToken();
    if (!token) return;
    const res = await networkService.listHospitals(token, {
      search: search.trim() || undefined,
      specialty: specialty.trim() || undefined,
      status: statusFilter === "all" ? undefined : statusFilter,
    });
    setHospitals(res.hospitals);
  }, [authLoading, getAccessToken, search, specialty, statusFilter]);

  useEffect(() => {
    refresh().catch(err => setError(formatNetworkError(err)));
  }, [refresh]);

  const specialties = useMemo(() => {
    const set = new Set<string>();
    hospitals.forEach(h => h.departments.forEach(d => set.add(d)));
    return [...set].sort();
  }, [hospitals]);

  const openRequest = (h: Hospital) => {
    setError(null);
    setMessage(null);
    setTarget(h);
    const dept =
      DEPARTMENT_OPTIONS.find(d => h.departments.includes(d)) ||
      h.departments[0] ||
      DEPARTMENT_OPTIONS[0];
    const facility =
      FACILITY_OPTIONS.find(f => h.facilities.includes(f)) ||
      h.facilities[0] ||
      FACILITY_OPTIONS[0];
    setForm({
      priority: "HIGH",
      emergencyType: EMERGENCY_TYPES[0],
      requiredDepartment: dept,
      requiredFacilities: facility,
      shortDescription: "",
      patientReference: "",
    });
  };

  const submitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target) return;
    if (!form.emergencyType.trim() || !form.requiredDepartment.trim()) {
      setError("Emergency type and required department are required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");
      const res = await networkService.createAssistance(token, {
        targetHospitalId: target.hospitalId,
        priority: form.priority,
        emergencyType: form.emergencyType.trim(),
        requiredDepartment: form.requiredDepartment.trim(),
        requiredFacilities: form.requiredFacilities
          ? [form.requiredFacilities.trim()].filter(Boolean)
          : [],
        shortDescription: form.shortDescription.trim(),
        patientReference: form.patientReference.trim(),
      });
      setMessage(`${res.message} (${res.request.requestId})`);
      setTarget(null);
    } catch (err) {
      setError(formatNetworkError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <StaffLayout allowedRoles={["admin", "doctor", "nurse"]}>
      <PageHeader
        title="Your Hospital Network"
        description="Discover other hospitals on the Smart Care Network and request CareGuard assistance when needed."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center mb-4">
        <div className="relative flex-1 min-w-0 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9 h-10 rounded-xl"
            placeholder="Search hospitals..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Input
          className="h-10 rounded-xl max-w-xs"
          placeholder="Filter by specialty..."
          list="specialty-options"
          value={specialty}
          onChange={e => setSpecialty(e.target.value)}
        />
        <datalist id="specialty-options">
          {specialties.map(s => (
            <option key={s} value={s} />
          ))}
        </datalist>
        <select
          className="h-10 rounded-xl border border-input bg-background px-3 text-sm min-w-[8.5rem]"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as HospitalStatus | "all")}
          aria-label="Filter by status"
        >
          {STATUS_OPTIONS.map(s => (
            <option key={s} value={s}>
              {s === "all" ? "All status" : s}
            </option>
          ))}
        </select>
        <Button asChild variant="outline" className="shrink-0">
          <Link to="/careguard/incoming">Incoming Requests</Link>
        </Button>
      </div>

      {error && <p className="text-sm text-destructive mb-3">{error}</p>}
      {message && (
        <p className="text-sm text-foreground bg-muted/50 rounded-xl px-3 py-2 mb-3">{message}</p>
      )}

      {hospitals.length === 0 ? (
        <Card className="rounded-2xl shadow-card">
          <CardContent className="py-4">
            <EmptyState
              icon={Building2}
              title="No partner hospitals available"
              description="Other hospitals registered on the Smart Care Network will appear here. Status is database-backed and configurable (not live presence telemetry)."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {hospitals.map(h => (
            <Card key={h.id} className="rounded-2xl shadow-card">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-base truncate">{h.hospitalName}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {[h.city, h.state].filter(Boolean).join(", ") || "Location not set"}
                    </p>
                  </div>
                  <Badge variant={statusVariant(h.status)} className="shrink-0 text-[10px]">
                    {h.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground font-semibold">
                    Departments
                  </p>
                  <p className="text-sm text-foreground mt-0.5">
                    {h.departments.length ? h.departments.join(" · ") : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground font-semibold">
                    Facilities
                  </p>
                  <p className="text-sm text-foreground mt-0.5">
                    {h.facilities.length ? h.facilities.join(" · ") : "—"}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">
                    Emergency Support:{" "}
                    <span className="font-medium text-foreground">
                      {h.emergencySupport ? "Available" : "Unavailable"}
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">{h.hospitalId}</span>
                </div>
                {canRequest && (
                  <Button
                    type="button"
                    className="w-full gap-1.5"
                    disabled={h.status === "OFFLINE"}
                    onClick={() => openRequest(h)}
                  >
                    <Siren className="h-4 w-4" />
                    Request Assistance
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!target} onOpenChange={open => !open && setTarget(null)}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>Request Assistance</DialogTitle>
            <DialogDescription>
              Send a CareGuard assistance request to {target?.hospitalName}. Only a patient reference
              code is shared — no full patient record.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitRequest} className="grid gap-3">
            <div>
              <Label>Target hospital</Label>
              <p className="mt-1 text-sm font-medium text-foreground">{target?.hospitalName}</p>
              <p className="text-xs text-muted-foreground font-mono">{target?.hospitalId}</p>
            </div>
            <div>
              <Label>Priority</Label>
              <select
                className="w-full mt-1 h-10 rounded-xl border border-input bg-background px-3 text-sm"
                value={form.priority}
                onChange={e => setForm(f => ({ ...f, priority: e.target.value as AssistancePriority }))}
              >
                <option value="CRITICAL">CRITICAL</option>
                <option value="HIGH">HIGH</option>
                <option value="NORMAL">NORMAL</option>
              </select>
            </div>
            <div>
              <Label>Emergency type</Label>
              <select
                className="w-full mt-1 h-10 rounded-xl border border-input bg-background px-3 text-sm"
                value={form.emergencyType}
                onChange={e => setForm(f => ({ ...f, emergencyType: e.target.value }))}
                required
              >
                {EMERGENCY_TYPES.map(t => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Required department</Label>
              <select
                className="w-full mt-1 h-10 rounded-xl border border-input bg-background px-3 text-sm"
                value={form.requiredDepartment}
                onChange={e => setForm(f => ({ ...f, requiredDepartment: e.target.value }))}
                required
              >
                {DEPARTMENT_OPTIONS.map(d => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Required facility</Label>
              <select
                className="w-full mt-1 h-10 rounded-xl border border-input bg-background px-3 text-sm"
                value={form.requiredFacilities}
                onChange={e => setForm(f => ({ ...f, requiredFacilities: e.target.value }))}
              >
                {FACILITY_OPTIONS.map(f => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Patient reference (optional)</Label>
              <Input
                className="mt-1 rounded-xl"
                value={form.patientReference}
                onChange={e => setForm(f => ({ ...f, patientReference: e.target.value }))}
                placeholder="PT-1042"
              />
            </div>
            <div>
              <Label>Short description</Label>
              <Input
                className="mt-1 rounded-xl"
                value={form.shortDescription}
                onChange={e => setForm(f => ({ ...f, shortDescription: e.target.value }))}
                maxLength={500}
                placeholder="Patient requires urgent cardiac intervention and ICU support."
              />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setTarget(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "Sending…" : "Send request"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </StaffLayout>
  );
};

export default ConnectedHospitalsPage;

/** Compact admin dashboard teaser — links to Connected Hospitals (API-backed). */
export function NetworkQuickAccessCard() {
  const { getAccessToken } = useAuth();
  const [stats, setStats] = useState({ connected: 0, online: 0, pending: 0 });

  useEffect(() => {
    void (async () => {
      try {
        const token = await getAccessToken();
        if (!token) return;
        const res = await networkService.getSummary(token);
        setStats({
          connected: res.summary.connectedHospitalCount,
          online: res.summary.hospitalsOnline,
          pending: res.summary.pendingAssistanceRequests,
        });
      } catch {
        /* ignore — empty/unavailable network */
      }
    })();
  }, [getAccessToken]);

  return (
    <Card className="rounded-2xl shadow-card">
      <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          Connected Hospitals
        </CardTitle>
        <Button asChild size="sm" variant="outline">
          <Link to="/careguard/hospitals">Open network →</Link>
        </Button>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground tabular-nums">{stats.connected}</span> partner
          hospital{stats.connected === 1 ? "" : "s"}
          {" · "}
          <span className="font-semibold text-foreground tabular-nums">{stats.online}</span> online
          {stats.pending > 0 && (
            <>
              {" · "}
              <span className="font-semibold text-foreground tabular-nums">{stats.pending}</span> pending
              request{stats.pending === 1 ? "" : "s"}
            </>
          )}
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Discover partner hospitals on the Smart Care Network and send CareGuard assistance requests.
        </p>
      </CardContent>
    </Card>
  );
}

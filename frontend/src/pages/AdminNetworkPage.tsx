import { useCallback, useEffect, useState } from "react";
import { StaffLayout } from "@/components/StaffLayout";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
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
  type AssistanceRequest,
  type Hospital,
  type HospitalStatus,
  type NetworkSummary,
} from "@/services/networkService";
import { Activity, Building2, Plus } from "lucide-react";

const emptyHospitalForm = {
  hospitalId: "",
  hospitalName: "",
  registrationId: "",
  address: "",
  city: "",
  state: "",
  contactPhone: "",
  contactEmail: "",
  departments: "",
  facilities: "",
  emergencySupport: true,
  status: "ONLINE" as HospitalStatus,
};

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

const AdminNetworkPage = () => {
  const { getAccessToken } = useAuth();
  const [summary, setSummary] = useState<NetworkSummary | null>(null);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [requests, setRequests] = useState<AssistanceRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(emptyHospitalForm);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) return;
    const [sum, hosp, req] = await Promise.all([
      networkService.getSummary(token),
      networkService.listHospitals(token, { includeLocal: true }),
      networkService.listAssistance(token, { scope: "network" }),
    ]);
    setSummary(sum.summary);
    setHospitals(hosp.hospitals);
    setRequests(req.requests);
  }, [getAccessToken]);

  useEffect(() => {
    refresh().catch(err => setError(formatNetworkError(err)));
  }, [refresh]);

  const onRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");
      const res = await networkService.registerHospital(token, {
        hospitalId: form.hospitalId.trim(),
        hospitalName: form.hospitalName.trim(),
        registrationId: form.registrationId.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        contactPhone: form.contactPhone.trim(),
        contactEmail: form.contactEmail.trim(),
        departments: form.departments
          .split(",")
          .map(s => s.trim())
          .filter(Boolean),
        facilities: form.facilities
          .split(",")
          .map(s => s.trim())
          .filter(Boolean),
        emergencySupport: form.emergencySupport,
        status: form.status,
      });
      setMessage(res.message);
      setAddOpen(false);
      setForm(emptyHospitalForm);
      await refresh();
    } catch (err) {
      setError(formatNetworkError(err));
    } finally {
      setBusy(false);
    }
  };

  const setHospitalStatus = async (h: Hospital, status: HospitalStatus) => {
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");
      await networkService.updateHospital(token, h.id, { status });
      setMessage(`${h.hospitalName} → ${status}`);
      await refresh();
    } catch (err) {
      setError(formatNetworkError(err));
    }
  };

  const setRequestStatus = async (r: AssistanceRequest, status: AssistanceRequest["status"]) => {
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");
      const res = await networkService.updateAssistanceStatus(token, r.id, status);
      setMessage(res.message);
      await refresh();
    } catch (err) {
      setError(formatNetworkError(err));
    }
  };

  const partners = hospitals.filter(h => !h.isLocal);
  const local = hospitals.find(h => h.isLocal) || summary?.localHospital || null;

  return (
    <StaffLayout allowedRoles={["admin"]}>
      <PageHeader
        title="Hospital Network"
        description="Register connected hospitals, review status, and monitor assistance activity."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        <StatCard label="Connected hospitals" value={summary?.connectedHospitalCount ?? 0} icon={Building2} />
        <StatCard label="Online partners" value={summary?.hospitalsOnline ?? 0} icon={Building2} />
        <StatCard label="Active requests" value={summary?.activeEmergencyRequests ?? 0} icon={Activity} />
        <StatCard label="Pending" value={summary?.pendingAssistanceRequests ?? 0} icon={Activity} />
      </div>

      {local && (
        <Card className="rounded-2xl shadow-card mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">This hospital (local)</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p className="font-semibold">{local.hospitalName}</p>
            <p className="text-muted-foreground font-mono text-xs mt-1">{local.hospitalId}</p>
            <p className="text-muted-foreground mt-1">
              Status is configurable in the database ({local.status}) — not live presence telemetry.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Connected hospitals
        </h3>
        <Button type="button" size="sm" className="gap-1.5" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" />
          Register hospital
        </Button>
      </div>

      {error && <p className="text-sm text-destructive mb-3">{error}</p>}
      {message && (
        <p className="text-sm text-foreground bg-muted/50 rounded-xl px-3 py-2 mb-3">{message}</p>
      )}

      {partners.length === 0 ? (
        <Card className="rounded-2xl shadow-card mb-6">
          <CardContent className="py-4">
            <EmptyState
              icon={Building2}
              title="No connected hospitals found"
              description="Register a partner hospital to enable CareGuard assistance requests across the network."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3 mb-8">
          {partners.map(h => (
            <Card key={h.id} className="rounded-2xl shadow-card">
              <CardContent className="pt-4 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold truncate">{h.hospitalName}</p>
                    <Badge variant="secondary" className="text-[10px] shrink-0">
                      {h.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {[h.city, h.state].filter(Boolean).join(", ") || "—"} · {h.hospitalId}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1 truncate">
                    {h.departments.length ? h.departments.join(", ") : "No departments listed"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  {(["ONLINE", "BUSY", "OFFLINE"] as HospitalStatus[]).map(s => (
                    <Button
                      key={s}
                      type="button"
                      size="sm"
                      variant={h.status === s ? "default" : "outline"}
                      onClick={() => setHospitalStatus(h, s)}
                    >
                      {s}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
        Network assistance activity
      </h3>
      {requests.length === 0 ? (
        <Card className="rounded-2xl shadow-card">
          <CardContent className="py-4">
            <EmptyState
              icon={Activity}
              title="No active assistance requests"
              description="Assistance requests created through CareGuard will appear here for network oversight."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {requests.slice(0, 25).map(r => (
            <Card key={r.id} className="rounded-2xl shadow-card">
              <CardContent className="py-3 px-4 space-y-2 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-mono font-medium">{r.requestId}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {r.requestingHospitalId} → {r.targetHospitalId} · {r.emergencyType} ·{" "}
                      {r.requiredDepartment}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-[10px]">
                      {r.priority}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px]">
                      {r.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{fmt(r.createdAt)}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {r.status === "PENDING" && (
                    <>
                      <Button size="sm" onClick={() => setRequestStatus(r, "ACCEPTED")}>
                        Accept
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setRequestStatus(r, "REJECTED")}>
                        Reject
                      </Button>
                    </>
                  )}
                  {r.status === "ACCEPTED" && (
                    <Button size="sm" onClick={() => setRequestStatus(r, "IN_PROGRESS")}>
                      Start Assistance
                    </Button>
                  )}
                  {r.status === "IN_PROGRESS" && (
                    <Button size="sm" onClick={() => setRequestStatus(r, "RESOLVED")}>
                      Mark Resolved
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Register connected hospital</DialogTitle>
            <DialogDescription>
              Adds a partner hospital record to the network. Does not create Firebase users or demo
              data.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onRegister} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Hospital ID</Label>
              <Input
                className="mt-1 rounded-xl"
                value={form.hospitalId}
                onChange={e => setForm(f => ({ ...f, hospitalId: e.target.value }))}
                placeholder="HOSP-PARTNER-01"
                required
              />
            </div>
            <div>
              <Label>Hospital name</Label>
              <Input
                className="mt-1 rounded-xl"
                value={form.hospitalName}
                onChange={e => setForm(f => ({ ...f, hospitalName: e.target.value }))}
                required
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Registration / identifier</Label>
              <Input
                className="mt-1 rounded-xl"
                value={form.registrationId}
                onChange={e => setForm(f => ({ ...f, registrationId: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Address</Label>
              <Input
                className="mt-1 rounded-xl"
                value={form.address}
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
              />
            </div>
            <div>
              <Label>City</Label>
              <Input
                className="mt-1 rounded-xl"
                value={form.city}
                onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
              />
            </div>
            <div>
              <Label>State</Label>
              <Input
                className="mt-1 rounded-xl"
                value={form.state}
                onChange={e => setForm(f => ({ ...f, state: e.target.value }))}
              />
            </div>
            <div>
              <Label>Contact phone</Label>
              <Input
                className="mt-1 rounded-xl"
                value={form.contactPhone}
                onChange={e => setForm(f => ({ ...f, contactPhone: e.target.value }))}
              />
            </div>
            <div>
              <Label>Contact email</Label>
              <Input
                type="email"
                className="mt-1 rounded-xl"
                value={form.contactEmail}
                onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Departments (comma-separated)</Label>
              <Input
                className="mt-1 rounded-xl"
                value={form.departments}
                onChange={e => setForm(f => ({ ...f, departments: e.target.value }))}
                placeholder="Emergency, Cardiology, ICU"
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Facilities (comma-separated)</Label>
              <Input
                className="mt-1 rounded-xl"
                value={form.facilities}
                onChange={e => setForm(f => ({ ...f, facilities: e.target.value }))}
                placeholder="ICU, Ventilator, Blood Bank"
              />
            </div>
            <div>
              <Label>Status</Label>
              <select
                className="w-full mt-1 h-10 rounded-xl border border-input bg-background px-3 text-sm"
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value as HospitalStatus }))}
              >
                <option value="ONLINE">ONLINE</option>
                <option value="BUSY">BUSY</option>
                <option value="OFFLINE">OFFLINE</option>
              </select>
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.emergencySupport}
                  onChange={e => setForm(f => ({ ...f, emergencySupport: e.target.checked }))}
                />
                Emergency support available
              </label>
            </div>
            <DialogFooter className="sm:col-span-2 gap-2">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "Saving…" : "Register"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </StaffLayout>
  );
};

export default AdminNetworkPage;

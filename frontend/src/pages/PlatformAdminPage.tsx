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
import { formatNetworkError, type HospitalStatus } from "@/services/networkService";
import {
  platformService,
  type PlatformHospital,
  type PlatformSummary,
} from "@/services/platformService";
import { Building2, Plus, Shield } from "lucide-react";

const emptyHospitalForm = {
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

const emptyAdminForm = {
  fullName: "",
  email: "",
  department: "Administration",
  staffId: "",
  temporaryPassword: "",
};

function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function statusVariant(status: HospitalStatus): "default" | "secondary" | "outline" {
  if (status === "ONLINE") return "default";
  if (status === "BUSY") return "secondary";
  return "outline";
}

const PlatformAdminPage = () => {
  const { getAccessToken, staff, loading: authLoading } = useAuth();
  const isPlatform = Boolean(staff?.isPlatformAdmin);

  const [summary, setSummary] = useState<PlatformSummary | null>(null);
  const [hospitals, setHospitals] = useState<PlatformHospital[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(emptyHospitalForm);

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<PlatformHospital | null>(null);
  const [editForm, setEditForm] = useState(emptyHospitalForm);

  const [adminOpen, setAdminOpen] = useState(false);
  const [adminHospital, setAdminHospital] = useState<PlatformHospital | null>(null);
  const [adminForm, setAdminForm] = useState(emptyAdminForm);
  const [createdCred, setCreatedCred] = useState<{ email: string; password: string } | null>(null);

  const refresh = useCallback(async () => {
    if (authLoading || !isPlatform) return;
    const token = await getAccessToken();
    if (!token) return;
    setLoading(true);
    try {
      const [sum, list] = await Promise.all([
        platformService.getSummary(token),
        platformService.listHospitals(token),
      ]);
      setSummary(sum.summary);
      setHospitals(list.hospitals);
      setError(null);
    } finally {
      setLoading(false);
    }
  }, [authLoading, getAccessToken, isPlatform]);

  useEffect(() => {
    refresh().catch(err => {
      setError(formatNetworkError(err));
      setLoading(false);
    });
  }, [refresh]);

  if (!isPlatform) {
    return (
      <StaffLayout allowedRoles={["admin"]}>
        <PageHeader
          title="Platform Administration"
          description="Manage hospitals connected to the Smart Care Network."
        />
        <Card className="rounded-2xl shadow-card">
          <CardContent className="py-4">
            <EmptyState
              icon={Shield}
              title="Platform administrator access required"
              description="Hospital Admins manage staff within their own hospital. Only Platform Admins can register and manage hospitals on the network."
            />
          </CardContent>
        </Card>
      </StaffLayout>
    );
  }

  const openEdit = (h: PlatformHospital) => {
    setEditing(h);
    setEditForm({
      hospitalName: h.hospitalName,
      registrationId: h.registrationId,
      address: h.address,
      city: h.city,
      state: h.state,
      contactPhone: h.contactPhone,
      contactEmail: h.contactEmail,
      departments: h.departments.join(", "),
      facilities: h.facilities.join(", "),
      emergencySupport: h.emergencySupport,
      status: h.status,
    });
    setEditOpen(true);
  };

  const openAssignAdmin = (h: PlatformHospital) => {
    setAdminHospital(h);
    setAdminForm({
      ...emptyAdminForm,
      staffId: `ADM-${h.hospitalId.replace(/^HOSP-/, "")}`,
    });
    setCreatedCred(null);
    setAdminOpen(true);
  };

  const onCreateHospital = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");
      const res = await platformService.createHospital(token, {
        hospitalName: form.hospitalName.trim(),
        registrationId: form.registrationId.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        address: form.address.trim() || undefined,
        contactPhone: form.contactPhone.trim() || undefined,
        contactEmail: form.contactEmail.trim() || undefined,
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
      setAdminHospital(res.hospital);
      setAdminForm({
        ...emptyAdminForm,
        staffId: `ADM-${res.hospital.hospitalId.replace(/^HOSP-/, "")}`,
      });
      setCreatedCred(null);
      setAdminOpen(true);
    } catch (err) {
      setError(formatNetworkError(err));
    } finally {
      setBusy(false);
    }
  };

  const onUpdateHospital = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");
      const res = await platformService.updateHospital(token, editing.hospitalId, {
        hospitalName: editForm.hospitalName.trim(),
        registrationId: editForm.registrationId.trim(),
        address: editForm.address.trim(),
        city: editForm.city.trim(),
        state: editForm.state.trim(),
        contactPhone: editForm.contactPhone.trim(),
        contactEmail: editForm.contactEmail.trim(),
        departments: editForm.departments
          .split(",")
          .map(s => s.trim())
          .filter(Boolean),
        facilities: editForm.facilities
          .split(",")
          .map(s => s.trim())
          .filter(Boolean),
        emergencySupport: editForm.emergencySupport,
        status: editForm.status,
      });
      setMessage(res.message);
      setEditOpen(false);
      setEditing(null);
      await refresh();
    } catch (err) {
      setError(formatNetworkError(err));
    } finally {
      setBusy(false);
    }
  };

  const onAssignAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminHospital) return;
    setBusy(true);
    setError(null);
    setCreatedCred(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");
      const password = adminForm.temporaryPassword.trim();
      const res = await platformService.assignAdmin(token, adminHospital.hospitalId, {
        fullName: adminForm.fullName.trim(),
        email: adminForm.email.trim(),
        department: adminForm.department.trim() || "Administration",
        staffId: adminForm.staffId.trim(),
        temporaryPassword: password || undefined,
      });
      setMessage(res.message);
      if (res.createdFirebase && password) {
        setCreatedCred({ email: res.admin.email, password });
      } else {
        setAdminOpen(false);
      }
      await refresh();
    } catch (err) {
      setError(formatNetworkError(err));
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (h: PlatformHospital, status: HospitalStatus) => {
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");
      await platformService.updateHospital(token, h.hospitalId, { status });
      setMessage(`${h.hospitalName} → ${status}`);
      await refresh();
    } catch (err) {
      setError(formatNetworkError(err));
    }
  };

  return (
    <StaffLayout allowedRoles={["admin"]}>
      <PageHeader
        title="Platform Administration"
        description="Manage hospitals connected to the Smart Care Network. Hospital Admins manage staff inside their own hospital."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        <StatCard label="Total Hospitals" value={summary?.totalHospitals ?? 0} icon={Building2} />
        <StatCard label="Online Hospitals" value={summary?.onlineHospitals ?? 0} icon={Building2} />
        <StatCard label="Busy Hospitals" value={summary?.busyHospitals ?? 0} icon={Building2} />
        <StatCard
          label="Emergency Support"
          value={summary?.emergencySupportHospitals ?? 0}
          icon={Shield}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Network hospitals
        </h3>
        <Button
          size="sm"
          className="gap-1.5"
          onClick={() => {
            setForm(emptyHospitalForm);
            setAddOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Add Hospital
        </Button>
      </div>

      {error && <p className="text-sm text-destructive mb-3">{error}</p>}
      {message && (
        <p className="text-sm text-foreground bg-muted/50 rounded-xl px-3 py-2 mb-3">{message}</p>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading hospitals…</p>
      ) : hospitals.length === 0 ? (
        <Card className="rounded-2xl shadow-card">
          <CardContent className="py-4">
            <EmptyState
              icon={Building2}
              title="No hospitals registered"
              description="Add the first hospital to the Smart Care Network."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {hospitals.map(h => (
            <Card key={h.id} className="rounded-2xl shadow-card">
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-base">{h.hospitalName}</CardTitle>
                    <p className="text-xs text-muted-foreground font-mono mt-1">
                      {h.hospitalId}
                      {h.registrationId ? ` · ${h.registrationId}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusVariant(h.status)} className="text-[10px]">
                      {h.status}
                    </Badge>
                    {h.isLocal && (
                      <Badge variant="outline" className="text-[10px]">
                        Local
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">City / State</p>
                    <p className="font-medium">
                      {[h.city, h.state].filter(Boolean).join(", ") || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">Emergency</p>
                    <p className="font-medium">{h.emergencySupport ? "Available" : "No"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">Hospital Admin</p>
                    <p className="font-medium truncate">
                      {h.hospitalAdmin?.fullName || (
                        <span className="text-muted-foreground">Not assigned</span>
                      )}
                    </p>
                    {h.hospitalAdmin?.email && (
                      <p className="text-xs text-muted-foreground truncate">{h.hospitalAdmin.email}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">Created</p>
                    <p className="font-medium">{fmt(h.createdAt)}</p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground">Departments</p>
                  <p className="text-muted-foreground">
                    {h.departments.length ? h.departments.join(" · ") : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground">Facilities</p>
                  <p className="text-muted-foreground">
                    {h.facilities.length ? h.facilities.join(" · ") : "—"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => openEdit(h)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openAssignAdmin(h)}>
                    {h.hospitalAdmin ? "Update Admin" : "Assign Admin"}
                  </Button>
                  {(["ONLINE", "BUSY", "OFFLINE"] as HospitalStatus[]).map(s => (
                    <Button
                      key={s}
                      size="sm"
                      variant={h.status === s ? "default" : "ghost"}
                      disabled={h.status === s}
                      onClick={() => setStatus(h, s)}
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

      {/* Add Hospital */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Hospital</DialogTitle>
            <DialogDescription>
              Hospital ID is assigned automatically (next HOSP-NNN). Registration ID must be unique.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onCreateHospital} className="grid gap-3">
            <div>
              <Label>Hospital Name *</Label>
              <Input
                className="mt-1 rounded-xl"
                required
                value={form.hospitalName}
                onChange={e => setForm(f => ({ ...f, hospitalName: e.target.value }))}
              />
            </div>
            <div>
              <Label>Registration ID *</Label>
              <Input
                className="mt-1 rounded-xl"
                required
                value={form.registrationId}
                onChange={e => setForm(f => ({ ...f, registrationId: e.target.value }))}
                placeholder="CITYCARE-001"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>City *</Label>
                <Input
                  className="mt-1 rounded-xl"
                  required
                  value={form.city}
                  onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                />
              </div>
              <div>
                <Label>State *</Label>
                <Input
                  className="mt-1 rounded-xl"
                  required
                  value={form.state}
                  onChange={e => setForm(f => ({ ...f, state: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label>Address</Label>
              <Input
                className="mt-1 rounded-xl"
                value={form.address}
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Contact Phone</Label>
                <Input
                  className="mt-1 rounded-xl"
                  value={form.contactPhone}
                  onChange={e => setForm(f => ({ ...f, contactPhone: e.target.value }))}
                />
              </div>
              <div>
                <Label>Contact Email</Label>
                <Input
                  className="mt-1 rounded-xl"
                  type="email"
                  value={form.contactEmail}
                  onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label>Departments (comma-separated)</Label>
              <Input
                className="mt-1 rounded-xl"
                value={form.departments}
                onChange={e => setForm(f => ({ ...f, departments: e.target.value }))}
                placeholder="Cardiology, Emergency Medicine"
              />
            </div>
            <div>
              <Label>Facilities (comma-separated)</Label>
              <Input
                className="mt-1 rounded-xl"
                value={form.facilities}
                onChange={e => setForm(f => ({ ...f, facilities: e.target.value }))}
                placeholder="ICU, Emergency Department"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Status</Label>
                <select
                  className="w-full mt-1 h-10 rounded-xl border border-input bg-background px-3 text-sm"
                  value={form.status}
                  onChange={e =>
                    setForm(f => ({ ...f, status: e.target.value as HospitalStatus }))
                  }
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
                  Emergency Support
                </label>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "Creating…" : "Create Hospital"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Hospital */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Hospital</DialogTitle>
            <DialogDescription>
              {editing?.hospitalId} — hospital ID cannot be changed.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onUpdateHospital} className="grid gap-3">
            <div>
              <Label>Hospital Name *</Label>
              <Input
                className="mt-1 rounded-xl"
                required
                value={editForm.hospitalName}
                onChange={e => setEditForm(f => ({ ...f, hospitalName: e.target.value }))}
              />
            </div>
            <div>
              <Label>Registration ID *</Label>
              <Input
                className="mt-1 rounded-xl"
                required
                value={editForm.registrationId}
                onChange={e => setEditForm(f => ({ ...f, registrationId: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>City *</Label>
                <Input
                  className="mt-1 rounded-xl"
                  required
                  value={editForm.city}
                  onChange={e => setEditForm(f => ({ ...f, city: e.target.value }))}
                />
              </div>
              <div>
                <Label>State *</Label>
                <Input
                  className="mt-1 rounded-xl"
                  required
                  value={editForm.state}
                  onChange={e => setEditForm(f => ({ ...f, state: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label>Address</Label>
              <Input
                className="mt-1 rounded-xl"
                value={editForm.address}
                onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))}
              />
            </div>
            <div>
              <Label>Departments (comma-separated)</Label>
              <Input
                className="mt-1 rounded-xl"
                value={editForm.departments}
                onChange={e => setEditForm(f => ({ ...f, departments: e.target.value }))}
              />
            </div>
            <div>
              <Label>Facilities (comma-separated)</Label>
              <Input
                className="mt-1 rounded-xl"
                value={editForm.facilities}
                onChange={e => setEditForm(f => ({ ...f, facilities: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Status</Label>
                <select
                  className="w-full mt-1 h-10 rounded-xl border border-input bg-background px-3 text-sm"
                  value={editForm.status}
                  onChange={e =>
                    setEditForm(f => ({ ...f, status: e.target.value as HospitalStatus }))
                  }
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
                    checked={editForm.emergencySupport}
                    onChange={e =>
                      setEditForm(f => ({ ...f, emergencySupport: e.target.checked }))
                    }
                  />
                  Emergency Support
                </label>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "Saving…" : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Hospital Admin */}
      <Dialog
        open={adminOpen}
        onOpenChange={open => {
          if (!open) {
            setAdminOpen(false);
            setCreatedCred(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Assign Hospital Admin</DialogTitle>
            <DialogDescription>
              {adminHospital
                ? `${adminHospital.hospitalName} (${adminHospital.hospitalId})`
                : "Hospital Admin"}
              . Role will be Hospital Admin with isPlatformAdmin=false.
            </DialogDescription>
          </DialogHeader>
          {createdCred ? (
            <div className="space-y-3">
              <p className="text-sm text-foreground">
                Share these credentials securely. The temporary password is shown once.
              </p>
              <div className="rounded-xl bg-muted/50 px-3 py-2 text-sm font-mono">
                <p>{createdCred.email}</p>
                <p className="mt-1">{createdCred.password}</p>
              </div>
              <DialogFooter>
                <Button type="button" onClick={() => setAdminOpen(false)}>
                  Done
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={onAssignAdmin} className="grid gap-3">
              <div>
                <Label>Full Name *</Label>
                <Input
                  className="mt-1 rounded-xl"
                  required
                  value={adminForm.fullName}
                  onChange={e => setAdminForm(f => ({ ...f, fullName: e.target.value }))}
                />
              </div>
              <div>
                <Label>Email *</Label>
                <Input
                  className="mt-1 rounded-xl"
                  type="email"
                  required
                  value={adminForm.email}
                  onChange={e => setAdminForm(f => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div>
                <Label>Department</Label>
                <Input
                  className="mt-1 rounded-xl"
                  value={adminForm.department}
                  onChange={e => setAdminForm(f => ({ ...f, department: e.target.value }))}
                />
              </div>
              <div>
                <Label>Staff ID *</Label>
                <Input
                  className="mt-1 rounded-xl"
                  required
                  value={adminForm.staffId}
                  onChange={e => setAdminForm(f => ({ ...f, staffId: e.target.value }))}
                />
              </div>
              <div>
                <Label>Temporary Password</Label>
                <Input
                  className="mt-1 rounded-xl"
                  type="password"
                  autoComplete="new-password"
                  value={adminForm.temporaryPassword}
                  onChange={e => setAdminForm(f => ({ ...f, temporaryPassword: e.target.value }))}
                  placeholder="Required only if email is new in Firebase"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  If the email already exists in Firebase, the existing account is linked and the
                  password is not changed.
                </p>
              </div>
              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => setAdminOpen(false)}>
                  Skip for now
                </Button>
                <Button type="submit" disabled={busy}>
                  {busy ? "Saving…" : "Assign Admin"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </StaffLayout>
  );
};

export default PlatformAdminPage;

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, formatAuthError } from "@/contexts/AuthContext";
import {
  authService,
  type StaffAccountStatus,
  type StaffProfile,
  type StaffRole,
} from "@/services/authService";
import { Users } from "lucide-react";

const CREATABLE_ROLES: StaffRole[] = ["doctor", "nurse", "lab", "pharmacy", "billing", "reception", "admin"];
const STATUSES: StaffAccountStatus[] = ["INVITED", "ACTIVE", "SUSPENDED", "DISABLED"];

const emptyForm = {
  fullName: "",
  email: "",
  role: "doctor" as StaffRole,
  department: "",
  staffId: "",
  status: "ACTIVE" as StaffAccountStatus,
};

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function StaffManagement() {
  const { getAccessToken } = useAuth();
  const [staff, setStaff] = useState<StaffProfile[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<StaffProfile | null>(null);
  const [viewing, setViewing] = useState<StaffProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) return;
    const res = await authService.listStaff(token);
    setStaff(res.staff);
  }, [getAccessToken]);

  useEffect(() => {
    refresh().catch(err => setError(formatAuthError(err)));
  }, [refresh]);

  const validateForm = () => {
    if (!form.fullName.trim()) return "Full name is required.";
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      return "Enter a valid email address.";
    }
    if (!form.staffId.trim()) return "Staff ID is required.";
    if (!CREATABLE_ROLES.includes(form.role)) return "Select a valid role.";
    return null;
  };

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const v = validateForm();
    if (v) {
      setError(v);
      return;
    }
    setBusy(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");
      const res = await authService.createStaff(token, {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        role: form.role,
        department: form.department.trim(),
        staffId: form.staffId.trim(),
        status: form.status,
      });
      const parts = [res.message];
      if (res.temporaryPassword) parts.push(`Temporary password (share securely, not stored): ${res.temporaryPassword}`);
      if (res.passwordResetLink) parts.push(`Password reset link available — share securely with the staff member.`);
      setMessage(parts.join(" "));
      setForm(emptyForm);
      await refresh();
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (user: StaffProfile, status: StaffAccountStatus) => {
    setError(null);
    setMessage(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");
      await authService.updateStaff(token, user.id, { status });
      setMessage(`${user.fullName} → ${status}`);
      setViewing(null);
      setEditing(null);
      await refresh();
    } catch (err) {
      setError(formatAuthError(err));
    }
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setError(null);
    setBusy(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");
      await authService.updateStaff(token, editing.id, {
        fullName: editing.fullName,
        role: editing.role,
        department: editing.department,
        staffId: editing.staffId,
        status: editing.status,
      });
      setMessage("Staff record updated. Role changes apply on next session refresh / login.");
      setEditing(null);
      await refresh();
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="rounded-2xl shadow-card mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          Staff Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={onCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label>Full Name</Label>
            <Input
              className="mt-1 rounded-xl"
              value={form.fullName}
              onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
              required
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              className="mt-1 rounded-xl"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              required
            />
          </div>
          <div>
            <Label>Role</Label>
            <select
              className="w-full mt-1 h-10 rounded-xl border border-input bg-background px-3 text-sm"
              value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value as StaffRole }))}
            >
              {CREATABLE_ROLES.map(r => (
                <option key={r} value={r}>
                  {r.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Department</Label>
            <Input
              className="mt-1 rounded-xl"
              value={form.department}
              onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
            />
          </div>
          <div>
            <Label>Staff ID</Label>
            <Input
              className="mt-1 rounded-xl"
              placeholder="DOC-002"
              value={form.staffId}
              onChange={e => setForm(f => ({ ...f, staffId: e.target.value }))}
              required
            />
          </div>
          <div>
            <Label>Status</Label>
            <select
              className="w-full mt-1 h-10 rounded-xl border border-input bg-background px-3 text-sm"
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value as StaffAccountStatus }))}
            >
              {STATUSES.map(s => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={busy}>
              {busy ? "Creating…" : "Create staff account"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Backend creates Firebase Auth identity + Smart Care System record. Passwords are never stored in MongoDB.
            </p>
          </div>
        </form>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {message && <p className="text-sm text-foreground bg-muted/50 rounded-xl px-3 py-2 break-all">{message}</p>}

        {viewing && (
          <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm space-y-1">
            <div className="flex justify-between gap-2">
              <p className="font-semibold">View — {viewing.fullName}</p>
              <Button type="button" size="sm" variant="ghost" onClick={() => setViewing(null)}>
                Close
              </Button>
            </div>
            <p>Email: {viewing.email}</p>
            <p>Role: {viewing.role.toUpperCase()}</p>
            <p>Department: {viewing.department || "—"}</p>
            <p>Staff ID: {viewing.staffId}</p>
            <p>Status: {viewing.status}</p>
            <p>Created: {fmtDate(viewing.createdAt)}</p>
            <p>Last login: {fmtDate(viewing.lastLoginAt)}</p>
            <p className="text-xs text-muted-foreground">Firebase UID: {viewing.firebaseUid || "not linked"}</p>
          </div>
        )}

        {editing && (
          <form onSubmit={saveEdit} className="rounded-xl border border-border p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <p className="sm:col-span-2 font-semibold text-sm">Edit — {editing.email}</p>
            <div>
              <Label>Full Name</Label>
              <Input
                className="mt-1 rounded-xl"
                value={editing.fullName}
                onChange={e => setEditing({ ...editing, fullName: e.target.value })}
              />
            </div>
            <div>
              <Label>Role</Label>
              <select
                className="w-full mt-1 h-10 rounded-xl border border-input bg-background px-3 text-sm"
                value={editing.role}
                onChange={e => setEditing({ ...editing, role: e.target.value as StaffRole })}
              >
                {CREATABLE_ROLES.map(r => (
                  <option key={r} value={r}>
                    {r.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Department</Label>
              <Input
                className="mt-1 rounded-xl"
                value={editing.department}
                onChange={e => setEditing({ ...editing, department: e.target.value })}
              />
            </div>
            <div>
              <Label>Staff ID</Label>
              <Input
                className="mt-1 rounded-xl"
                value={editing.staffId}
                onChange={e => setEditing({ ...editing, staffId: e.target.value })}
              />
            </div>
            <div>
              <Label>Status</Label>
              <select
                className="w-full mt-1 h-10 rounded-xl border border-input bg-background px-3 text-sm"
                value={editing.status}
                onChange={e => setEditing({ ...editing, status: e.target.value as StaffAccountStatus })}
              >
                {STATUSES.map(s => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2 flex gap-2">
              <Button type="submit" disabled={busy}>
                Save
              </Button>
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-2 font-medium">Name</th>
                <th className="pb-2 font-medium">Email</th>
                <th className="pb-2 font-medium">Role</th>
                <th className="pb-2 font-medium hidden md:table-cell">Department</th>
                <th className="pb-2 font-medium">Staff ID</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium hidden lg:table-cell">Created</th>
                <th className="pb-2 font-medium hidden lg:table-cell">Last login</th>
                <th className="pb-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {staff.map(u => (
                <tr key={u.id} className="border-b border-border/50 last:border-0">
                  <td className="py-2 font-medium">{u.fullName}</td>
                  <td className="py-2 text-muted-foreground">{u.email}</td>
                  <td className="py-2 uppercase text-xs font-semibold">{u.role}</td>
                  <td className="py-2 hidden md:table-cell text-muted-foreground">{u.department || "—"}</td>
                  <td className="py-2 text-primary font-medium">{u.staffId}</td>
                  <td className="py-2 text-xs">{u.status}</td>
                  <td className="py-2 hidden lg:table-cell text-xs text-muted-foreground">{fmtDate(u.createdAt)}</td>
                  <td className="py-2 hidden lg:table-cell text-xs text-muted-foreground">{fmtDate(u.lastLoginAt)}</td>
                  <td className="py-2 text-right">
                    <div className="inline-flex flex-wrap justify-end gap-1">
                      <Button type="button" size="sm" variant="ghost" onClick={() => setViewing(u)}>
                        View
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setEditing({ ...u })}>
                        Edit
                      </Button>
                      {u.status !== "ACTIVE" && (
                        <Button type="button" size="sm" variant="ghost" onClick={() => setStatus(u, "ACTIVE")}>
                          Activate
                        </Button>
                      )}
                      {u.status !== "SUSPENDED" && u.status !== "DISABLED" && (
                        <Button type="button" size="sm" variant="ghost" onClick={() => setStatus(u, "SUSPENDED")}>
                          Suspend
                        </Button>
                      )}
                      {u.status !== "DISABLED" && (
                        <Button type="button" size="sm" variant="ghost" onClick={() => setStatus(u, "DISABLED")}>
                          Disable
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {staff.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-4 text-muted-foreground">
                    No staff records yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { authService, type StaffProfile, type StaffRole } from "@/services/authService";
import { formatAuthError } from "@/contexts/AuthContext";
import { Users } from "lucide-react";

const ROLES: StaffRole[] = ["doctor", "nurse", "lab", "pharmacy", "billing", "reception", "admin"];

const emptyForm = {
  fullName: "",
  email: "",
  role: "doctor" as StaffRole,
  department: "",
  staffId: "",
  temporaryPassword: "",
  status: "ACTIVE",
};

export function StaffManagement() {
  const { getAccessToken } = useAuth();
  const [staff, setStaff] = useState<StaffProfile[]>([]);
  const [form, setForm] = useState(emptyForm);
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

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");
      const res = await authService.createStaff(token, {
        fullName: form.fullName,
        email: form.email,
        role: form.role,
        department: form.department,
        staffId: form.staffId,
        status: form.status,
        temporaryPassword: form.temporaryPassword || undefined,
      });
      setMessage(
        res.temporaryPassword
          ? `${res.message} Temporary password: ${res.temporaryPassword}`
          : res.message
      );
      setForm(emptyForm);
      await refresh();
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const toggleStatus = async (user: StaffProfile) => {
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");
      const next = user.status === "DISABLED" ? "ACTIVE" : "DISABLED";
      await authService.updateStaff(token, user.id, { status: next });
      await refresh();
    } catch (err) {
      setError(formatAuthError(err));
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
              {ROLES.map(r => (
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
            <Label>Initial password (optional)</Label>
            <Input
              type="password"
              className="mt-1 rounded-xl"
              value={form.temporaryPassword}
              onChange={e => setForm(f => ({ ...f, temporaryPassword: e.target.value }))}
              placeholder="Leave blank to auto-generate"
            />
          </div>
          <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={busy}>
              {busy ? "Creating…" : "Create staff account"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Creates Firebase Auth identity (when Admin SDK is configured) and a Smart Care System user record. Passwords are never stored in MongoDB.
            </p>
          </div>
        </form>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {message && <p className="text-sm text-foreground bg-muted/50 rounded-xl px-3 py-2">{message}</p>}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-2 font-medium">Staff ID</th>
                <th className="pb-2 font-medium">Name</th>
                <th className="pb-2 font-medium">Email</th>
                <th className="pb-2 font-medium">Role</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {staff.map(u => (
                <tr key={u.id} className="border-b border-border/50 last:border-0">
                  <td className="py-2 font-medium text-primary">{u.staffId}</td>
                  <td className="py-2">{u.fullName}</td>
                  <td className="py-2 text-muted-foreground">{u.email}</td>
                  <td className="py-2 uppercase text-xs font-semibold">{u.role}</td>
                  <td className="py-2 text-xs">{u.status}</td>
                  <td className="py-2 text-right">
                    <Button type="button" size="sm" variant="ghost" onClick={() => toggleStatus(u)}>
                      {u.status === "DISABLED" ? "Activate" : "Disable"}
                    </Button>
                  </td>
                </tr>
              ))}
              {staff.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-4 text-muted-foreground">
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

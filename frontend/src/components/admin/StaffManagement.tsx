import { useCallback, useEffect, useMemo, useState } from "react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth, formatAuthError } from "@/contexts/AuthContext";
import {
  authService,
  type StaffAccountStatus,
  type StaffProfile,
  type StaffRole,
} from "@/services/authService";
import { MoreHorizontal, Plus, Search, Users, Eye, EyeOff, Copy, Check } from "lucide-react";
import { Link } from "react-router-dom";

const CREATABLE_ROLES: StaffRole[] = ["doctor", "nurse", "lab", "pharmacy", "billing", "reception"];
const FILTER_ROLES: Array<StaffRole | "all"> = ["all", ...CREATABLE_ROLES];
const FILTER_STATUSES: Array<"all" | "ACTIVE" | "INVITED" | "SUSPENDED"> = [
  "all",
  "ACTIVE",
  "INVITED",
  "SUSPENDED",
];

const emptyForm = {
  fullName: "",
  email: "",
  temporaryPassword: "",
  role: "doctor" as StaffRole,
  department: "",
  staffId: "",
  status: "ACTIVE" as StaffAccountStatus,
};

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function statusVariant(status: StaffAccountStatus): "default" | "secondary" | "destructive" | "outline" {
  if (status === "ACTIVE") return "default";
  if (status === "INVITED") return "secondary";
  if (status === "SUSPENDED") return "outline";
  return "destructive";
}

export function StaffManagement() {
  const { getAccessToken } = useAuth();
  const [staff, setStaff] = useState<StaffProfile[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<StaffRole | "all">("all");
  const [statusFilter, setStatusFilter] = useState<StaffAccountStatus | "all">("all");
  const [form, setForm] = useState(emptyForm);
  const [addOpen, setAddOpen] = useState(false);
  const [showTempPassword, setShowTempPassword] = useState(false);
  const [firebaseLookup, setFirebaseLookup] = useState<{
    email: string;
    existsInFirebase: boolean;
    firebaseUid: string | null;
    existsInStaffStore: boolean;
  } | null>(null);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{
    email: string;
    temporaryPassword: string;
  } | null>(null);
  const [revealCreatedPassword, setRevealCreatedPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [viewing, setViewing] = useState<StaffProfile | null>(null);
  const [editing, setEditing] = useState<StaffProfile | null>(null);
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

  const summary = useMemo(() => {
    return {
      total: staff.length,
      active: staff.filter(s => s.status === "ACTIVE").length,
      suspended: staff.filter(s => s.status === "SUSPENDED" || s.status === "DISABLED").length,
    };
  }, [staff]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return staff.filter(u => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (statusFilter !== "all") {
        if (statusFilter === "SUSPENDED") {
          if (u.status !== "SUSPENDED" && u.status !== "DISABLED") return false;
        } else if (u.status !== statusFilter) return false;
      }
      if (!q) return true;
      return (
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.staffId.toLowerCase().includes(q)
      );
    });
  }, [staff, search, roleFilter, statusFilter]);

  const validateForm = (data: typeof emptyForm, linkingExisting: boolean) => {
    if (!data.fullName.trim()) return "Full name is required.";
    if (!data.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
      return "Enter a valid email address.";
    }
    if (!linkingExisting && (!data.temporaryPassword || data.temporaryPassword.length < 8)) {
      return "Temporary password must be at least 8 characters.";
    }
    if (!data.staffId.trim()) return "Staff ID is required.";
    if (!CREATABLE_ROLES.includes(data.role)) return "Select a valid role.";
    return null;
  };

  const lookupEmail = async (emailRaw: string) => {
    const email = emailRaw.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFirebaseLookup(null);
      return;
    }
    setLookupBusy(true);
    try {
      const token = await getAccessToken();
      if (!token) return;
      const result = await authService.lookupFirebaseAccount(token, email);
      setFirebaseLookup(result);
    } catch (err) {
      setFirebaseLookup(null);
      setError(formatAuthError(err));
    } finally {
      setLookupBusy(false);
    }
  };

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const emailForShare = form.email.trim().toLowerCase();
    setBusy(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");

      let linkingExisting = Boolean(
        firebaseLookup?.existsInFirebase && firebaseLookup.email === emailForShare
      );
      if (!linkingExisting || firebaseLookup?.email !== emailForShare) {
        const lookup = await authService.lookupFirebaseAccount(token, emailForShare);
        setFirebaseLookup(lookup);
        linkingExisting = lookup.existsInFirebase;
      }

      const v = validateForm(form, linkingExisting);
      if (v) {
        setError(v);
        setBusy(false);
        return;
      }

      const passwordForShare = form.temporaryPassword;
      const result = await authService.createStaff(token, {
        fullName: form.fullName.trim(),
        email: emailForShare,
        role: form.role,
        department: form.department.trim(),
        staffId: form.staffId.trim(),
        status: form.status,
        ...(linkingExisting ? {} : { temporaryPassword: passwordForShare }),
      });
      setForm(emptyForm);
      setShowTempPassword(false);
      setFirebaseLookup(null);
      setAddOpen(false);
      setRevealCreatedPassword(false);
      setCopied(false);
      if (result.createdFirebase && passwordForShare) {
        setCreatedCredentials({ email: emailForShare, temporaryPassword: passwordForShare });
      } else {
        setCreatedCredentials(null);
      }
      setMessage(result.message);
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

  const onDelete = async (user: StaffProfile) => {
    if (
      !window.confirm(
        `Delete ${user.fullName} (${user.email})?\n\nThis removes the Smart Care System staff record and attempts to remove the Firebase Auth user.`
      )
    ) {
      return;
    }
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");
      await authService.deleteStaff(token, user.id);
      setMessage(`${user.fullName} deleted`);
      setViewing(null);
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
      setMessage("Staff record updated.");
      setEditing(null);
      await refresh();
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const ActionMenu = ({ user }: { user: StaffProfile }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" size="sm" variant="ghost" className="h-8 w-8 p-0 shrink-0" aria-label="More actions">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {(user.status === "ACTIVE" || user.status === "INVITED") && (
          <DropdownMenuItem onClick={() => setStatus(user, "SUSPENDED")}>Suspend</DropdownMenuItem>
        )}
        {(user.status === "SUSPENDED" || user.status === "DISABLED") && (
          <DropdownMenuItem onClick={() => setStatus(user, "ACTIVE")}>Activate</DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onDelete(user)}>
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-1 min-w-0">
          <div className="relative flex-1 min-w-0 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9 h-10 rounded-xl"
              placeholder="Search staff..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="h-10 rounded-xl border border-input bg-background px-3 text-sm min-w-[8.5rem]"
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value as StaffRole | "all")}
            aria-label="Filter by role"
          >
            {FILTER_ROLES.map(r => (
              <option key={r} value={r}>
                {r === "all" ? "All Roles" : r.charAt(0).toUpperCase() + r.slice(1)}
              </option>
            ))}
          </select>
          <select
            className="h-10 rounded-xl border border-input bg-background px-3 text-sm min-w-[8.5rem]"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as StaffAccountStatus | "all")}
            aria-label="Filter by status"
          >
            {FILTER_STATUSES.map(s => (
              <option key={s} value={s}>
                {s === "all" ? "All Status" : s.charAt(0) + s.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </div>
        <Button type="button" className="gap-1.5 shrink-0" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Staff
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="rounded-2xl shadow-card">
          <CardContent className="pt-4 pb-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Total Staff</p>
            <p className="text-2xl font-bold tabular-nums mt-1">{summary.total}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-card">
          <CardContent className="pt-4 pb-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Active</p>
            <p className="text-2xl font-bold tabular-nums mt-1">{summary.active}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-card">
          <CardContent className="pt-4 pb-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Suspended</p>
            <p className="text-2xl font-bold tabular-nums mt-1">{summary.suspended}</p>
          </CardContent>
        </Card>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {message && <p className="text-sm text-foreground bg-muted/50 rounded-xl px-3 py-2 break-all">{message}</p>}

      {/* Desktop / tablet table */}
      <Card className="rounded-2xl shadow-card hidden md:block overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm table-fixed min-w-[960px]">
            <colgroup>
              <col className="w-[14%]" />
              <col className="w-[18%]" />
              <col className="w-[9%]" />
              <col className="w-[12%]" />
              <col className="w-[9%]" />
              <col className="w-[9%]" />
              <col className="w-[11%]" />
              <col className="w-[11%]" />
              <col className="w-[7%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground bg-muted/30">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-3 py-3 font-medium">Email</th>
                <th className="px-3 py-3 font-medium">Role</th>
                <th className="px-3 py-3 font-medium">Department</th>
                <th className="px-3 py-3 font-medium">Staff ID</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium">Created</th>
                <th className="px-3 py-3 font-medium">Last Login</th>
                <th className="px-3 py-3 font-medium text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium text-foreground truncate" title={u.fullName}>
                    {u.fullName}
                  </td>
                  <td className="px-3 py-3 text-muted-foreground truncate" title={u.email}>
                    {u.email}
                  </td>
                  <td className="px-3 py-3 uppercase text-xs font-semibold tracking-wide">{u.role}</td>
                  <td className="px-3 py-3 text-muted-foreground truncate" title={u.department || undefined}>
                    {u.department || "—"}
                  </td>
                  <td className="px-3 py-3 font-medium text-primary whitespace-nowrap">{u.staffId}</td>
                  <td className="px-3 py-3">
                    <Badge variant={statusVariant(u.status)} className="text-[10px] font-semibold">
                      {u.status}
                    </Badge>
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">{fmtDate(u.createdAt)}</td>
                  <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">{fmtDate(u.lastLoginAt)}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end gap-0.5 whitespace-nowrap">
                      <Button type="button" size="sm" variant="ghost" className="h-8 px-2" onClick={() => setViewing(u)}>
                        View
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2"
                        onClick={() => setEditing({ ...u })}
                      >
                        Edit
                      </Button>
                      <ActionMenu user={u} />
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">
                    No staff match your search or filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {filtered.map(u => (
          <Card key={u.id} className="rounded-2xl shadow-card">
            <CardContent className="pt-4 pb-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-foreground truncate">{u.fullName}</p>
                  <p className="text-sm text-muted-foreground truncate">{u.email}</p>
                </div>
                <Badge variant={statusVariant(u.status)} className="shrink-0 text-[10px]">
                  {u.status}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground">Role</p>
                  <p className="font-medium uppercase text-xs">{u.role}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground">Staff ID</p>
                  <p className="font-medium text-primary">{u.staffId}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] uppercase text-muted-foreground">Department</p>
                  <p className="font-medium">{u.department || "—"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Button type="button" size="sm" variant="outline" className="flex-1" onClick={() => setViewing(u)}>
                  View
                </Button>
                <ActionMenu user={u} />
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No staff match your search or filters.</p>
        )}
      </div>

      {/* Add Staff dialog */}
      <Dialog
        open={addOpen}
        onOpenChange={open => {
          setAddOpen(open);
          if (!open) {
            setShowTempPassword(false);
            setFirebaseLookup(null);
            setForm(emptyForm);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>Add Staff</DialogTitle>
            <DialogDescription>
              Links an existing Firebase account by email, or creates a new Firebase identity when
              needed. Passwords are never stored in Smart Care System.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <Label>Full Name</Label>
              <Input
                className="mt-1 rounded-xl"
                value={form.fullName}
                onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                required
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Email</Label>
              <Input
                type="email"
                className="mt-1 rounded-xl"
                value={form.email}
                onChange={e => {
                  setForm(f => ({ ...f, email: e.target.value }));
                  setFirebaseLookup(null);
                }}
                onBlur={() => lookupEmail(form.email)}
                required
              />
              {lookupBusy && (
                <p className="text-xs text-muted-foreground mt-1.5">Checking Firebase…</p>
              )}
              {!lookupBusy && firebaseLookup?.existsInFirebase && (
                <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1.5">
                  Existing Firebase account found. This staff member will be linked to the existing
                  account. The existing password will not be changed.
                </p>
              )}
              {!lookupBusy && firebaseLookup && !firebaseLookup.existsInFirebase && (
                <p className="text-xs text-muted-foreground mt-1.5">
                  No existing Firebase account found. A new account will be created.
                </p>
              )}
            </div>
            {(!firebaseLookup || !firebaseLookup.existsInFirebase) && (
              <div className="sm:col-span-2">
                <Label htmlFor="temp-password">Temporary Password</Label>
                <div className="relative mt-1">
                  <Input
                    id="temp-password"
                    type={showTempPassword ? "text" : "password"}
                    className="rounded-xl pr-10"
                    value={form.temporaryPassword}
                    onChange={e => setForm(f => ({ ...f, temporaryPassword: e.target.value }))}
                    required={!firebaseLookup?.existsInFirebase}
                    minLength={8}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground"
                    onClick={() => setShowTempPassword(v => !v)}
                    aria-label={showTempPassword ? "Hide password" : "Show password"}
                  >
                    {showTempPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                  Required only when creating a new Firebase account. Not shown or stored for
                  existing accounts.
                </p>
              </div>
            )}
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
              <Label>Staff ID</Label>
              <Input
                className="mt-1 rounded-xl"
                placeholder="DOC-002"
                value={form.staffId}
                onChange={e => setForm(f => ({ ...f, staffId: e.target.value }))}
                required
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Department</Label>
              <Input
                className="mt-1 rounded-xl"
                value={form.department}
                onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
              />
            </div>
            <DialogFooter className="sm:col-span-2 gap-2">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy || lookupBusy}>
                {busy
                  ? firebaseLookup?.existsInFirebase
                    ? "Linking…"
                    : "Creating…"
                  : firebaseLookup?.existsInFirebase
                    ? "Link staff"
                    : "Create staff"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* One-time credentials share dialog (password from form memory only) */}
      <Dialog
        open={!!createdCredentials}
        onOpenChange={open => {
          if (!open) {
            setCreatedCredentials(null);
            setRevealCreatedPassword(false);
            setCopied(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Staff account created successfully.</DialogTitle>
            <DialogDescription>
              Share these credentials securely. The password will not be shown again.
            </DialogDescription>
          </DialogHeader>
          {createdCredentials && (
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-[10px] uppercase text-muted-foreground font-semibold">Email</p>
                <p className="font-medium break-all">{createdCredentials.email}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-muted-foreground font-semibold">
                  Temporary password
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 rounded-lg bg-muted px-3 py-2 font-mono text-sm">
                    {revealCreatedPassword
                      ? createdCredentials.temporaryPassword
                      : "••••••••"}
                  </code>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setRevealCreatedPassword(v => !v)}
                  >
                    {revealCreatedPassword ? "Hide" : "Show"}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(createdCredentials.temporaryPassword);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      } catch {
                        setError("Could not copy to clipboard.");
                      }
                    }}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    <span className="ml-1">{copied ? "Copied" : "Copy password"}</span>
                  </Button>
                </div>
              </div>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Share these credentials securely. The password will not be shown again.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              onClick={() => {
                setCreatedCredentials(null);
                setRevealCreatedPassword(false);
                setCopied(false);
              }}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View dialog */}
      <Dialog open={!!viewing} onOpenChange={open => !open && setViewing(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          {viewing && (
            <>
              <DialogHeader>
                <DialogTitle>{viewing.fullName}</DialogTitle>
                <DialogDescription>Staff account details</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="col-span-2">
                  <p className="text-[10px] uppercase text-muted-foreground font-semibold">Email</p>
                  <p className="font-medium break-all">{viewing.email}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground font-semibold">Role</p>
                  <p className="font-medium uppercase">{viewing.role}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground font-semibold">Staff ID</p>
                  <p className="font-medium text-primary">{viewing.staffId}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground font-semibold">Department</p>
                  <p className="font-medium">{viewing.department || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground font-semibold">Status</p>
                  <Badge variant={statusVariant(viewing.status)} className="mt-0.5">
                    {viewing.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground font-semibold">Created</p>
                  <p className="font-medium text-xs">{fmtDate(viewing.createdAt)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground font-semibold">Last login</p>
                  <p className="font-medium text-xs">{fmtDate(viewing.lastLoginAt)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] uppercase text-muted-foreground font-semibold">Authentication</p>
                  <p className="font-medium text-xs">
                    {viewing.firebaseUid ? `Linked (UID ${viewing.firebaseUid.slice(0, 8)}…)` : "Not linked to Firebase yet"}
                  </p>
                </div>
              </div>
              <DialogFooter className="flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditing({ ...viewing });
                    setViewing(null);
                  }}
                >
                  Edit
                </Button>
                {viewing.status === "ACTIVE" || viewing.status === "INVITED" ? (
                  <Button type="button" variant="outline" onClick={() => setStatus(viewing, "SUSPENDED")}>
                    Suspend
                  </Button>
                ) : (
                  <Button type="button" variant="outline" onClick={() => setStatus(viewing, "ACTIVE")}>
                    Activate
                  </Button>
                )}
                <Button type="button" variant="destructive" onClick={() => onDelete(viewing)}>
                  Delete
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={open => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          {editing && (
            <>
              <DialogHeader>
                <DialogTitle>Edit staff</DialogTitle>
                <DialogDescription>{editing.email}</DialogDescription>
              </DialogHeader>
              <form onSubmit={saveEdit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
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
                  <Label>Status</Label>
                  <select
                    className="w-full mt-1 h-10 rounded-xl border border-input bg-background px-3 text-sm"
                    value={editing.status}
                    onChange={e => setEditing({ ...editing, status: e.target.value as StaffAccountStatus })}
                  >
                    {(["INVITED", "ACTIVE", "SUSPENDED"] as StaffAccountStatus[]).map(s => (
                      <option key={s} value={s}>
                        {s}
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
                <DialogFooter className="sm:col-span-2 gap-2">
                  <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={busy}>
                    Save
                  </Button>
                </DialogFooter>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Compact dashboard teaser — not the full staff table. */
export function StaffQuickAccessCard() {
  const { getAccessToken } = useAuth();
  const [stats, setStats] = useState({ active: 0, invited: 0 });

  useEffect(() => {
    void (async () => {
      try {
        const token = await getAccessToken();
        if (!token) return;
        const res = await authService.listStaff(token);
        setStats({
          active: res.staff.filter(s => s.status === "ACTIVE").length,
          invited: res.staff.filter(s => s.status === "INVITED").length,
        });
      } catch {
        /* ignore */
      }
    })();
  }, [getAccessToken]);

  return (
    <Card className="rounded-2xl shadow-card">
      <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          Staff
        </CardTitle>
        <Button asChild size="sm" variant="outline">
          <Link to="/admin/staff">Manage Staff →</Link>
        </Button>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground tabular-nums">{stats.active}</span> active staff
          {stats.invited > 0 && (
            <>
              {" · "}
              <span className="font-semibold text-foreground tabular-nums">{stats.invited}</span> pending invitation
              {stats.invited === 1 ? "" : "s"}
            </>
          )}
        </p>
      </CardContent>
    </Card>
  );
}

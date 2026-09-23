import { ReactNode, useMemo, useState } from "react";
import { Link, useLocation, Navigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Stethoscope,
  Heart,
  Pill,
  Receipt,
  FlaskConical,
  Menu,
  LogOut,
  Bell,
  ChevronDown,
  Shield,
  Building2,
} from "lucide-react";
import hospitalLogo from "@/assets/hospital-logo.png";
import { useAuth, ROLE_NAV, ROLE_LABELS, StaffRole } from "@/contexts/AuthContext";
import { usePatients } from "@/contexts/PatientContext";
import { useCareGuard } from "@/contexts/CareGuardContext";
import { DemoModeBanner } from "@/components/DemoModeBanner";
import { StaffProfileCard } from "@/components/StaffProfileCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const iconMap: Record<string, typeof LayoutDashboard> = {
  Dashboard: LayoutDashboard,
  Registration: Users,
  Doctor: Stethoscope,
  Patients: Stethoscope,
  Nurse: Heart,
  "Nursing Station": Heart,
  Pharmacy: Pill,
  Billing: Receipt,
  Laboratory: FlaskConical,
  Lab: FlaskConical,
  CareGuard: Shield,
  "Staff Management": Users,
  "Connected Hospitals": Building2,
  "Hospital Network": Building2,
};

const GROUP_LABELS: Record<StaffRole, { title: string; paths?: string[] }[]> = {
  admin: [
    { title: "Overview", paths: ["/admin", "/careguard", "/careguard/hospitals"] },
    { title: "Clinical", paths: ["/doctor", "/nurse"] },
    { title: "Diagnostics", paths: ["/lab", "/pharmacy"] },
    { title: "Operations", paths: ["/reception", "/billing", "/admin/staff", "/admin/network"] },
  ],
  reception: [{ title: "Front desk" }],
  doctor: [{ title: "Clinical", paths: ["/doctor", "/careguard", "/careguard/hospitals"] }],
  nurse: [{ title: "Clinical", paths: ["/nurse", "/careguard", "/careguard/hospitals"] }],
  pharmacy: [{ title: "Diagnostics", paths: ["/pharmacy", "/careguard"] }],
  billing: [{ title: "Finance", paths: ["/billing", "/careguard"] }],
  lab: [{ title: "Diagnostics", paths: ["/lab", "/careguard"] }],
};

export const StaffLayout = ({ children, allowedRoles }: { children: ReactNode; allowedRoles?: StaffRole[] }) => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { role, staff, logout, loading } = useAuth();
  const { patients } = usePatients();
  const { getRoleSignals } = useCareGuard();

  const unread = useMemo(
    () => patients.reduce((n, p) => n + p.notifications.filter(x => !x.read).length, 0),
    [patients]
  );
  const careguardOpen = getRoleSignals(role).length;

  // Wait for Firebase + session hydrate before treating missing role as logged-out
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Restoring session…
      </div>
    );
  }

  if (!role || role === "family") {
    return <Navigate to="/login" replace />;
  }

  if (staff?.mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role) && role !== "admin") {
    const home = ROLE_NAV[role]?.[0]?.path || "/login";
    return <Navigate to={home} replace />;
  }

  const navItems = (ROLE_NAV[role] || []).filter(item => {
    // Platform network registration is not a hospital-facing admin workflow
    if (item.path === "/admin/network" && !staff?.isPlatformAdmin) return false;
    return true;
  });
  const groups = GROUP_LABELS[role] || [{ title: "Workspace" }];

  const renderNav = (onNavigate?: () => void) => (
    <nav className="flex-1 py-4 space-y-5 px-3 overflow-y-auto">
      {groups.map(group => {
        const items = group.paths
          ? navItems.filter(i => group.paths!.includes(i.path))
          : navItems;
        if (items.length === 0) return null;
        return (
          <div key={group.title}>
            <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {group.title}
            </p>
            <div className="space-y-0.5">
              {items.map(item => {
                const active =
                  item.path === "/admin"
                    ? location.pathname === "/admin"
                    : item.path === "/careguard"
                      ? location.pathname === "/careguard"
                      : location.pathname === item.path ||
                        location.pathname.startsWith(`${item.path}/`);
                const Icon = iconMap[item.label] || LayoutDashboard;
                return (
                  <Link
                    key={item.path + item.label}
                    to={item.path}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                        : "text-sidebar-foreground hover:bg-muted"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate flex-1">{item.label}</span>
                    {item.path === "/careguard" && careguardOpen > 0 && (
                      <span className="text-[10px] font-bold tabular-nums bg-primary/15 text-primary rounded-full px-1.5 py-0.5">
                        {careguardOpen}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-canvas">
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-foreground/20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={cn(
          "fixed lg:sticky top-0 left-0 z-40 h-screen w-[15.5rem] bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border transition-transform lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border">
          <img src={hospitalLogo} alt="Smart Care System" width={36} height={36} className="rounded-lg" />
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-foreground leading-tight truncate">Smart Care System</h1>
            <p className="text-[11px] text-muted-foreground">Connected hospital care</p>
          </div>
        </div>

        <div className="mx-3 mt-4 rounded-2xl bg-primary/5 border border-primary/10 px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Active role</p>
          <p className="text-sm font-semibold text-foreground">{ROLE_LABELS[role]}</p>
          {staff?.fullName && (
            <p className="text-[11px] text-muted-foreground truncate mt-0.5">{staff.fullName}</p>
          )}
        </div>

        {renderNav(() => setSidebarOpen(false))}

        <div className="p-3 border-t border-sidebar-border">
          <Link
            to="/login"
            onClick={() => {
              void logout();
            }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Link>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 bg-card/90 backdrop-blur-md border-b border-border px-4 md:px-6 py-3 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl hover:bg-muted lg:hidden"
            type="button"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5 text-foreground" />
          </button>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground truncate lg:hidden">
              {ROLE_LABELS[role]} workspace
            </p>
            <p className="hidden lg:block text-sm text-muted-foreground">
              Smart Care System · unified patient care
            </p>
          </div>

          <Button variant="ghost" size="icon" className="relative rounded-full" type="button" aria-label="Notifications">
            <Bell className="h-4 w-4" />
            {unread > 0 && (
              <span className="absolute top-1.5 right-1.5 h-4 min-w-4 px-1 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Button>

          <div className="hidden sm:flex items-center gap-2 rounded-full border border-border bg-card pl-1 pr-3 py-1">
            <div className="h-8 w-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold">
              {ROLE_LABELS[role].slice(0, 1)}
            </div>
            <div className="leading-tight">
              <p className="text-xs font-semibold text-foreground">{staff?.fullName || ROLE_LABELS[role]}</p>
              <p className="text-[10px] text-muted-foreground">{ROLE_LABELS[role]}</p>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-[1400px] w-full mx-auto animate-fade-in overflow-x-hidden">
          <DemoModeBanner />
          <StaffProfileCard />
          {children}
        </main>
      </div>
    </div>
  );
};

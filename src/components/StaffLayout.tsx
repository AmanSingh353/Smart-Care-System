import { ReactNode, useState } from "react";
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
} from "lucide-react";
import hospitalLogo from "@/assets/hospital-logo.png";
import { useAuth, ROLE_NAV, ROLE_LABELS, StaffRole } from "@/contexts/AuthContext";

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
};

export const StaffLayout = ({ children, allowedRoles }: { children: ReactNode; allowedRoles?: StaffRole[] }) => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { role, logout } = useAuth();

  if (!role || role === "family") {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role) && role !== "admin") {
    const home = ROLE_NAV[role]?.[0]?.path || "/";
    return <Navigate to={home} replace />;
  }

  const navItems = ROLE_NAV[role] || [];

  return (
    <div className="flex min-h-screen">
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-foreground/20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-60 bg-sidebar text-sidebar-foreground flex flex-col transition-transform lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
          <img src={hospitalLogo} alt="Hospital Logo" width={36} height={36} />
          <div>
            <h1 className="text-sm font-bold text-sidebar-primary-foreground leading-tight">SCS30</h1>
            <p className="text-xs text-sidebar-foreground/70">Smart Care System</p>
          </div>
        </div>

        <div className="px-5 py-3 border-b border-sidebar-border">
          <p className="text-[10px] uppercase tracking-wider text-sidebar-foreground/50">Signed in as</p>
          <p className="text-sm font-medium text-sidebar-primary-foreground">{ROLE_LABELS[role]}</p>
        </div>

        <nav className="flex-1 py-4 space-y-1 px-3">
          {navItems.map(item => {
            const active = location.pathname === item.path;
            const Icon = iconMap[item.label] || LayoutDashboard;
            return (
              <Link
                key={item.path + item.label}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <Link
            to="/"
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Link>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 bg-card border-b border-border px-4 py-3 flex items-center gap-3 lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-md hover:bg-muted" type="button">
            <Menu className="h-5 w-5 text-foreground" />
          </button>
          <span className="text-sm font-semibold text-foreground">SCS30 · {ROLE_LABELS[role]}</span>
        </header>
        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
};

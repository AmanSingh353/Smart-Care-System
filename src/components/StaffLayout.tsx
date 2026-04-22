import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, Stethoscope, Heart, Pill, Receipt, Settings, Menu, X, LogOut } from "lucide-react";
import hospitalLogo from "@/assets/hospital-logo.png";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/admin" },
  { label: "Patients", icon: Users, path: "/admin" },
  { label: "Doctors", icon: Stethoscope, path: "/doctor" },
  { label: "Nurses", icon: Heart, path: "/nurse" },
  { label: "Pharmacy", icon: Pill, path: "/pharmacy" },
  { label: "Billing", icon: Receipt, path: "/billing" },
  { label: "Registration", icon: Settings, path: "/reception" },
];

export const StaffLayout = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-foreground/20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-sidebar text-sidebar-foreground flex flex-col transition-transform lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
          <img src={hospitalLogo} alt="Hospital Logo" width={36} height={36} />
          <div>
            <h1 className="text-sm font-bold text-sidebar-primary-foreground leading-tight">30-Second</h1>
            <p className="text-xs text-sidebar-foreground/70">Smart Care System</p>
          </div>
        </div>
        <nav className="flex-1 py-4 space-y-1 px-3">
          {navItems.map(item => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.label}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${active ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"}`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <Link to="/" className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-colors">
            <LogOut className="h-4 w-4" />
            Logout
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 bg-card border-b border-border px-4 py-3 flex items-center gap-3 lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-md hover:bg-muted">
            <Menu className="h-5 w-5 text-foreground" />
          </button>
          <span className="text-sm font-semibold text-foreground">Smart Care System</span>
        </header>
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

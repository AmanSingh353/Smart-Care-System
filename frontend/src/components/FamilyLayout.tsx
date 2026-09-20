import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { User, Receipt, MessageSquare, Bell, LogOut, Activity } from "lucide-react";
import hospitalLogo from "@/assets/hospital-logo.png";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { label: "Overview", icon: User, hash: "#info" },
  { label: "Treatment", icon: Activity, hash: "#treatment" },
  { label: "Live Bill", icon: Receipt, hash: "#bill" },
  { label: "Requests", icon: MessageSquare, hash: "#requests" },
  { label: "Alerts", icon: Bell, hash: "#notifications" },
];

export const FamilyLayout = ({ children }: { children: ReactNode }) => {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <header className="sticky top-0 z-20 bg-card/90 backdrop-blur-md border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <img src={hospitalLogo} alt="Smart Care System" width={28} height={28} className="rounded-md" />
            <div className="min-w-0">
              <span className="text-sm font-bold text-foreground block leading-tight truncate">Family Care View</span>
              <span className="text-[10px] text-muted-foreground">Live updates from the hospital</span>
            </div>
          </div>
          <Link
            to="/login"
            onClick={logout}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </Link>
        </div>
        <nav className="max-w-5xl mx-auto px-4 flex gap-1 overflow-x-auto pb-0">
          {navItems.map(item => (
            <a
              key={item.label}
              href={item.hash}
              className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:border-border transition-colors whitespace-nowrap"
            >
              <item.icon className="h-3.5 w-3.5" />
              {item.label}
            </a>
          ))}
        </nav>
      </header>
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6 md:py-8 animate-fade-in">{children}</main>
    </div>
  );
};

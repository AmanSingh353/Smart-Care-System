import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { User, Receipt, MessageSquare, Bell, LogOut } from "lucide-react";
import hospitalLogo from "@/assets/hospital-logo.png";

const navItems = [
  { label: "Patient Info", icon: User, hash: "#info" },
  { label: "Live Bill", icon: Receipt, hash: "#bill" },
  { label: "Requests", icon: MessageSquare, hash: "#requests" },
  { label: "Notifications", icon: Bell, hash: "#notifications" },
];

export const FamilyLayout = ({ children }: { children: ReactNode }) => {
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-20 bg-card border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={hospitalLogo} alt="Hospital Logo" width={28} height={28} />
            <span className="text-sm font-semibold text-foreground">Smart Care System</span>
          </div>
          <Link to="/" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <LogOut className="h-3.5 w-3.5" />
            Logout
          </Link>
        </div>
        <nav className="max-w-5xl mx-auto px-4 flex gap-1 overflow-x-auto pb-0">
          {navItems.map(item => {
            const active = location.hash === item.hash || (!location.hash && item.hash === "#info");
            return (
              <a
                key={item.label}
                href={item.hash}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"}`}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </a>
            );
          })}
        </nav>
      </header>
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        {children}
      </main>
    </div>
  );
};

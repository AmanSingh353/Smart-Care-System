import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X, ArrowRight } from "lucide-react";
import hospitalLogo from "@/assets/hospital-logo.png";
import { Button } from "@/components/ui/button";

const links = [
  { label: "Platform", href: "#platform" },
  { label: "Solutions", href: "#journey" },
  { label: "Intelligence", href: "#intelligence" },
  { label: "Family", href: "#family" },
  { label: "Emergency Network", href: "#nece" },
];

export function LandingNavbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-card/80 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between gap-4">
        <a href="#top" className="flex items-center gap-2.5 min-w-0">
          <img src={hospitalLogo} alt="" width={32} height={32} className="rounded-lg" />
          <span className="font-bold text-foreground truncate">Smart Care System</span>
        </a>

        <nav className="hidden lg:flex items-center gap-1">
          {links.map(l => (
            <a
              key={l.href}
              href={l.href}
              className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden sm:flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/login">Enter Smart Care System</Link>
          </Button>
        </div>

        <button
          type="button"
          className="lg:hidden p-2 rounded-xl hover:bg-muted"
          onClick={() => setOpen(v => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="lg:hidden border-t border-border bg-card px-4 py-4 space-y-1 animate-fade-in">
          {links.map(l => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block px-3 py-2.5 text-sm font-medium text-foreground rounded-xl hover:bg-muted"
            >
              {l.label}
            </a>
          ))}
          <Button asChild className="w-full mt-2">
            <Link to="/login" onClick={() => setOpen(false)}>
              Enter Smart Care System <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      )}
    </header>
  );
}

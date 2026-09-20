import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePatients } from "@/contexts/PatientContext";
import { useCareGuard } from "@/contexts/CareGuardContext";
import { Button } from "@/components/ui/button";
import { isDemoMode, CANONICAL_DEMO_PATIENT } from "@/config/demo";
import { RotateCcw, Wifi, WifiOff } from "lucide-react";

/** Compact DEMO MODE strip — reset is admin-only and clearly labeled. */
export function DemoModeBanner() {
  const { role } = useAuth();
  const { resetDemoData } = usePatients();
  const { resetDemoSignals, backendConnected } = useCareGuard();

  if (!isDemoMode() || !role || role === "family") return null;

  return (
    <div className="mb-4 rounded-xl border border-primary/20 bg-primary/[0.04] px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
      <div className="min-w-0 space-y-0.5">
        <p className="font-semibold text-foreground">
          DEMO MODE · fictional data only
        </p>
        <p className="text-muted-foreground truncate">
          Canonical live demo: register <span className="font-medium text-foreground">{CANONICAL_DEMO_PATIENT.name}</span> at Reception
          {" · "}
          {backendConnected ? (
            <span className="inline-flex items-center gap-1 text-success">
              <Wifi className="h-3 w-3" /> CareGuard live link
            </span>
          ) : (
            <span className="inline-flex items-center gap-1">
              <WifiOff className="h-3 w-3" /> Offline-capable (local CareGuard)
            </span>
          )}
        </p>
      </div>
      <div className="flex flex-wrap gap-2 shrink-0">
        {role === "admin" && (
          <>
            <Button asChild size="sm" variant="outline">
              <Link to="/careguard">CareGuard</Link>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => {
                if (
                  !window.confirm(
                    "Reset DEMO DATA only?\n\nThis restores fictional patients, workflows, and CareGuard signals. It does not touch any production database."
                  )
                ) {
                  return;
                }
                resetDemoData();
                setTimeout(() => resetDemoSignals(), 80);
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset Demo Data
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

import { Link } from "react-router-dom";
import { ArrowRight, Activity, FlaskConical, Pill, Shield, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePatients } from "@/contexts/PatientContext";
import { isPatientActive, getBillTotal } from "@/data/mockData";
import { StatusBadge } from "@/components/dashboard/StatusBadge";

export function LandingHero() {
  const { patients } = usePatients();
  const active = patients.filter(isPatientActive);
  const preview = active.slice(0, 3);
  const pendingTests = patients.reduce(
    (n, p) => n + p.tests.filter(t => t.status !== "Completed").length,
    0
  );
  const unpaid = patients.filter(p => p.billStatus === "Unpaid").length;

  return (
    <section className="container py-14 md:py-20 lg:py-24">
      <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
        <div className="space-y-5 md:space-y-6 animate-fade-in">
          <p className="text-sm font-bold tracking-wide text-primary">Smart Care System</p>
          <h1 className="text-4xl md:text-5xl lg:text-[3.35rem] font-extrabold tracking-tight text-foreground text-balance leading-[1.08]">
            Connected hospital care, built around one patient record.
          </h1>
          <p className="text-base md:text-lg text-muted-foreground max-w-xl leading-relaxed">
            One unified record across Reception, Doctor, Lab, Pharmacy, Nursing, Billing and Family —
            with CareGuard helping teams see what needs attention next.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Button asChild size="lg" className="min-w-[10rem]">
              <Link to="/login">
                Enter Smart Care System <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#platform">See how it works</a>
            </Button>
          </div>
          <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground pt-1">
            <li className="font-medium text-foreground/85">Unified patient record</li>
            <li aria-hidden="true">·</li>
            <li>Connected departments</li>
            <li aria-hidden="true">·</li>
            <li className="inline-flex items-center gap-1">
              <Shield className="h-3.5 w-3.5 text-primary" aria-hidden />
              CareGuard intelligence
            </li>
          </ul>
        </div>

        <div className="relative animate-fade-in">
          <div className="absolute -inset-4 bg-primary/10 blur-3xl rounded-full opacity-50 pointer-events-none" aria-hidden />
          <div className="relative rounded-3xl border border-border bg-card shadow-soft p-4 md:p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Live preview</p>
                <p className="text-sm font-bold text-foreground">Hospital command snapshot</p>
              </div>
              <StatusBadge status="Under Treatment" />
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Active", value: active.length, icon: Users },
                { label: "Pending labs", value: pendingTests, icon: FlaskConical },
                { label: "Unpaid", value: unpaid, icon: Activity },
              ].map(s => (
                <div key={s.label} className="rounded-2xl bg-muted/60 border border-border/60 p-3 transition-colors hover:bg-muted/80">
                  <s.icon className="h-3.5 w-3.5 text-primary mb-2" aria-hidden />
                  <p className="text-lg font-bold tabular-nums">{s.value}</p>
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              {preview.map(p => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background/80 px-3 py-2.5 transition-colors hover:border-primary/25"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{p.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {p.id} · {p.assignedDoctor}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <StatusBadge status={p.treatmentStatus} />
                    <p className="text-[10px] text-muted-foreground mt-1 tabular-nums">
                      ₹{getBillTotal(p.billItems).toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>
              ))}
              {preview.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No active patients yet. Register one to see the live preview.
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground rounded-xl bg-primary/5 border border-primary/10 px-3 py-2">
              <Pill className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden />
              <span>Live data from the Smart Care System patient record</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

import { Link } from "react-router-dom";
import { ArrowRight, Activity, FlaskConical, Pill, Users } from "lucide-react";
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
    <section className="container py-12 md:py-20 lg:py-24">
      <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
        <div className="space-y-6 animate-fade-in">
          <p className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
            SCS30 · Connected hospital care
          </p>
          <h1 className="text-4xl md:text-5xl lg:text-[3.25rem] font-extrabold tracking-tight text-foreground text-balance leading-[1.1]">
            Smart hospital care, connected.
          </h1>
          <p className="text-base md:text-lg text-muted-foreground max-w-xl leading-relaxed">
            Smart Care System connects patients, doctors, nurses, labs, pharmacy, billing and families
            around one unified patient journey — so every department works from the same live record.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <a href="#platform">
                Explore Smart Care <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/login">Enter Hospital</Link>
            </Button>
          </div>
          <p className="text-sm font-medium text-foreground/80">
            One patient record · Every department connected
          </p>
        </div>

        {/* Live product preview from PatientContext */}
        <div className="relative animate-fade-in">
          <div className="absolute -inset-4 bg-primary/10 blur-3xl rounded-full opacity-60 pointer-events-none" />
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
                <div key={s.label} className="rounded-2xl bg-muted/60 border border-border/60 p-3">
                  <s.icon className="h-3.5 w-3.5 text-primary mb-2" />
                  <p className="text-lg font-bold tabular-nums">{s.value}</p>
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              {preview.map(p => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background/80 px-3 py-2.5"
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
                <p className="text-sm text-muted-foreground text-center py-6">No active patients yet</p>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground rounded-xl bg-primary/5 px-3 py-2">
              <Pill className="h-3.5 w-3.5 text-primary" />
              Data shown from the live Smart Care patient store
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

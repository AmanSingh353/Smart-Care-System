import { Building2, Network, BedDouble, Stethoscope, Ambulance, ArrowLeftRight } from "lucide-react";

export function LandingNece() {
  return (
    <section id="nece" className="container py-16 md:py-20">
      <div className="rounded-3xl border border-border bg-card p-6 md:p-10 shadow-soft">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Emergency network</p>
          <span className="text-[10px] font-bold uppercase tracking-wider rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
            Future capability
          </span>
        </div>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-balance max-w-2xl">
          NECE — Emergency Care Exchange
        </h2>
        <p className="mt-3 text-muted-foreground max-w-2xl leading-relaxed">
          A planned network layer for sharing critical capacity between hospitals during emergencies.
          This is distinct from the currently live Smart Care coordination platform inside a single hospital.
        </p>

        <div className="mt-8 flex flex-col md:flex-row items-stretch justify-center gap-4 md:gap-6">
          <div className="flex-1 rounded-2xl border border-border bg-muted/30 p-5 text-center">
            <Building2 className="h-6 w-6 text-primary mx-auto mb-2" />
            <p className="font-bold">Hospital A</p>
            <p className="text-xs text-muted-foreground mt-1">Local Smart Care instance</p>
          </div>
          <div className="flex md:flex-col items-center justify-center gap-2 px-2">
            <Network className="h-5 w-5 text-primary" />
            <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs font-semibold text-muted-foreground text-center">Emergency Network</p>
          </div>
          <div className="flex-1 rounded-2xl border border-border bg-muted/30 p-5 text-center">
            <Building2 className="h-6 w-6 text-primary mx-auto mb-2" />
            <p className="font-bold">Hospital B</p>
            <p className="text-xs text-muted-foreground mt-1">Trusted partner facility</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: BedDouble, label: "ICU beds" },
            { icon: Stethoscope, label: "Specialists" },
            { icon: Ambulance, label: "Ambulances" },
            { icon: ArrowLeftRight, label: "Transfers" },
          ].map(r => (
            <div key={r.label} className="rounded-xl border border-dashed border-border px-3 py-3 text-center">
              <r.icon className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
              <p className="text-xs font-medium text-muted-foreground">{r.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

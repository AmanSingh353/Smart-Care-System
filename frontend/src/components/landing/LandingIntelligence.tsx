import { LineChart, AlertTriangle, Users, Lightbulb, Activity } from "lucide-react";

const examples = [
  { icon: Activity, title: "Patient-flow insights", desc: "See where care is waiting across the journey." },
  { icon: Users, title: "Resource visibility", desc: "Understand beds, pending labs, and pharmacy load." },
  { icon: AlertTriangle, title: "Operational alerts", desc: "Surface bottlenecks before they become delays." },
  { icon: Lightbulb, title: "Care recommendations", desc: "Future CareGuard guidance grounded in live data." },
];

export function LandingIntelligence() {
  return (
    <section id="intelligence" className="container py-16 md:py-20">
      <div className="max-w-2xl mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">Hospital intelligence</p>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-balance">
          Turn hospital data into actionable insight.
        </h2>
        <p className="mt-3 text-muted-foreground leading-relaxed">
          Smart Care lays the foundation for CareGuard — intelligence that helps teams notice risk and
          opportunity earlier. Capabilities below describe the direction; live AI recommendations are
          introduced in a later phase.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {examples.map(e => (
          <div key={e.title} className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="h-9 w-9 rounded-xl bg-secondary text-primary flex items-center justify-center mb-3">
              <e.icon className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold">{e.title}</h3>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{e.desc}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-dashed border-primary/30 bg-primary/5 px-4 py-2 text-xs font-medium text-primary">
        <LineChart className="h-3.5 w-3.5" />
        CareGuard placeholder is prepared in the patient workspace — logic arrives in Phase 3B+
      </div>
    </section>
  );
}

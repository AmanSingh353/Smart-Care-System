import { Shield, AlertTriangle, ClipboardCheck, Workflow, Lightbulb } from "lucide-react";

const pillars = [
  {
    icon: AlertTriangle,
    title: "What needs attention",
    desc: "Surface delayed labs, overdue tasks, and review items.",
  },
  {
    icon: ClipboardCheck,
    title: "Who should act",
    desc: "Route each signal to the responsible hospital role.",
  },
  {
    icon: Workflow,
    title: "Explainable why",
    desc: "Every signal shows source, reason, and next action.",
  },
  {
    icon: Lightbulb,
    title: "Human review",
    desc: "CareGuard supports decisions — it never replaces clinicians.",
  },
];

export function LandingIntelligence() {
  return (
    <section id="intelligence" className="container py-16 md:py-20">
      <div className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/[0.06] via-card to-card p-6 md:p-10 shadow-card">
        <div className="max-w-2xl mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-bold text-primary mb-3">
            <Shield className="h-3.5 w-3.5" aria-hidden />
            CareGuard
          </div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-balance">
            CareGuard helps identify what needs attention next.
          </h2>
          <p className="mt-3 text-muted-foreground leading-relaxed max-w-xl">
            Smart Care System stores the event. CareGuard watches the workflow and asks the right
            person to review — calmly, explainably, and without replacing clinical judgment.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {pillars.map(e => (
            <div
              key={e.title}
              className="rounded-2xl border border-border/80 bg-card/90 p-4 md:p-5 transition-colors hover:border-primary/30"
            >
              <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                <e.icon className="h-4 w-4" aria-hidden />
              </div>
              <h3 className="text-sm font-bold text-foreground">{e.title}</h3>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{e.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

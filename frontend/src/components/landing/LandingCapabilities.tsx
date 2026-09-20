import {
  Timer,
  FileHeart,
  Network,
  Brain,
  Users,
  Ambulance,
} from "lucide-react";

const capabilities = [
  {
    icon: Timer,
    title: "30-Second Registration",
    desc: "Admit patients fast with a minimal form and an instant hospital-wide ID.",
  },
  {
    icon: FileHeart,
    title: "Unified Patient Record",
    desc: "One shared record for diagnosis, labs, medicines, nursing notes, and billing.",
  },
  {
    icon: Network,
    title: "Real-Time Care Coordination",
    desc: "Doctor, lab, pharmacy, and nurse actions update the same live patient state.",
  },
  {
    icon: Brain,
    title: "CareGuard intelligence",
    desc: "Surfaces what needs attention next — explainable signals for the right role to review.",
  },
  {
    icon: Users,
    title: "Family Transparency",
    desc: "Families see treatment progress, reports, medicines, and billing clearly.",
  },
  {
    icon: Ambulance,
    title: "Emergency Care Exchange",
    desc: "NECE prepares hospitals to share capacity across a trusted emergency network.",
  },
];

export function LandingCapabilities() {
  return (
    <section id="platform" className="container py-16 md:py-20">
      <div className="max-w-2xl mb-10">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">Platform</p>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-balance">
          Everything a connected hospital needs — in one care system.
        </h2>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
        {capabilities.map(c => (
          <div
            key={c.title}
            className="rounded-2xl border border-border bg-card p-5 md:p-6 shadow-card hover:shadow-soft transition-shadow"
          >
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
              <c.icon className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-foreground mb-1.5">{c.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{c.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

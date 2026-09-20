import { Bell, FileText, Pill, CreditCard, MessageSquare, HeartPulse } from "lucide-react";

const items = [
  { icon: HeartPulse, title: "Live treatment updates", desc: "See status changes as care progresses." },
  { icon: FileText, title: "Reports & tests", desc: "Results appear when the lab completes them." },
  { icon: Pill, title: "Medicines", desc: "Know what is prescribed and when it is ready." },
  { icon: Bell, title: "Notifications", desc: "Important moments, without hospital jargon." },
  { icon: CreditCard, title: "Billing transparency", desc: "Understand charges and payment status." },
  { icon: MessageSquare, title: "Service requests", desc: "Ask for bed upgrades or extra support." },
];

export function LandingFamily() {
  return (
    <section id="family" className="container py-16 md:py-20">
      <div className="rounded-3xl border border-border bg-gradient-to-br from-card to-secondary/40 shadow-soft overflow-hidden">
        <div className="grid lg:grid-cols-2">
          <div className="p-6 md:p-10 lg:p-12">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">Family experience</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-balance">
              Reassurance when it matters most.
            </h2>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              The Family Dashboard is a calm window into the patient’s hospital journey — clear updates,
              not overwhelming clinical noise.
            </p>
          </div>
          <div className="p-6 md:p-8 grid sm:grid-cols-2 gap-3 content-center bg-card/40 border-t lg:border-t-0 lg:border-l border-border">
            {items.map(item => (
              <div key={item.title} className="rounded-2xl border border-border bg-card p-4">
                <item.icon className="h-4 w-4 text-primary mb-2" />
                <p className="text-sm font-semibold text-foreground">{item.title}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

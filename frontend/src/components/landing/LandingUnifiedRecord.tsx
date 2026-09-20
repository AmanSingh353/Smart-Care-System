import { Stethoscope, FlaskConical, Pill, Heart, Receipt, Users } from "lucide-react";

const nodes = [
  { label: "Doctor", icon: Stethoscope, pos: "top-0 left-1/2 -translate-x-1/2" },
  { label: "Lab", icon: FlaskConical, pos: "top-[18%] right-0" },
  { label: "Pharmacy", icon: Pill, pos: "bottom-[18%] right-0" },
  { label: "Nurse", icon: Heart, pos: "bottom-0 left-1/2 -translate-x-1/2" },
  { label: "Billing", icon: Receipt, pos: "bottom-[18%] left-0" },
  { label: "Family", icon: Users, pos: "top-[18%] left-0" },
];

export function LandingUnifiedRecord() {
  return (
    <section className="container py-16 md:py-20">
      <div className="grid lg:grid-cols-2 gap-10 items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">Unified record</p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-balance">
            One patient. Six connected views.
          </h2>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            Clinical, diagnostic, nursing, pharmacy, billing, and family experiences all read and write
            the same patient object — so information is never trapped in a department silo.
          </p>
        </div>

        <div className="relative mx-auto w-full max-w-md aspect-square">
          <div className="absolute inset-[22%] rounded-3xl border border-primary/20 bg-primary/5 shadow-card flex flex-col items-center justify-center text-center p-4 z-10">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">Patient record</p>
            <p className="text-lg font-bold text-foreground mt-1">Unified SCS ID</p>
            <p className="text-xs text-muted-foreground mt-1">Diagnosis · Labs · Meds · Bill · Alerts</p>
          </div>
          {nodes.map(n => (
            <div
              key={n.label}
              className={`absolute ${n.pos} w-[5.5rem] sm:w-28 rounded-2xl border border-border bg-card shadow-card px-2 py-2.5 text-center`}
            >
              <n.icon className="h-4 w-4 text-primary mx-auto mb-1" />
              <p className="text-xs font-semibold text-foreground">{n.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

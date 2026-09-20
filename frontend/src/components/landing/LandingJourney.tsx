import { useState } from "react";
import { cn } from "@/lib/utils";

const STEPS = [
  "Registration",
  "Consultation",
  "Diagnosis",
  "Lab",
  "Prescription",
  "Pharmacy",
  "Treatment",
  "Billing",
  "Discharge",
];

export function LandingJourney() {
  const [active, setActive] = useState(0);

  return (
    <section id="journey" className="container py-16 md:py-20">
      <div className="rounded-3xl border border-border bg-card shadow-soft p-6 md:p-10">
        <div className="max-w-2xl mb-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">One patient journey</p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-balance">
            Every department. Same patient. Same truth.
          </h2>
          <p className="mt-3 text-muted-foreground text-sm md:text-base">
            From the first registration scan to discharge and payment, Smart Care keeps one continuous
            workflow — not siloed department tools.
          </p>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 snap-x">
          {STEPS.map((step, i) => (
            <button
              key={step}
              type="button"
              onClick={() => setActive(i)}
              className={cn(
                "snap-start shrink-0 rounded-full px-4 py-2 text-sm font-semibold border transition-all",
                active === i
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"
              )}
            >
              {i + 1}. {step}
            </button>
          ))}
        </div>

        <div className="mt-6 hidden md:flex items-center gap-1">
          {STEPS.map((step, i) => (
            <div key={step} className="flex items-center flex-1 min-w-0">
              <div
                className={cn(
                  "h-2 w-full rounded-full transition-colors",
                  i <= active ? "bg-primary" : "bg-muted"
                )}
              />
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl bg-muted/40 border border-border/60 p-5 md:p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Now highlighting</p>
          <p className="text-xl font-bold text-foreground mt-1">{STEPS[active]}</p>
          <p className="text-sm text-muted-foreground mt-2 max-w-xl">
            {active === 0 && "Reception creates a unique patient ID and admits them into the hospital system in seconds."}
            {active === 1 && "Doctors open the same record — history, allergies, and status already waiting."}
            {active === 2 && "Diagnosis updates propagate instantly to nursing, pharmacy, billing, and family views."}
            {active === 3 && "Lab requests become pending tasks with status and results written back to the record."}
            {active === 4 && "Prescriptions appear for pharmacy without re-entry or paper handoffs."}
            {active === 5 && "Pharmacy fulfillment status closes the loop for nurses and the family dashboard."}
            {active === 6 && "Nursing updates and dose confirmations keep the care plan current."}
            {active === 7 && "Charges accumulate from care actions — transparent for staff and family."}
            {active === 8 && "Discharge and payment clear the journey with a complete audit trail."}
          </p>
        </div>
      </div>
    </section>
  );
}

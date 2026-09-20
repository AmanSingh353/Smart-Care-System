import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LandingFinalCta() {
  return (
    <section className="container py-16 md:py-24">
      <div className="rounded-3xl bg-primary text-primary-foreground px-6 py-12 md:px-12 md:py-16 text-center shadow-soft">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-balance max-w-2xl mx-auto">
          One connected ecosystem for smarter, faster healthcare.
        </h2>
        <p className="mt-3 text-primary-foreground/80 max-w-xl mx-auto text-sm md:text-base">
          Enter the Smart Care System hospital workspace and experience registration through discharge
          on a single shared patient record.
        </p>
        <Button asChild size="lg" variant="secondary" className="mt-8">
          <Link to="/login">
            Enter Smart Care System <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
      <p className="text-center text-xs text-muted-foreground mt-8">
        Smart Care System © {new Date().getFullYear()} · Built for connected hospital care
      </p>
    </section>
  );
}

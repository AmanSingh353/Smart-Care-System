import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingCapabilities } from "@/components/landing/LandingCapabilities";
import { LandingJourney } from "@/components/landing/LandingJourney";
import { LandingUnifiedRecord } from "@/components/landing/LandingUnifiedRecord";
import { LandingFamily } from "@/components/landing/LandingFamily";
import { LandingIntelligence } from "@/components/landing/LandingIntelligence";
import { LandingNece } from "@/components/landing/LandingNece";
import { LandingFinalCta } from "@/components/landing/LandingFinalCta";

const LandingPage = () => {
  return (
    <div id="top" className="min-h-screen bg-canvas">
      <LandingNavbar />
      <LandingHero />
      <LandingCapabilities />
      <LandingJourney />
      <LandingUnifiedRecord />
      <LandingFamily />
      <LandingIntelligence />
      <LandingNece />
      <LandingFinalCta />
    </div>
  );
};

export default LandingPage;

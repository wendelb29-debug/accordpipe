import { useState } from "react";
import { Link } from "react-router-dom";
import { Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import accordLogo from "@/assets/accord-logo-full.png";
import { HeroSection } from "@/components/landing/HeroSection";
import { ProblemSolutionSection } from "@/components/landing/ProblemSolutionSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { FlowSection } from "@/components/landing/FlowSection";
import { SocialProofSection } from "@/components/landing/SocialProofSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { SecuritySection } from "@/components/landing/SecuritySection";
import { FAQSection } from "@/components/landing/FAQSection";
import { CTASection } from "@/components/landing/CTASection";
import { FooterSection } from "@/components/landing/FooterSection";
import { TrialSignupDialog } from "@/components/landing/TrialSignupDialog";

export default function LandingPage() {
  const [trialOpen, setTrialOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[hsl(228,40%,6%)] overflow-x-hidden safe-area-bottom">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-[hsl(220,20%,12%)] bg-[hsl(228,40%,6%,0.95)] backdrop-blur-xl" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="mx-auto flex h-12 sm:h-14 md:h-16 max-w-7xl items-center justify-between px-3 sm:px-4 md:px-6">
          <Link to="/" className="flex items-center shrink-0">
            <img src={accordLogo} alt="ACCORD" className="h-28 w-auto shrink-0 brightness-200" />
          </Link>

          <nav className="hidden lg:flex items-center gap-6">
            <a href="#features" className="text-sm font-medium text-[hsl(218,14%,55%)] hover:text-[hsl(210,40%,96%)] transition-colors">Funcionalidades</a>
            <a href="#planos" className="text-sm font-medium text-[hsl(218,14%,55%)] hover:text-[hsl(210,40%,96%)] transition-colors">Planos</a>
            <a href="#faq" className="text-sm font-medium text-[hsl(218,14%,55%)] hover:text-[hsl(210,40%,96%)] transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <Button
              size="sm"
              className="gap-1 bg-gradient-to-r from-[hsl(224,76%,53%)] to-[hsl(263,87%,60%)] text-[hsl(0,0%,100%)] shadow-md text-[11px] sm:text-xs md:text-sm px-2.5 sm:px-3 md:px-4 h-7 sm:h-8 md:h-9 shrink-0 border-0"
              onClick={() => setTrialOpen(true)}
            >
              <Rocket className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
              <span className="hidden sm:inline">Teste Gratuito</span>
              <span className="sm:hidden">Testar</span>
            </Button>
            <Link to="/auth">
              <Button variant="ghost" size="sm" className="text-[hsl(218,14%,55%)] hover:text-[hsl(210,40%,96%)] hover:bg-[hsl(220,25%,14%)] text-[11px] sm:text-xs md:text-sm px-2 sm:px-3 h-7 sm:h-8 md:h-9">Entrar</Button>
            </Link>
          </div>
        </div>
      </header>

      <HeroSection />
      <ProblemSolutionSection />
      <FeaturesSection />
      <FlowSection />
      <SocialProofSection />
      <PricingSection />
      <SecuritySection />
      <FAQSection />
      <CTASection />
      <FooterSection />
      <TrialSignupDialog open={trialOpen} onOpenChange={setTrialOpen} />
    </div>
  );
}

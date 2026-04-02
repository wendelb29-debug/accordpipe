import { useState } from "react";
import { Link } from "react-router-dom";
import { Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import accordLogo from "@/assets/accord-logo-full.png";
import { HeroSection } from "@/components/landing/HeroSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { BenefitsSection } from "@/components/landing/BenefitsSection";
import { IntegrationsSection } from "@/components/landing/IntegrationsSection";
import { TargetAudienceSection } from "@/components/landing/TargetAudienceSection";
import { BeforeAfterSection } from "@/components/landing/BeforeAfterSection";
import { SecuritySection } from "@/components/landing/SecuritySection";
import { SocialProofSection } from "@/components/landing/SocialProofSection";
import { CTASection } from "@/components/landing/CTASection";
import { FAQSection } from "@/components/landing/FAQSection";
import { FooterSection } from "@/components/landing/FooterSection";
import { TrialSignupDialog } from "@/components/landing/TrialSignupDialog";

export default function LandingPage() {
  const [trialOpen, setTrialOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden safe-area-bottom">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-border/30 bg-background/95 backdrop-blur-xl" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="mx-auto flex h-12 sm:h-14 md:h-16 max-w-7xl items-center justify-between px-3 sm:px-4 md:px-6">
          {/* Logo */}
          <Link to="/" className="flex items-center shrink-0">
            <img src={accordLogo} alt="ACCORD" className="h-7 sm:h-8 md:h-10 w-auto shrink-0" />
          </Link>

          {/* Nav - desktop only */}
          <nav className="hidden lg:flex items-center gap-6">
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Funcionalidades</a>
            <a href="#integracoes" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Integrações</a>
            <a href="#faq" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">FAQ</a>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <Button
              size="sm"
              className="gap-1 gradient-primary text-primary-foreground shadow-md text-[11px] sm:text-xs md:text-sm px-2.5 sm:px-3 md:px-4 h-7 sm:h-8 md:h-9 shrink-0"
              onClick={() => setTrialOpen(true)}
            >
              <Rocket className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
              <span className="hidden sm:inline">Teste Gratuito</span>
              <span className="sm:hidden">Testar</span>
            </Button>
            <Link to="/auth">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground text-[11px] sm:text-xs md:text-sm px-2 sm:px-3 h-7 sm:h-8 md:h-9">Entrar</Button>
            </Link>
          </div>
        </div>
      </header>

      <HeroSection />
      <HowItWorksSection />
      <BenefitsSection />
      <IntegrationsSection />
      <TargetAudienceSection />
      <BeforeAfterSection />
      <SecuritySection />
      <SocialProofSection />
      <FAQSection />
      <CTASection />
      <FooterSection />
      <TrialSignupDialog open={trialOpen} onOpenChange={setTrialOpen} />
    </div>
  );
}

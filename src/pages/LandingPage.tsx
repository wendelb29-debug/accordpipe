import { useState } from "react";
import { Link } from "react-router-dom";
import { Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import orbitLogo from "@/assets/orbit-logo-new.png";
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
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-border/30 glass">
        <div className="mx-auto flex h-14 md:h-16 max-w-7xl items-center justify-between px-3 md:px-6">
          <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
            <img src={orbitLogo} alt="ORBIT" className="h-7 md:h-8 w-auto" />
            <span className="text-base md:text-lg font-black tracking-tight text-foreground" style={{ letterSpacing: "-0.04em" }}>ORBIT</span>
            <span className="text-base md:text-lg font-light tracking-tight text-muted-foreground" style={{ letterSpacing: "-0.04em" }}>HUB</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Funcionalidades
            </a>
            <a href="#integracoes" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Integrações
            </a>
            <a href="#faq" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Perguntas Frequentes
            </a>
          </nav>
          <div className="flex items-center gap-1.5 md:gap-3 shrink-0">
            <Button
              size="sm"
              className="gap-1.5 md:gap-2 gradient-primary text-primary-foreground shadow-md hover:shadow-lg transition-shadow text-xs md:text-sm px-3 md:px-4 h-8 md:h-9"
              onClick={() => setTrialOpen(true)}
            >
              <Rocket className="h-3.5 w-3.5 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Teste Gratuito</span>
              <span className="sm:hidden">Testar</span>
            </Button>
            <Link to="/auth">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground text-xs md:text-sm px-2 md:px-3 h-8 md:h-9">Entrar</Button>
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

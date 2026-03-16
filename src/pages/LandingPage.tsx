import { useState } from "react";
import { Link } from "react-router-dom";
import { Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import orbitLogo from "@/assets/orbit-logo.png";
import { HeroSection } from "@/components/landing/HeroSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { BenefitsSection } from "@/components/landing/BenefitsSection";
import { IntegrationsSection } from "@/components/landing/IntegrationsSection";
import { TargetAudienceSection } from "@/components/landing/TargetAudienceSection";
import { BeforeAfterSection } from "@/components/landing/BeforeAfterSection";
import { SecuritySection } from "@/components/landing/SecuritySection";
import { DemoVideoSection } from "@/components/landing/DemoVideoSection";
import { SocialProofSection } from "@/components/landing/SocialProofSection";
import { CTASection } from "@/components/landing/CTASection";
import { FooterSection } from "@/components/landing/FooterSection";
import { TrialSignupDialog } from "@/components/landing/TrialSignupDialog";

export default function LandingPage() {
  const [trialOpen, setTrialOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <img src={orbitLogo} alt="ORBIT" className="h-9 w-auto" />
            <span className="text-xl font-bold tracking-tight text-foreground">ORBIT HUB</span>
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
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              className="gap-2 bg-green-600 hover:bg-green-700"
              onClick={() => setTrialOpen(true)}
            >
              <Rocket className="h-4 w-4" />
              Teste Gratuito
            </Button>
            <Link to="/auth">
              <Button variant="ghost" size="sm">Entrar</Button>
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
      <DemoVideoSection />
      <SocialProofSection />
      <CTASection />
      <FooterSection />
      <TrialSignupDialog open={trialOpen} onOpenChange={setTrialOpen} />
    </div>
  );
}

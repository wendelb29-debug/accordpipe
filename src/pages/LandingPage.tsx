import { useState } from "react";
import { Link } from "react-router-dom";
import { Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import accordLogo from "@/assets/accord-logo-full.png";
import { HeroSection } from "@/components/landing/HeroSection";
import { ProblemSolutionSection } from "@/components/landing/ProblemSolutionSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { FlowSection } from "@/components/landing/FlowSection";
import { DifferentialSection } from "@/components/landing/DifferentialSection";
import { DashboardVisualSection } from "@/components/landing/DashboardVisualSection";
import { SocialProofSection } from "@/components/landing/SocialProofSection";

import { SecuritySection } from "@/components/landing/SecuritySection";
import { FAQSection } from "@/components/landing/FAQSection";
import { CTASection } from "@/components/landing/CTASection";
import { FooterSection } from "@/components/landing/FooterSection";
import { TrialSignupDialog } from "@/components/landing/TrialSignupDialog";

export default function LandingPage() {
  const [trialOpen, setTrialOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0B0F19] overflow-x-hidden safe-area-bottom">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-[rgba(255,255,255,0.06)] bg-[rgba(11,15,25,0.92)] backdrop-blur-2xl" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="mx-auto flex h-12 sm:h-14 md:h-16 max-w-7xl items-center justify-between px-3 sm:px-4 md:px-6">
          <Link to="/" className="flex items-center shrink-0">
            <img src={accordLogo} alt="ACCORD" className="h-28 w-auto shrink-0 brightness-200" />
          </Link>

          <nav className="hidden lg:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-[#9CA3AF] hover:text-[#E5E7EB] transition-colors duration-150">Funcionalidades</a>
            <a href="#como-funciona" className="text-sm font-medium text-[#9CA3AF] hover:text-[#E5E7EB] transition-colors duration-150">Como funciona</a>
            <a href="#planos" className="text-sm font-medium text-[#9CA3AF] hover:text-[#E5E7EB] transition-colors duration-150">Planos</a>
            <a href="#faq" className="text-sm font-medium text-[#9CA3AF] hover:text-[#E5E7EB] transition-colors duration-150">FAQ</a>
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <Button
              size="sm"
              className="gap-1 bg-gradient-to-r from-[#2563EB] to-[#7C3AED] text-white shadow-lg shadow-[rgba(124,58,237,0.25)] text-[11px] sm:text-xs md:text-sm px-2.5 sm:px-3 md:px-4 h-7 sm:h-8 md:h-9 shrink-0 border-0 hover:shadow-xl hover:shadow-[rgba(124,58,237,0.35)] transition-all duration-150"
              onClick={() => setTrialOpen(true)}
            >
              <Rocket className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
              <span className="hidden sm:inline">Teste Gratuito</span>
              <span className="sm:hidden">Testar</span>
            </Button>
            <Link to="/auth">
              <Button variant="ghost" size="sm" className="text-[#9CA3AF] hover:text-[#E5E7EB] hover:bg-[rgba(255,255,255,0.05)] text-[11px] sm:text-xs md:text-sm px-2 sm:px-3 h-7 sm:h-8 md:h-9">Entrar</Button>
            </Link>
          </div>
        </div>
      </header>

      <HeroSection />
      <FlowSection />
      <ProblemSolutionSection />
      <FeaturesSection />
      <DifferentialSection />
      <DashboardVisualSection />
      <SocialProofSection />
      
      <SecuritySection />
      <FAQSection />
      <CTASection />
      <FooterSection />
      <TrialSignupDialog open={trialOpen} onOpenChange={setTrialOpen} />
    </div>
  );
}

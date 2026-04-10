import { useState } from "react";
import { Link } from "react-router-dom";
import { Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import accordLogo from "@/assets/accord-logo-full.png";
import { HeroSection } from "@/components/landing/HeroSection";
import { PositioningSection } from "@/components/landing/PositioningSection";
import { ProductScreenshots } from "@/components/landing/ProductScreenshots";
import { ModulesSection } from "@/components/landing/ModulesSection";
import { ToolsComparison } from "@/components/landing/ToolsComparison";
import { AuthoritySection } from "@/components/landing/AuthoritySection";
import { DifferentialSection } from "@/components/landing/DifferentialSection";
import { SocialProofSection } from "@/components/landing/SocialProofSection";
import { FAQSection } from "@/components/landing/FAQSection";
import { ObjectionBreaker } from "@/components/landing/ObjectionBreaker";
import { PremiumCTASection } from "@/components/landing/PremiumCTASection";
import { FooterSection } from "@/components/landing/FooterSection";
import { TrialSignupDialog } from "@/components/landing/TrialSignupDialog";

export default function LandingPage() {
  const [trialOpen, setTrialOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#070B14] overflow-x-hidden safe-area-bottom">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-[rgba(255,255,255,0.05)] bg-[rgba(7,11,20,0.85)] backdrop-blur-2xl" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center shrink-0">
            <img src={accordLogo} alt="ACCORD" className="h-28 w-auto shrink-0 brightness-200" />
          </Link>

          <nav className="hidden lg:flex items-center gap-8">
            {[
              { href: "#features", label: "Funcionalidades" },
              { href: "#como-funciona", label: "Como funciona" },
              { href: "#faq", label: "FAQ" },
            ].map((l) => (
              <a key={l.href} href={l.href} className="text-[13px] font-medium text-[#64748B] hover:text-[#E2E8F0] transition-colors duration-200">
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              className="gap-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs sm:text-sm px-4 h-9 rounded-lg shadow-lg shadow-[rgba(37,99,235,0.2)] border-0 transition-all duration-200 hover:shadow-xl"
              onClick={() => setTrialOpen(true)}
            >
              <Rocket className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">Teste 7 dias grátis</span>
              <span className="sm:hidden">Testar</span>
            </Button>
            <Link to="/auth">
              <Button variant="ghost" size="sm" className="text-[#64748B] hover:text-[#E2E8F0] hover:bg-[rgba(255,255,255,0.05)] text-xs sm:text-sm px-3 h-9">
                Entrar
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <HeroSection />
      <PositioningSection />
      <ProductScreenshots />
      <ModulesSection />
      <ToolsComparison />
      <AuthoritySection />
      <DifferentialSection />
      <SocialProofSection />
      <FAQSection />
      <ObjectionBreaker />
      <PremiumCTASection />
      <FooterSection />
      <TrialSignupDialog open={trialOpen} onOpenChange={setTrialOpen} />
    </div>
  );
}

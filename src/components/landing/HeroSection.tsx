import { useState } from "react";
import { Rocket, Play, ArrowRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TrialSignupDialog } from "./TrialSignupDialog";

export function HeroSection() {
  const [trialOpen, setTrialOpen] = useState(false);

  return (
    <section
      className="relative overflow-hidden min-h-[90vh] flex items-center"
      style={{ background: "radial-gradient(circle at top, #111827, #020617)" }}
    >
      {/* Subtle ambient glow */}
      <div className="absolute top-[-10%] left-[20%] w-[700px] h-[700px] rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.10),transparent_60%)] blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-5%] right-[15%] w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(124,58,237,0.07),transparent_60%)] blur-3xl pointer-events-none" />

      {/* Grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 py-20 sm:py-28 md:py-36 w-full">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div className="mb-6 sm:mb-8 inline-flex items-center gap-2 rounded-full border border-[rgba(124,58,237,0.25)] bg-[rgba(124,58,237,0.06)] px-5 py-2.5 text-xs sm:text-sm font-medium text-[#A78BFA]">
            <Zap className="h-3.5 w-3.5 shrink-0" />
            <span>CRM + Contratos + IA em uma só plataforma</span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0" />
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.1]">
            Controle seu comercial{" "}
            <br className="hidden sm:block" />
            do lead ao contrato em{" "}
            <span className="bg-gradient-to-r from-[#3B82F6] via-[#8B5CF6] to-[#C084FC] bg-clip-text text-transparent">
              um só lugar
            </span>
          </h1>

          <p className="mx-auto mt-5 sm:mt-6 max-w-2xl text-base sm:text-lg md:text-xl leading-relaxed text-[#D1D5DB]">
            CRM, contratos, clientes e automações integrados em uma única plataforma.
            Simplifique sua operação e venda mais.
          </p>

          {/* CTAs */}
          <div className="mt-8 sm:mt-10 flex flex-col items-center gap-3 sm:gap-4 sm:flex-row sm:justify-center">
            <Button
              size="lg"
              className="gap-2 px-8 text-sm sm:text-base font-semibold bg-gradient-to-r from-[#2563EB] to-[#7C3AED] text-white shadow-lg shadow-[rgba(124,58,237,0.3)] h-12 sm:h-14 rounded-xl hover:shadow-xl hover:shadow-[rgba(124,58,237,0.4)] hover:scale-[1.02] transition-all duration-150 w-full sm:w-auto border-0"
              onClick={() => setTrialOpen(true)}
            >
              <Rocket className="h-5 w-5" />
              Começar agora
            </Button>
            <a href="mailto:contato@accordhub.com.br?subject=Solicitar demonstração" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="gap-2 px-8 text-sm sm:text-base font-medium h-12 sm:h-14 rounded-xl border-[rgba(255,255,255,0.1)] text-white hover:bg-[rgba(255,255,255,0.05)] hover:border-[rgba(255,255,255,0.15)] transition-all duration-150 w-full bg-transparent">
                <Play className="h-4 w-4" />
                Ver demonstração
              </Button>
            </a>
          </div>

          {/* Trust */}
          <div className="mt-6 sm:mt-8 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs sm:text-sm text-[#9CA3AF]">
            <span className="flex items-center gap-1.5"><span className="text-emerald-400">✓</span> Sem cartão de crédito</span>
            <span className="flex items-center gap-1.5"><span className="text-emerald-400">✓</span> 7 dias grátis</span>
            <span className="hidden sm:flex items-center gap-1.5"><span className="text-emerald-400">✓</span> Suporte incluso</span>
          </div>
        </div>
      </div>
      <TrialSignupDialog open={trialOpen} onOpenChange={setTrialOpen} />
    </section>
  );
}

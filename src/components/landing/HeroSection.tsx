import { useState } from "react";
import { Rocket, Play, ArrowRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import dashboardMockup from "@/assets/dashboard-mockup.png";
import { TrialSignupDialog } from "./TrialSignupDialog";

export function HeroSection() {
  const [trialOpen, setTrialOpen] = useState(false);

  return (
    <section className="relative overflow-hidden bg-[hsl(228,40%,6%)] min-h-[90vh] flex items-center">
      {/* Ambient glow effects */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-[radial-gradient(circle,hsl(224,76%,53%,0.15),transparent_60%)] blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-[radial-gradient(circle,hsl(263,87%,60%,0.1),transparent_60%)] blur-3xl" />
      {/* Grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(hsl(224,50%,20%,0.15)_1px,transparent_1px),linear-gradient(90deg,hsl(224,50%,20%,0.15)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 py-20 sm:py-28 md:py-36 w-full">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div className="mb-6 sm:mb-8 inline-flex items-center gap-2 rounded-full border border-[hsl(263,87%,60%,0.3)] bg-[hsl(263,87%,60%,0.08)] px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-[hsl(263,87%,70%)]">
            <Zap className="h-3.5 w-3.5 shrink-0" />
            <span>Plataforma completa com IA integrada</span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0" />
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-[hsl(210,40%,98%)] leading-[1.1]">
            Automatize seu comercial,{" "}
            <br className="hidden sm:block" />
            contratos e clientes em{" "}
            <span className="bg-gradient-to-r from-[hsl(224,76%,53%)] via-[hsl(263,87%,60%)] to-[hsl(280,70%,60%)] bg-clip-text text-transparent">
              um só lugar
            </span>
          </h1>

          {/* Sub */}
          <p className="mx-auto mt-5 sm:mt-6 max-w-2xl text-base sm:text-lg md:text-xl leading-relaxed text-[hsl(218,14%,65%)]">
            Do lead ao contrato assinado, tudo integrado, automatizado e escalável. 
            Simplifique sua operação e venda mais.
          </p>

          {/* CTAs */}
          <div className="mt-8 sm:mt-10 flex flex-col items-center gap-3 sm:gap-4 sm:flex-row sm:justify-center">
            <Button
              size="lg"
              className="gap-2 px-8 text-sm sm:text-base font-semibold bg-gradient-to-r from-[hsl(224,76%,53%)] to-[hsl(263,87%,60%)] text-[hsl(0,0%,100%)] shadow-lg shadow-[hsl(263,87%,60%,0.25)] h-12 sm:h-14 rounded-xl hover:shadow-xl hover:shadow-[hsl(263,87%,60%,0.35)] transition-all w-full sm:w-auto border-0"
              onClick={() => setTrialOpen(true)}
            >
              <Rocket className="h-5 w-5" />
              Testar grátis por 7 dias
            </Button>
            <a href="mailto:contato@accordhub.com.br?subject=Solicitar demonstração" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="gap-2 px-8 text-sm sm:text-base font-medium h-12 sm:h-14 rounded-xl border-[hsl(220,20%,22%)] text-[hsl(210,40%,96%)] hover:bg-[hsl(220,25%,14%)] hover:border-[hsl(220,20%,30%)] transition-all w-full bg-transparent">
                <Play className="h-4 w-4" />
                Ver demonstração
              </Button>
            </a>
          </div>

          {/* Trust */}
          <div className="mt-6 sm:mt-8 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs sm:text-sm text-[hsl(218,14%,50%)]">
            <span className="flex items-center gap-1.5">✓ Sem cartão de crédito</span>
            <span className="flex items-center gap-1.5">✓ 7 dias grátis</span>
            <span className="hidden sm:flex items-center gap-1.5">✓ Suporte incluso</span>
          </div>
        </div>

        {/* Dashboard Mockup */}
        <div className="mt-16 sm:mt-20 flex justify-center">
          <div className="relative w-full max-w-5xl">
            <div className="absolute -inset-6 rounded-3xl bg-gradient-to-br from-[hsl(224,76%,53%,0.15)] via-[hsl(263,87%,60%,0.1)] to-transparent blur-3xl" />
            <div className="relative rounded-2xl border border-[hsl(220,20%,18%)] shadow-2xl shadow-[hsl(0,0%,0%,0.4)] overflow-hidden bg-[hsl(220,30%,10%)]">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-[hsl(220,20%,16%)] bg-[hsl(220,30%,8%)]">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-[hsl(0,72%,51%,0.6)]" />
                  <div className="h-3 w-3 rounded-full bg-[hsl(45,93%,47%,0.6)]" />
                  <div className="h-3 w-3 rounded-full bg-[hsl(142,71%,45%,0.6)]" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="h-5 w-48 rounded-md bg-[hsl(220,25%,14%)]" />
                </div>
              </div>
              <img
                src={dashboardMockup}
                alt="Painel do ACCORD"
                className="w-full"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </div>
      <TrialSignupDialog open={trialOpen} onOpenChange={setTrialOpen} />
    </section>
  );
}

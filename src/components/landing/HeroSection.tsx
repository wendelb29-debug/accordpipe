import { useState } from "react";
import { Rocket, CalendarDays, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import dashboardMockup from "@/assets/dashboard-mockup.png";
import { TrialSignupDialog } from "./TrialSignupDialog";

export function HeroSection() {
  const [trialOpen, setTrialOpen] = useState(false);

  return (
    <section className="relative overflow-hidden">
      {/* Layered blue background for depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-[hsl(218,30%,94%)] via-background to-background" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_center,hsl(218,58%,32%,0.08),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,hsl(215,50%,45%,0.05),transparent_50%)]" />
      
      {/* Subtle grid */}
      <div className="absolute inset-0 bg-[linear-gradient(hsl(218,30%,80%,0.25)_1px,transparent_1px),linear-gradient(90deg,hsl(218,30%,80%,0.25)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_65%)]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-24 md:py-32 lg:py-40">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div className="mb-6 sm:mb-8 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-primary shadow-sm">
            <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
            <span>Plataforma completa com Inteligência Artificial</span>
            <ArrowRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.5rem] font-black tracking-tight text-foreground leading-[1.15] sm:leading-[1.1]">
            Gerencie vendas, contratos e atendimento em um{" "}
            <span className="bg-gradient-to-r from-primary via-primary-glow to-primary bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, hsl(218,58%,32%), hsl(215,50%,45%), hsl(210,45%,50%))' }}>
              único sistema com IA
            </span>
          </h1>

          {/* Subheadline */}
          <p className="mx-auto mt-4 sm:mt-6 max-w-2xl text-base sm:text-lg md:text-xl leading-relaxed text-muted-foreground">
            Automatize processos, aumente suas vendas e tenha controle total da sua operação sem complicação.
          </p>

          {/* CTAs */}
          <div className="mt-8 sm:mt-10 flex flex-col items-center gap-3 sm:gap-4 sm:flex-row sm:justify-center">
            <Button
              size="lg"
              className="gap-2 px-6 sm:px-8 text-sm sm:text-base font-semibold gradient-primary text-primary-foreground shadow-lg shadow-primary/25 h-11 sm:h-13 rounded-xl hover:shadow-xl hover:shadow-primary/30 transition-shadow w-full sm:w-auto"
              onClick={() => setTrialOpen(true)}
            >
              <Rocket className="h-4 w-4 sm:h-5 sm:w-5" />
              Começar teste grátis
            </Button>
            <a href="mailto:contato@accordhub.com.br?subject=Solicitar demonstração" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="gap-2 px-6 sm:px-8 text-sm sm:text-base font-medium h-11 sm:h-13 rounded-xl border-border hover:bg-card hover:shadow-md transition-all w-full">
                <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5" />
                Ver demonstração
              </Button>
            </a>
          </div>

          {/* Trust indicators */}
          <div className="mt-6 sm:mt-8 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs sm:text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">✓ Sem cartão de crédito</span>
            <span className="flex items-center gap-1.5">✓ 7 dias grátis</span>
            <span className="hidden sm:flex items-center gap-1.5">✓ Suporte incluso</span>
          </div>
        </div>

        {/* Dashboard Mockup */}
        <div className="mt-20 flex justify-center">
          <div className="relative w-full max-w-5xl">
            <div className="absolute -inset-6 rounded-3xl bg-gradient-to-br from-primary/12 via-primary-glow/8 to-transparent blur-3xl" />
            <div className="relative rounded-2xl border border-border/50 shadow-xl overflow-hidden bg-card">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40 bg-muted/40">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-destructive/50" />
                  <div className="h-3 w-3 rounded-full bg-yellow-500/50" />
                  <div className="h-3 w-3 rounded-full bg-green-500/50" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="h-5 w-48 rounded-md bg-muted/60" />
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

import { useState } from "react";
import { Rocket, CalendarDays, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import dashboardMockup from "@/assets/dashboard-mockup.png";
import { TrialSignupDialog } from "./TrialSignupDialog";

export function HeroSection() {
  const [trialOpen, setTrialOpen] = useState(false);

  return (
    <section className="relative overflow-hidden">
      {/* Premium background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.06),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,hsl(var(--accent)/0.04),transparent_60%)]" />
      
      {/* Grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(hsl(var(--border)/0.3)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border)/0.3)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)]" />

      <div className="relative mx-auto max-w-7xl px-6 py-24 md:py-32 lg:py-40">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-5 py-2 text-sm font-medium text-primary backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5" />
            Plataforma completa com Inteligência Artificial
            <ArrowRight className="h-3.5 w-3.5" />
          </div>

          {/* Headline */}
          <h1 className="text-4xl font-black tracking-tight text-foreground sm:text-5xl lg:text-[3.5rem] lg:leading-[1.1]">
            Gerencie vendas, contratos e atendimento em um{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              único sistema com IA
            </span>
          </h1>

          {/* Subheadline */}
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
            Automatize processos, aumente suas vendas e tenha controle total da sua operação sem complicação.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button
              size="lg"
              className="gap-2 px-8 text-base font-semibold bg-green-600 hover:bg-green-700 shadow-lg shadow-green-600/20 h-13 rounded-xl"
              onClick={() => setTrialOpen(true)}
            >
              <Rocket className="h-5 w-5" />
              Começar teste grátis
            </Button>
            <a href="mailto:contato@orbithub.com.br?subject=Solicitar demonstração">
              <Button size="lg" variant="outline" className="gap-2 px-8 text-base font-medium h-13 rounded-xl border-border/80 hover:bg-muted">
                <CalendarDays className="h-5 w-5" />
                Ver demonstração
              </Button>
            </a>
          </div>

          {/* Trust indicators */}
          <div className="mt-8 flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">✓ Sem cartão de crédito</span>
            <span className="hidden sm:flex items-center gap-1.5">✓ 7 dias grátis</span>
            <span className="hidden md:flex items-center gap-1.5">✓ Suporte incluso</span>
          </div>
        </div>

        {/* Dashboard Mockup */}
        <div className="mt-20 flex justify-center">
          <div className="relative w-full max-w-5xl">
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-primary/15 to-accent/15 blur-3xl opacity-50" />
            <div className="relative rounded-2xl border border-border/40 shadow-2xl overflow-hidden bg-card">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40 bg-muted/30">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-destructive/60" />
                  <div className="h-3 w-3 rounded-full bg-yellow-500/60" />
                  <div className="h-3 w-3 rounded-full bg-green-500/60" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="h-5 w-48 rounded-md bg-muted/50" />
                </div>
              </div>
              <img
                src={dashboardMockup}
                alt="Painel do ORBIT HUB"
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

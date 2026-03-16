import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Zap, Rocket, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import dashboardMockup from "@/assets/dashboard-mockup.png";
import { TrialSignupDialog } from "./TrialSignupDialog";

export function HeroSection() {
  const [trialOpen, setTrialOpen] = useState(false);

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.08),transparent_70%)]" />
      <div className="relative mx-auto max-w-7xl px-6 py-20 md:py-28 lg:py-36">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
            <Zap className="h-3.5 w-3.5" />
            Plataforma completa para sua operação
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Transforme seu atendimento e pagamentos num{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              único painel
            </span>
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground sm:text-xl">
            Gestão completa de atendimento, vendas, faturamento e relatórios como nunca antes.
            Tudo em um só lugar com o ORBIT HUB.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button
              size="lg"
              className="gap-2 px-8 text-base bg-green-600 hover:bg-green-700 shadow-lg shadow-green-600/25"
              onClick={() => setTrialOpen(true)}
            >
              <Rocket className="h-5 w-5" />
              Teste Gratuito – 7 Dias
            </Button>
            <a href="mailto:contato@orbithub.com.br?subject=Solicitar demonstração">
              <Button size="lg" variant="outline" className="gap-2 px-8 text-base">
                <CalendarDays className="h-5 w-5" />
                Agendar Demonstração
              </Button>
            </a>
          </div>
        </div>

        {/* Dashboard Mockup */}
        <div className="mt-16 flex justify-center">
          <div className="relative w-full max-w-5xl">
            <div className="absolute -inset-4 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 blur-3xl opacity-40" />
            <img
              src={dashboardMockup}
              alt="Painel do ORBIT HUB"
              className="relative rounded-2xl border border-border/50 shadow-2xl"
              loading="lazy"
            />
          </div>
        </div>
      </div>
      <TrialSignupDialog open={trialOpen} onOpenChange={setTrialOpen} />
    </section>
  );
}

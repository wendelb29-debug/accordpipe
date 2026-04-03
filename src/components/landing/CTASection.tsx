import { useState } from "react";
import { CalendarDays, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TrialSignupDialog } from "./TrialSignupDialog";

export function CTASection() {
  const [trialOpen, setTrialOpen] = useState(false);

  return (
    <section className="mx-auto max-w-7xl px-6 py-24">
      <div className="relative rounded-3xl overflow-hidden p-12 text-center md:p-16 shadow-xl">
        {/* Deep blue gradient background */}
        <div className="absolute inset-0 gradient-blue-subtle" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(215,50%,55%,0.3),transparent_60%)]" />
        
        <div className="relative">
          <h2 className="text-3xl font-bold text-primary-foreground sm:text-4xl">
            Pronto para transformar sua gestão?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-primary-foreground/75">
            Simplifique atendimento, vendas e pagamentos agora mesmo com o ACCORD.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button
              size="lg"
              className="gap-2 px-8 text-base font-semibold bg-card text-foreground hover:bg-card/90 shadow-lg hover:shadow-xl transition-shadow"
              onClick={() => setTrialOpen(true)}
            >
              <Rocket className="h-5 w-5" />
              Teste Gratuito – 7 Dias
            </Button>
            <a href="mailto:contato@orbithub.com.br?subject=Solicitar demonstração">
              <Button
                size="lg"
                variant="outline"
                className="gap-2 px-8 text-base border-primary-foreground/25 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              >
                <CalendarDays className="h-5 w-5" />
                Agendar Demonstração
              </Button>
            </a>
          </div>
        </div>
      </div>
      <TrialSignupDialog open={trialOpen} onOpenChange={setTrialOpen} />
    </section>
  );
}

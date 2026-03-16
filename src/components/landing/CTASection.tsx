import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TrialSignupDialog } from "./TrialSignupDialog";

export function CTASection() {
  const [trialOpen, setTrialOpen] = useState(false);

  return (
    <section className="mx-auto max-w-7xl px-6 py-24">
      <div className="rounded-3xl bg-gradient-to-br from-primary to-accent p-12 text-center shadow-2xl md:p-16">
        <h2 className="text-3xl font-bold text-primary-foreground sm:text-4xl">
          Pronto para transformar sua gestão?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-primary-foreground/80">
          Simplifique atendimento, vendas e pagamentos agora mesmo com o ORBIT HUB.
        </p>
        <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Button
            size="lg"
            className="gap-2 px-8 text-base font-semibold bg-green-600 hover:bg-green-700 shadow-lg text-white"
            onClick={() => setTrialOpen(true)}
          >
            <Rocket className="h-5 w-5" />
            Teste Gratuito – 7 Dias
          </Button>
          <a href="mailto:contato@orbithub.com.br?subject=Solicitar demonstração">
            <Button
              size="lg"
              variant="outline"
              className="gap-2 px-8 text-base border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            >
              <CalendarDays className="h-5 w-5" />
              Agendar Demonstração
            </Button>
          </a>
        </div>
      </div>
      <TrialSignupDialog open={trialOpen} onOpenChange={setTrialOpen} />
    </section>
  );
}

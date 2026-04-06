import { useState } from "react";
import { Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TrialSignupDialog } from "./TrialSignupDialog";

export function CTASection() {
  const [trialOpen, setTrialOpen] = useState(false);

  return (
    <section className="relative py-20 sm:py-28 bg-[hsl(228,40%,6%)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="relative rounded-3xl overflow-hidden p-10 sm:p-16 text-center">
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-[hsl(224,76%,53%,0.2)] via-[hsl(263,87%,60%,0.1)] to-[hsl(228,40%,8%)]" />
          <div className="absolute inset-0 border border-[hsl(224,76%,53%,0.15)] rounded-3xl" />

          <div className="relative">
            <h2 className="text-3xl font-bold text-[hsl(210,40%,98%)] sm:text-4xl">
              Comece agora e automatize sua operação
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-[hsl(218,14%,65%)]">
              Teste grátis por 7 dias. Sem cartão de crédito. Sem compromisso.
            </p>
            <div className="mt-8">
              <Button
                size="lg"
                className="gap-2 px-10 text-base font-semibold bg-gradient-to-r from-[hsl(224,76%,53%)] to-[hsl(263,87%,60%)] text-[hsl(0,0%,100%)] shadow-lg shadow-[hsl(263,87%,60%,0.25)] h-14 rounded-xl hover:shadow-xl transition-all border-0"
                onClick={() => setTrialOpen(true)}
              >
                <Rocket className="h-5 w-5" />
                Criar conta grátis
              </Button>
            </div>
          </div>
        </div>
      </div>
      <TrialSignupDialog open={trialOpen} onOpenChange={setTrialOpen} />
    </section>
  );
}

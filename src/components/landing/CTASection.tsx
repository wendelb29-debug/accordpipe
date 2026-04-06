import { useState } from "react";
import { Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TrialSignupDialog } from "./TrialSignupDialog";

export function CTASection() {
  const [trialOpen, setTrialOpen] = useState(false);

  return (
    <section className="relative py-20 sm:py-28" style={{ background: '#0B0F19' }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="relative rounded-3xl overflow-hidden p-10 sm:p-16 text-center">
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-[rgba(37,99,235,0.12)] via-[rgba(124,58,237,0.08)] to-[rgba(11,15,25,0.9)]" />
          <div className="absolute inset-0 border border-[rgba(124,58,237,0.12)] rounded-3xl" />

          <div className="relative">
            <h2 className="text-3xl font-bold text-[#E5E7EB] sm:text-4xl">
              Transforme sua operação agora
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-[#9CA3AF]">
              Teste grátis por 7 dias. Sem cartão de crédito. Sem compromisso.
            </p>
            <div className="mt-8">
              <Button
                size="lg"
                className="gap-2 px-10 text-base font-semibold bg-gradient-to-r from-[#2563EB] to-[#7C3AED] text-white shadow-lg shadow-[rgba(124,58,237,0.3)] h-14 rounded-xl hover:shadow-xl hover:shadow-[rgba(124,58,237,0.4)] hover:scale-[1.02] transition-all duration-150 border-0"
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

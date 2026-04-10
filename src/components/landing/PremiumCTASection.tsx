import { useState } from "react";
import { Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TrialSignupDialog } from "./TrialSignupDialog";

export function PremiumCTASection() {
  const [trialOpen, setTrialOpen] = useState(false);

  return (
    <section className="relative py-24 sm:py-32 overflow-hidden" style={{ background: "linear-gradient(135deg, #1E3A5F 0%, #0f0a2e 100%)" }}>
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M60 0H0v60' fill='none' stroke='white' stroke-width='0.5'/%3E%3C/svg%3E\")" }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-[radial-gradient(ellipse,rgba(99,102,241,0.15),transparent_70%)] pointer-events-none" />

      <div className="relative mx-auto max-w-3xl px-4 sm:px-6 text-center">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
          Sua operação pronta para o próximo nível
        </h2>

        <p className="mt-5 text-base sm:text-lg text-[#CBD5E1] max-w-xl mx-auto leading-relaxed">
          Se você quer vender mais, organizar sua empresa e escalar com previsibilidade, o próximo passo é simples.
        </p>

        <div className="mt-8">
          <Button
            size="lg"
            className="gap-2.5 px-10 text-sm font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-xl shadow-[rgba(37,99,235,0.3)] h-14 rounded-xl transition-all duration-200 hover:shadow-2xl hover:scale-[1.02] border-0"
            onClick={() => setTrialOpen(true)}
          >
            <Rocket className="h-4.5 w-4.5" />
            Criar minha conta agora
          </Button>
        </div>

        <p className="mt-5 text-sm text-[#94A3B8]">
          Comece hoje e transforme a forma como sua empresa vende, atende e cresce.
        </p>
      </div>

      <TrialSignupDialog open={trialOpen} onOpenChange={setTrialOpen} />
    </section>
  );
}

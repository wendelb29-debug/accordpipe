import { useState } from "react";
import { Rocket, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TrialSignupDialog } from "./TrialSignupDialog";

export function PremiumCTASection() {
  const [trialOpen, setTrialOpen] = useState(false);

  return (
    <section className="relative py-28 sm:py-36 overflow-hidden" style={{ background: "linear-gradient(135deg, #1E3A5F 0%, #0f0a2e 100%)" }}>
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M60 0H0v60' fill='none' stroke='white' stroke-width='0.5'/%3E%3C/svg%3E\")" }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-[radial-gradient(ellipse,rgba(99,102,241,0.18),transparent_70%)] pointer-events-none" />

      <div className="relative mx-auto max-w-3xl px-4 sm:px-6 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.05)] px-4 py-1.5 text-xs font-medium text-[#A5B4FC] mb-6">
          <Sparkles className="h-3 w-3" />
          Comece gratuitamente
        </div>

        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
          Sua concorrência já está se{" "}
          <span className="bg-gradient-to-r from-[#60A5FA] to-[#A78BFA] bg-clip-text text-transparent">organizando</span>.{" "}
          <br className="hidden sm:block" />
          E você?
        </h2>

        <p className="mt-5 text-base sm:text-lg text-[#CBD5E1] max-w-xl mx-auto leading-relaxed">
          Cada dia sem processo é uma venda perdida. Comece agora e assuma o controle da sua operação comercial.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            size="lg"
            className="gap-2.5 px-10 text-sm font-semibold bg-white hover:bg-[#F1F5F9] text-[#0F172A] shadow-xl shadow-[rgba(255,255,255,0.1)] h-14 rounded-xl transition-all duration-200 hover:shadow-2xl hover:scale-[1.02] border-0"
            onClick={() => setTrialOpen(true)}
          >
            <Rocket className="h-4.5 w-4.5" />
            Teste 7 dias grátis
          </Button>
        </div>

        <p className="mt-5 text-sm text-[#94A3B8]">
          Sem cartão de crédito · Configuração em 2 minutos · Suporte incluso
        </p>
      </div>

      <TrialSignupDialog open={trialOpen} onOpenChange={setTrialOpen} />
    </section>
  );
}

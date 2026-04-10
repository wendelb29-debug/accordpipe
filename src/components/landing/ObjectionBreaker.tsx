import { useState } from "react";
import { Shield, Clock, Headphones, RefreshCw, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TrialSignupDialog } from "./TrialSignupDialog";

const guarantees = [
  { icon: Clock, title: "7 dias grátis", desc: "Teste tudo sem compromisso. Se não gostar, basta não continuar." },
  { icon: Shield, title: "Sem cartão de crédito", desc: "Nenhum dado financeiro é solicitado. Zero risco." },
  { icon: Headphones, title: "Suporte desde o dia 1", desc: "Nossa equipe te ajuda a configurar e começar a usar." },
  { icon: RefreshCw, title: "Comece em 2 minutos", desc: "Cadastro rápido. Sem instalação, sem burocracia." },
];

export function ObjectionBreaker() {
  const [trialOpen, setTrialOpen] = useState(false);

  return (
    <section className="relative py-16 sm:py-28 md:py-36" style={{ background: "#0A0F1C" }}>
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[rgba(59,130,246,0.12)] to-transparent" />

      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white leading-tight">
          "E se não funcionar{" "}
          <span className="text-[#64748B]">pra mim?"</span>
        </h2>
        <p className="mt-3 sm:mt-4 text-sm sm:text-base text-[#94A3B8] max-w-xl mx-auto leading-relaxed">
          A gente entende. Por isso, removemos qualquer barreira pra você testar o Accord com calma, sem risco e sem pressão.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-8 sm:mt-10 max-w-2xl mx-auto">
          {guarantees.map((g) => (
            <div
              key={g.title}
              className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] p-4 sm:p-5 text-left transition-all duration-200 hover:border-[rgba(59,130,246,0.15)] hover:bg-[rgba(59,130,246,0.04)]"
            >
              <g.icon className="h-4 w-4 sm:h-5 sm:w-5 text-[#3B82F6] mb-2 sm:mb-3" />
              <p className="text-sm font-semibold text-[#E2E8F0]">{g.title}</p>
              <p className="text-[12px] sm:text-[13px] text-[#64748B] mt-1 leading-relaxed">{g.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 sm:mt-10">
          <Button
            size="lg"
            className="gap-2 sm:gap-2.5 px-6 sm:px-10 text-xs sm:text-sm font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-xl shadow-[rgba(37,99,235,0.25)] h-12 sm:h-14 rounded-xl transition-all duration-200 hover:shadow-2xl hover:scale-[1.02] border-0 w-full sm:w-auto"
            onClick={() => setTrialOpen(true)}
          >
            <Rocket className="h-4 w-4" />
            Quero organizar minha operação agora
          </Button>
          <p className="mt-3 text-[11px] sm:text-xs text-[#64748B]">
            Sem cartão · Comece em menos de 2 minutos · Cancele quando quiser
          </p>
        </div>
      </div>

      <TrialSignupDialog open={trialOpen} onOpenChange={setTrialOpen} />
    </section>
  );
}

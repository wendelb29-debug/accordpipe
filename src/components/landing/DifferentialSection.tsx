import { useState } from "react";
import { Rocket, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TrialSignupDialog } from "./TrialSignupDialog";

const without = [
  "5+ ferramentas desconectadas",
  "Dados espalhados em planilhas",
  "Leads esquecidos sem follow-up",
  "Retrabalho constante entre equipes",
];

const withAccord = [
  "Um único sistema integrado",
  "Dados centralizados e organizados",
  "Automações que não deixam escapar nada",
  "Fluxo contínuo do lead ao cliente",
];

export function DifferentialSection() {
  const [trialOpen, setTrialOpen] = useState(false);

  return (
    <section className="relative py-16 sm:py-28 md:py-36" style={{ background: "#080D19" }}>
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[rgba(59,130,246,0.12)] to-transparent" />

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-14">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white leading-tight">
            Você não precisa de mais ferramentas.{" "}
            <br className="hidden sm:block" />
            <span className="text-[#64748B]">Você precisa de um sistema que funcione.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 max-w-3xl mx-auto mb-8 sm:mb-12">
          <div className="rounded-2xl border border-[rgba(239,68,68,0.15)] bg-[rgba(239,68,68,0.04)] p-5 sm:p-6">
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[#EF4444] mb-4 sm:mb-5">Sem o Accord</p>
            <ul className="space-y-2.5 sm:space-y-3">
              {without.map((item) => (
                <li key={item} className="flex items-start gap-2 sm:gap-2.5">
                  <X className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#EF4444] mt-0.5 shrink-0" />
                  <span className="text-xs sm:text-sm text-[#9CA3AF]">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-[rgba(34,197,94,0.15)] bg-[rgba(34,197,94,0.04)] p-5 sm:p-6">
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[#22C55E] mb-4 sm:mb-5">Com o Accord</p>
            <ul className="space-y-2.5 sm:space-y-3">
              {withAccord.map((item) => (
                <li key={item} className="flex items-start gap-2 sm:gap-2.5">
                  <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#22C55E] mt-0.5 shrink-0" />
                  <span className="text-xs sm:text-sm text-[#D1D5DB]">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="text-center">
          <Button
            size="lg"
            className="gap-2 sm:gap-2.5 px-6 sm:px-8 text-xs sm:text-sm font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-xl shadow-[rgba(37,99,235,0.25)] h-12 sm:h-13 rounded-xl transition-all duration-200 hover:shadow-2xl hover:scale-[1.02] border-0 w-full sm:w-auto"
            onClick={() => setTrialOpen(true)}
          >
            <Rocket className="h-4 w-4" />
            Teste 7 dias grátis
          </Button>
        </div>
      </div>

      <TrialSignupDialog open={trialOpen} onOpenChange={setTrialOpen} />
    </section>
  );
}

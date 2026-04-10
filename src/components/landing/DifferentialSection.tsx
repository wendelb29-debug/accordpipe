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
    <section className="relative py-28 sm:py-36" style={{ background: "#080D19" }}>
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[rgba(59,130,246,0.12)] to-transparent" />

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
            Você não precisa de mais ferramentas.{" "}
            <br className="hidden sm:block" />
            <span className="text-[#64748B]">Você precisa de um sistema que funcione.</span>
          </h2>
        </div>

        {/* Comparison */}
        <div className="grid sm:grid-cols-2 gap-5 max-w-3xl mx-auto mb-12">
          {/* Without */}
          <div className="rounded-2xl border border-[rgba(239,68,68,0.15)] bg-[rgba(239,68,68,0.04)] p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-[#EF4444] mb-5">Sem o Accord</p>
            <ul className="space-y-3">
              {without.map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <X className="h-4 w-4 text-[#EF4444] mt-0.5 shrink-0" />
                  <span className="text-sm text-[#9CA3AF]">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* With */}
          <div className="rounded-2xl border border-[rgba(34,197,94,0.15)] bg-[rgba(34,197,94,0.04)] p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-[#22C55E] mb-5">Com o Accord</p>
            <ul className="space-y-3">
              {withAccord.map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 text-[#22C55E] mt-0.5 shrink-0" />
                  <span className="text-sm text-[#D1D5DB]">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="text-center">
          <Button
            size="lg"
            className="gap-2.5 px-8 text-sm font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-xl shadow-[rgba(37,99,235,0.25)] h-13 rounded-xl transition-all duration-200 hover:shadow-2xl hover:scale-[1.02] border-0"
            onClick={() => setTrialOpen(true)}
          >
            <Rocket className="h-4.5 w-4.5" />
            Teste 7 dias grátis
          </Button>
        </div>
      </div>

      <TrialSignupDialog open={trialOpen} onOpenChange={setTrialOpen} />
    </section>
  );
}

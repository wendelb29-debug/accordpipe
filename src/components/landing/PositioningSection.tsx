import { Layers } from "lucide-react";

export function PositioningSection() {
  return (
    <section className="relative py-14 sm:py-24 md:py-32" style={{ background: "#0B1120" }}>
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[rgba(59,130,246,0.12)] to-transparent" />

      <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(99,102,241,0.2)] bg-[rgba(99,102,241,0.06)] px-3 sm:px-4 py-1.5 text-[11px] sm:text-xs font-medium text-[#818CF8] mb-3 sm:mb-4">
          <Layers className="h-3 w-3" />
          Mais que um CRM
        </div>

        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white leading-tight">
          Tudo o que sua operação precisa.{" "}
          <span className="text-[#64748B]">Em um único lugar.</span>
        </h2>

        <div className="mt-5 sm:mt-6 space-y-3 sm:space-y-4 text-sm sm:text-base md:text-lg text-[#94A3B8] leading-relaxed max-w-2xl mx-auto">
          <p>O Accord não é apenas um CRM.</p>
          <p>É uma plataforma completa para empresas que querem crescer com estrutura, previsibilidade e escala.</p>
          <p className="text-[#64748B]">
            Você centraliza vendas, atendimento, contratos, financeiro e dados — eliminando ferramentas soltas e processos manuais.
          </p>
        </div>
      </div>
    </section>
  );
}

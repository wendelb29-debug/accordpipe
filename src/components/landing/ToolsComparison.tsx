import { Check, X, DollarSign } from "lucide-react";

const tools = [
  { name: "CRM de vendas", separate: "R$ 197/mês", accord: true },
  { name: "Contratos digitais", separate: "R$ 89/mês", accord: true },
  { name: "Atendimento WhatsApp", separate: "R$ 149/mês", accord: true },
  { name: "Propostas comerciais", separate: "R$ 79/mês", accord: true },
  { name: "Gestão financeira", separate: "R$ 99/mês", accord: true },
  { name: "Automação com IA", separate: "R$ 199/mês", accord: true },
];

const totalSeparate = "R$ 812/mês";

export function ToolsComparison() {
  return (
    <section className="relative py-28 sm:py-36" style={{ background: "#080D19" }}>
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[rgba(59,130,246,0.12)] to-transparent" />

      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold text-[#3B82F6] tracking-wider uppercase mb-3">
            Comparação
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
            Substitua 6+ ferramentas por{" "}
            <span className="bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] bg-clip-text text-transparent">
              uma só
            </span>
          </h2>
        </div>

        <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(17,24,39,0.5)] backdrop-blur-xl overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-3 px-5 py-4 border-b border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Funcionalidade</span>
            <span className="text-xs font-semibold text-[#EF4444] uppercase tracking-wider text-center">Ferramentas separadas</span>
            <span className="text-xs font-semibold text-[#22C55E] uppercase tracking-wider text-center">Accord</span>
          </div>

          {/* Rows */}
          {tools.map((t, i) => (
            <div
              key={t.name}
              className={`grid grid-cols-3 px-5 py-3.5 items-center ${
                i < tools.length - 1 ? "border-b border-[rgba(255,255,255,0.04)]" : ""
              }`}
            >
              <span className="text-sm text-[#CBD5E1] font-medium">{t.name}</span>
              <div className="flex items-center justify-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5 text-[#EF4444]/60" />
                <span className="text-sm text-[#9CA3AF]">{t.separate}</span>
              </div>
              <div className="flex justify-center">
                <div className="w-6 h-6 rounded-full bg-[rgba(34,197,94,0.12)] flex items-center justify-center">
                  <Check className="h-3.5 w-3.5 text-[#22C55E]" />
                </div>
              </div>
            </div>
          ))}

          {/* Total */}
          <div className="grid grid-cols-3 px-5 py-4 border-t border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)]">
            <span className="text-sm font-bold text-white">Total estimado</span>
            <div className="flex items-center justify-center">
              <span className="text-sm font-bold text-[#EF4444] line-through">{totalSeparate}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-sm font-bold text-[#22C55E]">Tudo incluso</span>
              <span className="text-[11px] text-[#64748B]">em um único sistema</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

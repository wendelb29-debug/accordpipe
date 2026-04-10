import { Eye, Workflow, Zap, TrendingUp } from "lucide-react";

const pillars = [
  { icon: Eye, title: "Visão completa da operação", color: "#3B82F6" },
  { icon: Workflow, title: "Organização de ponta a ponta", color: "#6366F1" },
  { icon: Zap, title: "Automação inteligente", color: "#8B5CF6" },
  { icon: TrendingUp, title: "Ganho real de produtividade", color: "#22C55E" },
];

export function AuthoritySection() {
  return (
    <section className="relative py-24 sm:py-32" style={{ background: "#0B1120" }}>
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[rgba(139,92,246,0.12)] to-transparent" />

      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-6">
          Controle, previsibilidade e escala
        </h2>

        <div className="max-w-2xl mx-auto space-y-4 text-base sm:text-lg text-[#94A3B8] leading-relaxed mb-12">
          <p>Empresas que crescem de verdade não dependem de sorte.</p>
          <p>Elas operam com processos claros, dados organizados e decisões rápidas.</p>
          <p className="text-[#64748B]">O Accord entrega exatamente isso:</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {pillars.map((p) => (
            <div
              key={p.title}
              className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] p-5 transition-all duration-300 hover:border-[rgba(255,255,255,0.1)]"
            >
              <div
                className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl"
                style={{ background: `${p.color}10`, color: p.color }}
              >
                <p.icon className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium text-[#E2E8F0]">{p.title}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

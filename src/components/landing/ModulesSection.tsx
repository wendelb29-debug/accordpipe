import {
  Kanban, FileSignature, MessageSquare, Users, Bot, BarChart3,
  Wallet, LayoutDashboard, Zap, ArrowRight,
} from "lucide-react";

const modules = [
  { icon: Kanban, title: "CRM Inteligente", desc: "Pipeline visual com automações e controle total do funil.", color: "#3B82F6", tag: "Vendas" },
  { icon: FileSignature, title: "Propostas Comerciais", desc: "Cálculo automático, parcelas e identidade visual.", color: "#6366F1", tag: "Comercial" },
  { icon: BarChart3, title: "Contratos Digitais", desc: "Assinatura eletrônica validada, rápida e segura.", color: "#8B5CF6", tag: "Jurídico" },
  { icon: MessageSquare, title: "Atendimento WhatsApp", desc: "Conversas centralizadas com respostas automatizadas.", color: "#22C55E", tag: "Suporte" },
  { icon: Users, title: "Gestão de Clientes", desc: "Base ativa, upsells, recorrência e histórico.", color: "#06B6D4", tag: "Retenção" },
  { icon: Wallet, title: "Financeiro Integrado", desc: "Cobranças, pagamentos e crescimento em tempo real.", color: "#F59E0B", tag: "Financeiro" },
  { icon: LayoutDashboard, title: "Workspaces", desc: "Departamentos com fluxos e métricas independentes.", color: "#EC4899", tag: "Gestão" },
  { icon: Bot, title: "Inteligência Artificial", desc: "Automação de tarefas e aumento de produtividade.", color: "#A855F7", tag: "IA" },
];

export function ModulesSection() {
  return (
    <section id="features" className="relative py-16 sm:py-28 md:py-36" style={{ background: "#080D19" }}>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] sm:w-[900px] h-[400px] sm:h-[600px] bg-[radial-gradient(ellipse,rgba(59,130,246,0.04),transparent_70%)] pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center mb-10 sm:mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(99,102,241,0.2)] bg-[rgba(99,102,241,0.06)] px-3 sm:px-4 py-1.5 text-[11px] sm:text-xs font-medium text-[#818CF8] mb-3 sm:mb-4">
            <Zap className="h-3 w-3" />
            Ecossistema completo
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white">
            Um ecossistema completo para sua operação
          </h2>
          <p className="mt-3 sm:mt-4 text-sm sm:text-base text-[#64748B] max-w-lg mx-auto">
            Cada módulo integrado de ponta a ponta. Sem ferramentas soltas.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {modules.map((m) => (
            <div
              key={m.title}
              className="group relative rounded-2xl border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] p-4 sm:p-6 transition-all duration-300 hover:border-[rgba(255,255,255,0.12)] hover:bg-[rgba(255,255,255,0.04)] hover:-translate-y-1 sm:hover:-translate-y-1.5 hover:shadow-xl hover:shadow-[rgba(0,0,0,0.2)]"
            >
              <span
                className="absolute top-3 right-3 sm:top-4 sm:right-4 text-[8px] sm:text-[9px] font-bold uppercase tracking-widest opacity-40 group-hover:opacity-70 transition-opacity duration-300"
                style={{ color: m.color }}
              >
                {m.tag}
              </span>

              <div
                className="mb-3 sm:mb-4 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-110"
                style={{ background: `${m.color}12`, color: m.color }}
              >
                <m.icon className="h-4.5 w-4.5 sm:h-5.5 sm:w-5.5" />
              </div>
              <h3 className="text-[13px] sm:text-[15px] font-semibold text-[#E2E8F0] mb-1 sm:mb-1.5">{m.title}</h3>
              <p className="text-[11px] sm:text-xs leading-relaxed text-[#64748B] mb-2 sm:mb-3">{m.desc}</p>

              <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-medium opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-0 group-hover:translate-x-1" style={{ color: m.color }}>
                Explorar <ArrowRight className="h-3 w-3" />
              </div>

              <div
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{ boxShadow: `inset 0 1px 30px ${m.color}08, 0 0 80px ${m.color}05` }}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

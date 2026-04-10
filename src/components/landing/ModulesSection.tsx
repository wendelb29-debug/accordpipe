import {
  Kanban, FileSignature, MessageSquare, Users, Bot, BarChart3,
  Wallet, LayoutDashboard, Zap,
} from "lucide-react";

const modules = [
  { icon: Kanban, title: "CRM Inteligente", desc: "Gerencie leads com pipeline visual, automações e controle total do funil.", color: "#3B82F6" },
  { icon: FileSignature, title: "Propostas Comerciais", desc: "Crie propostas profissionais com cálculo automático, parcelas e identidade visual.", color: "#6366F1" },
  { icon: BarChart3, title: "Contratos Digitais", desc: "Envie contratos com assinatura eletrônica validada, rápida e segura.", color: "#8B5CF6" },
  { icon: MessageSquare, title: "Atendimento WhatsApp", desc: "Centralize conversas, distribua atendimentos e automatize respostas com IA.", color: "#22C55E" },
  { icon: Users, title: "Gestão de Clientes", desc: "Controle sua base ativa, upsells, recorrência e histórico completo.", color: "#06B6D4" },
  { icon: Wallet, title: "Financeiro Integrado", desc: "Acompanhe cobranças, pagamentos e crescimento da operação em tempo real.", color: "#F59E0B" },
  { icon: LayoutDashboard, title: "Workspaces", desc: "Organize sua empresa por departamentos com fluxos independentes.", color: "#EC4899" },
  { icon: Bot, title: "Inteligência Artificial", desc: "Automatize tarefas, melhore comunicação e aumente produtividade com IA.", color: "#A855F7" },
];

export function ModulesSection() {
  return (
    <section id="features" className="relative py-24 sm:py-32" style={{ background: "#080D19" }}>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] bg-[radial-gradient(ellipse,rgba(59,130,246,0.04),transparent_70%)] pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(99,102,241,0.2)] bg-[rgba(99,102,241,0.06)] px-4 py-1.5 text-xs font-medium text-[#818CF8] mb-4">
            <Zap className="h-3 w-3" />
            Ecossistema completo
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Um ecossistema completo para sua operação
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {modules.map((m) => (
            <div
              key={m.title}
              className="group relative rounded-2xl border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] p-6 transition-all duration-300 hover:border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.04)] hover:-translate-y-1"
            >
              <div
                className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-300"
                style={{ background: `${m.color}10`, color: m.color }}
              >
                <m.icon className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold text-[#E2E8F0] mb-2">{m.title}</h3>
              <p className="text-xs leading-relaxed text-[#64748B]">{m.desc}</p>

              <div
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{ boxShadow: `inset 0 0 40px ${m.color}06, 0 0 60px ${m.color}04` }}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

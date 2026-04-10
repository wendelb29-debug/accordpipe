import {
  Kanban, FileSignature, MessageSquare, Users, Bot, BarChart3,
  Wallet, LayoutDashboard, FileText, Headphones, Zap, Globe,
} from "lucide-react";

const modules = [
  { icon: Kanban, title: "CRM Kanban", desc: "Pipeline visual com funis personalizáveis, arrastar cards e gestão de leads completa.", color: "#3B82F6" },
  { icon: FileSignature, title: "Contratos Digitais", desc: "Criação, envio e assinatura digital com validade jurídica e rastreabilidade completa.", color: "#8B5CF6" },
  { icon: FileText, title: "Propostas Comerciais", desc: "Monte propostas profissionais com catálogo de produtos e envie direto pelo sistema.", color: "#6366F1" },
  { icon: MessageSquare, title: "WhatsApp Integrado", desc: "Atendimento direto pelo WhatsApp com automações, filas e respostas por IA.", color: "#22C55E" },
  { icon: Bot, title: "Accord AI", desc: "Assistente inteligente para análise de dados, respostas automáticas e insights comerciais.", color: "#A855F7" },
  { icon: Wallet, title: "Financeiro", desc: "Controle de receitas, boletos, cobranças e relatórios financeiros por cliente.", color: "#F59E0B" },
  { icon: Users, title: "Base de Clientes", desc: "Cadastro centralizado com documentos, dependentes, contratos e histórico completo.", color: "#06B6D4" },
  { icon: LayoutDashboard, title: "Workspaces", desc: "Ambientes isolados por equipe, com permissões, funis e métricas independentes.", color: "#EC4899" },
];

export function ModulesSection() {
  return (
    <section id="features" className="relative py-24 sm:py-32" style={{ background: "#080D19" }}>
      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] bg-[radial-gradient(ellipse,rgba(59,130,246,0.04),transparent_70%)] pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(99,102,241,0.2)] bg-[rgba(99,102,241,0.06)] px-4 py-1.5 text-xs font-medium text-[#818CF8] mb-4">
            <Zap className="h-3 w-3" />
            Módulos integrados
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Tudo que sua operação precisa
          </h2>
          <p className="mt-4 text-lg text-[#64748B] max-w-xl mx-auto">
            Ferramentas enterprise integradas que funcionam como um único sistema.
          </p>
        </div>

        {/* Grid */}
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

              {/* Hover glow */}
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

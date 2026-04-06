import {
  BarChart3, FileSignature, MessageSquare, Users, Bot, Kanban,
} from "lucide-react";

const features = [
  { icon: Kanban, title: "CRM Inteligente", description: "Pipeline visual Kanban com gestão completa de leads, atividades e funil de vendas.", color: "#2563EB" },
  { icon: FileSignature, title: "Assinatura Digital", description: "Crie, envie e assine contratos digitalmente com validade jurídica e rastreabilidade.", color: "#7C3AED" },
  { icon: MessageSquare, title: "WhatsApp Integrado", description: "Atendimento direto pelo WhatsApp com automações e respostas inteligentes via IA.", color: "#22C55E" },
  { icon: Users, title: "Base de Clientes", description: "Cadastro centralizado com documentos, dependentes, contratos e histórico completo.", color: "#F59E0B" },
  { icon: BarChart3, title: "Relatórios Avançados", description: "Dashboards em tempo real com métricas de vendas, faturamento e performance.", color: "#06B6D4" },
  { icon: Bot, title: "Automação com IA", description: "Assistente inteligente que gera respostas, analisa dados e oferece insights.", color: "#A855F7" },
];

export function FeaturesSection() {
  return (
    <section id="features" className="relative py-20 sm:py-28" style={{ background: '#0B0F19' }}>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-[radial-gradient(circle,rgba(37,99,235,0.04),transparent_60%)] pointer-events-none" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center mb-14">
          <p className="text-sm font-semibold text-[#2563EB] tracking-wider uppercase mb-3">Funcionalidades</p>
          <h2 className="text-3xl font-bold tracking-tight text-[#E5E7EB] sm:text-4xl">
            Tudo que sua empresa precisa
          </h2>
          <p className="mt-4 text-lg text-[#9CA3AF]">
            Ferramentas poderosas para gerenciar toda a sua operação comercial.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl border border-[rgba(255,255,255,0.05)] bg-[#111827] p-7 transition-all duration-200 hover:border-[rgba(255,255,255,0.1)] hover:bg-[#1a2235]"
              style={{ boxShadow: '0 0 0 0 transparent' }}
              onMouseEnter={(e) => e.currentTarget.style.boxShadow = `0 0 40px ${f.color}08`}
              onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 0 0 0 transparent'}
            >
              <div
                className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-200"
                style={{ background: `${f.color}12`, color: f.color }}
              >
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold text-[#E5E7EB]">{f.title}</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-[#6B7280]">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

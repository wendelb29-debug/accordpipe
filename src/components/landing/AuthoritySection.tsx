import { TrendingUp, Shield, Layers, Globe } from "lucide-react";

const pillars = [
  {
    icon: TrendingUp,
    title: "Vendas escaláveis",
    desc: "Pipeline estruturado com automação inteligente para multiplicar resultados sem aumentar complexidade.",
    metric: "3x",
    metricLabel: "mais conversões",
  },
  {
    icon: Shield,
    title: "Segurança enterprise",
    desc: "Permissões granulares, auditoria completa e dados isolados por tenant com RLS nativo.",
    metric: "100%",
    metricLabel: "rastreável",
  },
  {
    icon: Layers,
    title: "Gestão unificada",
    desc: "CRM, contratos, financeiro e atendimento em um único workspace. Sem integrações quebradas.",
    metric: "8+",
    metricLabel: "módulos integrados",
  },
  {
    icon: Globe,
    title: "Multi-tenant nativo",
    desc: "Arquitetura SaaS pronta para escala com workspaces, equipes e permissões por organização.",
    metric: "∞",
    metricLabel: "organizações",
  },
];

export function AuthoritySection() {
  return (
    <section className="relative py-24 sm:py-32" style={{ background: "#0B1120" }}>
      {/* Divider line */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[rgba(59,130,246,0.15)] to-transparent" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Construído para empresas{" "}
            <span className="bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] bg-clip-text text-transparent">que crescem</span>
          </h2>
          <p className="mt-4 text-lg text-[#64748B] max-w-xl mx-auto">
            Arquitetura robusta, segurança de verdade e ferramentas que acompanham o ritmo da sua operação.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {pillars.map((p) => (
            <div key={p.title} className="group rounded-2xl border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] p-7 transition-all duration-300 hover:border-[rgba(255,255,255,0.1)] hover:-translate-y-1">
              <p.icon className="h-6 w-6 text-[#3B82F6] mb-5" />
              <div className="mb-4">
                <span className="text-3xl font-black text-white">{p.metric}</span>
                <span className="ml-2 text-xs text-[#64748B] uppercase tracking-wider">{p.metricLabel}</span>
              </div>
              <h3 className="text-base font-semibold text-[#E2E8F0] mb-2">{p.title}</h3>
              <p className="text-sm leading-relaxed text-[#64748B]">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

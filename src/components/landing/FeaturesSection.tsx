import {
  BarChart3, FileSignature, MessageSquare, Users, Bot, Kanban,
} from "lucide-react";

const features = [
  { icon: BarChart3, title: "CRM Inteligente", description: "Pipeline visual Kanban com gestão completa de leads, atividades e funil de vendas." },
  { icon: FileSignature, title: "Contratos com Assinatura Digital", description: "Crie, envie e assine contratos digitalmente com validade jurídica e rastreabilidade completa." },
  { icon: MessageSquare, title: "Integração com WhatsApp", description: "Atendimento direto pelo WhatsApp com automações e respostas inteligentes via IA." },
  { icon: Users, title: "Base de Clientes Completa", description: "Cadastro centralizado de clientes com documentos, dependentes, contratos e histórico." },
  { icon: BarChart3, title: "Relatórios Avançados", description: "Dashboards em tempo real com métricas de vendas, faturamento e performance da equipe." },
  { icon: Bot, title: "Automação com IA", description: "Assistente inteligente que gera respostas, analisa dados e oferece insights estratégicos." },
];

export function FeaturesSection() {
  return (
    <section id="features" className="relative py-20 sm:py-28 bg-[hsl(228,40%,6%)]">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-[radial-gradient(circle,hsl(224,76%,53%,0.06),transparent_60%)]" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center mb-14">
          <h2 className="text-3xl font-bold tracking-tight text-[hsl(210,40%,98%)] sm:text-4xl">
            Tudo que sua empresa precisa
          </h2>
          <p className="mt-4 text-lg text-[hsl(218,14%,65%)]">
            Ferramentas poderosas para gerenciar toda a sua operação comercial.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl border border-[hsl(220,20%,16%)] bg-[hsl(220,30%,10%)] p-7 transition-all duration-300 hover:border-[hsl(224,76%,53%,0.3)] hover:bg-[hsl(220,30%,12%)]"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(224,76%,53%,0.15)] to-[hsl(263,87%,60%,0.1)] text-[hsl(224,76%,65%)] group-hover:from-[hsl(224,76%,53%,0.25)] group-hover:to-[hsl(263,87%,60%,0.15)] transition-all">
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold text-[hsl(210,40%,98%)]">{f.title}</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-[hsl(218,14%,55%)]">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

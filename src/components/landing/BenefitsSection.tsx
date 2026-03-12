import {
  Building2,
  FileSignature,
  Receipt,
  BarChart3,
  MessageSquare,
  FileText,
} from "lucide-react";

const features = [
  {
    icon: MessageSquare,
    title: "CRM e Atendimento",
    description: "Gerencie clientes com quadro Kanban visual, WhatsApp integrado e automações inteligentes.",
  },
  {
    icon: Receipt,
    title: "Faturamento Automático",
    description: "Emita pagamentos via Kiwify e receba automaticamente por PIX, boleto ou cartão.",
  },
  {
    icon: BarChart3,
    title: "Relatórios de Performance",
    description: "Dashboards em tempo real com métricas essenciais para tomada de decisão.",
  },
  {
    icon: Building2,
    title: "Gestão de Empresas",
    description: "Cadastre e gerencie todos os seus clientes com informações completas e organizadas.",
  },
  {
    icon: FileSignature,
    title: "Contratos Digitais",
    description: "Crie, envie e assine contratos digitalmente com captura de foto e geolocalização.",
  },
  {
    icon: FileText,
    title: "Documentos Centralizados",
    description: "Armazene e organize todos os documentos dos seus clientes em um só lugar.",
  },
];

export function BenefitsSection() {
  return (
    <section id="features" className="mx-auto max-w-7xl px-6 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Tudo que sua empresa precisa
        </h2>
        <p className="mt-4 text-lg text-muted-foreground">
          Ferramentas poderosas para gerenciar toda a sua operação em um só lugar.
        </p>
      </div>
      <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="group rounded-2xl border border-border/50 bg-card p-6 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <feature.icon className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">{feature.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

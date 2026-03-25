import {
  Building2,
  FileSignature,
  Receipt,
  BarChart3,
  MessageSquare,
  FileText,
  Bot,
  Users,
  ShieldCheck,
  Kanban,
  Phone,
  CreditCard,
} from "lucide-react";

const features = [
  {
    icon: Bot,
    title: "Orbit AI – Inteligência Artificial",
    description: "Assistente com IA integrada (ChatGPT) que gera respostas automáticas, analisa dados e oferece insights estratégicos em tempo real.",
    highlight: true,
  },
  {
    icon: MessageSquare,
    title: "CRM Completo com Kanban",
    description: "Pipeline visual de vendas com quadro Kanban, gestão de leads por etapas, histórico de atividades e controle total do funil comercial.",
  },
  {
    icon: Phone,
    title: "WhatsApp Integrado",
    description: "Atendimento direto pelo WhatsApp com envio e recebimento de mensagens, automações e respostas inteligentes via IA.",
  },
  {
    icon: Receipt,
    title: "Faturamento Automático",
    description: "Emissão de cobranças via Kiwify com PIX, boleto e cartão. Controle financeiro completo com status de pagamento em tempo real.",
  },
  {
    icon: FileSignature,
    title: "Contratos Digitais",
    description: "Crie, envie e assine contratos digitalmente com captura de foto, geolocalização e histórico completo de assinaturas.",
  },
  {
    icon: Building2,
    title: "Gestão de Empresas",
    description: "Cadastro completo de clientes e servidores com CNPJ, endereço, responsáveis e controle de status ativo/inativo.",
  },
  {
    icon: Users,
    title: "Gestão de Usuários e Permissões",
    description: "Controle de acesso por perfis (Admin, CEO, Operador, Financeiro, Comercial) com permissões granulares por função.",
  },
  {
    icon: BarChart3,
    title: "Dashboards e Relatórios",
    description: "Painéis em tempo real com métricas de vendas, faturamento, conversão e performance da equipe comercial.",
  },
  {
    icon: FileText,
    title: "Documentos Centralizados",
    description: "Armazene e organize todos os documentos dos clientes em um só lugar com categorização e busca rápida.",
  },
  {
    icon: Kanban,
    title: "Gestão de Vendas",
    description: "Acompanhe todo o ciclo de venda: prospecção, proposta, negociação, cadastro, contrato e ativação do cliente.",
  },
  {
    icon: CreditCard,
    title: "Financeiro Integrado",
    description: "Controle de receitas, despesas, boletos e inadimplência com visão consolidada por empresa e período.",
  },
  {
    icon: ShieldCheck,
    title: "Segurança Avançada",
    description: "Criptografia de ponta a ponta, autenticação segura, controle de sessão e backups automáticos diários.",
  },
];

export function BenefitsSection() {
  return (
    <section id="features" className="mx-auto max-w-7xl px-6 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Tudo que sua empresa precisa em um só lugar
        </h2>
        <p className="mt-4 text-lg text-muted-foreground">
          Ferramentas poderosas para gerenciar toda a sua operação — do primeiro contato à cobrança recorrente.
        </p>
      </div>
      <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <div
            key={feature.title}
            className={`group rounded-2xl border p-6 transition-all duration-300 hover:shadow-lg ${
              feature.highlight
                ? "border-primary/40 bg-primary/5 hover:border-primary/60 hover:shadow-primary/10"
                : "border-border/50 bg-card hover:border-primary/30 hover:shadow-primary/5"
            }`}
          >
            <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl transition-colors ${
              feature.highlight
                ? "bg-primary text-primary-foreground"
                : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground"
            }`}>
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

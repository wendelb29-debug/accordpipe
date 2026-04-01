import {
  Building2, FileSignature, Receipt, BarChart3, MessageSquare, FileText,
  Bot, Users, ShieldCheck, Kanban, Phone, CreditCard,
} from "lucide-react";

const features = [
  { icon: Bot, title: "Orbit AI – Inteligência Artificial", description: "Assistente com IA integrada (ChatGPT) que gera respostas automáticas, analisa dados e oferece insights estratégicos em tempo real.", highlight: true },
  { icon: MessageSquare, title: "CRM Completo com Kanban", description: "Pipeline visual de vendas com quadro Kanban, gestão de leads por etapas, histórico de atividades e controle total do funil comercial." },
  { icon: Phone, title: "WhatsApp Integrado", description: "Atendimento direto pelo WhatsApp com envio e recebimento de mensagens, automações e respostas inteligentes via IA." },
  { icon: Receipt, title: "Faturamento Automático", description: "Emissão de cobranças via gateway de pagamento com PIX, boleto e cartão. Controle financeiro completo com status de pagamento em tempo real." },
  { icon: FileSignature, title: "Contratos Digitais", description: "Crie, envie e assine contratos digitalmente com captura de foto, geolocalização e histórico completo de assinaturas." },
  { icon: Building2, title: "Gestão de Empresas", description: "Cadastro completo de clientes e servidores com CNPJ, endereço, responsáveis e controle de status ativo/inativo." },
  { icon: Users, title: "Gestão de Usuários e Permissões", description: "Controle de acesso por perfis (Admin, CEO, Operador, Financeiro, Comercial) com permissões granulares por função." },
  { icon: BarChart3, title: "Dashboards e Relatórios", description: "Painéis em tempo real com métricas de vendas, faturamento, conversão e performance da equipe comercial." },
  { icon: FileText, title: "Documentos Centralizados", description: "Armazene e organize todos os documentos dos clientes em um só lugar com categorização e busca rápida." },
  { icon: Kanban, title: "Gestão de Vendas", description: "Acompanhe todo o ciclo de venda: prospecção, proposta, negociação, cadastro, contrato e ativação do cliente." },
  { icon: CreditCard, title: "Financeiro Integrado", description: "Controle de receitas, despesas, boletos e inadimplência com visão consolidada por empresa e período." },
  { icon: ShieldCheck, title: "Segurança Avançada", description: "Criptografia de ponta a ponta, autenticação segura, controle de sessão e backups automáticos diários." },
];

export function BenefitsSection() {
  return (
    <section id="features" className="relative py-24">
      {/* Subtle blue background layer */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-[hsl(216,25%,94%)] to-background" />
      
      <div className="relative mx-auto max-w-7xl px-6">
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
              className={`group rounded-2xl border p-7 transition-all duration-300 premium-hover ${
                feature.highlight
                  ? "border-primary/30 bg-card shadow-card hover:border-primary/50 hover:shadow-lg"
                  : "border-border/40 bg-card shadow-card hover:border-primary/30 hover:shadow-lg"
              }`}
            >
              <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-xl transition-colors ${
                feature.highlight
                  ? "gradient-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "bg-primary/8 text-primary group-hover:gradient-primary group-hover:text-primary-foreground group-hover:shadow-md"
              }`}>
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold text-foreground">{feature.title}</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

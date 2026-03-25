import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "O que é o ORBIT HUB?",
    answer:
      "É uma plataforma completa de gestão operacional que centraliza CRM, atendimento via WhatsApp, contratos digitais, faturamento, relatórios e inteligência artificial em um único painel moderno e seguro.",
  },
  {
    question: "O ORBIT HUB possui Inteligência Artificial?",
    answer:
      "Sim! O Orbit AI é um assistente inteligente integrado que utiliza tecnologia de IA (ChatGPT) para gerar respostas automáticas no WhatsApp, analisar dados, fornecer insights estratégicos e auxiliar na tomada de decisões.",
  },
  {
    question: "Preciso pagar para usar?",
    answer:
      "O ORBIT HUB possui planos flexíveis. Oferecemos um teste gratuito de 7 dias para que você conheça todas as funcionalidades antes de tomar sua decisão.",
  },
  {
    question: "Posso testar o sistema antes de contratar?",
    answer:
      "Sim! Oferecemos 7 dias de teste gratuito com acesso a todas as funcionalidades. Basta clicar em 'Teste Gratuito' e preencher seus dados.",
  },
  {
    question: "O sistema é seguro?",
    answer:
      "Sim. Utilizamos criptografia de ponta a ponta, autenticação segura, controle de acesso por níveis de permissão e backups automáticos diários.",
  },
  {
    question: "Como funciona o pagamento automático?",
    answer:
      "Integramos com a Kiwify para processar pagamentos via PIX, boleto e cartão de crédito. Quando o pagamento é confirmado, o sistema atualiza automaticamente o status financeiro.",
  },
  {
    question: "Quais integrações o ORBIT HUB oferece?",
    answer:
      "O sistema integra com WhatsApp (Z-API e Evolution API), Kiwify para pagamentos, e possui IA integrada para automações inteligentes. Novas integrações são adicionadas constantemente.",
  },
];

export function FAQSection() {
  return (
    <section id="faq" className="mx-auto max-w-3xl px-6 py-24">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Perguntas frequentes
        </h2>
        <p className="mt-4 text-lg text-muted-foreground">
          Tire suas dúvidas sobre o ORBIT HUB.
        </p>
      </div>
      <Accordion type="single" collapsible className="w-full">
        {faqs.map((faq, i) => (
          <AccordionItem key={i} value={`item-${i}`}>
            <AccordionTrigger className="text-left text-foreground">
              {faq.question}
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground">
              {faq.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}

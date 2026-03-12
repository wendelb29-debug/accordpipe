import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "O que é o ORBIT HUB ERP?",
    answer:
      "É uma plataforma completa de gestão operacional que centraliza atendimento, vendas, contratos, pagamentos e relatórios em um único painel moderno e seguro.",
  },
  {
    question: "Preciso pagar para usar?",
    answer:
      "O ORBIT HUB ERP possui planos flexíveis. Entre em contato conosco para conhecer as opções e encontrar o plano ideal para sua operação.",
  },
  {
    question: "Posso testar o sistema antes de contratar?",
    answer:
      "Sim! Oferecemos uma demonstração completa para que você conheça todas as funcionalidades antes de tomar sua decisão.",
  },
  {
    question: "O sistema é seguro?",
    answer:
      "Sim. Utilizamos criptografia de ponta a ponta, autenticação multi-fator, controle de acesso por níveis e backups automáticos diários.",
  },
  {
    question: "Como funciona o pagamento automático?",
    answer:
      "Integramos com a Kiwify para processar pagamentos via PIX, boleto e cartão de crédito. Quando o pagamento é confirmado, o sistema atualiza automaticamente o status financeiro da empresa.",
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
          Tire suas dúvidas sobre o ORBIT HUB ERP.
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

import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  { question: "O que é o ACCORD?", answer: "É uma plataforma completa de gestão operacional que centraliza CRM, atendimento via WhatsApp, contratos digitais, faturamento, relatórios e inteligência artificial em um único painel moderno e seguro." },
  { question: "O ACCORD possui Inteligência Artificial?", answer: "Sim! O Accord AI é um assistente inteligente integrado que utiliza tecnologia de IA para gerar respostas automáticas, analisar dados, fornecer insights estratégicos e auxiliar na tomada de decisões." },
  { question: "Preciso pagar para usar?", answer: "O ACCORD possui planos flexíveis. Oferecemos um teste gratuito de 7 dias para que você conheça todas as funcionalidades antes de tomar sua decisão." },
  { question: "Posso testar o sistema antes de contratar?", answer: "Sim! Oferecemos 7 dias de teste gratuito com acesso a todas as funcionalidades. Basta clicar em 'Teste Gratuito' e preencher seus dados." },
  { question: "O sistema é seguro?", answer: "Sim. Utilizamos criptografia de ponta a ponta, autenticação segura, controle de acesso por níveis de permissão e backups automáticos diários." },
  { question: "Quais integrações o ACCORD oferece?", answer: "O sistema integra com API WhatsApp, gateway de pagamento para cobranças, e possui IA integrada para automações inteligentes. Novas integrações são adicionadas constantemente." },
];

export function FAQSection() {
  return (
    <section id="faq" className="relative py-20 sm:py-28 bg-[hsl(228,40%,6%)]">
      <div className="relative mx-auto max-w-3xl px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight text-[hsl(210,40%,98%)] sm:text-4xl">
            Perguntas frequentes
          </h2>
          <p className="mt-4 text-lg text-[hsl(218,14%,65%)]">
            Tire suas dúvidas sobre o ACCORD.
          </p>
        </div>
        <div className="rounded-2xl border border-[hsl(220,20%,16%)] bg-[hsl(220,30%,10%)] p-6">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="border-[hsl(220,20%,16%)]">
                <AccordionTrigger className="text-left text-[hsl(210,40%,98%)] hover:text-[hsl(224,76%,65%)] py-5">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-[hsl(218,14%,55%)] leading-relaxed pb-5">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}

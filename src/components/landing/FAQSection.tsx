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
    <section id="faq" className="relative py-14 sm:py-20 md:py-28" style={{ background: '#0B0F19' }}>
      <div className="relative mx-auto max-w-3xl px-4 sm:px-6">
        <div className="text-center mb-8 sm:mb-12">
          <p className="text-xs sm:text-sm font-semibold text-[#7C3AED] tracking-wider uppercase mb-2 sm:mb-3">Dúvidas</p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-[#E5E7EB]">
            Perguntas frequentes
          </h2>
          <p className="mt-3 sm:mt-4 text-sm sm:text-lg text-[#9CA3AF]">
            Tire suas dúvidas sobre o ACCORD.
          </p>
        </div>
        <div className="rounded-2xl border border-[rgba(255,255,255,0.05)] bg-[#111827] p-4 sm:p-6">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="border-[rgba(255,255,255,0.05)]">
                <AccordionTrigger className="text-left text-sm sm:text-base text-[#E5E7EB] hover:text-[#A78BFA] py-4 sm:py-5">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-xs sm:text-sm text-[#9CA3AF] leading-relaxed pb-4 sm:pb-5">
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

import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";

export default function TermsOfService() {
  return (
    <>
      <Helmet>
        <title>Termos de Uso | ACCORD</title>
        <meta name="description" content="Termos de uso da plataforma ACCORD. Regras de uso, limitações de responsabilidade e condições do serviço." />
        <link rel="canonical" href="https://accordpipe.com.br/terms" />
        <meta property="og:title" content="Termos de Uso | ACCORD" />
        <meta property="og:description" content="Termos de uso da plataforma ACCORD." />
        <meta property="og:url" content="https://accordpipe.com.br/terms" />
      </Helmet>
    <div className="min-h-screen bg-[#070B14] text-[#E5E7EB]">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12 sm:py-16">
        <Link to="/" className="text-sm text-[#2563EB] hover:underline">← Voltar</Link>
        <h1 className="mt-6 text-3xl sm:text-4xl font-bold">Termos de Uso</h1>
        <p className="mt-2 text-sm text-[#9CA3AF]">Última atualização: 23 de abril de 2026</p>

        <div className="mt-8 space-y-6 text-sm sm:text-base text-[#D1D5DB] leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-[#E5E7EB] mb-2">1. Identificação do Vendedor</h2>
            <p>Estes Termos de Uso ("Termos") regem o acesso e utilização da plataforma Accord ("Serviço"), fornecida por <strong>Accord Pipe</strong> ("nós", "nosso"). Ao acessar ou utilizar o Serviço, você está contratando com Accord Pipe e concorda com estes Termos.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#E5E7EB] mb-2">2. Aceitação</h2>
            <p>O uso continuado do Serviço constitui aceitação destes Termos. Caso não concorde, descontinue imediatamente a utilização. Você declara possuir capacidade legal — ou autoridade para vincular sua organização — ao aceitar estes Termos.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#E5E7EB] mb-2">3. Descrição do Serviço</h2>
            <p>O Accord é uma plataforma SaaS de gestão operacional que oferece CRM, gestão de contratos, assinatura digital, integração com WhatsApp, gestão financeira e demais módulos descritos no plano contratado.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#E5E7EB] mb-2">4. Uso Permitido e Proibido</h2>
            <p>Você se compromete a não: (i) utilizar o Serviço para fins ilícitos, fraude ou spam; (ii) violar direitos de propriedade intelectual de terceiros; (iii) interferir na segurança do Serviço (incluindo malware, sondagem ou scraping); (iv) realizar engenharia reversa, revender ou redistribuir o Serviço; (v) burlar limitações técnicas do plano contratado.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#E5E7EB] mb-2">5. Propriedade Intelectual</h2>
            <p>Todo o software, documentação, marca e identidade visual do Serviço são de propriedade exclusiva da Accord Pipe. Concedemos a você uma licença limitada, não exclusiva e intransferível para uso do Serviço dentro do plano contratado. O conteúdo enviado por você permanece de sua propriedade; você nos concede licença limitada para hospedá-lo e processá-lo exclusivamente para prestação do Serviço.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#E5E7EB] mb-2">6. Pagamentos e Assinatura</h2>
            <p>Os termos de pagamento, faturamento, impostos, cancelamento e reembolso são processados pelo nosso revendedor oficial. Consulte os <a href="https://www.paddle.com/legal/checkout-buyer-terms" target="_blank" rel="noopener noreferrer" className="text-[#2563EB] hover:underline">Termos do Comprador da Paddle</a> e nossa <Link to="/refund-policy" className="text-[#2563EB] hover:underline">Política de Reembolso</Link>.</p>
            <p className="mt-3"><strong>Divulgação Merchant of Record:</strong> Our order process is conducted by our online reseller Paddle.com. Paddle.com is the Merchant of Record for all our orders. Paddle provides all customer service inquiries and handles returns.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#E5E7EB] mb-2">7. Conta e Credenciais</h2>
            <p>Você é responsável por manter a confidencialidade das credenciais de acesso e por toda atividade realizada em sua conta. Comprometemo-nos a fornecer informações precisas e mantê-las atualizadas.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#E5E7EB] mb-2">8. Nível de Serviço e Garantias</h2>
            <p>Embora envidemos esforços razoáveis para manter o Serviço disponível, não garantimos operação ininterrupta ou livre de erros. Excluímos, na máxima extensão permitida em lei, todas as garantias implícitas, incluindo comerciabilidade e adequação a um propósito específico.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#E5E7EB] mb-2">9. Limitação de Responsabilidade</h2>
            <p>Nossa responsabilidade agregada perante você fica limitada aos valores efetivamente pagos nos 12 (doze) meses anteriores ao evento que originou a reclamação. Não respondemos por danos indiretos, consequentes ou especiais, incluindo lucros cessantes, perda de dados ou de fundo de comércio. Não excluímos responsabilidade por fraude, dolo, morte ou lesão pessoal quando vedada por lei.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#E5E7EB] mb-2">10. Suspensão e Rescisão</h2>
            <p>Podemos suspender ou encerrar seu acesso em caso de: (i) inadimplência; (ii) violação material destes Termos; (iii) risco de segurança ou fraude; (iv) violações reiteradas. Após o encerramento, disponibilizaremos uma janela razoável para exportação de dados antes da exclusão definitiva.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#E5E7EB] mb-2">11. Indenização</h2>
            <p>Você nos indenizará por reclamações de terceiros decorrentes de seu conteúdo, uso ilícito do Serviço ou violação destes Termos.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#E5E7EB] mb-2">12. Lei Aplicável e Foro</h2>
            <p>Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da Comarca de Uberlândia/MG para dirimir controvérsias, com renúncia a qualquer outro, por mais privilegiado que seja.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#E5E7EB] mb-2">13. Cessão e Força Maior</h2>
            <p>Você não poderá ceder estes Termos sem nosso consentimento prévio. Poderemos ceder em casos de fusão, aquisição ou reorganização societária. Nenhuma das partes responderá por descumprimento decorrente de eventos de força maior fora de seu controle razoável.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#E5E7EB] mb-2">14. Contato</h2>
            <p>Dúvidas sobre estes Termos: <a href="mailto:suporte@accordclass.com.br" className="text-[#2563EB] hover:underline">suporte@accordclass.com.br</a>.</p>
          </section>
        </div>
      </div>
    </div>
    </>
  );
}

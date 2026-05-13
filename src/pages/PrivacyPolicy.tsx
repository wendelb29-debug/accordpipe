import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";

export default function PrivacyPolicy() {
  return (
    <>
      <Helmet>
        <title>Política de Privacidade | ACCORD</title>
        <meta name="description" content="Política de privacidade da ACCORD. Saiba como protegemos seus dados pessoais e cumprimos a LGPD." />
        <link rel="canonical" href="https://accordpipe.com.br/privacy" />
        <meta property="og:title" content="Política de Privacidade | ACCORD" />
        <meta property="og:description" content="Política de privacidade da ACCORD. Saiba como protegemos seus dados pessoais." />
        <meta property="og:url" content="https://accordpipe.com.br/privacy" />
      </Helmet>
    <div className="min-h-screen bg-[#070B14] text-[#E5E7EB]">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12 sm:py-16">
        <Link to="/" className="text-sm text-[#2563EB] hover:underline">← Voltar</Link>
        <h1 className="mt-6 text-3xl sm:text-4xl font-bold">Política de Privacidade</h1>
        <p className="mt-2 text-sm text-[#9CA3AF]">Última atualização: 23 de abril de 2026</p>

        <div className="mt-8 space-y-6 text-sm sm:text-base text-[#D1D5DB] leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-[#E5E7EB] mb-2">1. Identificação do Controlador</h2>
            <p>Esta Política de Privacidade é fornecida por <strong>Accord Pipe</strong> ("nós", "nosso"), atuando como controlador de dados pessoais coletados por meio de nossa plataforma SaaS de gestão operacional ("Serviço"). Ao utilizar o Serviço, você concorda com as práticas descritas neste documento.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#E5E7EB] mb-2">2. Dados que Coletamos</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Dados de cadastro:</strong> nome, e-mail, CPF, telefone/WhatsApp, data de nascimento, credenciais de acesso.</li>
              <li><strong>Dados da empresa:</strong> razão social, CNPJ, endereço e dados de contato corporativo.</li>
              <li><strong>Conteúdo do usuário:</strong> leads, contratos, documentos, mensagens e arquivos enviados à plataforma.</li>
              <li><strong>Dados de uso e telemetria:</strong> endereço IP, identificadores de dispositivo, logs de acesso, navegador.</li>
              <li><strong>Dados de suporte:</strong> mensagens enviadas a nossa equipe de atendimento.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#E5E7EB] mb-2">3. Finalidades e Bases Legais</h2>
            <p>Utilizamos seus dados para: (i) criação e manutenção da conta — execução de contrato; (ii) prestação do Serviço — execução de contrato; (iii) prevenção a fraudes e segurança — legítimo interesse e obrigação legal; (iv) melhoria do produto — legítimo interesse; (v) suporte ao cliente — execução de contrato; (vi) comunicações de marketing — consentimento (com opção de descadastro a qualquer momento).</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#E5E7EB] mb-2">4. Compartilhamento de Dados</h2>
            <p>Compartilhamos dados pessoais com:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li><strong>Provedores de infraestrutura e subprocessadores</strong> (hospedagem, análise, ferramentas de suporte).</li>
              <li><strong>Merchant of Record (Paddle)</strong> para venda do produto, gestão de assinaturas, pagamentos, conformidade tributária e emissão de faturas.</li>
              <li><strong>Assessores profissionais</strong> (jurídico, contábil) quando estritamente necessário.</li>
              <li><strong>Autoridades competentes</strong> quando exigido por lei.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#E5E7EB] mb-2">5. Retenção</h2>
            <p>Mantemos seus dados pessoais apenas pelo tempo necessário ao cumprimento das finalidades para as quais foram coletados, observadas as obrigações legais e regulatórias aplicáveis. Após esse período, os dados são excluídos ou anonimizados de forma segura.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#E5E7EB] mb-2">6. Direitos do Titular (LGPD)</h2>
            <p>Você pode, a qualquer momento, solicitar: confirmação da existência de tratamento; acesso aos dados; correção de dados incompletos ou desatualizados; anonimização, bloqueio ou eliminação; portabilidade; informação sobre compartilhamentos; revogação do consentimento. Para exercer seus direitos, contate <a href="mailto:suporte@accordclass.com.br" className="text-[#2563EB] hover:underline">suporte@accordclass.com.br</a>.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#E5E7EB] mb-2">7. Segurança</h2>
            <p>Adotamos medidas técnicas e organizacionais apropriadas — incluindo criptografia em trânsito, controles de acesso baseados em função e auditoria — para proteger seus dados contra acesso não autorizado, perda ou divulgação indevida.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#E5E7EB] mb-2">8. Cookies</h2>
            <p>Utilizamos cookies essenciais para autenticação e funcionamento da plataforma, além de cookies analíticos para entender o uso do produto. Você pode gerenciar preferências diretamente em seu navegador.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#E5E7EB] mb-2">9. Contato</h2>
            <p>Em caso de dúvidas sobre esta Política, entre em contato pelo e-mail <a href="mailto:suporte@accordclass.com.br" className="text-[#2563EB] hover:underline">suporte@accordclass.com.br</a>.</p>
          </section>
        </div>
      </div>
    </div>
    </>
  );
}

import { Link } from "react-router-dom";

const SELLER = "Accord";

export default function Privacidade() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 text-foreground">
      <Link to="/" className="text-sm text-primary hover:underline">← Voltar</Link>
      <h1 className="text-3xl font-bold mt-4 mb-2">Política de Privacidade</h1>
      <p className="text-sm text-muted-foreground mb-8">Última atualização: {new Date().toLocaleDateString("pt-BR")}</p>

      <Section title="1. Controlador">
        <strong>{SELLER}</strong> atua como controlador dos dados pessoais coletados por meio da
        plataforma. Esta política descreve quais dados coletamos, como usamos e com quem
        compartilhamos.
      </Section>

      <Section title="2. Dados coletados">
        Coletamos: (a) dados de cadastro (nome, e-mail, CPF/CNPJ, telefone); (b) credenciais de
        acesso; (c) conteúdos que você insere na plataforma (leads, contratos, mensagens); (d) dados
        de uso e telemetria (logs, identificadores de dispositivo, IP); (e) mensagens de suporte.
      </Section>

      <Section title="3. Finalidades">
        Usamos os dados para: criar e manter sua conta, prestar o Serviço, garantir segurança e
        prevenir fraude, melhorar nossos produtos, prestar suporte e enviar comunicações relacionadas
        ao Serviço.
      </Section>

      <Section title="4. Base legal (LGPD)">
        Tratamos dados com base em: execução de contrato, legítimo interesse (segurança, melhoria do
        produto), cumprimento de obrigação legal e consentimento (quando aplicável).
      </Section>

      <Section title="5. Compartilhamento">
        Compartilhamos dados com:
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>Provedores de infraestrutura, hospedagem e analytics (subprocessadores);</li>
          <li>
            Nosso processador de pagamentos <strong>Paddle.com</strong>, que atua como Comerciante
            Registrado para venda, gestão de assinaturas, faturamento, conformidade fiscal e
            emissão de notas;
          </li>
          <li>Consultores profissionais (jurídico, contábil), quando necessário;</li>
          <li>Autoridades, quando exigido por lei.</li>
        </ul>
      </Section>

      <Section title="6. Retenção">
        Mantemos os dados pelo período necessário para cumprir as finalidades descritas, atender
        obrigações legais e contratuais. Após esse período, os dados são excluídos ou anonimizados.
      </Section>

      <Section title="7. Direitos do titular">
        Você pode solicitar: acesso, correção, exclusão, portabilidade, restrição ou objeção ao
        tratamento, e revogação de consentimento. Para exercer seus direitos, contate-nos pelos
        canais oficiais. Você também pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD).
      </Section>

      <Section title="8. Segurança">
        Adotamos medidas técnicas e organizacionais apropriadas (criptografia em trânsito, controles
        de acesso, segregação de ambientes) para proteger seus dados contra acesso não autorizado,
        perda ou alteração.
      </Section>

      <Section title="9. Transferências internacionais">
        Alguns subprocessadores podem operar fora do Brasil (incluindo Paddle.com nos EUA/UE). Nesses
        casos, adotamos salvaguardas contratuais adequadas, conforme a LGPD e as leis aplicáveis.
      </Section>

      <Section title="10. Cookies">
        Utilizamos cookies essenciais para autenticação e funcionamento do Serviço. Cookies de
        analytics podem ser utilizados, sempre conforme as preferências do usuário.
      </Section>

      <Section title="11. Alterações">
        Podemos atualizar esta política. Mudanças relevantes serão informadas com antecedência
        razoável.
      </Section>

      <Section title="12. Contato">
        Para questões sobre privacidade, entre em contato pelos canais de suporte da plataforma.
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="text-lg font-semibold mb-2">{title}</h2>
      <div className="text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

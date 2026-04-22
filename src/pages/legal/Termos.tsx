import { Link } from "react-router-dom";

const SELLER = "Accord";

export default function Termos() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 text-foreground">
      <Link to="/" className="text-sm text-primary hover:underline">← Voltar</Link>
      <h1 className="text-3xl font-bold mt-4 mb-2">Termos de Uso</h1>
      <p className="text-sm text-muted-foreground mb-8">Última atualização: {new Date().toLocaleDateString("pt-BR")}</p>

      <Section title="1. Aceitação">
        Ao utilizar a plataforma <strong>{SELLER}</strong> ("Serviço"), você concorda com estes Termos.
        Se não concordar, não utilize o Serviço.
      </Section>

      <Section title="2. Sobre o Vendedor">
        Estes Termos são celebrados entre você e <strong>{SELLER}</strong>. Você confirma que tem
        autoridade para vincular sua organização (caso esteja contratando como pessoa jurídica) ou que
        possui idade legal para contratar (caso pessoa física).
      </Section>

      <Section title="3. Uso adequado">
        Você concorda em não: (a) usar o Serviço para fins ilegais; (b) cometer fraude, spam ou abuso;
        (c) infringir direitos de propriedade intelectual; (d) interferir na segurança do Serviço,
        incluindo malware, varredura, scraping não autorizado ou tentativas de invasão.
      </Section>

      <Section title="4. Propriedade intelectual">
        O Serviço, incluindo software, documentação, marca e identidade visual, é de propriedade
        exclusiva de <strong>{SELLER}</strong>. Concedemos a você uma licença limitada, não-exclusiva e
        intransferível para uso de acordo com seu plano contratado.
      </Section>

      <Section title="5. Disponibilidade">
        Embora façamos esforços razoáveis para manter o Serviço disponível e estável, não garantimos
        operação ininterrupta ou livre de erros.
      </Section>

      <Section title="6. Pagamentos, faturamento e cancelamento">
        Os pagamentos, ciclos de cobrança, impostos, cancelamentos e reembolsos seguem os termos do
        nosso processador de pagamentos. Nosso processo de pedidos é conduzido pelo nosso revendedor
        online <strong>Paddle.com</strong>. Paddle.com é o <strong>Comerciante Registrado (Merchant of
        Record)</strong> de todos os nossos pedidos. A Paddle responde por toda a tributação relacionada
        à venda, atende solicitações de clientes e processa devoluções. Consulte os{" "}
        <a className="text-primary underline" href="https://www.paddle.com/legal/checkout-buyer-terms" target="_blank" rel="noopener noreferrer">
          Termos do Comprador da Paddle
        </a>{" "}
        para detalhes sobre cobrança, renovação automática e cancelamento.
      </Section>

      <Section title="7. Suspensão e encerramento">
        Podemos suspender ou encerrar seu acesso em caso de: violação material destes Termos,
        inadimplência, risco de fraude ou segurança, ou violações repetidas/graves das nossas políticas.
      </Section>

      <Section title="8. Conteúdo do usuário">
        Você concede a <strong>{SELLER}</strong> licença limitada para hospedar e processar conteúdos
        que você inserir no Serviço, exclusivamente para a finalidade de prestá-lo.
      </Section>

      <Section title="9. Garantias e limitação de responsabilidade">
        Na máxima extensão permitida pela lei, excluímos garantias implícitas (incluindo
        comercialização e adequação a uma finalidade específica). Nossa responsabilidade total agregada
        é limitada às taxas pagas por você nos 12 meses anteriores ao evento que deu causa à
        reclamação. Excluímos responsabilidade por danos indiretos, lucros cessantes, perda de dados
        ou perda de reputação. Estas limitações não se aplicam a casos de fraude, dolo ou onde a lei
        não permitir.
      </Section>

      <Section title="10. Indenização">
        Você concorda em indenizar <strong>{SELLER}</strong> por reclamações decorrentes do conteúdo
        que você submeter, do uso ilícito do Serviço ou da violação destes Termos.
      </Section>

      <Section title="11. Lei aplicável e foro">
        Estes Termos são regidos pelas leis do Brasil. Fica eleito o foro da comarca da sede do
        Vendedor, com renúncia a qualquer outro, por mais privilegiado que seja.
      </Section>

      <Section title="12. Alterações">
        Podemos atualizar estes Termos. Mudanças relevantes serão comunicadas com antecedência razoável.
        O uso continuado após a publicação implica aceitação.
      </Section>

      <Section title="13. Contato">
        Dúvidas: entre em contato pelos canais de suporte disponíveis dentro do Serviço.
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="text-lg font-semibold mb-2">{title}</h2>
      <p className="text-sm leading-relaxed text-muted-foreground">{children}</p>
    </section>
  );
}

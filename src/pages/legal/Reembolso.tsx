import { Link } from "react-router-dom";

const SELLER = "Accord";

export default function Reembolso() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 text-foreground">
      <Link to="/" className="text-sm text-primary hover:underline">← Voltar</Link>
      <h1 className="text-3xl font-bold mt-4 mb-2">Política de Reembolso</h1>
      <p className="text-sm text-muted-foreground mb-8">Última atualização: {new Date().toLocaleDateString("pt-BR")}</p>

      <Section title="Garantia de 30 dias">
        Oferecemos uma <strong>garantia de satisfação de 30 dias</strong>. Se você não estiver
        satisfeito com sua assinatura <strong>{SELLER}</strong>, pode solicitar o reembolso integral
        em até 30 dias corridos a contar da data da compra.
      </Section>

      <Section title="Como solicitar">
        Os reembolsos são processados pelo nosso parceiro de pagamento{" "}
        <strong>Paddle.com</strong>, que atua como Comerciante Registrado de todas as nossas vendas.
        Para solicitar:
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>
            Acesse{" "}
            <a className="text-primary underline" href="https://paddle.net" target="_blank" rel="noopener noreferrer">
              paddle.net
            </a>{" "}
            e localize sua compra pelo e-mail utilizado;
          </li>
          <li>Ou entre em contato com nosso suporte dentro da plataforma.</li>
        </ul>
      </Section>

      <Section title="Reembolsos após 30 dias">
        Após o período de 30 dias, reembolsos não são concedidos automaticamente, mas casos
        excepcionais (falha técnica grave, cobrança duplicada) serão analisados individualmente em
        boa-fé.
      </Section>

      <Section title="Cancelamento">
        Você pode cancelar sua assinatura a qualquer momento em <strong>Assinatura → Gerenciar /
        Cancelar</strong>. O cancelamento encerra renovações futuras; o acesso permanece ativo até o
        fim do período já pago.
      </Section>

      <Section title="Renovação automática">
        As assinaturas são renovadas automaticamente ao fim de cada ciclo (mensal ou anual), salvo
        cancelamento prévio.
      </Section>

      <Section title="Contato">
        Para qualquer dúvida sobre cobranças ou reembolsos, entre em contato pelos canais de suporte
        da plataforma.
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

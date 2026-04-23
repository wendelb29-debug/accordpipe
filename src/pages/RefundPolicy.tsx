import { Link } from "react-router-dom";

export default function RefundPolicy() {
  return (
    <div className="min-h-screen bg-[#070B14] text-[#E5E7EB]">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12 sm:py-16">
        <Link to="/" className="text-sm text-[#2563EB] hover:underline">← Voltar</Link>
        <h1 className="mt-6 text-3xl sm:text-4xl font-bold">Política de Reembolso</h1>
        <p className="mt-2 text-sm text-[#9CA3AF]">Última atualização: 23 de abril de 2026</p>

        <div className="mt-8 space-y-6 text-sm sm:text-base text-[#D1D5DB] leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-[#E5E7EB] mb-2">1. Garantia de 30 dias</h2>
            <p>A <strong>Accord Pipe</strong> oferece uma garantia incondicional de <strong>30 dias</strong>. Caso você não esteja satisfeito com sua assinatura, pode solicitar o reembolso integral em até 30 (trinta) dias corridos a partir da data do pedido.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#E5E7EB] mb-2">2. Como solicitar o reembolso</h2>
            <p>Os reembolsos são processados pela Paddle, nossa Merchant of Record oficial. Para solicitar, acesse <a href="https://paddle.net" target="_blank" rel="noopener noreferrer" className="text-[#2563EB] hover:underline">paddle.net</a> com o e-mail utilizado na compra ou entre em contato com nosso suporte em <a href="mailto:suporte@accordclass.com.br" className="text-[#2563EB] hover:underline">suporte@accordclass.com.br</a>.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#E5E7EB] mb-2">3. Prazo de processamento</h2>
            <p>Após aprovação, o reembolso é processado pela Paddle no mesmo método de pagamento utilizado. O valor pode levar de 5 a 10 dias úteis para aparecer em seu extrato, dependendo do emissor do cartão ou instituição financeira.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#E5E7EB] mb-2">4. Cancelamento da assinatura</h2>
            <p>Você pode cancelar sua assinatura a qualquer momento. O cancelamento interrompe a renovação no próximo ciclo de cobrança e mantém seu acesso até o final do período já pago.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#E5E7EB] mb-2">5. Contato</h2>
            <p>Dúvidas sobre reembolsos: <a href="mailto:suporte@accordclass.com.br" className="text-[#2563EB] hover:underline">suporte@accordclass.com.br</a>.</p>
          </section>
        </div>
      </div>
    </div>
  );
}

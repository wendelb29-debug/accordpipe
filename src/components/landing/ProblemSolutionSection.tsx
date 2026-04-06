import { XCircle, CheckCircle2 } from "lucide-react";

const problems = [
  "Leads se perdem em planilhas e WhatsApp",
  "Contratos manuais e desorganizados",
  "Falta de controle sobre o funil de vendas",
  "Processos repetitivos e sem automação",
  "Dados espalhados em vários sistemas",
  "Sem visibilidade de métricas e resultados",
];

const solutions = [
  "CRM completo com pipeline visual Kanban",
  "Assinatura digital integrada e válida juridicamente",
  "Controle total do funil: lead → venda → contrato",
  "Automação inteligente com IA integrada",
  "Tudo centralizado em uma única plataforma",
  "Relatórios avançados em tempo real",
];

export function ProblemSolutionSection() {
  return (
    <section className="relative py-20 sm:py-28" style={{ background: '#0B0F19' }}>
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center mb-14">
          <h2 className="text-3xl font-bold tracking-tight text-[#E5E7EB] sm:text-4xl">
            Chega de improviso. Hora de escalar.
          </h2>
          <p className="mt-4 text-lg text-[#9CA3AF]">
            Veja como o ACCORD resolve os problemas que travam sua operação.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Problems */}
          <div className="rounded-2xl border border-[rgba(239,68,68,0.15)] bg-[rgba(239,68,68,0.03)] p-7 sm:p-8">
            <h3 className="text-lg font-semibold text-[#F87171] mb-6 flex items-center gap-2">
              <XCircle className="h-5 w-5" />
              Sem o Accord
            </h3>
            <ul className="space-y-4">
              {problems.map((p, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-[#9CA3AF]">
                  <XCircle className="h-4 w-4 mt-0.5 shrink-0 text-[rgba(239,68,68,0.5)]" />
                  {p}
                </li>
              ))}
            </ul>
          </div>

          {/* Solutions */}
          <div className="rounded-2xl border border-[rgba(34,197,94,0.15)] bg-[rgba(34,197,94,0.03)] p-7 sm:p-8">
            <h3 className="text-lg font-semibold text-[#4ADE80] mb-6 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Com o Accord
            </h3>
            <ul className="space-y-4">
              {solutions.map((s, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-[#D1D5DB]">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-[rgba(34,197,94,0.6)]" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

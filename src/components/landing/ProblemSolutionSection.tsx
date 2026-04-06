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
  "Assinatura digital integrada e juridicamente válida",
  "Controle total do funil: lead → venda → contrato",
  "Automação inteligente com IA integrada",
  "Tudo centralizado em uma única plataforma",
  "Relatórios avançados em tempo real",
];

export function ProblemSolutionSection() {
  return (
    <section className="relative py-20 sm:py-28 bg-[hsl(228,40%,6%)]">
      <div className="absolute inset-0 bg-gradient-to-b from-[hsl(228,40%,8%)] via-[hsl(228,40%,6%)] to-[hsl(228,40%,6%)]" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center mb-14">
          <h2 className="text-3xl font-bold tracking-tight text-[hsl(210,40%,98%)] sm:text-4xl">
            Chega de improviso. Hora de escalar.
          </h2>
          <p className="mt-4 text-lg text-[hsl(218,14%,65%)]">
            Veja como o ACCORD resolve os problemas que travam sua operação.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Problems */}
          <div className="rounded-2xl border border-[hsl(0,50%,25%,0.3)] bg-[hsl(0,30%,10%,0.3)] p-7 sm:p-8">
            <h3 className="text-lg font-semibold text-[hsl(0,72%,65%)] mb-6 flex items-center gap-2">
              <XCircle className="h-5 w-5" />
              Sem o Accord
            </h3>
            <ul className="space-y-4">
              {problems.map((p, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-[hsl(218,14%,55%)]">
                  <XCircle className="h-4 w-4 mt-0.5 shrink-0 text-[hsl(0,60%,50%,0.6)]" />
                  {p}
                </li>
              ))}
            </ul>
          </div>

          {/* Solutions */}
          <div className="rounded-2xl border border-[hsl(142,50%,25%,0.3)] bg-[hsl(142,30%,10%,0.2)] p-7 sm:p-8">
            <h3 className="text-lg font-semibold text-[hsl(142,71%,55%)] mb-6 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Com o Accord
            </h3>
            <ul className="space-y-4">
              {solutions.map((s, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-[hsl(210,20%,80%)]">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-[hsl(142,71%,45%,0.7)]" />
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

import { Link2Off, RefreshCcw, FileSpreadsheet, CheckCircle2 } from "lucide-react";

const items = [
  { icon: Link2Off, title: "Sem retrabalho", description: "Cada etapa alimenta a próxima automaticamente. Nada é digitado duas vezes." },
  { icon: RefreshCcw, title: "Sem perder clientes", description: "Follow-ups, lembretes e atividades garantem que nenhum lead seja esquecido." },
  { icon: FileSpreadsheet, title: "Sem planilhas", description: "Tudo que antes era feito em Excel agora está organizado e integrado no sistema." },
];

export function DifferentialSection() {
  return (
    <section className="relative py-20 sm:py-28" style={{ background: '#0B0F19' }}>
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center mb-14">
          <p className="text-sm font-semibold text-[#A855F7] tracking-wider uppercase mb-3">Diferencial</p>
          <h2 className="text-3xl font-bold tracking-tight text-[#E5E7EB] sm:text-4xl">
            Tudo conectado. Nada perdido.
          </h2>
          <p className="mt-4 text-lg text-[#9CA3AF] max-w-2xl mx-auto">
            Uma plataforma onde cada dado se conecta e cada processo flui sem interrupção.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.title}
              className="relative rounded-2xl border border-[rgba(255,255,255,0.05)] bg-[#111827] p-8 transition-all duration-200 hover:border-[rgba(124,58,237,0.2)]"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[rgba(124,58,237,0.08)] text-[#A855F7]">
                <item.icon className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold text-[#E5E7EB] mb-2">{item.title}</h3>
              <p className="text-sm leading-relaxed text-[#6B7280]">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

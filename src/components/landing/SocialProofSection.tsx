import { Star } from "lucide-react";

const testimonials = [
  {
    quote: "Aceleramos o atendimento em 3x com o Accord. A gestão de contratos ficou muito mais ágil.",
    name: "Carlos Mendes",
    role: "Diretor Comercial",
    company: "Grupo Proteger",
  },
  {
    quote: "Os relatórios em tempo real mudaram nossa tomada de decisão. Recomendo para qualquer operação.",
    name: "Ana Souza",
    role: "Gerente de Operações",
    company: "Shield Proteção Veicular",
  },
  {
    quote: "Centralizar documentos, contratos e pagamentos num único sistema foi transformador.",
    name: "Roberto Lima",
    role: "CEO",
    company: "SafeDrive Associação",
  },
];

export function SocialProofSection() {
  return (
    <section className="relative py-28 sm:py-36" style={{ background: '#0B0F19' }}>
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[rgba(245,158,11,0.12)] to-transparent" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center mb-14">
          <p className="text-sm font-semibold text-[#F59E0B] tracking-wider uppercase mb-3">Depoimentos</p>
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Quem usa, recomenda
          </h2>
          <p className="mt-3 text-[#64748B]">Empresas reais que transformaram sua operação com o Accord.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="group rounded-2xl border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] p-7 transition-all duration-300 hover:border-[rgba(245,158,11,0.15)] hover:-translate-y-1 hover:bg-[rgba(255,255,255,0.04)]"
            >
              <div className="flex gap-1 mb-5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-[#F59E0B] text-[#F59E0B]" />
                ))}
              </div>
              <p className="text-sm leading-relaxed text-[#D1D5DB] italic mb-6">"{t.quote}"</p>
              <div className="border-t border-[rgba(255,255,255,0.05)] pt-4">
                <p className="text-sm font-semibold text-[#E5E7EB]">{t.name}</p>
                <p className="text-xs text-[#6B7280] mt-0.5">{t.role} — {t.company}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

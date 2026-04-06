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

const stats = [
  { value: "500+", label: "Empresas gerenciadas" },
  { value: "10k+", label: "Contratos assinados" },
  { value: "99.9%", label: "Uptime garantido" },
  { value: "3x", label: "Mais produtividade" },
];

export function SocialProofSection() {
  return (
    <section className="relative py-20 sm:py-28 bg-[hsl(228,40%,6%)]">
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 mb-20">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-[hsl(224,76%,60%)] to-[hsl(263,87%,65%)] bg-clip-text text-transparent">{stat.value}</p>
              <p className="mt-1 text-sm text-[hsl(218,14%,50%)]">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Testimonials */}
        <div className="mx-auto max-w-2xl text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight text-[hsl(210,40%,98%)] sm:text-4xl">
            Quem usa, recomenda
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="rounded-2xl border border-[hsl(220,20%,16%)] bg-[hsl(220,30%,10%)] p-6"
            >
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-[hsl(45,93%,47%)] text-[hsl(45,93%,47%)]" />
                ))}
              </div>
              <p className="text-sm leading-relaxed text-[hsl(210,20%,80%)] italic">"{t.quote}"</p>
              <div className="mt-4 border-t border-[hsl(220,20%,16%)] pt-4">
                <p className="text-sm font-semibold text-[hsl(210,40%,98%)]">{t.name}</p>
                <p className="text-xs text-[hsl(218,14%,50%)]">{t.role} — {t.company}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

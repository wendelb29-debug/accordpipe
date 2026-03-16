import { Star } from "lucide-react";

const testimonials = [
  {
    quote: "Aceleramos o atendimento em 3x com o Orbit. A gestão de contratos ficou muito mais ágil.",
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
    <section className="border-y border-border/50 bg-muted/30">
      <div className="mx-auto max-w-7xl px-6 py-24">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 mb-20">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl font-bold text-primary">{stat.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Testimonials */}
        <div className="mx-auto max-w-2xl text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Quem usa, recomenda
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Veja o que nossos clientes dizem sobre o ORBIT HUB.
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm"
            >
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                ))}
              </div>
              <p className="text-sm leading-relaxed text-foreground italic">"{t.quote}"</p>
              <div className="mt-4 border-t border-border/50 pt-4">
                <p className="text-sm font-semibold text-foreground">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.role} — {t.company}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

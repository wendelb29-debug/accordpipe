import { Car, Shield, Building, Sun, Stethoscope, Briefcase } from "lucide-react";

const segments = [
  { icon: Car, name: "Proteção Veicular" },
  { icon: Shield, name: "Seguros" },
  { icon: Building, name: "Imobiliárias" },
  { icon: Sun, name: "Energia Solar" },
  { icon: Stethoscope, name: "Clínicas" },
  { icon: Briefcase, name: "Empresas de Serviços" },
];

export function TargetAudienceSection() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-24">
      <div className="mx-auto max-w-2xl text-center mb-16">
        <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Para quem é o ACCORD?
        </h2>
        <p className="mt-4 text-lg text-muted-foreground">
          O ACCORD foi desenvolvido para empresas que precisam gerenciar vendas, contratos e pagamentos com eficiência.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6">
        {segments.map((seg) => (
          <div
            key={seg.name}
            className="group flex flex-col items-center gap-4 rounded-2xl border border-border/40 bg-card p-7 text-center shadow-card premium-hover"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/8 text-primary transition-colors group-hover:gradient-primary group-hover:text-primary-foreground group-hover:shadow-md">
              <seg.icon className="h-7 w-7" />
            </div>
            <span className="text-sm font-semibold text-foreground">{seg.name}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

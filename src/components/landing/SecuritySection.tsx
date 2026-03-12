import { Lock, Database, Cloud, Activity, ShieldCheck } from "lucide-react";

const features = [
  { icon: Lock, title: "Criptografia de dados", description: "Proteção de ponta a ponta em todas as comunicações." },
  { icon: Database, title: "Backups automáticos", description: "Seus dados seguros com backups diários." },
  { icon: Cloud, title: "Servidores em nuvem", description: "Infraestrutura escalável e de alta disponibilidade." },
  { icon: Activity, title: "Uptime 99.9%", description: "Disponibilidade garantida para sua operação." },
  { icon: ShieldCheck, title: "Conformidade LGPD", description: "Adequado à Lei Geral de Proteção de Dados." },
];

export function SecuritySection() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-24">
      <div className="mx-auto max-w-2xl text-center mb-16">
        <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Segurança e Infraestrutura
        </h2>
        <p className="mt-4 text-lg text-muted-foreground">
          Sua operação protegida com tecnologia de ponta.
        </p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
        {features.map((f) => (
          <div key={f.title} className="flex flex-col items-center text-center gap-3 rounded-2xl border border-border/50 bg-card p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <f.icon className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">{f.title}</h3>
            <p className="text-xs text-muted-foreground">{f.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

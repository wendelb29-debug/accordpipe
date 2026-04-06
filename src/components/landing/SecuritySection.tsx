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
    <section className="relative py-20 sm:py-28" style={{ background: '#0B0F19' }}>
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center mb-14">
          <p className="text-sm font-semibold text-[#22C55E] tracking-wider uppercase mb-3">Segurança</p>
          <h2 className="text-3xl font-bold tracking-tight text-[#E5E7EB] sm:text-4xl">
            Segurança e Infraestrutura
          </h2>
          <p className="mt-4 text-lg text-[#9CA3AF]">
            Sua operação protegida com tecnologia de ponta.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {features.map((f) => (
            <div key={f.title} className="flex flex-col items-center text-center gap-4 rounded-2xl border border-[rgba(255,255,255,0.05)] bg-[#111827] p-6 transition-all duration-200 hover:border-[rgba(34,197,94,0.15)]">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[rgba(34,197,94,0.08)] text-[#22C55E]">
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-semibold text-[#E5E7EB]">{f.title}</h3>
              <p className="text-xs text-[#6B7280] leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

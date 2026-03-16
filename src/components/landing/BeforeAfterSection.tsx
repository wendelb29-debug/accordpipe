import { X, Check } from "lucide-react";

const comparisons = [
  { before: "Planilhas desorganizadas", after: "CRM visual centralizado" },
  { before: "WhatsApp sem controle", after: "Atendimento integrado" },
  { before: "Contratos em papel", after: "Contratos digitais" },
  { before: "Cobrança manual", after: "Faturamento automático" },
];

export function BeforeAfterSection() {
  return (
    <section className="border-y border-border/50 bg-muted/30">
      <div className="mx-auto max-w-4xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Antes e depois do ORBIT
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Veja como sua operação muda com o ORBIT HUB.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Before column */}
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6">
            <h3 className="mb-6 text-center text-lg font-bold text-destructive">ANTES</h3>
            <div className="space-y-4">
              {comparisons.map((c) => (
                <div key={c.before} className="flex items-center gap-3 rounded-xl bg-background/60 p-4">
                  <X className="h-5 w-5 shrink-0 text-destructive" />
                  <span className="text-sm text-foreground">{c.before}</span>
                </div>
              ))}
            </div>
          </div>
          {/* After column */}
          <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-6">
            <h3 className="mb-6 text-center text-lg font-bold text-green-600">COM ORBIT</h3>
            <div className="space-y-4">
              {comparisons.map((c) => (
                <div key={c.after} className="flex items-center gap-3 rounded-xl bg-background/60 p-4">
                  <Check className="h-5 w-5 shrink-0 text-green-600" />
                  <span className="text-sm text-foreground">{c.after}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

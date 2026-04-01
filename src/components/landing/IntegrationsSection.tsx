import { MessageSquare, CreditCard, Calendar, Webhook } from "lucide-react";

const integrations = [
  { icon: MessageSquare, name: "WhatsApp API", color: "text-green-500" },
  { icon: CreditCard, name: "Gateway de Pagamento", color: "text-purple-500" },
  { icon: Calendar, name: "Google Agenda", color: "text-red-500" },
  { icon: Webhook, name: "Webhooks / API", color: "text-orange-500" },
];

export function IntegrationsSection() {
  return (
    <section id="integracoes" className="border-y border-border/50 bg-muted/30">
      <div className="mx-auto max-w-7xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Integrações poderosas
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            O ORBIT conecta com as principais ferramentas para automatizar sua operação.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6">
          {integrations.map((item) => (
            <div
              key={item.name}
              className="group flex flex-col items-center gap-3 rounded-2xl border border-border/50 bg-card p-6 text-center transition-all hover:border-primary/30 hover:shadow-lg"
            >
              <div className={`flex h-14 w-14 items-center justify-center rounded-xl bg-muted ${item.color}`}>
                <item.icon className="h-7 w-7" />
              </div>
              <span className="text-sm font-medium text-foreground">{item.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

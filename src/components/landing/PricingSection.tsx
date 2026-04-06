import { useState } from "react";
import { Check, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TrialSignupDialog } from "./TrialSignupDialog";

const plans = [
  {
    name: "Starter",
    price: "197",
    description: "Ideal para equipes pequenas",
    users: "Até 3 usuários",
    features: [
      "CRM com pipeline Kanban",
      "Contratos com assinatura digital",
      "Integração WhatsApp",
      "Relatórios básicos",
      "Suporte por e-mail",
    ],
    highlight: false,
  },
  {
    name: "Growth",
    price: "397",
    description: "Para operações em crescimento",
    users: "Até 10 usuários",
    features: [
      "Tudo do Starter",
      "Automação com IA (Accord AI)",
      "Relatórios avançados",
      "Gestão financeira",
      "Suporte prioritário",
    ],
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "697",
    description: "Para grandes operações",
    users: "Usuários ilimitados",
    features: [
      "Tudo do Growth",
      "Multi-empresa",
      "API personalizada",
      "Onboarding dedicado",
      "Suporte 24/7",
    ],
    highlight: false,
  },
];

export function PricingSection() {
  const [trialOpen, setTrialOpen] = useState(false);

  return (
    <section id="planos" className="relative py-20 sm:py-28 bg-[hsl(228,40%,6%)]">
      <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-[radial-gradient(circle,hsl(263,87%,60%,0.06),transparent_60%)]" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center mb-14">
          <h2 className="text-3xl font-bold tracking-tight text-[hsl(210,40%,98%)] sm:text-4xl">
            Planos que cabem na sua operação
          </h2>
          <p className="mt-4 text-lg text-[hsl(218,14%,65%)]">
            Comece com 7 dias grátis. Sem cartão de crédito.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border p-7 sm:p-8 flex flex-col ${
                plan.highlight
                  ? "border-[hsl(263,87%,60%,0.4)] bg-gradient-to-b from-[hsl(263,87%,60%,0.08)] to-[hsl(220,30%,10%)]"
                  : "border-[hsl(220,20%,16%)] bg-[hsl(220,30%,10%)]"
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-[hsl(224,76%,53%)] to-[hsl(263,87%,60%)] text-[hsl(0,0%,100%)] text-xs font-semibold">
                  Mais popular
                </div>
              )}
              <h3 className="text-lg font-bold text-[hsl(210,40%,98%)]">{plan.name}</h3>
              <p className="text-sm text-[hsl(218,14%,55%)] mt-1">{plan.description}</p>
              <div className="mt-5">
                <span className="text-4xl font-black text-[hsl(210,40%,98%)]">R${plan.price}</span>
                <span className="text-sm text-[hsl(218,14%,50%)]">/mês</span>
              </div>
              <p className="text-xs text-[hsl(263,87%,65%)] mt-2 font-medium">{plan.users}</p>
              <ul className="mt-6 space-y-3 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-[hsl(218,14%,65%)]">
                    <Check className="h-4 w-4 shrink-0 text-[hsl(142,71%,45%)]" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                className={`mt-7 w-full h-11 font-semibold rounded-xl ${
                  plan.highlight
                    ? "bg-gradient-to-r from-[hsl(224,76%,53%)] to-[hsl(263,87%,60%)] text-[hsl(0,0%,100%)] border-0 shadow-lg shadow-[hsl(263,87%,60%,0.2)]"
                    : "bg-[hsl(220,25%,14%)] text-[hsl(210,40%,96%)] border border-[hsl(220,20%,22%)] hover:bg-[hsl(220,25%,18%)]"
                }`}
                onClick={() => setTrialOpen(true)}
              >
                <Rocket className="h-4 w-4 mr-2" />
                Começar agora
              </Button>
            </div>
          ))}
        </div>
      </div>
      <TrialSignupDialog open={trialOpen} onOpenChange={setTrialOpen} />
    </section>
  );
}

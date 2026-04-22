import { useMemo, useState } from "react";
import { Loader2, Check, ExternalLink, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBillingPlans } from "@/hooks/useBillingPlans";
import { usePaddleSubscription } from "@/hooks/usePaddleSubscription";
import { usePaddleCheckout } from "@/hooks/usePaddleCheckout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function Assinatura() {
  const { plans, loading: plansLoading } = useBillingPlans();
  const { subscription, isActive, loading: subLoading } = usePaddleSubscription();
  const { openCheckout, loading: checkoutLoading } = usePaddleCheckout();
  const { profile } = useAuth();
  const { toast } = useToast();
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");
  const [portalLoading, setPortalLoading] = useState(false);

  const visiblePlans = useMemo(
    () => plans.filter(p => p.is_active && p.slug !== "master-" && !p.slug.startsWith("starter-copy")),
    [plans]
  );

  const formatBRL = (n: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

  const handleSubscribe = (slug: string) => {
    const plan = visiblePlans.find(p => p.slug === slug);
    openCheckout({
      priceId: `${slug}_${cycle}`,
      seatPriceId: `${slug}_seat_monthly`,
      baseUserLimit: plan?.base_user_limit ?? 3,
    });
  };

  const handleOpenPortal = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("paddle-customer-portal", {});
      if (error || !data?.url) throw new Error(error?.message || "Falha ao abrir portal");
      window.open(data.url, "_blank");
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setPortalLoading(false);
    }
  };

  if (plansLoading || subLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" /> Assinatura da plataforma
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Escolha um plano para liberar o acesso completo ao Accord para sua empresa.
        </p>
      </div>

      {isActive && subscription && (
        <Card className="border-primary/40 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                Plano ativo
                <Badge variant="default">{subscription.status}</Badge>
              </span>
              <Button size="sm" variant="outline" onClick={handleOpenPortal} disabled={portalLoading}>
                {portalLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ExternalLink className="h-4 w-4 mr-2" />}
                Gerenciar / Cancelar
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <div><span className="text-muted-foreground">Plano:</span> <strong>{subscription.price_id}</strong></div>
            <div><span className="text-muted-foreground">Ciclo:</span> {subscription.billing_cycle}</div>
            <div><span className="text-muted-foreground">Seats extras pagos:</span> {subscription.seats_quantity}</div>
            {subscription.current_period_end && (
              <div><span className="text-muted-foreground">Próxima cobrança:</span> {new Date(subscription.current_period_end).toLocaleDateString("pt-BR")}</div>
            )}
            {subscription.cancel_at_period_end && (
              <div className="text-warning-foreground font-medium pt-1">Cancelamento agendado para o fim do período.</div>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs value={cycle} onValueChange={v => setCycle(v as any)}>
        <TabsList>
          <TabsTrigger value="monthly">Mensal</TabsTrigger>
          <TabsTrigger value="yearly">Anual <Badge variant="secondary" className="ml-2 text-[10px]">2 meses grátis</Badge></TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {visiblePlans.map(plan => {
          const price = cycle === "monthly" ? plan.monthly_price : plan.yearly_price;
          const isCurrent = subscription?.product_id === `plan_${plan.slug}`;
          return (
            <Card key={plan.id} className={isCurrent ? "border-primary" : ""}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {plan.name}
                  {isCurrent && <Badge>Atual</Badge>}
                </CardTitle>
                {plan.description && <p className="text-xs text-muted-foreground">{plan.description}</p>}
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="text-3xl font-bold">{formatBRL(Number(price))}</div>
                  <div className="text-xs text-muted-foreground">/{cycle === "monthly" ? "mês" : "ano"}</div>
                </div>
                <ul className="space-y-1.5 text-sm">
                  <li className="flex items-start gap-2"><Check className="h-4 w-4 text-primary mt-0.5 shrink-0" /> Até <strong>{plan.base_user_limit}</strong> usuários inclusos</li>
                  <li className="flex items-start gap-2"><Check className="h-4 w-4 text-primary mt-0.5 shrink-0" /> Usuário extra: {formatBRL(Number(plan.price_per_extra_user))}/mês</li>
                  <li className="flex items-start gap-2"><Check className="h-4 w-4 text-primary mt-0.5 shrink-0" /> Todos os módulos do Accord</li>
                </ul>
                <Button
                  className="w-full"
                  disabled={checkoutLoading || isCurrent || !profile?.company_id}
                  onClick={() => handleSubscribe(plan.slug)}
                  variant={isCurrent ? "outline" : "default"}
                >
                  {checkoutLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {isCurrent ? "Plano atual" : isActive ? "Trocar para este plano" : "Assinar"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Pagamento processado com segurança. Cancele a qualquer momento via "Gerenciar / Cancelar".
      </p>
    </div>
  );
}

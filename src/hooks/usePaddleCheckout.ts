import { useState } from "react";
import { initializePaddle, getPaddlePriceId } from "@/lib/paddle";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface OpenCheckoutOptions {
  priceId: string;
  seatPriceId?: string;
  /** Limite incluso no plano — usado para calcular seats extras a partir dos usuários ativos do tenant */
  baseUserLimit?: number;
  /** Override manual (se omitido, calcula via baseUserLimit + active users) */
  seats?: number;
  successUrl?: string;
}

export function usePaddleCheckout() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const openCheckout = async (opts: OpenCheckoutOptions) => {
    if (!profile?.company_id) {
      toast({ title: "Erro", description: "Tenant não identificado", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await initializePaddle();
      const basePaddleId = await getPaddlePriceId(opts.priceId);
      const items: any[] = [{ priceId: basePaddleId, quantity: 1 }];

      // Calcular seats extras se não foi fornecido explicitamente
      let seats = opts.seats;
      if (seats === undefined && opts.baseUserLimit !== undefined && opts.seatPriceId) {
        const { count } = await supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("company_id", profile.company_id)
          .eq("is_active", true)
          .eq("status", "ativo");
        seats = Math.max(0, (count ?? 0) - opts.baseUserLimit);
      }

      if (opts.seatPriceId && (seats ?? 0) > 0) {
        const seatPaddleId = await getPaddlePriceId(opts.seatPriceId);
        items.push({ priceId: seatPaddleId, quantity: seats });
      }

      window.Paddle.Checkout.open({
        items,
        customer: user?.email ? { email: user.email } : undefined,
        customData: {
          tenantId: profile.company_id,
          userId: user?.id || "",
        },
        settings: {
          displayMode: "overlay",
          successUrl: opts.successUrl || `${window.location.origin}/checkout/success`,
          allowLogout: false,
          variant: "one-page",
        },
      });
    } catch (e: any) {
      toast({ title: "Erro ao abrir checkout", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return { openCheckout, loading };
}

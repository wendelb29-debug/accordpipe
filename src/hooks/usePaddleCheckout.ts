import { useState } from "react";
import { initializePaddle, getPaddlePriceId } from "@/lib/paddle";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface OpenCheckoutOptions {
  priceId: string;
  seatPriceId?: string;
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
      if (opts.seatPriceId && (opts.seats ?? 0) > 0) {
        const seatPaddleId = await getPaddlePriceId(opts.seatPriceId);
        items.push({ priceId: seatPaddleId, quantity: opts.seats });
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
          successUrl: opts.successUrl || `${window.location.origin}/planos?checkout=success`,
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

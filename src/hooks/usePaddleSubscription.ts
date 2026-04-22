import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getPaymentsEnvironment } from "@/lib/paddle";

export interface PaddleSubscription {
  id: string;
  tenant_id: string;
  paddle_subscription_id: string;
  paddle_customer_id: string;
  product_id: string;
  price_id: string;
  seat_price_id: string | null;
  seats_quantity: number;
  billing_cycle: string;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  environment: string;
}

export function usePaddleSubscription() {
  const { profile } = useAuth();
  const [subscription, setSubscription] = useState<PaddleSubscription | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSub = useCallback(async () => {
    if (!profile?.company_id) {
      setSubscription(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const env = getPaymentsEnvironment();
    const { data } = await supabase
      .from("paddle_subscriptions")
      .select("*")
      .eq("tenant_id", profile.company_id)
      .eq("environment", env)
      .maybeSingle();
    setSubscription((data as any) || null);
    setLoading(false);
  }, [profile?.company_id]);

  useEffect(() => {
    fetchSub();
  }, [fetchSub]);

  // Realtime: refresh when webhook updates the row
  useEffect(() => {
    if (!profile?.company_id) return;
    const channel = supabase
      .channel(`paddle_sub_${profile.company_id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "paddle_subscriptions", filter: `tenant_id=eq.${profile.company_id}` },
        () => fetchSub()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.company_id, fetchSub]);

  const isActive =
    !!subscription &&
    ["active", "trialing"].includes(subscription.status) &&
    (!subscription.current_period_end || new Date(subscription.current_period_end) > new Date());

  return { subscription, loading, isActive, refetch: fetchSub };
}

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface TenantBillingAlert {
  show: boolean;
  type: "overdue" | "suspended" | null;
  due_date: string | null;
  grace_until: string | null;
  subscription_status: string | null;
  payment_status: string | null;
}

export function useTenantBillingStatus(): TenantBillingAlert {
  const { profile, isMasterTenantAdmin } = useAuth();
  const [alert, setAlert] = useState<TenantBillingAlert>({
    show: false,
    type: null,
    due_date: null,
    grace_until: null,
    subscription_status: null,
    payment_status: null,
  });

  useEffect(() => {
    if (!profile?.company_id || isMasterTenantAdmin) {
      setAlert((prev) => ({ ...prev, show: false }));
      return;
    }

    const check = async () => {
      const { data } = await supabase
        .from("master_tenant_clients")
        .select("subscription_status, payment_status, next_due_date, grace_until")
        .eq("tenant_id", profile.company_id)
        .maybeSingle();

      if (!data) return;
      const d = data as any;

      if (d.subscription_status === "suspended") {
        setAlert({
          show: true,
          type: "suspended",
          due_date: d.next_due_date,
          grace_until: d.grace_until,
          subscription_status: d.subscription_status,
          payment_status: d.payment_status,
        });
      } else if (d.subscription_status === "past_due" || d.payment_status === "overdue") {
        setAlert({
          show: true,
          type: "overdue",
          due_date: d.next_due_date,
          grace_until: d.grace_until,
          subscription_status: d.subscription_status,
          payment_status: d.payment_status,
        });
      } else {
        setAlert((prev) => ({ ...prev, show: false }));
      }
    };
    check();
  }, [profile?.company_id, isMasterTenantAdmin]);

  return alert;
}

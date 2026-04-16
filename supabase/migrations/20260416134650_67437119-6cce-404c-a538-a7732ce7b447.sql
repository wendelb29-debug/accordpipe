-- Create trigger to auto-recalculate subscription totals when key fields change
CREATE OR REPLACE FUNCTION public.trg_recalc_subscription_totals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only recalculate if relevant fields changed
  IF TG_OP = 'INSERT' OR
     OLD.extra_paid_users IS DISTINCT FROM NEW.extra_paid_users OR
     OLD.price_per_extra_user_snapshot IS DISTINCT FROM NEW.price_per_extra_user_snapshot OR
     OLD.plan_id IS DISTINCT FROM NEW.plan_id OR
     OLD.billing_cycle IS DISTINCT FROM NEW.billing_cycle OR
     OLD.monthly_price_snapshot IS DISTINCT FROM NEW.monthly_price_snapshot OR
     OLD.yearly_price_snapshot IS DISTINCT FROM NEW.yearly_price_snapshot OR
     OLD.extra_free_users IS DISTINCT FROM NEW.extra_free_users OR
     OLD.base_user_limit_snapshot IS DISTINCT FROM NEW.base_user_limit_snapshot THEN
    
    -- Calculate values inline to avoid recursive trigger
    DECLARE
      _rec_total NUMERIC(12,2);
      _uni_total NUMERIC(12,2);
      _base NUMERIC(12,2);
      _extra_user_cost NUMERIC(12,2);
    BEGIN
      SELECT COALESCE(SUM(value), 0) INTO _rec_total
        FROM public.subscription_extras
        WHERE tenant_id = NEW.tenant_id AND is_active = true AND is_selected = true AND type = 'recorrente';

      SELECT COALESCE(SUM(value), 0) INTO _uni_total
        FROM public.subscription_extras
        WHERE tenant_id = NEW.tenant_id AND is_active = true AND is_selected = true AND type = 'unico';

      _base := COALESCE(
        CASE WHEN NEW.billing_cycle = 'yearly' THEN NEW.yearly_price_snapshot ELSE NEW.monthly_price_snapshot END,
        0
      );
      _extra_user_cost := COALESCE(NEW.extra_paid_users * NEW.price_per_extra_user_snapshot, 0);

      NEW.valor_base_plano := _base;
      NEW.total_extras_recorrentes := _rec_total;
      NEW.total_extras_unicos := _uni_total;
      NEW.valor_mensal_total := _base + _extra_user_cost + _rec_total;
      NEW.valor_inicial_total := _base + _extra_user_cost + _rec_total + _uni_total;
    END;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger (BEFORE so we can modify NEW)
DROP TRIGGER IF EXISTS trg_auto_recalc_subscription ON public.tenant_subscriptions;
CREATE TRIGGER trg_auto_recalc_subscription
  BEFORE INSERT OR UPDATE ON public.tenant_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_recalc_subscription_totals();
import { createClient } from 'npm:@supabase/supabase-js@2';
import { getPaddleClient, gatewayFetch, type PaddleEnv } from '../_shared/paddle.ts';

const responseHeaders = {
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
    'Content-Type': 'application/json',
  },
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, responseHeaders);

  try {
    const { tenantId } = await req.json();
    if (!tenantId) {
      return new Response(JSON.stringify({ error: 'tenantId required' }), { status: 400, ...responseHeaders });
    }

    const { data: sub } = await supabase
      .from('paddle_subscriptions')
      .select('*')
      .eq('tenant_id', tenantId)
      .in('status', ['active', 'trialing', 'past_due'])
      .maybeSingle();

    if (!sub) {
      return new Response(JSON.stringify({ skipped: true, reason: 'no active paddle subscription' }), responseHeaders);
    }
    if (!sub.seat_price_id) {
      return new Response(JSON.stringify({ skipped: true, reason: 'no seat price configured' }), responseHeaders);
    }

    // Get tenant subscription seat count vs base limit
    const { data: tenantSub } = await supabase
      .from('tenant_subscriptions')
      .select('base_user_limit_snapshot')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    const baseLimit = tenantSub?.base_user_limit_snapshot ?? 3;

    const { count: activeUsers } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', tenantId)
      .eq('is_active', true)
      .eq('status', 'ativo');

    const extras = Math.max(0, (activeUsers ?? 0) - baseLimit);
    if (extras === sub.seats_quantity) {
      return new Response(JSON.stringify({ unchanged: true, seats: extras }), responseHeaders);
    }

    const env = sub.environment as PaddleEnv;

    // Resolve seat price paddle id
    const priceLookup = await gatewayFetch(env, `/prices?external_id=${encodeURIComponent(sub.seat_price_id)}`);
    const priceJson = await priceLookup.json();
    const seatPaddleId = priceJson.data?.[0]?.id;
    if (!seatPaddleId) {
      return new Response(JSON.stringify({ error: 'seat price not found in paddle' }), { status: 500, ...responseHeaders });
    }

    // Resolve base price paddle id
    const basePriceLookup = await gatewayFetch(env, `/prices?external_id=${encodeURIComponent(sub.price_id)}`);
    const baseJson = await basePriceLookup.json();
    const basePaddleId = baseJson.data?.[0]?.id;

    const paddle = getPaddleClient(env);

    const items: any[] = [{ priceId: basePaddleId, quantity: 1 }];
    if (extras > 0) items.push({ priceId: seatPaddleId, quantity: extras });

    await paddle.subscriptions.update(sub.paddle_subscription_id, {
      items,
      prorationBillingMode: 'prorated_immediately',
    });

    await supabase.from('paddle_subscriptions')
      .update({ seats_quantity: extras, updated_at: new Date().toISOString() })
      .eq('id', sub.id);

    return new Response(JSON.stringify({ updated: true, seats: extras }), responseHeaders);
  } catch (e) {
    console.error('paddle-update-seats error:', e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, ...responseHeaders });
  }
});

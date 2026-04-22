import { createClient } from 'npm:@supabase/supabase-js@2';
import { getPaddleClient, type PaddleEnv } from '../_shared/paddle.ts';

const responseHeaders = {
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
    'Content-Type': 'application/json',
  },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, responseHeaders);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, ...responseHeaders });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: userRes } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    const user = userRes?.user;
    if (!user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, ...responseHeaders });

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile?.company_id) {
      return new Response(JSON.stringify({ error: 'no tenant' }), { status: 400, ...responseHeaders });
    }

    const { data: sub } = await supabase
      .from('paddle_subscriptions')
      .select('paddle_customer_id, paddle_subscription_id, environment')
      .eq('tenant_id', profile.company_id)
      .maybeSingle();

    if (!sub) return new Response(JSON.stringify({ error: 'no subscription' }), { status: 404, ...responseHeaders });

    const paddle = getPaddleClient(sub.environment as PaddleEnv);
    const portal = await paddle.customerPortalSessions.create(sub.paddle_customer_id, [sub.paddle_subscription_id]);

    return new Response(JSON.stringify({ url: portal.urls.general.overview }), responseHeaders);
  } catch (e) {
    console.error('portal error:', e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, ...responseHeaders });
  }
});

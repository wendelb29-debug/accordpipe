import { createClient } from 'npm:@supabase/supabase-js@2';
import { verifyWebhook, EventName, type PaddleEnv } from '../_shared/paddle.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const url = new URL(req.url);
  const env = (url.searchParams.get('env') || 'sandbox') as PaddleEnv;

  try {
    const event = await verifyWebhook(req, env);
    console.log('[paddle webhook]', event.eventType, 'env=', env);

    switch (event.eventType) {
      case EventName.SubscriptionCreated:
      case EventName.SubscriptionUpdated:
        await upsertSubscription(event.data, env);
        break;
      case EventName.SubscriptionCanceled:
        await markCanceled(event.data, env);
        break;
      case EventName.TransactionCompleted:
        console.log('Transaction completed:', event.data.id);
        break;
      case EventName.TransactionPaymentFailed:
        console.log('Payment failed:', event.data.id);
        break;
      default:
        console.log('Unhandled event:', event.eventType);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Webhook error:', e);
    return new Response('Webhook error', { status: 400 });
  }
});

function findItem(items: any[], cond: (i: any) => boolean) {
  return items?.find(cond);
}

async function upsertSubscription(data: any, env: PaddleEnv) {
  const { id, customerId, items, status, currentBillingPeriod, customData, scheduledChange } = data;

  const tenantId = customData?.tenantId;
  if (!tenantId) {
    console.error('No tenantId in customData, skipping');
    return;
  }

  // Identify base price (qty 1) vs seat price (qty > 1 typically; matches *_seat_*)
  const seatItem = findItem(items, (i: any) =>
    (i.price?.importMeta?.externalId || '').includes('_seat_')
  );
  const baseItem = findItem(items, (i: any) =>
    !(i.price?.importMeta?.externalId || '').includes('_seat_')
  ) || items?.[0];

  const priceExt = baseItem?.price?.importMeta?.externalId || baseItem?.price?.id;
  const productExt = baseItem?.product?.importMeta?.externalId || baseItem?.product?.id;
  const seatPriceExt = seatItem?.price?.importMeta?.externalId || seatItem?.price?.id || null;
  const seatsQty = seatItem?.quantity || 0;
  const billingCycle = priceExt?.endsWith('_yearly') ? 'yearly' : 'monthly';

  const { error } = await supabase.from('paddle_subscriptions').upsert({
    tenant_id: tenantId,
    paddle_subscription_id: id,
    paddle_customer_id: customerId,
    product_id: productExt,
    price_id: priceExt,
    seat_price_id: seatPriceExt,
    seats_quantity: seatsQty,
    billing_cycle: billingCycle,
    status,
    current_period_start: currentBillingPeriod?.startsAt,
    current_period_end: currentBillingPeriod?.endsAt,
    cancel_at_period_end: scheduledChange?.action === 'cancel',
    environment: env,
    updated_at: new Date().toISOString(),
  }, {
    onConflict: 'tenant_id,environment',
  });

  if (error) console.error('Upsert error:', error);
}

async function markCanceled(data: any, env: PaddleEnv) {
  await supabase.from('paddle_subscriptions')
    .update({ status: 'canceled', updated_at: new Date().toISOString() })
    .eq('paddle_subscription_id', data.id)
    .eq('environment', env);
}

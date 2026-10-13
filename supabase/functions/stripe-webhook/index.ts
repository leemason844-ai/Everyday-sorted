import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const json = (body: object, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' },
});

Deno.serve(async (request: Request) => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const secret = Deno.env.get('STRIPE_SECRET_KEY');
  const signingSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!secret || !signingSecret || !url || !serviceKey) {
    console.error('Webhook configuration is missing');
    return json({ error: 'Webhook unavailable' }, 503);
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) return json({ error: 'Missing Stripe signature' }, 400);

  const stripe = new Stripe(secret);
  let event: Stripe.Event;
  try {
    const payload = await request.text();
    event = await stripe.webhooks.constructEventAsync(
      payload, signature, signingSecret
    );
  } catch (error) {
    console.error('Invalid Stripe webhook signature', error);
    return json({ error: 'Invalid signature' }, 400);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted'
    ) {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = typeof subscription.customer === 'string'
        ? subscription.customer : subscription.customer.id;

      // The checkout function creates the customer mapping. Never grant
      // access to an unmapped Stripe customer.
      const { data: customer, error: customerError } = await supabase
        .from('stripe_customers')
        .select('customer_id')
        .eq('customer_id', customerId)
        .is('deleted_at', null)
        .maybeSingle();
      if (customerError) throw customerError;
      if (!customer) return json({ received: true });

      const { data: existing, error: readError } = await supabase
        .from('stripe_subscriptions')
        .select('customer_id')
        .eq('customer_id', customerId)
        .maybeSingle();
      if (readError) throw readError;

      const fields = {
        status: subscription.status,
        subscription_id: subscription.id,
      };

      const result = existing
        ? await supabase.from('stripe_subscriptions')
            .update(fields).eq('customer_id', customerId)
        : await supabase.from('stripe_subscriptions')
            .insert({ customer_id: customerId, ...fields });
      if (result.error) throw result.error;
    }

    // Only acknowledge after database updates succeed. Stripe retries
    // failures, allowing recovery from temporary database outages.
    return json({ received: true });
  } catch (error) {
    console.error('Webhook processing failed', event.id, error);
    return json({ error: 'Webhook processing failed' }, 500);
  }
});

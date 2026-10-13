
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'Authorization, Content-Type, Apikey, X-Client-Info',
};

function json(body: object, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get(
      'SUPABASE_SERVICE_ROLE_KEY'
    );
    const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY');
    const priceId = Deno.env.get(
      'STRIPE_PREMIUM_MONTHLY_PRICE_ID'
    );
    const appUrl = (Deno.env.get('APP_URL') ?? '')
      .replace(/\/+$/, '');

    if (
      !supabaseUrl ||
      !serviceRoleKey ||
      !stripeSecret ||
      !priceId ||
      !appUrl
    ) {
      console.error('Missing required checkout configuration');
      return json({ error: 'Checkout unavailable' }, 503);
    }

    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];

    if (!token) {
      return json({ error: 'Sign in required' }, 401);
    }

    const supabase = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { data: authData, error: authError } =
      await supabase.auth.getUser(token);

    const user = authData.user;

    if (authError || !user) {
      return json({ error: 'Invalid session' }, 401);
    }

    const stripe = new Stripe(stripeSecret);

    const { data: existingCustomer, error: lookupError } =
      await supabase
        .from('stripe_customers')
        .select('customer_id')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .maybeSingle();

    if (lookupError) {
      console.error('Customer lookup failed', lookupError);
      return json({ error: 'Checkout unavailable' }, 500);
    }

    let customerId = existingCustomer?.customer_id;

    if (!customerId) {
      const newCustomer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id },
      });

      const { error: insertError } = await supabase
        .from('stripe_customers')
        .insert({
          user_id: user.id,
          customer_id: newCustomer.id,
        });

      if (insertError) {
        console.error('Customer mapping failed', insertError);
        try {
          await stripe.customers.del(newCustomer.id);
        } catch (cleanupError) {
          console.error('Customer cleanup failed', cleanupError);
        }
        return json({ error: 'Checkout unavailable' }, 500);
      }

      customerId = newCustomer.id;
    }

    // Check Stripe directly to avoid relying on a delayed webhook.
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 100,
    });

    const hasSubscription = subscriptions.data.some(
      (subscription) =>
        subscription.status === 'active' ||
        subscription.status === 'trialing' ||
        subscription.status === 'past_due' ||
        subscription.status === 'unpaid'
    );

    if (hasSubscription) {
      return json(
        { error: 'A subscription already exists. Manage your billing instead.' },
        409
      );
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/premium?status=success`,
      cancel_url: `${appUrl}/premium?status=cancel`,
      client_reference_id: user.id,
      metadata: { userId: user.id },
    });

    if (!session.url) {
      return json({ error: 'Checkout unavailable' }, 500);
    }

    return json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('Stripe checkout error', error);
    return json(
      { error: 'Unable to start checkout. Please try again.' },
      500
    );
  }
});

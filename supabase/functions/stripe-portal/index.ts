import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, Apikey, X-Client-Info',
};
const json = (body: object, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...cors, 'Content-Type': 'application/json' },
});

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const secret = Deno.env.get('STRIPE_SECRET_KEY');
    const url = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const appUrl = (Deno.env.get('APP_URL') ?? '').replace(/\/+$/, '');
    if (!secret || !url || !serviceKey || !appUrl) {
      return json({ error: 'Billing portal unavailable' }, 503);
    }

    const token = request.headers.get('Authorization')
      ?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) return json({ error: 'Sign in required' }, 401);

    const supabase = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return json({ error: 'Invalid session' }, 401);

    const { data: customer, error: customerError } = await supabase
      .from('stripe_customers')
      .select('customer_id')
      .eq('user_id', data.user.id)
      .is('deleted_at', null)
      .maybeSingle();
    if (customerError) throw customerError;
    if (!customer?.customer_id) {
      return json({ error: 'No billing account found' }, 404);
    }

    const stripe = new Stripe(secret);
    const session = await stripe.billingPortal.sessions.create({
      customer: customer.customer_id,
      return_url: appUrl + '/premium',
    });
    return json({ url: session.url });
  } catch (error) {
    console.error('Billing portal error', error);
    return json({ error: 'Unable to open billing portal' }, 500);
  }
});

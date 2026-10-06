import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
  const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2024-06-20' as any,
  });

  const body = await req.text();
  const sig = req.headers.get('stripe-signature') || '';

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, stripeWebhookSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  // Όταν η πληρωμή συνδρομής ολοκληρωθεί επιτυχώς
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;

    if (userId && supabaseUrl && supabaseKey) {
      const supabaseAdmin = createClient(supabaseUrl, supabaseKey);
      await supabaseAdmin
        .from('profiles')
        .update({ subscription_status: 'pro' })
        .eq('id', userId);
    }
  }

  return NextResponse.json({ received: true });
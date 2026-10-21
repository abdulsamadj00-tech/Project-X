import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return res.status(500).json({ error: 'Stripe is not configured on the server.' });
  }

  const stripe = new Stripe(stripeKey);

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'MediDx Pro Subscription',
              description: 'Unlock advanced AI diagnostics and unlimited reports.',
            },
            unit_amount: 2900,
            recurring: { interval: 'month' },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${req.headers.origin}/?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: `${req.headers.origin}/?canceled=true`,
    });

    res.json({ id: session.id, url: session.url });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}


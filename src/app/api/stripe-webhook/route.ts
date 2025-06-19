
// src/app/api/stripe-webhook/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe'; // Your Stripe SDK instance
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase'; // Your Firestore instance

export async function POST(req: NextRequest) {
  console.log('Stripe webhook received request');
  const rawBody = await req.text();
  const sig = req.headers.get('stripe-signature');
  
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('Webhook Error: STRIPE_WEBHOOK_SECRET is not set in environment variables.');
    return NextResponse.json({ error: 'Webhook secret is not configured.' }, { status: 500 });
  }

  if (!sig) {
    console.error('Webhook Error: Missing stripe-signature header.');
    return NextResponse.json({ error: 'Webhook signature verification failed. Missing signature.' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    console.log('Stripe event constructed successfully:', event.type);
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ error: `Webhook signature verification failed: ${err.message}` }, { status: 400 });
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session;
      console.log('Checkout session completed, ID:', session.id);

      const userId = session.client_reference_id || session.metadata?.firebaseUID;
      const creditsPurchasedString = session.metadata?.creditsPurchased;

      if (!userId) {
        console.error('Critical Error: Missing userId (client_reference_id or metadata.firebaseUID) in checkout.session.completed event. Cannot update credits. Session ID:', session.id);
        return NextResponse.json({ error: 'User ID not found in session. Cannot update credits.' }, { status: 400 });
      }
      if (!creditsPurchasedString) {
        console.error('Critical Error: Missing creditsPurchased in metadata for checkout.session.completed event. Cannot update credits. Session ID:', session.id, 'UserId:', userId);
        return NextResponse.json({ error: 'Credits purchased amount not found in session metadata.' }, { status: 400 });
      }
      
      const creditsPurchased = parseInt(creditsPurchasedString, 10);

      if (isNaN(creditsPurchased) || creditsPurchased <= 0) {
        console.error('Invalid creditsPurchased value in session metadata:', creditsPurchasedString, 'for session:', session.id, 'UserId:', userId);
        return NextResponse.json({ error: 'Invalid credits purchased amount.' }, { status: 400 });
      }

      try {
        const userDocRef = doc(db, 'users', userId);
        await updateDoc(userDocRef, {
          credits: increment(creditsPurchased)
        });
        console.log(`Successfully updated credits for user ${userId} by ${creditsPurchased}.`);
      } catch (firestoreError: any) {
        console.error(`Failed to update credits for user ${userId}: ${firestoreError.message}`);
        // For a production app, you might want to retry this or flag for manual intervention
        return NextResponse.json({ error: 'Failed to update user credits in database.' }, { status: 500 });
      }
      break;
    
    // You can handle other event types here if needed
    // case 'payment_intent.succeeded':
    //   const paymentIntent = event.data.object;
    //   console.log('PaymentIntent was successful!', paymentIntent);
    //   break;
    
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return NextResponse.json({ received: true });
}

// Disable Next.js body parsing for this route, as Stripe needs the raw body
export const config = {
  api: {
    bodyParser: false,
  },
};

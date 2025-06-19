// src/app/api/stripe-webhook/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe'; // Your Stripe SDK instance
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase'; // Your Firestore instance

// Make sure to set STRIPE_WEBHOOK_SECRET in your .env.local file
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig || !webhookSecret) {
    console.error('Webhook Error: Missing signature or webhook secret.');
    return NextResponse.json({ error: 'Webhook signature verification failed. Missing signature or secret.' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ error: `Webhook signature verification failed: ${err.message}` }, { status: 400 });
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session;
      console.log('Checkout session completed:', session.id);

      // IMPORTANT: Fulfillment logic (e.g., updating user credits)
      // This is where you would:
      // 1. Get the user ID (e.g., from session.client_reference_id or session.metadata.firebaseUID)
      // 2. Get the number of credits purchased (e.g., from session.metadata.creditsPurchased or by looking up the price ID)
      // 3. Securely update the user's credit balance in Firestore.

      const userId = session.client_reference_id || session.metadata?.firebaseUID;
      const creditsPurchasedString = session.metadata?.creditsPurchased;

      if (userId && creditsPurchasedString) {
        const creditsPurchased = parseInt(creditsPurchasedString, 10);
        if (!isNaN(creditsPurchased) && creditsPurchased > 0) {
          try {
            const userDocRef = doc(db, 'users', userId);
            await updateDoc(userDocRef, {
              credits: increment(creditsPurchased)
            });
            console.log(`Successfully updated credits for user ${userId} by ${creditsPurchased}.`);
          } catch (firestoreError: any) {
            console.error(`Failed to update credits for user ${userId}: ${firestoreError.message}`);
            // Optionally, handle this error, e.g., retry or log for manual intervention
            return NextResponse.json({ error: 'Failed to update user credits in database.' }, { status: 500 });
          }
        } else {
            console.error('Invalid creditsPurchased value in session metadata:', creditsPurchasedString);
        }
      } else {
        console.error('Missing userId or creditsPurchased in session metadata for session:', session.id);
        // Log this for investigation, as credits cannot be applied without this info.
      }
      break;
    
    // ... handle other event types if needed
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

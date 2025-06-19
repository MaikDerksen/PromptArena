
// src/app/api/stripe-webhook/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe'; // Your Stripe SDK instance
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase'; // Your Firestore instance

export async function POST(req: NextRequest) {
  console.log('STRIPE WEBHOOK: Received request to /api/stripe-webhook');
  const rawBody = await req.text();
  const sig = req.headers.get('stripe-signature');
  
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('STRIPE WEBHOOK Error: STRIPE_WEBHOOK_SECRET is not set in environment variables.');
    return NextResponse.json({ error: 'Webhook secret is not configured.' }, { status: 500 });
  }

  if (!sig) {
    console.error('STRIPE WEBHOOK Error: Missing stripe-signature header.');
    return NextResponse.json({ error: 'Webhook signature verification failed. Missing signature.' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    console.log('STRIPE WEBHOOK: Event constructed successfully:', event.type);
  } catch (err: any) {
    console.error(`STRIPE WEBHOOK: Signature verification failed: ${err.message}`);
    return NextResponse.json({ error: `Webhook signature verification failed: ${err.message}` }, { status: 400 });
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session;
      console.log('STRIPE WEBHOOK: Checkout session completed, ID:', session.id);

      const userId = session.client_reference_id || session.metadata?.firebaseUID;
      const creditsPurchasedString = session.metadata?.creditsPurchased;

      if (!userId) {
        console.error('STRIPE WEBHOOK Critical Error: Missing userId (client_reference_id or metadata.firebaseUID) in checkout.session.completed event. Cannot update credits. Session ID:', session.id);
        return NextResponse.json({ error: 'User ID not found in session. Cannot update credits.' }, { status: 400 });
      }
      if (!creditsPurchasedString) {
        console.error('STRIPE WEBHOOK Critical Error: Missing creditsPurchased in metadata for checkout.session.completed event. Cannot update credits. Session ID:', session.id, 'UserId:', userId);
        return NextResponse.json({ error: 'Credits purchased amount not found in session metadata.' }, { status: 400 });
      }
      
      const creditsPurchased = parseInt(creditsPurchasedString, 10);

      if (isNaN(creditsPurchased) || creditsPurchased <= 0) {
        console.error('STRIPE WEBHOOK: Invalid creditsPurchased value in session metadata:', creditsPurchasedString, 'for session:', session.id, 'UserId:', userId);
        return NextResponse.json({ error: 'Invalid credits purchased amount.' }, { status: 400 });
      }

      try {
        const userDocRef = doc(db, 'users', userId);
        await updateDoc(userDocRef, {
          credits: increment(creditsPurchased)
        });
        console.log(`STRIPE WEBHOOK: Successfully updated credits for user ${userId} by ${creditsPurchased}.`);
      } catch (firestoreError: any) {
        console.error(`STRIPE WEBHOOK: Failed to update credits for user ${userId}: ${firestoreError.message}`);
        // For a production app, you might want to retry this or flag for manual intervention
        return NextResponse.json({ error: 'Failed to update user credits in database.' }, { status: 500 });
      }
      break;
    
    default:
      console.log(`STRIPE WEBHOOK: Unhandled event type ${event.type}`);
  }

  return NextResponse.json({ received: true });
}

// Note: The 'export const config' object for disabling bodyParser is Pages Router syntax.
// In App Router, accessing the raw body is typically done via req.text() or req.blob() directly,
// and Next.js handles this without explicit config for disabling the default parser
// when these methods are used on the NextRequest object.

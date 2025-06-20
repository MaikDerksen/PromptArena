
// src/app/api/stripe-webhook/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe'; // Your Stripe SDK instance
import { db } from '@/lib/firebase';
import { doc, updateDoc, increment } from 'firebase/firestore';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  console.log('STRIPE WEBHOOK: Received request to /api/stripe-webhook');

  if (!webhookSecret) {
    console.error('STRIPE WEBHOOK ERROR: Webhook secret not configured.');
    return NextResponse.json({ error: 'Webhook secret not configured.' }, { status: 500 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    console.error('STRIPE WEBHOOK ERROR: Missing Stripe signature.');
    return NextResponse.json({ error: 'Missing Stripe signature.' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    console.log('STRIPE WEBHOOK: Event constructed successfully:', event.type);
  } catch (err: any) {
    console.error(`STRIPE WEBHOOK ERROR: Webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ error: `Webhook error: ${err.message}` }, { status: 400 });
  }

  // Handle the event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    console.log('STRIPE WEBHOOK: Handling checkout.session.completed for session ID:', session.id);
    console.log('STRIPE WEBHOOK: Session client_reference_id:', session.client_reference_id);
    console.log('STRIPE WEBHOOK: Session metadata:', JSON.stringify(session.metadata, null, 2));

    const userId = session.client_reference_id || session.metadata?.firebaseUID;
    const creditsPurchasedString = session.metadata?.creditsPurchased;

    console.log('STRIPE WEBHOOK: Extracted userId:', userId);
    console.log('STRIPE WEBHOOK: Extracted creditsPurchasedString:', creditsPurchasedString);

    if (!userId) {
      console.error('STRIPE WEBHOOK ERROR: User ID (client_reference_id or metadata.firebaseUID) not found in session.');
      // Still return 200 to acknowledge, but log error
      return NextResponse.json({ error: 'User ID not found in session, but webhook acknowledged.' }, { status: 200 });
    }
    if (!creditsPurchasedString) {
      console.error('STRIPE WEBHOOK ERROR: creditsPurchased not found in session metadata.');
      return NextResponse.json({ error: 'Credits purchased amount not found, but webhook acknowledged.' }, { status: 200 });
    }

    const creditsPurchased = parseInt(creditsPurchasedString, 10);
    if (isNaN(creditsPurchased) || creditsPurchased <= 0) {
      console.error('STRIPE WEBHOOK ERROR: Invalid creditsPurchased amount:', creditsPurchasedString);
      return NextResponse.json({ error: 'Invalid credits purchased amount, but webhook acknowledged.' }, { status: 200 });
    }

    console.log(`STRIPE WEBHOOK: Attempting to update credits for user ${userId}. Adding ${creditsPurchased} credits.`);
    try {
      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, {
        credits: increment(creditsPurchased),
      });
      console.log(`STRIPE WEBHOOK: Successfully updated credits for user ${userId}. Added ${creditsPurchased} credits.`);
    } catch (dbError: any) {
      console.error(`STRIPE WEBHOOK ERROR: Failed to update user credits in Firestore for user ${userId}: ${dbError.message}`);
      // Still return 200 to Stripe to acknowledge receipt, but log the internal error.
      return NextResponse.json({ error: 'Firestore update failed but webhook acknowledged.' }, { status: 200 });
    }
  } else {
    console.log(`STRIPE WEBHOOK: Unhandled event type ${event.type}`);
  }

  console.log('STRIPE WEBHOOK: Sending 200 OK response for event type:', event.type);
  return NextResponse.json({ received: true }, { status: 200 });
}

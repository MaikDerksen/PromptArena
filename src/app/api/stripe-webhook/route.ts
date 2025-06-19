
// src/app/api/stripe-webhook/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe'; // Your Stripe SDK instance
import { db } from '@/lib/firebase';
import { doc, updateDoc, increment } from 'firebase/firestore';

// Ensure your STRIPE_WEBHOOK_SECRET is set in .env
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
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session;
      console.log('STRIPE WEBHOOK: Handling checkout.session.completed for session ID:', session.id);
      
      const userId = session.client_reference_id || session.metadata?.firebaseUID;
      const creditsPurchasedString = session.metadata?.creditsPurchased;

      if (!userId) {
        console.error('STRIPE WEBHOOK ERROR: User ID (client_reference_id or metadata.firebaseUID) not found in session.');
        return NextResponse.json({ error: 'User ID not found in session.' }, { status: 400 });
      }
      if (!creditsPurchasedString) {
        console.error('STRIPE WEBHOOK ERROR: creditsPurchased not found in session metadata.');
        return NextResponse.json({ error: 'Credits purchased amount not found in session metadata.' }, { status: 400 });
      }

      const creditsPurchased = parseInt(creditsPurchasedString, 10);
      if (isNaN(creditsPurchased) || creditsPurchased <= 0) {
        console.error('STRIPE WEBHOOK ERROR: Invalid creditsPurchased amount:', creditsPurchasedString);
        return NextResponse.json({ error: 'Invalid credits purchased amount.' }, { status: 400 });
      }

      try {
        const userDocRef = doc(db, 'users', userId);
        await updateDoc(userDocRef, {
          credits: increment(creditsPurchased),
        });
        console.log(`STRIPE WEBHOOK: Successfully updated credits for user ${userId}. Added ${creditsPurchased} credits.`);
      } catch (dbError: any) {
        console.error(`STRIPE WEBHOOK ERROR: Failed to update user credits in Firestore for user ${userId}: ${dbError.message}`);
        // Still return 200 to Stripe to acknowledge receipt, but log the internal error.
        // You might want more sophisticated error handling/retry logic here for production.
        return NextResponse.json({ error: 'Firestore update failed but webhook acknowledged.' }, { status: 200 });
      }
      break;
    // ... handle other event types if needed
    default:
      console.log(`STRIPE WEBHOOK: Unhandled event type ${event.type}`);
  }

  return NextResponse.json({ received: true }, { status: 200 });
}


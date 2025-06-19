
// src/app/api/create-checkout-session/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { stripe } from '@/lib/stripe';
// For this example, we'll trust the userId passed from client
// For production, you'd verify the user via a session token or backend auth.

// Get the base URL from environment variables for constructing success/cancel URLs
const getBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  // Fallback for local development if NEXT_PUBLIC_APP_URL is not set
  return process.env.NODE_ENV === 'development'
    ? 'http://localhost:9002' // Default to your local dev port
    : ''; // Production URL should be set
};


export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { priceId, userId, creditsAmount } = body;

    if (!priceId) {
      return NextResponse.json({ error: 'Price ID is required' }, { status: 400 });
    }
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required for linking payment.' }, { status: 400 });
    }
     if (!creditsAmount || typeof creditsAmount !== 'number' || creditsAmount <= 0) {
      return NextResponse.json({ error: 'Valid credits amount is required.' }, { status: 400 });
    }


    const baseUrl = getBaseUrl();
    if (!baseUrl) {
        console.error("Base URL for Stripe Checkout redirects is not configured. Set NEXT_PUBLIC_APP_URL.");
        return NextResponse.json({ error: 'Server configuration error for redirect URLs.' }, { status: 500 });
    }
    
    const successUrl = `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/checkout/cancel`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: userId, // Pass the Firebase User ID
      metadata: { // Add any other metadata you need for the webhook
        firebaseUID: userId,
        creditsPurchased: String(creditsAmount), // Store as string, parse in webhook
      }
    });

    if (!session.id) {
        throw new Error("Failed to create Stripe session: No session ID returned.");
    }

    return NextResponse.json({ sessionId: session.id });

  } catch (error: any) {
    console.error('Error creating Stripe Checkout session:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

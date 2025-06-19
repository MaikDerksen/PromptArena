
// src/app/api/stripe-webhook/route.ts
import { NextResponse, type NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  console.log('STRIPE WEBHOOK (Simplified Debug Handler): Received request to /api/stripe-webhook');
  try {
    // Attempt to read the body to see if that part causes issues, but don't process it.
    const rawBody = await req.text();
    console.log('STRIPE WEBHOOK (Simplified Debug Handler): Raw body received, length:', rawBody.length);
  } catch (error: any) {
    console.error('STRIPE WEBHOOK (Simplified Debug Handler): Error reading request body:', error.message);
    // Even if body reading fails, try to send a response Stripe might accept over a redirect
    return NextResponse.json({ error: 'Failed to read request body for debug handler.' }, { status: 500 });
  }

  console.log('STRIPE WEBHOOK (Simplified Debug Handler): Intentionally returning 200 OK.');
  // Explicitly return a 200 OK response
  return NextResponse.json({ received: true, message: "Webhook acknowledged by simplified debug handler." }, { status: 200 });
}

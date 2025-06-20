
// This file is no longer needed as checkout sessions are created
// by the firestore-stripe-payments Firebase Extension.
// Deleting this file.
// The custom webhook at /api/stripe-webhook/route.ts is still
// used to listen for checkout.session.completed and update credits.

import { NextResponse, type NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  return NextResponse.json(
    { 
      error: 'This endpoint is deprecated. Checkout sessions are now handled by the Firebase Stripe Extension.' 
    }, 
    { status: 410 } // 410 Gone
  );
}

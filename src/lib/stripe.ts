
import Stripe from 'stripe';

let stripeInstance: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (!stripeInstance) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      // This error will now only be thrown if the key is missing when getStripeClient() is called at runtime.
      throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
    }
    stripeInstance = new Stripe(secretKey, {
      apiVersion: '2024-06-20', 
      typescript: true,
    });
  }
  return stripeInstance;
}

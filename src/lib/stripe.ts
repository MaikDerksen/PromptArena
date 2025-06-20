
import Stripe from 'stripe';

let stripeInstance: Stripe | null = null;

// The function now accepts the secret key as a parameter
export function getStripeClient(secretKey: string | undefined): Stripe {
  if (!secretKey) {
    // This error will now only be thrown if the key is missing when getStripeClient() is called at runtime
    // AND the calling function didn't provide it.
    throw new Error('STRIPE_SECRET_KEY was not provided to getStripeClient function');
  }
  if (!stripeInstance) {
    stripeInstance = new Stripe(secretKey, {
      apiVersion: '2024-06-20',
      typescript: true,
    });
  }
  return stripeInstance;
}


'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import AuthGuard from '@/components/auth-guard';
import LoadingSpinner from '@/components/loading-spinner';
import { CreditCard, Coins, ShoppingCart, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { loadStripe } from '@stripe/stripe-js';

// Ensure your Stripe publishable key is set in your .env file
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: string;
  description: string;
  icon: JSX.Element;
  stripePriceId: string; // This MUST be a Stripe Price ID (e.g., price_xxxxxxxxxxxxxx)
}

// IMPORTANT: Replace these stripePriceId values with YOUR ACTUAL STRIPE PRICE IDs
// You need to create these products and prices in your Stripe Dashboard.
const creditPackages: CreditPackage[] = [
  {
    id: 'starter',
    name: 'Starter Pack',
    credits: 10,
    price: '$1.99',
    description: 'A small boost to get you going.',
    icon: <Coins className="w-8 h-8 text-primary" />,
    stripePriceId: 'price_1RbnwjGbzNii5AZqgqVNogUv', 
  },
  {
    id: 'creator',
    name: 'Creator Bundle',
    credits: 50,
    price: '$7.99',
    description: 'Perfect for regular battlers.',
    icon: <ShoppingCart className="w-8 h-8 text-primary" />,
    stripePriceId: 'price_1RbnxKGbzNii5AZqRs0TCysD', 
  },
  {
    id: 'arena_master',
    name: 'Arena Master Pack',
    credits: 150,
    price: '$19.99',
    description: 'Dominate the arena with plenty of credits!',
    icon: <CreditCard className="w-8 h-8 text-primary" />,
    stripePriceId: 'price_1Rbny7GbzNii5AZqalXjVAff', 
  },
];

function BuyCreditsPageContent() {
  const { userProfile, loading: authLoading, refreshUserProfile } = useAuth();
  const { toast } = useToast();
  const [isProcessingPayment, setIsProcessingPayment] = useState<string | null>(null); // Store ID of package being processed

  const handleBuyCredits = async (pkg: CreditPackage) => {
    if (!userProfile) {
        toast({ title: "Login Required", description: "Please log in to purchase credits.", variant: "destructive"});
        return;
    }
    
    if (!pkg.stripePriceId || !pkg.stripePriceId.startsWith('price_')) {
        toast({ 
            title: "Configuration Error", 
            description: `The Stripe ID for "${pkg.name}" (${pkg.stripePriceId}) does not look like a valid Price ID (e.g., price_xxxxxxxxxxxxxx). Please check your Stripe Dashboard.`, 
            variant: "destructive",
            duration: 10000 
        });
        console.error("Stripe Price ID for package:", pkg.name, "is likely incorrect:", pkg.stripePriceId);
        return;
    }

    setIsProcessingPayment(pkg.id);

    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
            priceId: pkg.stripePriceId, 
            userId: userProfile.uid, 
            creditsAmount: pkg.credits // Pass the amount of credits to be stored in metadata
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session.');
      }

      const { sessionId } = await response.json();
      const stripe = await stripePromise;

      if (stripe) {
        const { error } = await stripe.redirectToCheckout({ sessionId });
        if (error) {
          console.error('Stripe redirect error:', error);
          toast({ title: 'Payment Error', description: error.message || "Could not redirect to Stripe.", variant: 'destructive' });
        }
        // If redirect is successful, user leaves the page.
      } else {
         throw new Error("Stripe.js failed to load.");
      }
    } catch (error: any) {
      console.error('Payment initiation error:', error);
      toast({ title: 'Payment Error', description: error.message || 'Could not initiate payment.', variant: 'destructive' });
    } finally {
      setIsProcessingPayment(null);
    }
  };
  
  // Refresh user profile when component mounts or user changes,
  // especially if they are returning from Stripe after a purchase.
  useEffect(() => {
    if(userProfile?.uid){ // Check if userProfile and uid are available
        refreshUserProfile();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile?.uid]); // Re-run if UID changes 


  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner className="w-12 h-12" /> <span className="ml-2">Loading credits...</span>
      </div>
    );
  }

  if (!userProfile) {
    // This should ideally be caught by AuthGuard, but as a fallback
    return <p>Please log in to view and purchase credits.</p>;
  }

  return (
    <div className="space-y-8">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="font-headline text-3xl flex items-center gap-2">
            <CreditCard className="w-8 h-8 text-primary" /> Buy Credits
          </CardTitle>
          <CardDescription>
            Purchase credits to generate images in PromptArena. Your current balance is:
            <span className="font-bold text-lg text-primary ml-2">{userProfile.credits}</span> credits.
          </CardDescription>
        </CardHeader>
      </Card>

      <Alert variant="default" className="bg-yellow-500/10 border-yellow-600/50">
        <Info className="h-4 w-4 text-yellow-600" />
        <AlertTitle className="text-yellow-700">Important: Stripe IDs & Credit Updates</AlertTitle>
        <AlertDescription className="text-yellow-700">
          Please ensure the Stripe IDs used for packages are **Price IDs** (e.g., `price_xxxxxxxxxxxxxx`) from your Stripe Dashboard. Product IDs (`prod_...`) or Event IDs (`evt_...`) will not work correctly with this Checkout integration.
          <br />
          After a successful payment via Stripe, your credits will be updated once the payment is confirmed by our server via the webhook. This usually happens within a few moments.
          <br />
          <strong>Note for Developers:</strong> The webhook for automatic credit updates (`/api/stripe-webhook`) MUST be fully implemented and tested with your `STRIPE_WEBHOOK_SECRET` for credits to be added reliably after purchase. For local testing, use the Stripe CLI.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {creditPackages.map((pkg) => (
          <Card key={pkg.id} className="flex flex-col hover:shadow-primary/20 hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="items-center text-center">
              {pkg.icon}
              <CardTitle className="text-2xl font-headline mt-2">{pkg.name}</CardTitle>
              <CardDescription>{pkg.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow text-center">
              <p className="text-3xl font-bold text-primary">{pkg.credits} Credits</p>
              <p className="text-xl font-semibold">{pkg.price}</p>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full text-lg py-3" 
                onClick={() => handleBuyCredits(pkg)}
                disabled={isProcessingPayment === pkg.id || !userProfile }
              >
                {isProcessingPayment === pkg.id ? (
                  <><LoadingSpinner className="mr-2"/> Processing...</>
                ) : (
                  'Buy Now'
                )}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
      <p className="text-center text-sm text-muted-foreground mt-8">
        Credits are used to generate images in PromptArena. Each image generation costs 1 credit.
        <br />
        Payments are processed securely by Stripe. We do not store your card details.
      </p>
    </div>
  );
}

export default function BuyCreditsPage() {
    return (
        <AuthGuard>
            <BuyCreditsPageContent />
        </AuthGuard>
    )
}

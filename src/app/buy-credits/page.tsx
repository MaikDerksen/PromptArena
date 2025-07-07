
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
import { db } from '@/lib/firebase'; // Import db
import { collection, addDoc, onSnapshot, doc, type Unsubscribe } from 'firebase/firestore'; // Firebase imports

// Stripe publishable key is still needed for loadStripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: string;
  description: string;
  icon: JSX.Element;
  stripePriceId: string; // Will be LIVE Price ID
}

const creditPackages: CreditPackage[] = [
  {
    id: 'starter',
    name: 'Starter Pack',
    credits: 10,
    price: '$1.99', // Ensure this matches your live Stripe price
    description: 'A small boost to get you going.',
    icon: <Coins className="w-8 h-8 text-primary" />,
    stripePriceId: 'price_YOUR_LIVE_STARTER_PACK_PRICE_ID', // IMPORTANT: Replace with your LIVE Stripe Price ID
  },
  {
    id: 'creator',
    name: 'Creator Bundle',
    credits: 50,
    price: '$7.99', // Ensure this matches your live Stripe price
    description: 'Perfect for regular battlers.',
    icon: <ShoppingCart className="w-8 h-8 text-primary" />,
    stripePriceId: 'price_YOUR_LIVE_CREATOR_BUNDLE_PRICE_ID', // IMPORTANT: Replace with your LIVE Stripe Price ID
  },
  {
    id: 'arena_master',
    name: 'Arena Master Pack',
    credits: 150,
    price: '$19.99', // Ensure this matches your live Stripe price
    description: 'Dominate the arena with plenty of credits!',
    icon: <CreditCard className="w-8 h-8 text-primary" />,
    stripePriceId: 'price_YOUR_LIVE_ARENA_MASTER_PRICE_ID', // IMPORTANT: Replace with your LIVE Stripe Price ID
  },
];

function BuyCreditsPageContent() {
  const { userProfile, loading: authLoading, refreshUserProfile } = useAuth();
  const { toast } = useToast();
  const [isProcessingPayment, setIsProcessingPayment] = useState<string | null>(null);

  const handleBuyCredits = async (pkg: CreditPackage) => {
    if (!userProfile) {
      toast({ title: "Login Required", description: "Please log in to purchase credits.", variant: "destructive" });
      return;
    }

    if (!pkg.stripePriceId || !pkg.stripePriceId.startsWith('price_') || pkg.stripePriceId.includes('YOUR_LIVE_')) {
      toast({
        title: "Configuration Error",
        description: `The Stripe ID for "${pkg.name}" is not configured for live payments. Please replace placeholder IDs.`,
        variant: "destructive",
        duration: 10000
      });
      console.error("Stripe Price ID is a placeholder:", pkg.stripePriceId);
      return;
    }

    setIsProcessingPayment(pkg.id);

    try {
      const checkoutSessionCollectionRef = collection(db, 'users', userProfile.uid, 'checkout_sessions');
      
      // Ensure NEXT_PUBLIC_APP_URL is set in your production environment variables
      const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
      const successUrl = `${appBaseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${appBaseUrl}/checkout/cancel`;

      const docRef = await addDoc(checkoutSessionCollectionRef, {
        price: pkg.stripePriceId, // This will be the LIVE Price ID
        success_url: successUrl,
        cancel_url: cancelUrl,
        mode: 'payment',
        client_reference_id: userProfile.uid,
        metadata: {
          firebaseUID: userProfile.uid,
          creditsPurchased: pkg.credits.toString(),
        },
      });

      const unsubscribe = onSnapshot(docRef, (snap) => {
        const data = snap.data();
        if (data?.error) {
          toast({ title: 'Payment Error', description: data.error.message || "Could not initiate payment with Firebase extension.", variant: 'destructive' });
          setIsProcessingPayment(null);
          unsubscribe();
        }
        if (data?.url) {
          window.location.assign(data.url);
          unsubscribe();
        }
      }, (error) => {
        console.error("Error listening to checkout session document:", error);
        toast({ title: 'Payment Error', description: "Error processing payment request. Please try again.", variant: 'destructive' });
        setIsProcessingPayment(null);
        unsubscribe();
      });

    } catch (error: any) {
      console.error('Error initiating checkout session via Firestore:', error);
      toast({ title: 'Payment Error', description: error.message || 'Could not initiate payment.', variant: 'destructive' });
      setIsProcessingPayment(null);
    }
  };

  useEffect(() => {
    if (userProfile?.uid) {
      refreshUserProfile();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile?.uid]); // refreshUserProfile can be memoized in useAuth if needed

  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner className="w-12 h-12" /> <span className="ml-2">Loading credits...</span>
      </div>
    );
  }

  if (!userProfile) {
    return <p>Please log in to view and purchase credits.</p>;
  }

  return (
    <div className="space-y-8">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="font-headline text-2xl md:text-3xl flex items-center gap-2">
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
          Checkout sessions are now created via the Firebase Stripe Extension using **LIVE** Stripe Product Prices.
          <br />
          After a successful payment via Stripe, your credits will be updated by our server webhook once the payment is confirmed. This usually happens within a few moments.
          <br />
          <strong>Note for Developers:</strong> Ensure your production webhook at (`/api/stripe-webhook`) is correctly configured in Stripe (Live mode) and listening for `checkout.session.completed` events for credits to be added.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {creditPackages.map((pkg) => (
          <Card key={pkg.id} className="flex flex-col hover:shadow-primary/20 hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="items-center text-center">
              {pkg.icon}
              <CardTitle className="text-xl md:text-2xl font-headline mt-2">{pkg.name}</CardTitle>
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
                disabled={isProcessingPayment === pkg.id || !userProfile || pkg.stripePriceId.includes('YOUR_LIVE_')}
              >
                {isProcessingPayment === pkg.id ? (
                  <><LoadingSpinner className="mr-2" /> Processing...</>
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


'use client';

import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import AuthGuard from '@/components/auth-guard';
import LoadingSpinner from '@/components/loading-spinner';
import { CreditCard, Coins, ShoppingCart, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: string;
  description: string;
  icon: JSX.Element;
}

const creditPackages: CreditPackage[] = [
  {
    id: 'starter',
    name: 'Starter Pack',
    credits: 10,
    price: '$1.99',
    description: 'A small boost to get you going.',
    icon: <Coins className="w-8 h-8 text-primary" />,
  },
  {
    id: 'creator',
    name: 'Creator Bundle',
    credits: 50,
    price: '$7.99',
    description: 'Perfect for regular battlers.',
    icon: <ShoppingCart className="w-8 h-8 text-primary" />,
  },
  {
    id: 'arena_master',
    name: 'Arena Master Pack',
    credits: 150,
    price: '$19.99',
    description: 'Dominate the arena with plenty of credits!',
    icon: <CreditCard className="w-8 h-8 text-primary" />,
  },
];

function BuyCreditsPageContent() {
  const { userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const handleBuyCredits = (pkg: CreditPackage) => {
    toast({
      title: 'Payment Placeholder',
      description: `You selected the "${pkg.name}". Actual payment processing is not implemented.`,
      variant: 'default',
    });
    console.log(`User ${userProfile?.email} attempted to buy package: ${pkg.name} for ${pkg.price}`);
    // In a real application, this would initiate the payment flow with a provider like Stripe.
  };

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
          <CardTitle className="font-headline text-3xl flex items-center gap-2">
            <CreditCard className="w-8 h-8 text-primary" /> Buy Credits
          </CardTitle>
          <CardDescription>
            Purchase credits to generate images in PromptArena. Your current balance is:
            <span className="font-bold text-lg text-primary ml-2">{userProfile.credits}</span> credits.
          </CardDescription>
        </CardHeader>
      </Card>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Payment System Placeholder</AlertTitle>
        <AlertDescription>
          This page demonstrates where a payment system would be integrated. Clicking "Buy" will not process any real payment or add credits.
          To implement payments, you would typically integrate a service like Stripe.
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
              <Button className="w-full text-lg py-3" onClick={() => handleBuyCredits(pkg)}>
                Buy Now
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
       <p className="text-center text-sm text-muted-foreground mt-8">
        Credits are used to generate images in PromptArena. Each image generation costs 1 credit.
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

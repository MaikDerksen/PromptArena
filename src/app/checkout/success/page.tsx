// src/app/checkout/success/page.tsx
'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import AuthGuard from '@/components/auth-guard';


function CheckoutSuccessPageContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const { toast } = useToast();

  useEffect(() => {
    if (sessionId) {
      // You could potentially use this sessionId to fetch more details about the order
      // or simply confirm to the user that this specific session was successful.
      toast({
        title: 'Payment Successful!',
        description: 'Thank you for your purchase.',
        variant: 'default',
      });
      // In a real app, you might want to clear cart, redirect to a dashboard, etc.
      // Credits will be updated via webhook.
    }
  }, [sessionId, toast]);

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Card className="w-full max-w-lg text-center shadow-xl">
        <CardHeader>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mb-4">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <CardTitle className="text-3xl font-headline">Payment Successful!</CardTitle>
          <CardDescription className="text-lg text-muted-foreground">
            Thank you for your purchase. Your transaction has been completed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert variant="default" className="bg-blue-500/10 border-blue-600/50 text-left">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-700">Credits Update Information</AlertTitle>
            <AlertDescription className="text-blue-700">
              Your purchased credits will be added to your account shortly.
              This process is handled by our server once Stripe confirms the payment.
              If you don&apos;t see your credits updated within a few minutes, please contact support or check your account page again later.
            </AlertDescription>
          </Alert>
          
          {sessionId && (
            <p className="text-sm text-muted-foreground">
              Your Stripe Session ID: <span className="font-mono bg-muted px-1 py-0.5 rounded text-xs">{sessionId}</span>
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/buy-credits">Buy More Credits</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
              <Link href="/">Back to Home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CheckoutSuccessPage() {
    return (
        <AuthGuard>
            <CheckoutSuccessPageContent />
        </AuthGuard>
    )
}
